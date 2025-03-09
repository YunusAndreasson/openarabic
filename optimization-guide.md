# Animation Optimization Guide

This guide details how we're improving animations across our app by using custom animation hooks instead of direct Reanimated components.

## Implementation Status

✅ = Implemented
⏳ = Pending implementation

## High Priority Components

- ✅ **app/(tabs)/index.tsx** - Multiple FadeIn instances (Updated with AnimatedPill and FeaturedArticle)
- ✅ **components/SignInRequired.tsx** - FadeIn animation
- ✅ **components/WordReviewCard.tsx** - Multiple animations, complex interaction

## Medium Priority Components

- ⏳ **components/ArticleList.tsx** - FadeIn animations for list items
- ⏳ **components/CategorySelector.tsx** - FadeIn animations for pills
- ⏳ **components/VocabularyWordList.tsx** - FadeIn animations for list items

## Low Priority Components

- ⏳ **components/ArabicWord.tsx** - Simple FadeIn animation
- ⏳ **components/ThemedModal.tsx** - FadeIn and animation for modal
- ⏳ **components/CategoryPills.tsx** - FadeIn animations for individual pills

## Animation Hooks Created

- ✅ **useFadeInAnimation.ts** - Customizable fade-in animation hook with delay and duration parameters
- ✅ **useSlideAnimation.ts** - For slide-in and slide-out animations with configurable parameters

## Next Steps

1. Continue updating medium priority components
2. Add more animation hooks as needed:
   - ⏳ useScaleAnimation.ts - For scaling elements in and out
   - ⏳ usePulseAnimation.ts - For attention-grabbing pulse effects
3. Document best practices for animation performance

## Components That Need Updates

### High Priority

1. **app/(tabs)/index.tsx**

   - Lines with `entering={FadeIn...}` need to be replaced with our `useFadeInAnimation` hook
   - Examples on lines 273, 329, 361, 430, 458, 588

2. **app/review.tsx**

   - Lines with `entering={FadeIn...}` need to be replaced with our animation hooks
   - Examples on lines 669, 674, 679, 711

3. **components/WordReviewCard.tsx**

   - Lines with `entering={FadeIn...}` need to be replaced
   - Examples on lines 173, 178, 185

4. **components/SignInRequired.tsx**
   - Line 29 with `entering={FadeIn.duration(300)}` needs to be updated

### Medium Priority

1. **components/ThemedModal.tsx**

   - Several instances of `entering={FadeIn...}` on lines 244, 272, 281, 306

2. **components/Loader.tsx**

   - Multiple `entering={FadeIn...}` instances on lines 91, 110, 112, 141

3. **components/FooterCircle.tsx**
   - Line 70 with `entering={FadeIn...}` needs updating

## How to Make the Updates

For each component that uses `entering={FadeIn...}`, follow this pattern:

1. **Import the hook**:

   ```typescript
   import { useFadeInAnimation } from '../utils/animations';
   ```

2. **Remove FadeIn import**:

   ```typescript
   // Remove this:
   import Animated, { FadeIn } from 'react-native-reanimated';
   // Replace with:
   import Animated from 'react-native-reanimated';
   ```

3. **Use the hook in the component**:

   ```typescript
   const { animatedStyle, startAnimation } = useFadeInAnimation(delay, duration);

   useEffect(() => {
     startAnimation();
   }, [startAnimation]);
   ```

4. **Apply the animated style**:

   ```typescript
   // Replace this:
   <Animated.View entering={FadeIn.duration(300).delay(100)}>

   // With this:
   <Animated.View style={[originalStyles, animatedStyle]}>
   ```

## Benefits of Using Our Animation Utilities

1. **Consistency**: All animations will have the same feel and timing
2. **Maintainability**: Changes to animation behavior can be made in one place
3. **Performance**: Our utilities are optimized for the app's needs
4. **Extensibility**: Easier to add new animation features in the future

## Example Before/After

**Before**:

```typescript
import Animated, { FadeIn } from 'react-native-reanimated';

return (
  <Animated.View entering={FadeIn.duration(300)}>
    <Text>Content</Text>
  </Animated.View>
);
```

**After**:

```typescript
import Animated from 'react-native-reanimated';
import { useFadeInAnimation } from '../utils/animations';

const { animatedStyle, startAnimation } = useFadeInAnimation(0, 300);

useEffect(() => {
  startAnimation();
}, [startAnimation]);

return (
  <Animated.View style={[styles.container, animatedStyle]}>
    <Text>Content</Text>
  </Animated.View>
);
```
