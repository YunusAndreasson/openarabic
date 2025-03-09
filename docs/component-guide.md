# Enhanced Components Guide

This guide provides instructions on how to use the newly implemented animation utilities and optimized image components throughout the app.

## Animation Utilities

The `utils/animations.ts` file contains several reusable animation hooks that provide consistent animations across the app:

### Button Animations

Use the `useButtonAnimation` hook for button press animations:

```jsx
import { useButtonAnimation } from '../utils/animations';

function MyButton({ onPress }) {
  const { animatedStyle, handlePressIn, handlePressOut } = useButtonAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1} // Important! We handle the opacity animation ourselves
      >
        <Text>Button Text</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
```

### Card Animations

Use the `useCardAnimation` hook for card press animations:

```jsx
import { useCardAnimation } from '../utils/animations';

function MyCard({ onPress }) {
  const { animatedStyle, handlePressIn, handlePressOut } = useCardAnimation();

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.card}>{/* Card content */}</View>
      </Pressable>
    </Animated.View>
  );
}
```

### Fade-In Animations

Use the `useFadeInAnimation` hook for fade-in effects:

```jsx
import { useFadeInAnimation } from '../utils/animations';

function MyComponent() {
  const { animatedStyle, startAnimation } = useFadeInAnimation(delay, duration);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Component content */}
    </Animated.View>
  );
}
```

### Pulse Animations

Use the `usePulseAnimation` hook for attention-grabbing effects:

```jsx
import { usePulseAnimation } from '../utils/animations';

function MyComponent() {
  const { animatedStyle, pulse } = usePulseAnimation();

  const handleHighlight = () => {
    pulse(); // Trigger the pulse animation
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Component content */}
    </Animated.View>
  );
}
```

## Enhanced Image Component

The `EnhancedImage` component provides optimized image loading with built-in animations, loading states, and error handling.

### Basic Usage

```jsx
import { EnhancedImage } from '../components/EnhancedImage';

function MyComponent() {
  return (
    <EnhancedImage source="https://example.com/image.jpg" style={styles.image} contentFit="cover" />
  );
}
```

### Props

- `source`: URL of the image to display
- `style`: Custom styles to apply to the container
- `contentFit`: Content fit mode ('cover', 'contain', 'fill', 'none', 'scale-down')
- `showLoadingIndicator`: Whether to show a loading indicator
- `alt`: Alternative text for accessibility
- `onLoad`: Callback function when the image loads successfully
- `onError`: Callback function when the image fails to load
- `disableOptimization`: For testing/debugging - disable image optimizations

### Features

The EnhancedImage component includes several optimizations:

1. **Optimized Loading**: Uses techniques to load images efficiently
2. **Smooth Transitions**: Fade-in animations when images load
3. **Error Handling**: Displays a fallback icon when images fail to load
4. **Loading State**: Shows a loading indicator while the image is loading
5. **Accessibility**: Supports screen readers with proper alt text

## Implementation Guidelines

### When to Use Animation Utilities

1. **Button Interactions**: Use `useButtonAnimation` for any clickable element that should provide feedback
2. **Card Interactions**: Use `useCardAnimation` for card components or list items
3. **Component Entry**: Use `useFadeInAnimation` for components that should animate when appearing
4. **Attention-Grabbing**: Use `usePulseAnimation` for elements that need to draw attention

### Where to Replace Image with EnhancedImage

Replace all instances of the basic `Image` component with `EnhancedImage` throughout the app:

1. Card components with images
2. Profile pictures
3. Article thumbnails
4. Header images
5. Icon images (when loaded from URLs)

## Best Practices

1. **Consistent Animations**: Use the same animation utilities across similar components
2. **Avoid Overuse**: Don't animate everything - focus on important interactions
3. **Performance**: Be careful when animating many items at once
4. **Testing**: Test animations on slower devices to ensure good performance
5. **Accessibility**: Always provide alt text for images using the `alt` prop
