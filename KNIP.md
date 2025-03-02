# Using Knip to Remove Unused Code

[Knip](https://github.com/webpro/knip) is a tool that helps identify and remove unused code in your JavaScript/TypeScript projects. This document explains how to use Knip in this project.

## Available Commands

- `npm run knip`: Run Knip to find all unused files, exports, and dependencies
- `npm run knip:production`: Run Knip focusing on production dependencies only
- `npm run knip:types`: Run Knip focusing on unused TypeScript types
- `npm run knip:files`: Run Knip focusing only on unused files

## Understanding Knip Output

Knip will analyze your codebase and report:

- **Unused files**: Files that are not imported anywhere
- **Unused exports**: Exported functions, variables, or types that are never imported
- **Unused dependencies**: npm packages listed in package.json but not used in code
- **Duplicate exports**: Exports with the same name from different files

## How to Remove Unused Code

1. Run `npm run knip` to identify unused code
2. Review the output carefully
3. Remove unused files, exports, or dependencies as needed
4. Re-run Knip to verify that the issues are resolved

## Finding Unused Files

If you specifically want to find files that can be safely removed:

1. Run `npm run knip:files` to focus only on unused files
2. Review the output to identify files that aren't imported or used anywhere
3. Before removing any file, verify that it's not:
   - Used dynamically (e.g., through dynamic imports)
   - Part of the Expo/React Native routing system
   - Referenced in non-code files (like documentation)

If Knip doesn't find any unused files, that's a good sign that your project is well-maintained!

## Current Configuration

Knip is configured in the `knip.json` file at the root of the project. The current configuration:

- Analyzes all TypeScript and JavaScript files in the project
- Treats files in `app/` and `components/` directories as entry points
- Ignores certain dependencies that are used implicitly (like Expo packages)
- Ignores specific files that contain exports that might be used dynamically

### Ignored Files

The following files are currently ignored in the Knip configuration:

- `constants/layout.ts` - Contains layout constants that might be used dynamically
- `utils/vocabulary.ts` - Contains utility functions that might be used dynamically
- `constants/Colors.ts` - Contains color definitions that might be used dynamically
- `hooks/useAudio.ts` - Contains hooks that might be used dynamically
- `types/articles.types.ts` - Contains types that might be used dynamically
- `components/ProgressBar.tsx` - Has duplicate exports that are intentional
- `components/ThemedModal.tsx` - Has duplicate exports that are intentional
- `app/_layout.tsx` - Used by Expo Router
- `app/review.tsx` - Used by Expo Router
- `components/ActionButton.tsx` - Used dynamically
- `components/ArticleHeader.tsx` - Used dynamically
- `components/ArticleSentence.tsx` - Used dynamically
- `components/Avatar.tsx` - Used dynamically

If you decide to use any of these ignored files or exports, you don't need to update the Knip configuration.

## Handling Duplicate Exports

Some files in the project have duplicate exports (both named exports and default exports). This is intentional for flexibility in importing. For example:

- `components/ProgressBar.tsx` exports both `ProgressBar` and a default export
- `components/ThemedModal.tsx` exports both `ThemedModal` and a default export

These are ignored in the Knip configuration to prevent false positives.

## Unused Production Dependencies

Running `npm run knip:production` has identified the following unused production dependencies:

- `@react-native-async-storage/async-storage`
- `@react-native-community/slider`
- `@react-navigation/elements`
- `@reduxjs/toolkit`
- `@shopify/react-native-skia`
- `expo-image`
- `react-native-url-polyfill`

These dependencies are currently not being used in the codebase. You can consider:

1. Removing them if they're truly not needed
2. Using them if they were intended to be used but haven't been implemented yet
3. Adding them to the `ignoreDependencies` list in `knip.json` if they're used implicitly or will be used soon

To remove an unused dependency, run:

```bash
npm uninstall <package-name>
```

## Tips for Maintaining a Clean Codebase

- Run Knip regularly as part of your development workflow
- Consider adding Knip to your CI/CD pipeline
- When removing code, always run tests afterward to ensure nothing breaks
- Be cautious when removing files that might be dynamically imported

## Customizing Knip

If you need to customize Knip's behavior:

1. Edit the `knip.json` file
2. Add patterns to the `ignore` array to exclude specific files or directories
3. Add package names to `ignoreDependencies` for packages that are used implicitly
4. Modify the `entry` array to change what Knip considers as entry points

### Adding New Files to Ignore

If you create new files that should be ignored by Knip (e.g., files with exports that might be used dynamically), add them to the `ignore` array in `knip.json`:

```json
"ignore": [
  // ... existing ignored files ...
  "path/to/your/new/file.ts"
]
```

For more information, see the [Knip documentation](https://github.com/webpro/knip).
