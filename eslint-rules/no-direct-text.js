/**
 * @fileoverview Rule to enforce using ThemedText instead of React Native's Text
 * @author AI Assistant
 */

'use strict';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: "Enforce using ThemedText instead of React Native's Text",
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
          excludedFiles: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noDirectText:
        "Use ThemedText from '@/components/ThemedText' instead of React Native's Text component",
    },
  },

  create: function (context) {
    // Default options
    const options = context.options[0] || {};
    const allowInTests = options.allowInTests !== false;
    const excludedFiles = options.excludedFiles || ['components/ThemedText.tsx', '__mocks__/**'];

    // Get the filename to check if it's a test file
    const filename = context.getFilename();
    const isTestFile =
      filename.includes('__tests__') || filename.includes('.test.') || filename.includes('.spec.');

    // Check if the file is excluded
    const isExcluded = excludedFiles.some(pattern => {
      if (pattern.includes('*')) {
        // Handle glob patterns (simple implementation)
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filename);
      }
      return filename.includes(pattern);
    });

    // Skip checking if file is excluded or is a test file and tests are allowed
    if (isExcluded || (allowInTests && isTestFile)) {
      return {};
    }

    return {
      // Check for imports of Text from react-native
      ImportSpecifier(node) {
        if (
          node.imported &&
          node.imported.name === 'Text' &&
          node.parent &&
          node.parent.source &&
          node.parent.source.value === 'react-native'
        ) {
          context.report({
            node,
            messageId: 'noDirectText',
            fix(fixer) {
              // Replace the Text import with ThemedText
              if (node.parent.specifiers.length === 1) {
                // If Text is the only import, replace the entire import
                return fixer.replaceText(
                  node.parent,
                  "import { ThemedText } from '@/components/ThemedText';"
                );
              } else {
                // Remove just the Text from the import
                const range = [
                  node.range[0],
                  // If there's a comma after, include it in the range
                  node.parent.specifiers[node.parent.specifiers.indexOf(node) + 1]
                    ? node.parent.specifiers[node.parent.specifiers.indexOf(node) + 1].range[0]
                    : node.range[1],
                ];
                return fixer.removeRange(range);
              }
            },
          });
        }
      },

      // Check for JSX usage of Text
      JSXOpeningElement(node) {
        if (node.name.name === 'Text') {
          context.report({
            node,
            messageId: 'noDirectText',
            fix(fixer) {
              // Replace Text with ThemedText
              return fixer.replaceText(node.name, 'ThemedText');
            },
          });
        }
      },
    };
  },
};
