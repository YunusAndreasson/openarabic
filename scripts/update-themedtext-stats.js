#!/usr/bin/env node

/**
 * Script to analyze ThemedText usage across the codebase and update
 * the usage statistics document.
 *
 * Usage:
 * node scripts/update-themedtext-stats.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to exclude
const EXCLUDED_DIRS = ['node_modules', '.git', 'dist', 'build', 'coverage'];

// Usage tracking
const typeUsage = {
  body: 0,
  bodyBold: 0,
  heading1: 0,
  heading2: 0,
  heading3: 0,
  caption: 0,
  label: 0,
  overline: 0,
  link: 0,
  arabic: 0,
  // Legacy types
  default: 0,
  title: 0,
  subtitle: 0,
  defaultSemiBold: 0,
};

const variantUsage = {
  error: 0,
  warning: 0,
  success: 0,
  info: 0,
  primary: 0,
  secondary: 0,
  subtle: 0,
  disabled: 0,
};

const fileTypeUsage = {
  screens: 0,
  components: 0,
  modals: 0,
  headers: 0,
};

// Common combinations
const combinations = {};

// Patterns
const THEMEDTEXT_IMPORT_PATTERN = /import\s+{\s*ThemedText\s*}/;
const THEMEDTEXT_TYPE_PATTERN = /type="([^"]+)"/g;
const THEMEDTEXT_VARIANT_PATTERN = /variant="([^"]+)"/g;

// Get all TypeScript/JavaScript files
const getSourceFiles = dir => {
  const files = [];

  const walk = currentDir => {
    if (EXCLUDED_DIRS.some(excluded => currentDir.includes(`/${excluded}/`))) {
      return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.includes(entry.name)) {
          walk(fullPath);
        }
      } else if (
        entry.name.endsWith('.ts') ||
        entry.name.endsWith('.tsx') ||
        entry.name.endsWith('.js') ||
        entry.name.endsWith('.jsx')
      ) {
        files.push(fullPath);
      }
    }
  };

  walk(dir);
  return files;
};

// Analyze a file for ThemedText usage
const analyzeFile = filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check if the file imports ThemedText
    if (!THEMEDTEXT_IMPORT_PATTERN.test(content)) {
      return;
    }

    // Count file type
    if (
      filePath.includes('/screen/') ||
      filePath.includes('/(tabs)/') ||
      filePath.includes('/app/')
    ) {
      fileTypeUsage.screens++;
    } else if (filePath.includes('/components/')) {
      if (filePath.includes('Modal')) {
        fileTypeUsage.modals++;
      } else if (filePath.includes('Header')) {
        fileTypeUsage.headers++;
      } else {
        fileTypeUsage.components++;
      }
    }

    // Find type usages
    const typeMatches = [...content.matchAll(THEMEDTEXT_TYPE_PATTERN)];
    for (const match of typeMatches) {
      const type = match[1];
      if (typeUsage.hasOwnProperty(type)) {
        typeUsage[type]++;
      }
    }

    // Find variant usages
    const variantMatches = [...content.matchAll(THEMEDTEXT_VARIANT_PATTERN)];
    for (const match of variantMatches) {
      const variant = match[1];
      if (variantUsage.hasOwnProperty(variant)) {
        variantUsage[variant]++;
      }
    }

    // Look for combinations
    for (const typeMatch of typeMatches) {
      const type = typeMatch[1];
      const typeIndex = typeMatch.index;

      // Look for a variant near this type
      for (const variantMatch of variantMatches) {
        const variant = variantMatch[1];
        const variantIndex = variantMatch.index;

        // If they're within 100 characters, consider them part of the same ThemedText
        if (Math.abs(typeIndex - variantIndex) < 100) {
          const combo = `${type}-${variant}`;
          combinations[combo] = (combinations[combo] || 0) + 1;
        }
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
};

// Update the statistics document
const updateStatsDocument = () => {
  const statsPath = path.join(process.cwd(), 'docs', 'ThemedText-Usage-Stats.md');
  let content = fs.readFileSync(statsPath, 'utf-8');

  // Update type usage
  Object.keys(typeUsage).forEach(type => {
    const count = typeUsage[type];
    content = content.replace(
      new RegExp(`\\| \`${type}\` \\| [^|]+ \\| - \\|`),
      `| \`${type}\` | [^|]+ | ${count} |`
    );
  });

  // Update variant usage
  Object.keys(variantUsage).forEach(variant => {
    const count = variantUsage[variant];
    content = content.replace(
      new RegExp(`\\| \`${variant}\` \\| [^|]+ \\| - \\|`),
      `| \`${variant}\` | [^|]+ | ${count} |`
    );
  });

  // Update file type usage
  content = content.replace(
    /- Screen components: -/,
    `- Screen components: ${fileTypeUsage.screens}`
  );
  content = content.replace(
    /- Reusable UI components: -/,
    `- Reusable UI components: ${fileTypeUsage.components}`
  );
  content = content.replace(/- Modal components: -/, `- Modal components: ${fileTypeUsage.modals}`);
  content = content.replace(
    /- Header components: -/,
    `- Header components: ${fileTypeUsage.headers}`
  );

  // Update legacy types
  content = content.replace(
    /\| `default` \| `body` \| - \|/,
    `| \`default\` | \`body\` | ${typeUsage.default} |`
  );
  content = content.replace(
    /\| `title` \| `heading1` \| - \|/,
    `| \`title\` | \`heading1\` | ${typeUsage.title} |`
  );
  content = content.replace(
    /\| `subtitle` \| `heading2` \| - \|/,
    `| \`subtitle\` | \`heading2\` | ${typeUsage.subtitle} |`
  );
  content = content.replace(
    /\| `defaultSemiBold` \| `bodyBold` \| - \|/,
    `| \`defaultSemiBold\` | \`bodyBold\` | ${typeUsage.defaultSemiBold} |`
  );

  // Update common patterns
  const topCombinations = Object.entries(combinations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([combo, count]) => `\`${combo}\` (${count} uses)`)
    .join(', ');

  content = content.replace(
    /- Most common combinations: /,
    `- Most common combinations: ${topCombinations || 'None detected'}`
  );

  // Update last updated date
  const currentDate = new Date().toISOString().split('T')[0];
  content = content.replace(/Last updated: \[DATE\]/, `Last updated: ${currentDate}`);
  content = content.replace(/As of \[DATE\]/, `As of ${currentDate}`);

  fs.writeFileSync(statsPath, content);
  console.log(`Updated stats document at ${statsPath}`);
};

// Main function
const main = () => {
  console.log('Analyzing ThemedText usage across the codebase...');

  const rootDir = process.cwd();
  const sourceFiles = getSourceFiles(rootDir);
  let totalFiles = 0;

  for (const file of sourceFiles) {
    analyzeFile(file);
    totalFiles++;
  }

  console.log(`Analyzed ${totalFiles} source files.`);
  console.log('Type usage:', typeUsage);
  console.log('Variant usage:', variantUsage);
  console.log('File type usage:', fileTypeUsage);

  updateStatsDocument();

  console.log('Done!');
};

main();
