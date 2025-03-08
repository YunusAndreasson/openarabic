# Article Testing Guide

This guide provides recommendations for testing the article-related screens and components in the application.

## Key Challenges

Testing React Native components, especially those with complex UI interactions and native dependencies, presents several challenges:

1. **Native Module Dependencies**: Components like `expo-image`, `expo-blur`, `expo-linear-gradient`, and `react-native-reanimated` require proper mocking.
2. **Complex UI Interactions**: Gestures, animations, and transitions are difficult to test in a unit test environment.
3. **Asynchronous Data Loading**: Article screens rely on data fetching, which requires proper async testing patterns.
4. **Deep Component Hierarchies**: The screens often have many nested components, making isolation difficult.

## Recommended Testing Approach

### 1. Start with Service Tests

The service layer is the easiest to test and provides the most value. Focus on:

- Testing `articlesService` methods like `getArticles`, `getArticle`, etc.
- Verifying proper parameters are passed to the Supabase client
- Testing error handling and edge cases

### 2. Use Simple Component Tests

For UI components, start with simplified tests that focus on basic functionality:

- Test that components render without crashing
- Verify that data is displayed correctly
- Test simple interactions like button presses
- Avoid testing complex animations or gestures

### 3. Mock External Dependencies

Create proper mocks for:

```javascript
// Mock expo-image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style: string }) => null,
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View;
  return {
    FadeIn: { duration: jest.fn(() => ({ delay: jest.fn().mockReturnValue({}) })) },
    useSharedValue: jest.fn(initial => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(value => value),
    default: View,
  };
});
```

### 4. Use Integration Tests for Complex Flows

For complex user flows, consider:

- Testing the main happy path (e.g., loading an article, bookmarking an article)
- Focusing on business logic rather than UI details
- Using `waitFor` to handle asynchronous operations

### 5. Consider E2E Testing for Full Flows

For comprehensive testing of the entire article experience:

- Use Detox or similar E2E testing frameworks
- Test real user journeys from browsing articles to reading them
- Test actual gestures and interactions

## Example Test Structure

```javascript
// Basic service test
it('should fetch article data', async () => {
  const { articlesService } = require('../../services/articles');
  articlesService.getArticle.mockResolvedValue({ id: '1', title: 'Test Article' });

  const article = await articlesService.getArticle('1');
  expect(article.title).toBe('Test Article');
});

// Simple component test
it('should render article title', async () => {
  const { getByText } = render(<ArticleComponent article={{ title: 'Test Article' }} />);
  expect(getByText('Test Article')).toBeTruthy();
});

// Integration test
it('should add article to bookmarks when bookmark button is pressed', async () => {
  const { mockDispatch } = setupTest();
  const { getByTestId } = render(<ArticleScreen />);

  fireEvent.press(getByTestId('bookmark-button'));

  expect(mockDispatch).toHaveBeenCalledWith(
    expect.objectContaining({
      type: expect.stringContaining('addBookmark'),
    })
  );
});
```

## Testing Priorities

Focus testing efforts on:

1. **Critical Business Logic**: Article fetching, bookmarking, filtering
2. **Common User Flows**: Browsing articles, reading articles, filtering by category
3. **Error States**: Handling network errors, empty states, loading states
4. **Accessibility**: Text scaling, color contrast, screen reader support

## Conclusion

Testing React Native applications, especially those with complex UI and native dependencies, requires a pragmatic approach. Focus on testing the most critical functionality first, and use a combination of unit, integration, and E2E tests to achieve comprehensive coverage.

Remember that perfect test coverage is less important than testing the features that matter most to users.
