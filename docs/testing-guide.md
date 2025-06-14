# Testing Guide for OpenArabic React Native App

## Overview

This document provides a comprehensive guide for creating tests in the OpenArabic React Native language learning app. The testing framework is built on Jest with React Native Testing Library, optimized for testing hooks, components, and business logic.

## Testing Stack

- **Test Runner**: Jest (~29.7.0)
- **React Native Testing**: jest-expo (^53.0.7)
- **Testing Library**: @testing-library/react-native (^13.2.0)
- **Test Renderer**: react-test-renderer (^19.1.0)
- **Globals**: @jest/globals (^30.0.0)

## Project Structure

```
oa3/
├── __tests__/           # Test files directory
├── __mocks__/           # Mock files for external libraries
├── hooks/               # Custom React hooks (primary testing target)
├── components/          # React components
├── services/            # API and external service logic
├── utils/               # Utility functions
└── jest.config.js       # Jest configuration
```

## Configuration Files

### Jest Configuration (`jest.config.js`)

- **Preset**: `jest-expo` for React Native compatibility
- **Test Environment**: `node` (optimized for RN)
- **Timeout**: 10 seconds for async operations
- **Mocks**: Configured for Reanimated, Skia, Gesture Handler, Redux

### ESLint & TypeScript

- Test files (`__tests__/`, `**/*.test.*`, `**/*.spec.*`) are **excluded** from validation
- Mock files (`__mocks__/`) are **excluded** from linting
- This allows flexible testing patterns without strict production rules
- **Important**: `yarn validate` will NOT check test files, so you can use any testing patterns without linting errors

## Available Mocks

The following libraries are pre-mocked and ready for testing. **All mocks are located in `__mocks__/` directory and automatically loaded by Jest:**

### 1. React Native Reanimated (`react-native-reanimated`)

```javascript
// Available mocked functions:
useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS;
FadeIn, FadeOut, SlideInRight, Layout;
```

### 2. React Native Skia (`@shopify/react-native-skia`)

```javascript
// Available mocked functions:
Canvas, useSharedValueEffect, useDerivedValue, useValue;
Skia.Paint, Skia.Path;
```

### 3. React Native Gesture Handler (`react-native-gesture-handler`)

```javascript
// Available mocked functions:
GestureHandlerRootView, Gesture.Pan, Gesture.Tap, GestureDetector;
```

### 4. React Redux (`react-redux`)

```javascript
// Available mocked functions:
useSelector, useDispatch, Provider, connect;
```

## Testing Patterns

### 1. Hook Testing (Primary Focus)

**Basic Hook Test Structure:**

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect } from '@jest/globals';
import { useYourHook } from '../hooks/useYourHook';

