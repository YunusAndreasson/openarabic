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
