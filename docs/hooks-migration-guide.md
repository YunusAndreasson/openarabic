# Hooks Migration Guide

## Animation Hooks Consolidation

We've identified inconsistencies in how animation hooks are used across the project. To improve maintainability and ensure a consistent animation experience, we've consolidated all animation hooks into the `hooks/animations` directory.

### What Changed

1. All animation hooks from `utils/animations.ts` have been moved to individual files in `hooks/animations/`
2. A central export index file has been created at `hooks/animations/index.ts`
3. The implementations have been standardized with improved documentation
4. Import paths have been standardized to use the `@/hooks/animations` alias
5. Basic tests have been added to verify the hooks' API surface

### Migration Status

✅ **Completed:**

- Created individual hook files in hooks/animations/ directory
- Created index.ts for centralized imports
- Updated all components to use the new hooks
- Added basic tests for all animation hooks
- Completely removed utils/animations.ts
- Added ESLint rule to prevent importing from non-existent utils/animations.ts

### How to Use the Animation Hooks

You can now import all animation hooks from a single location:

```tsx
import {
  useFadeInAnimation,
  useButtonAnimation,
  useCardAnimation,
  usePulseAnimation,
} from '@/hooks/animations';
```

### Available Animation Hooks

The following hooks are now available from the central location:

1. `useFadeInAnimation` - Creates a fade-in animation with a subtle rise effect
2. `useSlideAnimation` - Creates a slide animation for elements
3. `useButtonAnimation` - Creates a scale animation for buttons
4. `useCardAnimation` - Creates a scale and opacity animation for cards
5. `usePulseAnimation` - Creates a pulsing animation for attention-grabbing effects

### Examples

#### Using Card Animation

```tsx
import { useCardAnimation } from '@/hooks/animations';

function MyCard() {
  const { animatedStyle, handlePressIn, handlePressOut } = useCardAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        {/* Card content */}
      </Pressable>
    </Animated.View>
  );
}
```

#### Using Fade In Animation

```tsx
import { useFadeInAnimation } from '@/hooks/animations';

function MyComponent() {
  const { animatedStyle, startAnimation } = useFadeInAnimation();

  useEffect(() => {
    startAnimation();
  }, []);

  return <Animated.View style={animatedStyle}>{/* Component content */}</Animated.View>;
}
```

### Benefits

1. **Consistency**: All animation hooks use the same patterns and naming conventions
2. **Maintainability**: Easier to update animations across the entire app
3. **Developer Experience**: Simpler imports and better documentation
4. **Performance**: Standardized animation configurations for optimal performance
5. **Testability**: Basic tests for the hooks' API surface

### Testing Animation Components

We've added simple tests for all animation hooks. These tests focus on verifying the API surface of the hooks rather than trying to test the actual animation behavior, which is handled by the react-native-reanimated library.

If you're creating components that use these hooks, here's a recommended approach to testing:

```tsx
import { renderHook } from '@testing-library/react-hooks';
import yourHook from '../path/to/your/hook';

// Mock the react-native-reanimated library specifically for this test
jest.mock('react-native-reanimated', () => {
  return {
    // Only mock the functions your hook actually uses
    useSharedValue: jest.fn(val => ({ value: val })),
    useAnimatedStyle: jest.fn(() => ({
      /* mock style */
    })),
    withTiming: jest.fn(val => val),
    // Add any other functions your hook uses
  };
});

describe('Your Hook', () => {
  it('has the expected API surface', () => {
    const { result } = renderHook(() => yourHook());

    // Check that the hook returns the expected properties
    expect(result.current).toHaveProperty('animatedStyle');
    expect(result.current).toHaveProperty('someFunction');
    expect(typeof result.current.someFunction).toBe('function');
  });

  // You can add more tests to check specific behavior that doesn't depend
  // on react-native-reanimated's internals
});
```
