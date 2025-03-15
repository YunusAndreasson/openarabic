# Animation Hooks

This directory contains a collection of reusable animation hooks built with React Native Reanimated. These hooks provide consistent, performant animations throughout the application.

## Core Animation Hooks

### `useOpacityAnimation`

A unified hook for opacity and fade animations. Combines functionality from the previous `useFadeInAnimation`, `useOpacityAnimation`, and `useFadeInEntrance` hooks.

```tsx
import { useOpacityAnimation } from '../hooks/animations';

// Basic usage with auto-start
const { animatedStyle } = useOpacityAnimation({
  initialOpacity: 0,
  autoStart: true,
  delay: 50
});

// Apply to a component
<Animated.View style={[styles.container, animatedStyle]}>
  {children}
</Animated.View>

// Using built-in entering/exiting animations
<Animated.View entering={entering} exiting={exiting}>
  {children}
</Animated.View>

// Manual control
const { fadeIn, fadeOut, setOpacity } = useOpacityAnimation();
```

### `usePulseAnimation`

A unified hook for creating pulse animations with different styles. Combines functionality from the previous `usePulseAnimation` and `useDramaticPulseAnimation` hooks.

```tsx
import { usePulseAnimation } from '../hooks/animations';

// Standard pulse
const { animatedStyle, pulse, startAnimation } = usePulseAnimation();

// Dramatic pulse for loaders
const { animatedStyle } = usePulseAnimation({
  style: 'dramatic',
  autoStart: true,
});

// Apply to a component
<Animated.View style={[styles.container, animatedStyle]}>{children}</Animated.View>;
```

### `usePressAnimation`

A unified hook for press animations with scale and optional opacity effects. Combines functionality from the previous `useButtonAnimation` and `useCardAnimation` hooks.

```tsx
import { usePressAnimation } from '../hooks/animations';

// Button press animation
const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
  type: 'button',
});

// Card press animation with opacity
const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
  type: 'card',
});

// Custom press animation
const { animatedStyle, handlePressIn, handlePressOut } = usePressAnimation({
  type: 'custom',
  scaleAmount: 0.95,
  opacityAmount: 0.9,
  includeOpacity: true,
  springConfig: SPRING_CONFIG.BUTTON,
});

// Apply to a component
<Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
  <Animated.View style={[styles.container, animatedStyle]}>{children}</Animated.View>
</Pressable>;
```

### `useReviewAnimation`

A unified hook for review animations with swipe and fade effects. Combines functionality from the previous `useReviewCardAnimation` and `useReviewScreenAnimation` hooks.

```tsx
import { useReviewAnimation } from '../hooks/animations';

// Card-based review animation
const { animatedStyle, swipeLeft, swipeRight, resetPosition } = useReviewAnimation({
  type: 'card',
});

// Screen-based review animation
const { animatedStyle, swipeLeft, swipeRight, handleWordUpdate, setOpacityZeroCallback } =
  useReviewAnimation({
    type: 'screen',
    trackOpacityZero: true,
  });

// Apply to a component
<Animated.View style={[styles.container, animatedStyle]}>{children}</Animated.View>;
```

## Other Animation Hooks

### `useComponentAnimation`

Manages component animation states with delayed readiness.

### `useScaleAnimation`

Creates a scale animation with customizable parameters.

### `useSlideAnimation`

Creates a slide-in animation with customizable parameters.

## Shared Configuration

All animation hooks use shared configuration from `animationConfigs.ts`:

- `TIMING_CONFIG`: Standard timing configurations for animations
- `SPRING_CONFIG`: Standard spring configurations for animations

## Types

Animation types are centralized in `types.ts` for consistency across the codebase.

## Best Practices

1. **Use the appropriate hook** for your animation needs. Don't create custom animations when a hook already exists.
2. **Prefer built-in animations** when possible for better performance.
3. **Clean up animations** on component unmount to prevent memory leaks.
4. **Use the `autoStart` option** when you want animations to start immediately.
5. **Avoid conditional hook calls** as they can lead to React errors.
6. **Use the unified hooks** (`useOpacityAnimation`, `usePulseAnimation`, `usePressAnimation`, `useReviewAnimation`) instead of the deprecated individual hooks.
