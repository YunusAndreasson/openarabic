# ThemedText Refactoring Progress

## Updated Components

The following components have been successfully refactored to properly use `ThemedText` with type and variant props instead of direct styles:

- `ArabicWord` - Now uses `ThemedText` with appropriate type for Arabic text
- `WordListItem` - Refactored to utilize `ThemedText` types and variants
- `WordDetailsModal` - Restructured to use `ThemedText` properly with container-based styling
- `ThemedInput` - Updated helper text to use `ThemedText` with appropriate type and variant
- `WordReviewCard` - Modified to use `ThemedText` instead of `Animated.Text`
- `EmptyState` - Converted custom styles to container-based layout
- `SectionTitle` - Switched to type-based typography
- `ErrorState` - Now uses semantic variants
- `CopyrightFooter` - Using proper type and variants
- `RelatedArticlesSection` - Removed custom styles in favor of container-based styling
- `InfoCard` - Optimized for proper `ThemedText` usage
- `VocabularyStats` - Removed custom styles from `ThemedText` usage
- `Settings` - Updated multiple instances to use type and variant props
- `Bookmarks` - Updated the controls title to use `overline` type and `secondary` variant
- `Review` - Completion text now uses `heading2` and `heading3` types with `primary` variant
- `ArticleSentence` - English translation now uses `body` type and `secondary` variant
- `VocabularyDashboard` - Stat values and labels now use appropriate types and variants
- `VocabularyGraph` - Title, loading text, and data point labels now use appropriate types and variants
- `SignInRequired` - Fixed the animation style type issue with a type assertion
- `Pill` - Refactored to use `caption` type with `primary` and `secondary` variants

## Components With Remaining Issues

The following components still have fundamental issues with their `ThemedText` usage:

1. **AnimatedThemedText**

   - Continuing type conflicts between animation library and text styling
   - Animation styles are designed for View components but don't work properly with TextStyle
   - May need a complete redesign approach

2. **Pill Component**
   - Still has animation-related type errors even after refactoring text
   - The root issue is in the animation styles

## Animation-Related Challenges

During the refactoring process, we encountered several animation-related challenges that affect multiple components:

1. **Type Incompatibility**: React Native Reanimated's animation types are primarily designed for View components (ViewStyle), but ThemedText requires TextStyle props, leading to type conflicts.

2. **Nested Animation**: Most of the animated components use a nested structure where an Animated.View wraps a ThemedText component. The animation is applied to the View, not directly to the Text.

3. **Animation Libraries**: The animation hooks in the project return animated styles that aren't properly typed for use with text components.

## Proposed Solutions

There are several approaches to solve these animation-related issues:

1. **Type Assertions**: Use `as any` or other type assertions to bypass TypeScript checks. This is a quick fix but doesn't solve the underlying design issues.

2. **Container-Based Animation**: Apply animations only to container View components and keep the ThemedText components static inside. This is the most reliable approach.

3. **Custom Animation Hooks**: Create specialized animation hooks for text components that return properly typed animated styles.

4. **Wrapper Components**: Create a new set of animated text components that handle the type compatibility internally.

## Next Steps

1. **Fix Animation Compatibility Issues**

   - Implement a consistent approach for all animated text components
   - Create a reusable solution that can be applied across the codebase

2. **Resolve BaseCard Property Conflicts**

   - Remove usage of deprecated `animated` prop in favor of `includePressAnimation`
   - Many components had linter errors related to using both properties

3. **Standardize Typography System**

   - Create comprehensive documentation of the typography system
   - Establish clear guidelines for when to use each type and variant

4. **Animation Compatibility Layer**
   - Create a solution that bridges the gap between animation libraries and ThemedText
   - Consider creating specialized animated text components for different use cases

## Implemented Best Practices

1. **Container-Based Layout**

   - Use View containers for spacing and positioning
   - Let `ThemedText` handle typography only

2. **Semantic Variants**

   - Use `primary` for main content text
   - Use `secondary` for less prominent text like labels and descriptions
   - Use `error`, `warning`, etc. for status indicators

3. **Type-Based Typography**

   - Use `heading1`, `heading2`, `heading3` for hierarchical headings
   - Use `body` for main content text
   - Use `caption` and `label` for smaller supporting text
   - Use `overline` for all-caps labels and section headers

4. **Minimal Custom Styling**
   - Only use style prop for exceptional cases (like font scaling)
   - Keep custom styles to a minimum

## Recommended Global Solution

After analyzing the animation-related issues across multiple components, we recommend implementing a new `AnimatedText` component that properly handles both animation and typography:

```typescript
import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { ThemedText, ThemedTextProps } from './ThemedText';

interface AnimatedTextProps extends ThemedTextProps {
  animatedViewStyle?: StyleProp<ViewStyle>;
}

export const AnimatedText = React.memo(({
  children,
  style,
  animatedViewStyle,
  ...textProps
}: AnimatedTextProps) => {
  return (
    <Animated.View style={animatedViewStyle}>
      <ThemedText style={style} {...textProps}>
        {children}
      </ThemedText>
    </Animated.View>
  );
});
```

This approach separates the animation style (applied to the View) from the text style (applied to ThemedText), which resolves the type conflicts while maintaining the animation capabilities.
