#!/usr/bin/env node

/**
 * Script to migrate test files from React Native Text to ThemedText
 *
 * Usage:
 * node scripts/migrate-test-files.js
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Configuration
const TEST_GLOB = '__tests__/**/*.{tsx,ts,jsx,js}';
const IGNORE_PATTERNS = ['**/*.d.ts'];
const IMPORT_STATEMENT = `import { ThemedText } from '@/components/ThemedText';`;

async function main() {
  console.log('🔍 Searching for test files...');

  // Find all test files
  const files = await glob(TEST_GLOB, { ignore: IGNORE_PATTERNS });
  console.log(`Found ${files.length} test files`);

  let updatedCount = 0;

  for (const file of files) {
    try {
      // Read file content
      const content = await readFile(file, 'utf8');

      // Skip if there's no Text component used
      if (!content.includes('<Text') && !content.includes(' Text ')) {
        continue;
      }

      // Track if we need to add the import
      let needsImport = false;

      // Replace Text components
      const updatedContent = content
        // Replace imports
        .replace(/import\s+{[^}]*?(Text)[^}]*?}\s+from\s+['"]react-native['"];?/g, match => {
          needsImport = true;
          // Remove Text from the import, keep other imports
          return match.replace(/\bText\b,?\s*/, '').replace(/{\s*}/, '{ View }');
        })
        // Replace Text components with ThemedText
        .replace(/<Text(\s+[^>]*)?>([^<]*)<\/Text>/g, (match, props, children) => {
          needsImport = true;
          // Convert inline styles to props if needed
          const updatedProps = props
            ? props.replace(/style={{([^{}]*)}}/g, (styleMatch, styleContent) => {
                if (styleContent.includes('fontWeight')) {
                  return styleMatch.replace(/fontWeight:\s*['"]([^'"]+)['"]/g, '') + ` weight="$1"`;
                }
                return styleMatch;
              })
            : '';

          return `<ThemedText${updatedProps}>${children}</ThemedText>`;
        });

      // If we made changes, add the import if needed
      if (needsImport && updatedContent !== content) {
        let finalContent = updatedContent;

        // Check if the import already exists
        if (!updatedContent.includes('ThemedText')) {
          // Add the import statement after other imports
          finalContent = updatedContent.replace(
            /(import\s+.*?['"];?\n+)/s,
            `$1${IMPORT_STATEMENT}\n\n`
          );
        }

        // Write updated content
        await writeFile(file, finalContent, 'utf8');
        updatedCount++;
        console.log(`✅ Updated: ${file}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error);
    }
  }

  console.log(`\n🎉 Migration complete! Updated ${updatedCount} files.`);
  console.log(
    '\n⚠️  Note: You should review the changes and run tests to ensure everything works correctly.'
  );
  console.log('     Some complex JSX or special cases may need manual adjustment.');
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