describe('useYourHook', () => {
  it('should return initial state', () => {
    const { result } = renderHook(() => useYourHook());

    expect(result.current.someValue).toBe(expectedValue);
    expect(result.current.someFunction).toBeInstanceOf(Function);
  });

  it('should handle state updates', () => {
    const { result } = renderHook(() => useYourHook());

    act(() => {
      result.current.updateFunction('newValue');
    });

    expect(result.current.someValue).toBe('newValue');
  });
});
```

**Hook with Dependencies:**

```typescript
import { renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from '../store';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

describe('useHookWithDependencies', () => {
  it('should work with providers', () => {
    const { result } = renderHook(() => useHookWithDependencies(), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### 2. Component Testing

**Basic Component Test:**

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect } from '@jest/globals';
import { YourComponent } from '../components/YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<YourComponent title="Test" />);

    expect(getByText('Test')).toBeTruthy();
  });

  it('should handle press events', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(<YourComponent title="Press Me" onPress={mockOnPress} />);

    fireEvent.press(getByText('Press Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
```

### 3. Service/Utility Testing

**Service Function Test:**

```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { yourServiceFunction } from '../services/yourService';

describe('yourServiceFunction', () => {
  it('should process data correctly', async () => {
    const mockData = { id: 1, name: 'test' };
    const result = await yourServiceFunction(mockData);

    expect(result).toEqual(expectedResult);
  });

  it('should handle errors gracefully', async () => {
    const invalidData = null;

    await expect(yourServiceFunction(invalidData)).rejects.toThrow();
  });
});
```

## Priority Testing Areas

### 1. Authentication Hooks (`hooks/auth/`)

- User login/logout state management
- Token refresh logic
- Authentication persistence

### 2. Article Management (`hooks/articles/`)

- Article fetching and caching
- Reading progress tracking
- Bookmark functionality

### 3. Audio Playback (`hooks/audio/`)

- Audio state management
- Playback controls
- Progress tracking

### 4. Practice/Vocabulary (`hooks/practice/`, `hooks/vocabulary/`)

- Spaced repetition algorithms (FSRS)
- Word learning progress
- Practice session management

### 5. Theme Management (`hooks/theme/`)

- Light/dark mode switching
- Theme persistence

## Quick Setup Verification

Before writing tests, verify the setup is working:

```bash
# Test that Jest runs without errors
yarn test --passWithNoTests

# Should output: "No tests found, exiting with code 0"
# ✅ If this works, the testing framework is ready
```

## Running Tests

### Commands

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test --coverage

# Run specific test file
yarn test hooks/auth/useAuth.test.ts

# Run tests matching pattern
yarn test --testNamePattern="should handle login"
```

### Validation

```bash
# Validate code (excludes test files)
yarn validate

# This runs: tsc --noEmit && yarn lint
# Test files are automatically excluded from validation
# ✅ No errors will be thrown for test/mock files
```

## Best Practices

### 1. Test File Naming

- Use `.test.ts` or `.test.tsx` for test files
- Place tests in `__tests__/` directory or alongside source files
- Mirror the source file structure: `hooks/auth/useAuth.ts` → `hooks/auth/useAuth.test.ts`

### 2. Test Organization

```typescript
describe('ComponentName or hookName', () => {
  describe('when condition', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });

  describe('error handling', () => {
    it('should handle invalid input', () => {
      // Error test
    });
  });
});
```

### 3. Mock Management

- Use existing mocks when possible
- Create specific mocks for complex dependencies
- Reset mocks between tests if needed

### 4. Async Testing

```typescript
it('should handle async operations', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useAsyncHook());

  act(() => {
    result.current.triggerAsync();
  });

  await waitForNextUpdate();

  expect(result.current.data).toBeDefined();
});
```

### 5. Testing Redux Hooks

```typescript
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAppSelector } from '../store/hooks';

const mockStore = configureStore({
  reducer: {
    // Your reducers
  },
  preloadedState: {
    // Initial state for testing
  },
});

const wrapper = ({ children }) => <Provider store={mockStore}>{children}</Provider>;

describe('useAppSelector', () => {
  it('should select state correctly', () => {
    const { result } = renderHook(() => useAppSelector(state => state.someSlice.someValue), {
      wrapper,
    });

    expect(result.current).toBe(expectedValue);
  });
});
```

## Common Testing Scenarios

### 1. Testing Custom Hooks with useEffect

```typescript
it('should trigger effect on mount', () => {
  const mockEffect = jest.fn();
  const { result } = renderHook(() => useHookWithEffect(mockEffect));

  expect(mockEffect).toHaveBeenCalledTimes(1);
});
```

### 2. Testing Error Boundaries

```typescript
it('should handle errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const { getByText } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(getByText(/something went wrong/i)).toBeTruthy();
});
```

### 3. Testing Navigation

```typescript
import { NavigationContainer } from '@react-navigation/native';

const renderWithNavigation = component => {
  return render(<NavigationContainer>{component}</NavigationContainer>);
};
```

## Debugging Tests

### 1. Debug Output

```typescript
import { screen } from '@testing-library/react-native';

// Debug rendered component tree
screen.debug();

// Debug specific element
screen.debug(screen.getByText('Some text'));
```

### 2. Console Logging

```typescript
it('should debug hook state', () => {
  const { result } = renderHook(() => useYourHook());

  console.log('Hook result:', result.current);
  // This will show in test output
});
```

## Integration with App Architecture

### Database Types

- Use types from `types/database.types.ts` for Supabase-related tests
- Mock Supabase client responses with proper typing

### Constants

- Import from `constants/` for consistent test data
- Use `Colors.ts` and `layout.ts` for UI-related tests

### Redux Store

- Test with actual store structure from `store/`
- Use proper action creators and selectors

## Example Test Files

### Hook Test Example

```typescript
// __tests__/hooks/useArticleReader.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect } from '@jest/globals';
import { useArticleReader } from '../../hooks/articles/useArticleReader';

describe('useArticleReader', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useArticleReader());

    expect(result.current.currentArticle).toBeNull();
    expect(result.current.isReading).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('should start reading article', () => {
    const { result } = renderHook(() => useArticleReader());
    const mockArticle = { id: 1, title: 'Test Article' };

    act(() => {
      result.current.startReading(mockArticle);
    });

    expect(result.current.currentArticle).toEqual(mockArticle);
    expect(result.current.isReading).toBe(true);
  });
});
```

This testing guide provides the foundation for creating comprehensive tests across the OpenArabic React Native app. Focus on testing business logic in hooks, critical user flows, and error handling scenarios.
