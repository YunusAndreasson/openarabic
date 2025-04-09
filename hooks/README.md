# App Hooks

This directory contains reusable React hooks for the application.

## UI Interaction Hooks

### useButtonAction

`useButtonAction` is a custom hook designed to prevent rapid button presses. It has built-in debounce functionality to ensure actions aren't triggered multiple times.

#### Usage

```tsx
import { useButtonAction } from '@/hooks/useButtonAction';
import { ANIMATION_TIMING } from '@/constants/animations';

// In your component:
const handlePress = useButtonAction(() => {
  // Your action here
  console.log('Button pressed');
}, ANIMATION_TIMING.DEBOUNCE.STANDARD);

return (
  <TouchableOpacity onPress={handlePress}>
    <Text>Press Me</Text>
  </TouchableOpacity>
);
```

#### Parameters

- `fn`: The function to execute when the button is pressed
- `delay` (optional): Debounce delay in milliseconds, defaults to `ANIMATION_TIMING.DEBOUNCE.STANDARD` (300ms)

#### Standardized Timing Constants

The application uses standardized timing constants from `constants/animations.ts`:

```typescript
ANIMATION_TIMING.DEBOUNCE.EXTRA_SHORT: 50   // Ultra-short delay for typing
ANIMATION_TIMING.DEBOUNCE.SHORT: 150        // Quick interactions
ANIMATION_TIMING.DEBOUNCE.STANDARD: 300     // Standard buttons
ANIMATION_TIMING.DEBOUNCE.LONG: 500         // Significant actions
```

Choose the appropriate timing based on the importance and frequency of the interaction.

## Best Practices

1. Use `useButtonAction` for all interactive elements that trigger actions
2. Use the standardized timing constants for consistent UI behavior
3. For navigation actions, prefer `useNavigationWithDebounce` which is specifically designed for navigation
