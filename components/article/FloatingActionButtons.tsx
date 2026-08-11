import { GlassIconButton } from '@/components/ui';
import { memo, startTransition, useOptimistic } from 'react';
import { Platform, View } from 'react-native';
// Gesture-handler Pressable, NOT react-native's. The article screen wraps its
// whole content in an RNGH Pressable (see app/article/[id].tsx) to dismiss the
// word tooltip on a background tap. An RNGH ancestor wins the gesture arena
// against descendants that use the JS responder system, so these buttons —
// close, listen, add-to-playlist — silently stopped responding to every tap.
// RNGH children compose with it instead, which is why tapping a word kept
// working: SkiaArabicWord already imports Pressable from here.
import { Pressable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

export interface FloatingActionButtonsProps {
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  onClose: () => void;
  isListening: boolean;
  isListenLoading: boolean;
  onToggleListen: () => void;
}

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
    // The buttons sit at the screen corners (left/right edges), so on iOS the
    // dynamic island / notch — which is centered — doesn't overlap them, and a
    // 16px offset from the screen top keeps them visually tight against the
    // hero. Android has a full-width status bar, so we still need insets.top.
    const buttonTop = Platform.OS === 'android' ? insets.top : LAYOUT.SPACING.LARGE;

    const closeButtonStyle = {
      position: 'absolute' as const,
      top: buttonTop,
      left: LAYOUT.SPACING.LARGE,
      zIndex: LAYOUT.Z_INDEX.OVERLAY,
    };

    const actionButtonsStyle = {
      position: 'absolute' as const,
      top: buttonTop,
      right: LAYOUT.SPACING.LARGE,
      zIndex: LAYOUT.Z_INDEX.OVERLAY,
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

    const handleClose = () => {
      onClose();
    };

    const isListenActive = isListening || isListenLoading;

    return (
      <>
        {/* Close button - top left */}
        <GlassIconButton
          clear
          accessibilityLabel={STRINGS.ARTICLE_CLOSE_A11Y}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          icon="close"
          iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
          PressableComponent={Pressable}
          style={closeButtonStyle}
          onPress={handleClose}
        />

        {/* Action buttons - top right: [Listen] [Add to playlist] */}
        <View style={actionButtonsStyle}>
          {/* No hitSlop on the paired buttons: 12px slop would overlap the 4px
              gap and let the later sibling claim taps on its neighbour's edge.
              Both buttons already meet the 44px minimum touch target. */}
          <GlassIconButton
            accessibilityLabel={
              isListening ? STRINGS.ARTICLE_STOP_LISTENING_A11Y : STRINGS.ARTICLE_LISTEN_A11Y
            }
            accessibilityState={{ selected: isListening }}
            active={isListenActive}
            icon={isListenActive ? 'stop' : 'play'}
            iconSize={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            PressableComponent={Pressable}
            onPress={onToggleListen}
          />

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
            PressableComponent={Pressable}
            onPress={handleOptimisticToggle}
          />
        </View>
      </>
    );
  },
);

FloatingActionButtons.displayName = 'FloatingActionButtons';
