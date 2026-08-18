#!/usr/bin/env node

const { existsSync } = require('fs');

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

function getChangedFiles() {
  const { execSync } = require('child_process');
  const commands = [
    'git diff --name-only --diff-filter=d',
    'git diff --cached --name-only --diff-filter=d',
    'git ls-files --others --exclude-standard',
  ];

  const files = new Set();
  commands.forEach(cmd => {
    try {
      const output = execSync(cmd, { encoding: 'utf8' });
      if (output) {
        output.split('\n').forEach(file => {
          if (file && existsSync(file)) {
            files.add(file);
          }
        });
      }
    } catch {
      // Ignore errors
    }
  });

  return Array.from(files);
}

function filterFilesByExtension(files, extensions) {
  return files.filter(file => extensions.some(ext => file.endsWith(ext)));
}

// Paths outside the app's TypeScript program AND outside its ESLint config —
// both callers below filter on this. `__tests__/` is here because it is not in
// tsconfig.json (it has its own program, added as a separate task) and because
// eslint.config.mjs ignores it; changed test files therefore reach the tests
// typecheck and nothing else.
function isExcludedFile(file) {
  const excludedPaths = ['admin-dashboard/', 'translate/', '__tests__/', 'scripts/'];
  return excludedPaths.some(path => file.startsWith(path));
}

function isTestFile(file) {
  return file.startsWith('__tests__/');
}

function runCommand(command, args, label) {
  const { spawnSync } = require('child_process');
  const startTime = Date.now();

  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      shell: false, // Don't use shell to avoid issues with special characters
      stdio: ['ignore', 'pipe', 'pipe'], // stdin: ignore, stdout: pipe, stderr: pipe
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (result.error) {
      return {
        label,
        success: false,
        stdout: '',
        stderr: result.error.message || 'Command execution failed',
        duration,
        exitCode: 1,
      };
    }

    const success = result.status === 0;
    return {
      label,
      success,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
      duration,
      exitCode: result.status !== null ? result.status : 1,
    };
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    return {
      label,
      success: false,
      stdout: '',
      stderr: error.message || 'Command execution failed',
      duration,
      exitCode: 1,
    };
  }
}

function parseErrors(result) {
  const errors = [];
  const output = result.stderr + result.stdout;

  if (!output) return errors;

  // Parse TypeScript errors (tsc-files format)
  if (result.label === 'TypeScript' || result.label === 'TypeScript (tests)') {
    const tsErrorRegex = /(.+?)\((\d+),(\d+)\): error TS(\d+): (.+)/g;
    let match;
    while ((match = tsErrorRegex.exec(output)) !== null) {
      errors.push({
        file: match[1],
        line: match[2],
        column: match[3],
        message: match[5],
        code: `TS${match[4]}`,
        tool: 'TypeScript',
      });
    }
  }

  // Parse ESLint errors
  if (result.label === 'ESLint') {
    const lines = output.split('\n');
    lines.forEach(line => {
      const eslintMatch = line.match(/^(.+?):(\d+):(\d+):\s+(.+?)\s+(.+?)\s+\[(.+?)\]$/);
      if (eslintMatch) {
        errors.push({
          file: eslintMatch[1],
          line: eslintMatch[2],
          column: eslintMatch[3],
          severity: eslintMatch[4],
          message: eslintMatch[5],
          rule: eslintMatch[6],
          tool: 'ESLint',
        });
      }
    });
  }

  return errors;
}

