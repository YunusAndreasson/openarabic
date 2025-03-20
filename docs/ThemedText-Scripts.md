# ThemedText Management Scripts

This document provides an overview of the scripts available for managing the ThemedText component in our codebase.

## Available Scripts

### 1. Convert Text to ThemedText

**Location:** `scripts/convert-to-themed-text.js`

**Purpose:** Identifies React Native's `Text` components that could be replaced with `ThemedText`.

**Usage:**

```bash
node scripts/convert-to-themed-text.js [path-to-file-or-directory]
```

**Features:**

- Scans for direct `Text` component usage from React Native
- Suggests appropriate `ThemedText` replacements with suitable type and variant properties
- Identifies custom styling that should be migrated
- Generates detailed reports of suggested changes

### 2. Update ThemedText Usage Statistics

**Location:** `scripts/update-themedtext-stats.js`

**Purpose:** Analyzes the codebase to gather usage statistics about ThemedText and updates the documentation.

**Usage:**

```bash
node scripts/update-themedtext-stats.js
```

**Features:**

- Counts usage of different text types (`body`, `heading1`, etc.)
- Tracks usage of text variants (`primary`, `error`, etc.)
- Analyzes distribution across different types of files (screens, components, etc.)
- Identifies common type-variant combinations
- Automatically updates the `docs/ThemedText-Usage-Stats.md` file with the latest statistics

## How to Contribute

When making changes to the typography system:

1. Run the statistics script to understand current usage patterns
2. Make your changes to the `ThemedText` component
3. Run the statistics script again to verify the impact of your changes
4. Use the ESLint rules to catch any direct `Text` usage
5. Consider using the conversion script to identify opportunities for migration

## Best Practices

- Always check the usage statistics before introducing new text types or variants
- Consider the most common usage patterns when making changes to avoid disrupting existing patterns
- When converting components to use `ThemedText`, review the ESLint suggestions
- Follow the PR template at `docs/ThemedText-PR-TEMPLATE.md` when submitting changes
