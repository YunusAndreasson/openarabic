# Button Components

This directory contains various button components used throughout the application.

## ThemedButton

The `ThemedButton` component is a base button component that follows the application's design system. It supports both light and dark themes and provides consistent styling across the app.

### Features:

- Supports filled and outlined variants
- Handles icons with proper sizing
- Provides haptic feedback on press
- Supports loading state
- Properly handles shadows and elevation on both iOS and Android

### Usage:

```tsx
import { ThemedButton } from '../components/ThemedButton';

// Basic usage
<ThemedButton
  title="Click Me"
  onPress={handlePress}
/>

// With icon
<ThemedButton
  title="Save"
  icon="save-outline"
  onPress={handleSave}
/>

// Outlined variant
<ThemedButton
  variant="outlined"
  title="Cancel"
  onPress={handleCancel}
/>

// With loading state
<ThemedButton
  title="Submit"
  loading={isSubmitting}
  onPress={handleSubmit}
/>
```

## ActionButton

The `ActionButton` is a unified component that replaces both `AudioPlayButton` and `ReadingListButton`. It handles both audio playback and reading list functionality based on the `type` prop.

### Features:

- Unified interface for both audio playback and reading list actions
- Maintains all functionality of the original components
- Uses the improved `ThemedButton` for consistent styling
- Reduces code duplication
- Ensures consistent vertical spacing for proper alignment in article views
- Audio playback uses "Play/Pause" labels and is never disabled

### Usage:

#### For Audio Playback:

```tsx
import { ActionButton } from '../components/ActionButton';

<ActionButton type="audio" audioUrl="https://example.com/audio.mp3" />;
```

#### For Reading List:

```tsx
import { ActionButton } from '../components/ActionButton';

<ActionButton type="readingList" articleId={123} />;
```

## Vertical Alignment

All button components now use consistent vertical margins (`marginVertical: LAYOUT.SPACING.MEDIUM`) to ensure proper alignment when multiple buttons are displayed together in the article view. This consistency is important for maintaining a clean and professional UI.

## Migration Guide

If you're using the old `AudioPlayButton` or `ReadingListButton` components, you should migrate to the new `ActionButton` component:

### From AudioPlayButton:

```tsx
// Old
<AudioPlayButton audioUrl="https://example.com/audio.mp3" />

// New
<ActionButton type="audio" audioUrl="https://example.com/audio.mp3" />
```

### From ReadingListButton:

```tsx
// Old
<ReadingListButton articleId={123} />

// New
<ActionButton type="readingList" articleId={123} />
```

This refactoring improves code maintainability, reduces duplication, and ensures consistent styling across the application.