function formatErrorsForLLM(results) {
  let output = '\n';
  const hasFailures = results.some(r => !r.success);

  // Show status of all tools
  results.forEach(result => {
    const symbol = result.success ? '' : '';
    const color = result.success ? colors.green : colors.red;
    output += `${color}${symbol} ${result.label}: ${result.success ? 'Passed' : 'Failed'} (${result.duration}s)${colors.reset}\n`;
  });

  if (hasFailures) {
    output += `\n${colors.bright} Issues Found ${colors.reset}\n\n`;

    // Show detailed output for each failed tool
    results.forEach(result => {
      if (!result.success) {
        output += `${colors.bright}${result.label}:${colors.reset}\n`;

        // Try to parse structured errors
        const errors = parseErrors(result);

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

          // Show structured errors
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
          // No structured errors parsed - show raw output
          const rawOutput = (result.stdout || '') + (result.stderr || '');
          if (rawOutput && rawOutput.trim()) {
            // Remove ANSI codes and show relevant lines
            // eslint-disable-next-line no-control-regex
            const cleaned = rawOutput.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
            const lines = cleaned.split('\n').filter(line => line.trim());
            lines.forEach(line => {
              if (line.trim()) {
                output += `  ${line}\n`;
              }
            });
          } else {
            output += `  ${colors.yellow}(Tool failed but produced no parseable output)${colors.reset}\n`;
            output += `  Exit code: ${result.exitCode}\n`;
            if (result.stderr) {
              output += `  Stderr: ${result.stderr}\n`;
            }
            if (result.stdout) {
              output += `  Stdout: ${result.stdout}\n`;
            }
          }
        }
        output += '\n';
      }
    });

    output += `${colors.bright} Summary ${colors.reset}\n`;
    output += `${colors.red}${results.filter(r => !r.success).length} tool(s) failed validation${colors.reset}\n\n`;
    output += `${colors.cyan}Fix commands:${colors.reset}\n`;
    output += `  yarn lint:fix      - Auto-fix ESLint issues\n`;
  } else {
    output += `\n${colors.green}( All validations passed!${colors.reset}\n\n`;
    output += `${colors.cyan}=� Tip: Run "yarn check-unused" occasionally to check for unused dependencies${colors.reset}\n`;
  }

  return output;
}

async function main() {
  console.log(`${colors.cyan}=
 Checking for changed files...${colors.reset}\n`);

  const allChangedFiles = getChangedFiles();

  if (allChangedFiles.length === 0) {
    console.log(
      `${colors.green}( No changed files detected. Skipping validation.${colors.reset}\n`,
    );
    process.exit(0);
  }

  console.log(`${colors.blue}=� Found ${allChangedFiles.length} changed file(s)${colors.reset}`);

  const codeFiles = filterFilesByExtension(allChangedFiles, ['.ts', '.tsx', '.js', '.jsx']);

  console.log(`${colors.cyan}� Running validation in parallel...${colors.reset}\n`);

  const tasks = [];

  // TypeScript type checking (only .ts/.tsx files changed, excluding tests, scripts, and other excluded paths)
  const tsFiles = codeFiles.filter(
    file => !isExcludedFile(file) && (file.endsWith('.ts') || file.endsWith('.tsx')),
  );
  if (tsFiles.length > 0) {
    if (process.env.DEBUG_VALIDATE) {
      console.log(
        `${colors.cyan}DEBUG: Running tsc --noEmit for ${tsFiles.length} changed files${colors.reset}`,
      );
      console.log(`${colors.cyan}Files: ${tsFiles.join(', ')}${colors.reset}`);
    }
    // Use full tsc --noEmit instead of tsc-files to avoid module resolution issues
    tasks.push(Promise.resolve().then(() => runCommand('yarn', ['tsc', '--noEmit'], 'TypeScript')));
  }

  // The test suite is a separate TypeScript program. It is larger than the app
  // and was unchecked for a long time, which let tests drift from the source
  // they cover — assertions against props and columns that no longer exist pass
  // green because they compare undefined to undefined.
  const changedTestFiles = codeFiles.filter(isTestFile);
  if (changedTestFiles.length > 0) {
    tasks.push(
      Promise.resolve().then(() =>
        runCommand('yarn', ['tsc', '-p', 'tsconfig.test.json', '--noEmit'], 'TypeScript (tests)'),
      ),
    );
  }

  // ESLint - only non-excluded code files
  const filesToCheck = allChangedFiles.filter(file => !isExcludedFile(file));
  if (filesToCheck.length > 0) {
    const codeFilesToLint = filesToCheck.filter(file =>
      ['.ts', '.tsx', '.js', '.jsx'].some(ext => file.endsWith(ext)),
    );
    if (codeFilesToLint.length > 0) {
      tasks.push(
        Promise.resolve().then(() =>
          runCommand('npx', ['eslint', '--cache', ...codeFilesToLint], 'ESLint'),
        ),
      );
    }
  }

  if (tasks.length === 0) {
    console.log(`${colors.green}( No validation needed for changed files.${colors.reset}\n`);
    process.exit(0);
  }

  // Run all tasks in parallel
  const results = await Promise.all(tasks);

  // Format and display results
  const output = formatErrorsForLLM(results);
  console.log(output);

  // Exit with error if any task failed
  const hasErrors = results.some(r => !r.success);
  process.exit(hasErrors ? 1 : 0);
}

main().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
