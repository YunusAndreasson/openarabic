#!/usr/bin/env node

/**
 * Script to identify places in the codebase where React Native's Text components
 * should be replaced with ThemedText components.
 *
 * Usage:
 * node scripts/convert-to-themed-text.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to exclude
const EXCLUDED_DIRS = [
  'node_modules',
  '.git',
  '__tests__',
  '__mocks__',
  'dist',
  'build',
  'coverage',
];

// Files to exclude
const EXCLUDED_FILES = ['.md', '.snap', 'ThemedText.tsx', '.json', '.lock', '.log'];

// Patterns
const TEXT_IMPORT_PATTERN = /import\s+{([^}]*)}\s+from\s+['"]react-native['"]/g;
const TEXT_TAG_PATTERN = /<Text([^>]*)>([\s\S]*?)<\/Text>/g;

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
        (entry.name.endsWith('.ts') ||
          entry.name.endsWith('.tsx') ||
          entry.name.endsWith('.js') ||
          entry.name.endsWith('.jsx')) &&
        !EXCLUDED_FILES.some(excluded => entry.name.endsWith(excluded))
      ) {
        files.push(fullPath);
      }
    }
  };

  walk(dir);
  return files;
};

// Analyze a file for Text component usage
const analyzeFile = filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let importsText = false;
    let textUsages = [];

    // Check if the file imports Text from react-native
    const importMatches = [...content.matchAll(TEXT_IMPORT_PATTERN)];

    for (const match of importMatches) {
      if (match[1].includes('Text')) {
        importsText = true;
        break;
      }
    }

    // Don't continue if the file doesn't import Text
    if (!importsText) {
      return null;
    }

    // Look for Text component usage
    const tagMatches = [...content.matchAll(TEXT_TAG_PATTERN)];

    for (const match of tagMatches) {
      const props = match[1].trim();
      const children = match[2].trim();

      textUsages.push({
        originalText: match[0],
        props,
        children,
        // Generate ThemedText equivalent with appropriate type
        themedReplacement: generateThemedText(props, children),
      });
    }

    if (textUsages.length > 0) {
      return {
        filePath,
        usages: textUsages,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
};

// Generate appropriate ThemedText replacement based on context
const generateThemedText = (props, children) => {
  let type = 'body'; // Default type

  // Check for style props that might indicate specific typography
  if (props.includes('style=')) {
    if (
      props.includes("fontWeight: 'bold'") ||
      props.includes('fontWeight:"bold"') ||
      props.includes('fontWeight: 600')
    ) {
      type = 'bodyBold';
    }

    if (props.includes('fontSize') && props.includes('small')) {
      type = 'caption';
    }

    if (
      props.includes('fontSize') &&
      (props.includes('large') || props.includes('20') || props.includes('24'))
    ) {
      type = 'heading3';
    }

    if (
      props.includes('fontSize') &&
      (props.includes('xlarge') || props.includes('28') || props.includes('32'))
    ) {
      type = 'heading2';
    }

    if (
      props.includes('fontSize') &&
      (props.includes('xxlarge') || props.includes('huge') || props.includes('36'))
    ) {
      type = 'heading1';
    }
  }

  // Determine if it's a simple text replacement
  if (props.length === 0) {
    return `<ThemedText type="${type}">${children}</ThemedText>`;
  }

  // Complex replacement with props
  return `<ThemedText type="${type}"${props}>${children}</ThemedText>`;
};

// Main function
const main = () => {
  console.log('Analyzing codebase for Text component usage...');

  const rootDir = process.cwd();
  const sourceFiles = getSourceFiles(rootDir);
  const findings = [];

  for (const file of sourceFiles) {
    const result = analyzeFile(file);
    if (result) {
      findings.push(result);
    }
  }

  // Print findings
  if (findings.length === 0) {
    console.log('No Text components found that need to be converted to ThemedText!');
  } else {
    console.log(
      `Found ${findings.length} files with Text components that should be replaced with ThemedText:`
    );

    for (const finding of findings) {
      console.log(`\nFile: ${finding.filePath}`);
      console.log(
        `${finding.usages.length} Text component${finding.usages.length > 1 ? 's' : ''} found`
      );

      for (let i = 0; i < finding.usages.length; i++) {
        const usage = finding.usages[i];
        console.log(`\n${i + 1}. Original:`);
        console.log(`   ${usage.originalText.replace(/\n/g, '\n   ')}`);
        console.log(`   Suggested replacement:`);
        console.log(`   ${usage.themedReplacement.replace(/\n/g, '\n   ')}`);
      }

      console.log('\nAdditional changes needed:');
      console.log('1. Import ThemedText:');
      console.log("   import { ThemedText } from '@/components/ThemedText';");
      console.log('2. Remove Text from react-native import if no longer needed');
    }

    console.log(
      '\nManual review is required for each replacement to ensure correct typography type selection.'
    );
  }
};

main();
