# NowPlaying Modal Usage Guide

The NowPlaying modal has been made independent and can now be used from any screen in the app without being tied to the Listen tab.

## Location

The modal is now located at `app/now-playing.tsx` (moved from `app/(tabs)/listen/NowPlaying.tsx`)

## How to Use

### Option 1: Using Navigation Helpers (Recommended)

```typescript
import { openNowPlayingModal, closeNowPlayingModal } from '@/utils/navigationHelpers';

// Open modal with parameters
openNowPlayingModal({
  articleId: '123',
  audioState: 'playing',
});

// Open modal without parameters (will use current audio state)
openNowPlayingModal();

// Close modal
closeNowPlayingModal();
```

### Option 2: Direct Router Navigation

```typescript
import { router } from 'expo-router';

// With parameters
router.push({
  pathname: '/now-playing',
  params: {
    articleId: '123',
    position: '5000',
  },
});

// Without parameters
router.push({
  pathname: '/now-playing',
  params: undefined,
});

// Close
router.dismiss();
```

## Features

- **Independent**: Can be opened from any screen, not just the Listen tab
- **Parameter Support**: Pass article ID, position, duration, and audio state
- **Automatic Data Fetching**: Automatically fetches article data and audio state
- **Safe Area Handling**: Properly handles safe areas and positioning
- **Audio Controls**: Integrated stop button, timer, and progress display
- **Sentence Synchronization**: Shows current sentence with progress indicator

## Example Use Cases

1. **From Article Screen**: Open modal when user starts audio playback
2. **From Practice Screen**: Show modal for audio practice sessions
3. **From Reading List**: Quick access to currently playing audio
4. **From Widgets**: Background audio control from home screen widgets
5. **From Push Notifications**: Direct access to playing content

## Migration Notes

- Old route `/(tabs)/listen/NowPlaying` is now `/now-playing`
- The modal is configured in the root layout (`app/_layout.tsx`)
- All navigation calls have been updated to use the new route
- The Listen tab layout no longer includes the NowPlaying screen

## Technical Details

- **Modal Presentation**: Uses `presentation: 'modal'` with gesture support
- **Header**: Hidden for full-screen experience
- **Background**: Uses article image with gradient overlay
- **Controls**: Timer and stop buttons with haptic feedback
- **Progress**: Real-time audio progress with sentence synchronization
