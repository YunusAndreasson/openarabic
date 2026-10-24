import { GlassIconButton } from '@/components/ui';
import { memo, startTransition, useOptimistic } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

// Gesture-handler's Pressable, as everywhere in the reader — see ReaderPressable.
import { ReaderPressable } from './ReaderPressable';

export interface FloatingActionButtonsProps {
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  onClose: () => void;
  /** This article is playing through the MiniPlayer */
  isListening: boolean;
  /** This article's audio is loading into the MiniPlayer */
  isListenLoading: boolean;
  onToggleListen: () => void;
}

interface ReaderCloseButtonProps {
  onClose: () => void;
}

/**
 * The reader's way out, top left.
 *
 * Its own export because the reader's loading and error states need it too: the
 * reader is a `fullScreenModal` with its swipe-down exit turned off, so on iOS a
 * state without this button had no way out at all.
 */
export const ReaderCloseButton = ({ onClose }: ReaderCloseButtonProps) => {
  const insets = useSafeAreaInsets();

  // Clear of the status bar on both platforms.
  //
  // iOS used to hardcode a 16px offset here, on the reasoning that these sit
  // at the screen corners while the dynamic island is centred. That only held
  // while the reader was a pageSheet — the sheet is itself inset below the
  // status bar, so 16px from ITS top was already clear. The reader is now
  // `fullScreenModal` (it had to be, so the word card could scroll without
  // dragging the article away), and 16px from the true screen top put Close,
  // Listen and Add-to-playlist underneath the status bar — with the swipe-down
  // exit gone too, that left no way out of an article at all.
  //
  // No zIndex, here or on the action row: every place this renders, it is the
  // sibling after what it floats over, and the word sheet that must cover it
  // sets none — a zIndex would lift these buttons over its backdrop.
  const closeButtonStyle = {
    position: 'absolute' as const,
    top: insets.top,
    left: LAYOUT.SPACING.LARGE,
  };

  return (
    <GlassIconButton
      accessibilityLabel={STRINGS.ARTICLE_CLOSE_A11Y}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      icon="close"
      iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
      PressableComponent={ReaderPressable}
      style={closeButtonStyle}
      onPress={onClose}
    />
  );
};

ReaderCloseButton.displayName = 'ReaderCloseButton';

/**
 * Floating action buttons component positioned over parallax header
 * Provides controls for listening to the article, adding to playlist,
 * and closing the article
 */
export const FloatingActionButtons = memo<FloatingActionButtonsProps>(
  ({
    isInReadingList,
    onToggleReadingList,
    onClose,
    isListening,
    isListenLoading,
    onToggleListen,
  }) => {
    const insets = useSafeAreaInsets();

    // Level with ReaderCloseButton, which explains the offset
    const actionButtonsStyle = {
      position: 'absolute' as const,
      top: insets.top,
      right: LAYOUT.SPACING.LARGE,
      flexDirection: 'row' as const,
      gap: LAYOUT.SPACING.TINY,
    };

    // React 19: Use native useOptimistic for immediate UI feedback
    const [optimisticIsInReadingList, setOptimisticBookmark] = useOptimistic(
      isInReadingList,
      (_currentState, newValue: boolean) => newValue,
    );

    const handleOptimisticToggle = () => {
      const newValue = !optimisticIsInReadingList;
      // React 19: keep the async work inside the transition so the optimistic
      // value stays committed until the parent prop has caught up.
      startTransition(async () => {
        setOptimisticBookmark(newValue);
        await onToggleReadingList();
      });
    };

    // Listen only starts playback. Once this article is loading or playing, the
    // MiniPlayer at the foot of the reader is the control — it has the stop,
    // the progress and the sleep timer. This button used to turn into a second
    // stop at the top of the same screen, beside the MiniPlayer's own.
    const isPlayingHere = isListening || isListenLoading;

    return (
      <>
        <ReaderCloseButton onClose={onClose} />

        {/* Action buttons - top right: [Listen] [Add to playlist] */}
        <View style={actionButtonsStyle}>
          {/* No hitSlop on the paired buttons: 12px slop would overlap the 4px
              gap and let the later sibling claim taps on its neighbour's edge.
              Both buttons already meet the 44px minimum touch target. */}
          {!isPlayingHere && (
            <GlassIconButton
              accessibilityLabel={STRINGS.ARTICLE_LISTEN_A11Y}
              icon="play"
              iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              PressableComponent={ReaderPressable}
              onPress={onToggleListen}
            />
          )}

          <GlassIconButton
            accessibilityLabel={
              optimisticIsInReadingList
                ? STRINGS.ARTICLE_REMOVE_FROM_PLAYLIST_A11Y
                : STRINGS.ARTICLE_ADD_TO_PLAYLIST_A11Y
            }
            accessibilityState={{ selected: optimisticIsInReadingList }}
            active={optimisticIsInReadingList}
            icon={optimisticIsInReadingList ? 'headset' : 'headset-outline'}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            PressableComponent={ReaderPressable}
            onPress={handleOptimisticToggle}
          />
        </View>
      </>
    );
  },
);

FloatingActionButtons.displayName = 'FloatingActionButtons';
