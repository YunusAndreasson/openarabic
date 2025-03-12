# Animation System Upgrade Guide

This document outlines the changes made to the animation system to leverage the latest and most performant features from Reanimated 3.

## Current Implementation

The project is using `react-native-reanimated` version `~3.16.7`, which is a recent version of Reanimated 3. The animation system is well-organized with custom hooks in the `hooks/animations` directory.

## Changes Made

### 1. Enhanced Fade Animation Hook

The `useFadeInAnimation` hook has been updated to expose Reanimated 3's built-in `FadeIn` and `FadeOut` animations:

```typescript
// Before
const { animatedStyle, startAnimation } = useFadeInAnimation(0, duration);

// After
const { animatedStyle, startAnimation, entering, exiting } = useFadeInAnimation(0, duration);
```

This allows components to use either the manual animation approach or the more optimized built-in animations.

### 2. Added Layout Animation Hook

A new `useLayoutAnimation` hook has been added to leverage Reanimated 3's Layout Transitions API:

```typescript
// Using the new hook with LinearTransition
const { layout } = useLayoutAnimation({
  type: 'linear',
  duration: 300,
  delay: 0
});

// Using the new hook with SequencedTransition
const { layout } = useLayoutAnimation({
  type: 'sequenced',
  duration: 500,
  reverse: true
});

// Use in components
<Animated.View layout={layout}>
  {content}
</Animated.View>
```

This enables automatic animations when components change size or position.

### 3. Removed Deprecated Layout API

The deprecated `Layout` import has been removed from all animation hooks:

```typescript
// Before
import { Layout } from 'react-native-reanimated';

// Create layout animation
const layout = Layout.springify().damping(15).stiffness(150);

// After - using the new useLayoutAnimation hook
const { layout } = useLayoutAnimation({
  type: 'linear',
  duration: 300,
});
```

### 4. Added Shared Transition Hook

A new `useSharedTransition` hook has been added for creating shared element transitions between screens:

```typescript
// In first screen
const { sharedTransitionTag } = useSharedTransition('image-1');

// Use in components
<Animated.Image
  source={source}
  sharedTransitionTag={sharedTransitionTag}
/>

// In second screen (same tag)
const { sharedTransitionTag } = useSharedTransition('image-1');
```

### 5. Updated Components to Use Built-in Animations

The `EntranceAnimation` and `AnimatedItem` components have been updated to use Reanimated 3's built-in animations:

```typescript
// Before
<Animated.View style={[style, animatedStyle]}>
  {children}
</Animated.View>

// After
<Animated.View
  style={style}
  entering={FadeIn.duration(duration).delay(delay)}
>
  {children}
</Animated.View>
```

## Recommendations for Further Improvements

### 1. Migrate More Components to Built-in Animations

Reanimated 3 provides many built-in animations that are more performant than custom implementations:

- `FadeIn`/`FadeOut`
- `SlideInRight`/`SlideOutRight`
- `ZoomIn`/`ZoomOut`
- `FlipInXUp`/`FlipOutXDown`
- `LightSpeedInRight`/`LightSpeedOutLeft`
- `PinwheelIn`/`PinwheelOut`

### 2. Use Layout Transitions for Dynamic Content

Add the `layout` prop to components that change size or position:

```typescript
// Import the useLayoutAnimation hook
import { useLayoutAnimation } from '@/hooks/animations';

// Use the hook in your component
const { layout } = useLayoutAnimation({
  type: 'linear', // or 'sequenced', 'jumping', 'entryExit'
  duration: 300
});

// Apply to your component
<Animated.View layout={layout}>
  {dynamicContent}
</Animated.View>
```

### 3. Use Worklets for Performance-Critical Code

Mark functions with the `'worklet';` directive to run them on the UI thread:

```typescript
const animateValue = () => {
  'worklet';
  // This code runs on the UI thread
  value.value = withTiming(1);
};
```

### 4. Use Gesture Handlers with Worklets

Combine gesture handlers with worklets for responsive interactions:

```typescript
const gesture = Gesture.Pan().onUpdate(event => {
  'worklet';
  translateX.value = event.translationX;
});
```

### 5. Use Reanimated's Optimized Components

Replace standard components with Reanimated's optimized versions:

```typescript
// Before
<View style={style}>
  {children}
</View>

// After
<Animated.View style={style}>
  {children}
</Animated.View>
```

### 6. Use Shared Element Transitions for Screen Navigation

Implement shared element transitions for a more polished user experience:

```typescript
// In first screen
<Animated.Image
  source={source}
  sharedTransitionTag="hero-image"
/>

// In second screen
<Animated.Image
  source={source}
  sharedTransitionTag="hero-image"
/>
```

## Migration Strategy

1. Start by updating the most visible and frequently used animations
2. Test each change thoroughly on both iOS and Android
3. Measure performance before and after changes
4. Document any platform-specific issues or workarounds

## Resources

- [Reanimated 3 Documentation](https://docs.swmansion.com/react-native-reanimated/)
- [Reanimated 3 API Reference](https://docs.swmansion.com/react-native-reanimated/docs/api/)
- [Reanimated 3 Examples](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation)
- [Layout Transitions Documentation](https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/layout-transitions/)
