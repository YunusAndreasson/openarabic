#!/usr/bin/env node
/**
 * `yarn validate`: typecheck, lint and format-check what changed (unstaged,
 * staged and untracked files). Every tool runs at the same time, so the wall
 * time is the slowest tool's, not their sum.
 */

const { execFileSync, spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
const TS_EXTENSIONS = ['.ts', '.tsx'];

function getChangedFiles() {
  const commands = [
    ['diff', '--name-only', '--diff-filter=d', '-z'],
    ['diff', '--cached', '--name-only', '--diff-filter=d', '-z'],
    ['ls-files', '--others', '--exclude-standard', '-z'],
  ];

  const files = new Set();
  commands.forEach(args => {
    // Let main report Git failures. A blocked subprocess or broken repository
    // must not produce a successful "no changed files" validation result.
    const output = execFileSync('git', args, { encoding: 'utf8' });
    output.split('\0').forEach(file => {
      if (file && existsSync(file)) {
        files.add(file);
      }
    });
  });

  return Array.from(files);
}

function hasExtension(file, extensions) {
  return extensions.some(ext => file.endsWith(ext));
}

// Paths outside the app's TypeScript program AND outside its main ESLint
// config — both callers below filter on this. `__tests__/` is here because it
// is not in tsconfig.json (it has its own program, added as a separate task)
// and because eslint.config.mjs ignores it; changed test files instead reach
// the tests typecheck and eslint.tests.config.mjs (added as separate tasks
// below), not the main ESLint run.
function isExcludedFile(file) {
  const excludedPaths = ['admin-dashboard/', 'translate/', '__tests__/', 'scripts/'];
  return excludedPaths.some(prefix => file.startsWith(prefix));
}

function isTestFile(file) {
  return file.startsWith('__tests__/');
}

function bin(name) {
  return path.join('node_modules', '.bin', name);
}

// Resolves (never rejects) when the process exits, so one tool failing to
// start cannot hide the other tools' results.
function runCommand(label, command, args, parse) {
  const startTime = Date.now();

  return new Promise(resolve => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (exitCode, spawnError) => {
      if (settled) return;
      settled = true;
      resolve({
        label,
        parse,
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr: spawnError ? spawnError.message : stderr,
        duration: ((Date.now() - startTime) / 1000).toFixed(1),
      });
    };

    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8').on('data', chunk => (stdout += chunk));
    child.stderr.setEncoding('utf8').on('data', chunk => (stderr += chunk));
    child.on('error', error => finish(1, error));
    child.on('close', code => finish(code ?? 1));
  });
}

function parseTypeScript({ stdout, stderr }) {
  const tsErrorRegex = /^(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)$/gm;
  return [...(stdout + stderr).matchAll(tsErrorRegex)].map(match => ({
    file: match[1],
    line: match[2],
    column: match[3],
    message: match[5],
    rule: `TS${match[4]}`,
  }));
}

// ESLint runs with `--format json`: the default formatter's output is not
// line-per-problem, so no regex over it can be relied on.
function parseEslint({ stdout }) {
  let results;
  try {
    results = JSON.parse(stdout);
  } catch {
    return [];
  }
  return results.flatMap(result =>
    result.messages.map(message => ({
      file: path.relative(process.cwd(), result.filePath),
      line: message.line,
      column: message.column,
      message: `${message.severity === 2 ? 'error' : 'warning'}: ${message.message}`,
      rule: message.ruleId,
    })),
  );
}

// `prettier --check` names each unformatted file on its own "[warn] <file>"
// line (on stderr), followed by one "[warn] Code style issues ..." summary.
function parsePrettier({ stderr }) {
  return [...stderr.matchAll(/^\[warn\] (.+)$/gm)]
    .map(match => match[1])
    .filter(file => !file.startsWith('Code style issues'))
    .map(file => ({ file, message: 'not formatted' }));
}

