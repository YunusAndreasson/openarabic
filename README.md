# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

supabase gen types typescript --project-id kkmnzbeugdoajtzfjkxg --schema public > types/database.types.ts

# Article Reader App

## Component Structure

The application follows a modular component architecture to ensure maintainability, reusability, and performance optimization.

### Key Components

1. **ArticleScreen** (`app/article/[id].tsx`)

   - Main screen component that displays an article with its sentences and related articles
   - Uses React Query for data fetching and caching
   - Implements performance optimizations for smooth scrolling and rendering

2. **ArticleSentence** (`components/ArticleSentence.tsx`)

   - Renders a single sentence with its words
   - Memoized to prevent unnecessary re-renders
   - Handles both Arabic and English text display

3. **RelatedArticlesSection** (`components/RelatedArticlesSection.tsx`)

   - Displays a horizontal scrollable list of related articles
   - Memoized for better performance
   - Uses animations for smooth transitions

4. **ArticleHeader** (`components/ArticleHeader.tsx`)
   - Renders the article header with title, author, and action buttons
   - Adapts to light/dark mode with appropriate styling

### Performance Optimizations

1. **Component Extraction**

   - Components are extracted into separate files to improve code organization and reusability
   - Each component has a clear, single responsibility

2. **Memoization**

   - All components use React.memo to prevent unnecessary re-renders
   - Complex calculations and transformations are memoized with useMemo
   - Event handlers are stabilized with useCallback

3. **List Virtualization**

   - FlatList is used for efficient rendering of article sentences
   - Configuration includes:
     - initialNumToRender: 5
     - maxToRenderPerBatch: 5
     - windowSize: 10
     - removeClippedSubviews: true

4. **Data Pre-processing**

   - Sentences and words are sorted and processed before rendering
   - A Map is used for O(1) lookup of words by sentence ID

5. **Type Safety**
   - All components are properly typed with TypeScript
   - Interfaces are defined for component props

## Services and Data Flow

The application follows a clean separation of concerns:

1. **Types** (`types/articles.types.ts`)

   - Define the shape of data used throughout the application
   - Extend database types with application-specific properties

2. **Services** (`services/articles.ts`)

   - Handle data fetching and manipulation
   - Abstract database operations from UI components
   - Return properly typed data

3. **UI Components**
   - Consume data from services via React Query
   - Focus on presentation and user interaction
   - Maintain their own local state when needed

## Styling

- Uses a combination of StyleSheet and inline styles
- Adapts to light/dark mode with appropriate color schemes
- Follows consistent spacing and typography defined in constants

## Code Maintenance

### Knip - Removing Unused Code

This project uses [Knip](https://github.com/webpro/knip) to identify and remove unused code. To use Knip:

```bash
# Find all unused files, exports, and dependencies
npm run knip

# Focus on production dependencies only
npm run knip:production

# Focus on unused TypeScript types
npm run knip:types
```

For detailed information about using Knip in this project, see [KNIP.md](./KNIP.md).

## Typography System

The application uses a consistent typography system based on the `ThemedText` component. This component provides a unified way to style text according to its semantic meaning and ensures consistency across the app.

### ThemedText Refactoring

The codebase has been refactored to use the `ThemedText` component with type and variant props instead of direct styles. This improves:

1. **Consistency** - All text elements now use the same typography system
2. **Maintainability** - Typography can be updated in a central location
3. **Semantic meaning** - Text is styled according to its purpose, not just appearance
4. **Type safety** - Better TypeScript support for text components

### Documentation

- [Component Usage Guidelines](components/README.md) - How to use `ThemedText` and `AnimatedText` components properly
- [ThemedText Refactoring Summary](docs/ThemedText-Refactoring-Summary.md) - Summary of the refactoring process and challenges

### Key Components

#### ThemedText

The primary component for rendering text with proper styling:

```jsx
<ThemedText type="heading1" variant="primary">
  Page Title
</ThemedText>
```

#### AnimatedText

For text that needs to be animated:

```jsx
<AnimatedText type="body" variant="secondary" animatedViewStyle={fadeAnimation}>
  This text animates correctly
</AnimatedText>
```

## Migration from React Native Text

To ensure consistent typography throughout the application, we've implemented a migration plan to replace all instances of React Native's native `Text` component with our `ThemedText` component.

### Current Status

- ✅ All application components now use `ThemedText` instead of native `Text`
- ✅ Documentation examples updated to use `ThemedText`
- ⚠️ Test files still use native `Text` and need to be updated

### Migration Tools

We've created several tools to help with the migration:

1. **Migration Script** (`scripts/migrate-test-files.js`) - Automates the process of updating test files
2. **ESLint Rule** (`eslint-rules/no-direct-text.js`) - Prevents the use of the native `Text` component
3. **Migration Guidelines** (`docs/ThemedText-TestUpdates.md`) - Provides guidance for updating tests

### Next Steps

To complete the migration:

1. Run the migration script to update test files
2. Configure the ESLint rule to enforce usage of `ThemedText`
3. Manually review and fix any complex cases the script couldn't handle

For more details, see [ThemedText Migration Plan](docs/ThemedText-Migration.md).
