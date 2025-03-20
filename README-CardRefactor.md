# Card Component Refactoring

## Overview

This document outlines the refactoring of card components in the application to standardize appearance and behavior across all cards.

## Key Benefits

- **Consistent Styling**: All cards now share the same border radius, shadow, border width, and animation effects
- **Reusable Logic**: Common functionality like loading states and press animations are now centralized
- **Better Maintainability**: Updates to card styling or behavior can be made in a single place
- **Type Safety**: Standardized props and TypeScript interfaces
- **Reduced Code Duplication**: Eliminated redundant styling and animation code

## BaseCard Component

The `BaseCard` component serves as the foundation for all card components in the application. It handles:

- Consistent theming and styling
- Standardized border radius, shadows, and borders
- Loading states
- Press animations
- Layout animations

### BaseCard Props

| Prop                    | Type                           | Default    | Description                               |
| ----------------------- | ------------------------------ | ---------- | ----------------------------------------- |
| `children`              | ReactNode                      | (required) | Content to render inside the card         |
| `onPress`               | () => void                     | undefined  | Function to call when the card is pressed |
| `isLoading`             | boolean                        | false      | Whether the card is in a loading state    |
| `style`                 | StyleProp<ViewStyle>           | undefined  | Additional styles to apply to the card    |
| `shadowSize`            | 'small' \| 'medium' \| 'large' | 'medium'   | Shadow size to apply to the card          |
| `animated`              | boolean                        | true       | Whether to apply animation effects        |
| `includePressAnimation` | boolean                        | true       | Whether to include press animation        |
| `loadingComponent`      | ReactNode                      | undefined  | Custom loading component to use           |

### Usage Examples

#### Basic Card

```tsx
import BaseCard from './components/BaseCard';

<BaseCard>
  <Text>Card Content</Text>
</BaseCard>;
```

#### Card with Press Handler

```tsx
<BaseCard onPress={() => handlePress()}>
  <Text>Tap Me</Text>
</BaseCard>
```

#### Card with Custom Style

```tsx
<BaseCard
  style={{
    backgroundColor: '#f5f5f5',
    margin: 10,
  }}
>
  <Text>Custom Styled Card</Text>
</BaseCard>
```

#### Loading Card

```tsx
<BaseCard isLoading={true}>
  {/* This content won't be shown while loading */}
  <Text>This won't be visible during loading</Text>
</BaseCard>
```

#### Card with Custom Loading Component

```tsx
<BaseCard isLoading={true} loadingComponent={<CustomLoader />}>
  <Text>Card Content</Text>
</BaseCard>
```

## Refactored Card Components

The following card components have been refactored to use BaseCard:

### 1. ThemedCard

The `ThemedCard` component now uses `BaseCard` internally and focuses on its specific functionality:

- Article cards with images and text
- Compact cards for custom content

### 2. StatCard

The `StatCard` component has been simplified to use `BaseCard` for its container while maintaining its specific layout and content.

### 3. CompactArticleCard

The `CompactArticleCard` now leverages `BaseCard` for consistent styling and animations while focusing on its specific content presentation.

### 4. WordReviewCard

The `WordReviewCard` component now uses `BaseCard` for consistent styling and conditional animations based on visibility.

### 5. CategoryInfoCard

The `CategoryInfoCard` component has been refactored to use `BaseCard` with small shadow size and disabled animations to maintain its informational appearance.

### 6. VocabularyStats

The `VocabularyStats` component now uses `BaseCard` with custom loading state handling and disabled press animations.

### 7. Settings Cards

The settings screen has been updated to use `BaseCard` for all card-like components:

- Preferences settings card
- Social connections card
- Account actions card

All settings cards use `BaseCard` with `shadowSize="small"` and `animated={false}` to maintain the clean, static appearance appropriate for settings UI.

### 8. Audio Controls Card

The audio controls card in the Bookmarks screen now uses `BaseCard` with enhanced animations for better user experience when controlling playback.

### 9. VocabularyGraph

The `VocabularyGraph` component has been refactored to use `BaseCard` for its container. This component displays weekly progress data with animated graphs and interactive elements. The refactoring:

- Simplifies loading state management by using BaseCard's `isLoading` and `loadingComponent` props
- Maintains the complex Canvas-based graph visualization while standardizing the outer card appearance
- Improves code organization by separating container styling from content styling

### 10. VocabularyDashboard

The `VocabularyDashboard` component has been refactored to use `BaseCard` as its container. This component displays statistics about the user's vocabulary progress including total, mastered, learning, and due words. The refactoring:

- Maintains the component's internal layout with clear stat counters
- Uses `shadowSize="medium"` to give appropriate visual prominence
- Configures with `animated={true}` but `includePressAnimation={false}` since the dashboard itself doesn't have press interactions
- Creates a cleaner integration with the vocabulary screen

## Code Reduction Results

The refactoring has led to significant code reduction:

| Component           | Lines Before | Lines After | Reduction |
| ------------------- | ------------ | ----------- | --------- |
| ThemedCard          | 326          | 256         | ~21%      |
| StatCard            | 79           | 76          | ~4%       |
| CompactArticleCard  | 254          | ~200        | ~21%      |
| WordReviewCard      | 133          | ~80         | ~40%      |
| CategoryInfoCard    | 146          | ~120        | ~18%      |
| VocabularyStats     | 198          | ~180        | ~9%       |
| VocabularyGraph     | 372          | ~350        | ~6%       |
| VocabularyDashboard | 218          | ~210        | ~4%       |
| Settings Cards      | ~180         | ~150        | ~17%      |
| Bookmarks Controls  | ~70          | ~60         | ~14%      |

Overall, we've reduced the codebase by hundreds of lines while improving maintainability and consistency.

## Creating New Card Components

When creating new card components, extend BaseCard for consistent styling:

```tsx
import BaseCard from './components/BaseCard';

const MyCustomCard = ({ title, description, onPress }) => {
  return (
    <BaseCard onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </BaseCard>
  );
};
```

## Theming

The BaseCard component automatically uses the application's theme through the `useColors` hook, ensuring all cards have consistent colors that adapt to light and dark modes.

## Best Practices for Using BaseCard

1. **Use BaseCard for all card-like components**: Any component that has card-like styling should use BaseCard
2. **Keep specific styling in the child component**: BaseCard handles base styling, but specific layouts should be managed by the child component
3. **Use the `isLoading` prop**: Let BaseCard handle loading states whenever possible
4. **Customize animations**: Use the `animated` and `includePressAnimation` props to control animation behavior
5. **Choose appropriate shadow size**: Use the `shadowSize` prop to indicate hierarchy importance

## Conclusion

This refactoring standardizes the appearance and behavior of all card components while maintaining flexibility for specialized use cases. Future updates to card styling or behavior can be made in the BaseCard component and will automatically propagate to all derived card components.