function formatErrorsForLLM(results) {
  let output = '\n';
  const hasFailures = results.some(r => !r.success);

  // Show status of all tools
  results.forEach(result => {
    const color = result.success ? colors.green : colors.red;
    output += `${color}${result.label}: ${result.success ? 'Passed' : 'Failed'} (${result.duration}s)${colors.reset}\n`;
  });

  if (hasFailures) {
    output += `\n${colors.bright}Issues found${colors.reset}\n\n`;

    // Show detailed output for each failed tool
    results.forEach(result => {
      if (!result.success) {
        output += `${colors.bright}${result.label}:${colors.reset}\n`;

        const errors = result.parse(result);

        if (errors.length > 0) {
          // Group by file
          const errorsByFile = {};
          errors.forEach(error => {
            const file = error.file || 'unknown';
            if (!errorsByFile[file]) {
              errorsByFile[file] = [];
            }
            errorsByFile[file].push(error);
          });

          Object.keys(errorsByFile)
            .sort()
            .forEach(file => {
              output += `  ${colors.cyan}${file}${colors.reset}\n`;
              errorsByFile[file].forEach(error => {
                const location = error.line
                  ? `:${error.line}${error.column ? ':' + error.column : ''}`
                  : '';
                const rule = error.rule ? ` [${error.rule}]` : '';
                output += `    ${location ? location + ' -' : ''} ${error.message}${rule}\n`;
              });
            });
        } else {
          // Nothing parseable (a crash, a config error, ESLint's unused-suppressions
          // notice): show the raw output, minus ESLint's JSON report.
          const stdout = result.stdout.trimStart().startsWith('[') ? '' : result.stdout;
          // eslint-disable-next-line no-control-regex
          const cleaned = (stdout + result.stderr).replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
          const lines = cleaned.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            lines.forEach(line => {
              output += `  ${line}\n`;
            });
          } else {
            output += `  ${colors.yellow}(Tool failed but produced no parseable output)${colors.reset}\n`;
            output += `  Exit code: ${result.exitCode}\n`;
          }
        }
        output += '\n';
      }
    });

    output += `${colors.bright}Summary${colors.reset}\n`;
    output += `${colors.red}${results.filter(r => !r.success).length} tool(s) failed validation${colors.reset}\n\n`;
    output += `${colors.cyan}Fix commands:${colors.reset}\n`;
    output += `  yarn lint:fix                     - Auto-fix ESLint issues\n`;
    output += `  yarn prettier:fix                 - Format files\n`;
    output += `  yarn lint --prune-suppressions    - Record fixed backlog hits in eslint-suppressions.json\n`;
  } else {
    output += `\n${colors.green}All validations passed!${colors.reset}\n\n`;
    output += `${colors.cyan}Tip: Run "yarn check-unused" occasionally to check for unused dependencies${colors.reset}\n`;
  }

  return output;
}

async function main() {
  console.log(`${colors.cyan}Checking for changed files...${colors.reset}\n`);

  const allChangedFiles = getChangedFiles();

  if (allChangedFiles.length === 0) {
    console.log(`${colors.green}No changed files detected. Skipping validation.${colors.reset}\n`);
    process.exit(0);
  }

  console.log(`${colors.blue}Found ${allChangedFiles.length} changed file(s)${colors.reset}`);

  const codeFiles = allChangedFiles.filter(file => hasExtension(file, CODE_EXTENSIONS));
  const sourceFiles = codeFiles.filter(file => !isExcludedFile(file));
  const changedTestFiles = codeFiles.filter(isTestFile);
  const changedTestTsFiles = changedTestFiles.filter(file => hasExtension(file, TS_EXTENSIONS));

  console.log(`${colors.cyan}Running validation in parallel...${colors.reset}\n`);

  const tasks = [];

  // TypeScript type checking, only when an app .ts/.tsx file changed. Full
  // `tsc --noEmit` instead of tsc-files to avoid module resolution issues.
  if (sourceFiles.some(file => hasExtension(file, TS_EXTENSIONS))) {
    tasks.push(runCommand('TypeScript', bin('tsc'), ['--noEmit'], parseTypeScript));
  }

  // The test suite is a separate TypeScript program. It is larger than the app
  // and was unchecked for a long time, which let tests drift from the source
  // they cover — assertions against props and columns that no longer exist pass
  // green because they compare undefined to undefined.
  if (changedTestFiles.length > 0) {
    tasks.push(
      runCommand(
        'TypeScript (tests)',
        bin('tsc'),
        ['-p', 'tsconfig.test.json', '--noEmit'],
        parseTypeScript,
      ),
    );
  }

  // Same gate as `yarn lint` (zero warnings; the bulk-suppressed backlog in
  // eslint-suppressions.json applies here too). `--no-warn-ignored` keeps a
  // changed file the config ignores from counting as a warning.
  if (sourceFiles.length > 0) {
    tasks.push(
      runCommand(
        'ESLint',
        bin('eslint'),
        ['--cache', '--format', 'json', '--max-warnings', '0', '--no-warn-ignored', ...sourceFiles],
        parseEslint,
      ),
    );
  }

  // eslint-plugin-testing-library, scoped to __tests__ only (see
  // eslint.tests.config.mjs) — catches the false-pass RNTL bug shapes fixed by
  // hand in 87c8e51b (un-awaited async queries/utils, a waitFor doing more than
  // one job, lifecycle/cleanup ordering) so the next one fails CI instead of
  // needing another manual sweep.
  if (changedTestTsFiles.length > 0) {
    tasks.push(
      runCommand(
        'ESLint (tests)',
        bin('eslint'),
        [
          '-c',
          'eslint.tests.config.mjs',
          '--no-inline-config',
          '--cache',
          '--cache-location',
          '.eslintcache-tests',
          '--format',
          'json',
          ...changedTestTsFiles,
        ],
        parseEslint,
      ),
    );
  }

  // Every changed file Prettier has a parser for; .prettierignore still applies
  // to files named explicitly.
  tasks.push(
    runCommand(
      'Prettier',
      bin('prettier'),
      ['--check', '--cache', '--ignore-unknown', ...allChangedFiles],
      parsePrettier,
    ),
  );

  const results = await Promise.all(tasks);

  console.log(formatErrorsForLLM(results));

  const hasErrors = results.some(r => !r.success);
  process.exit(hasErrors ? 1 : 0);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
