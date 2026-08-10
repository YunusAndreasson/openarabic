import { Ionicons } from '@/components/ui/Icon';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { memo, startTransition, useOptimistic } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
// Gesture-handler Pressable, NOT react-native's. The article screen wraps its
// whole content in an RNGH Pressable (see app/article/[id].tsx) to dismiss the
// word tooltip on a background tap. An RNGH ancestor wins the gesture arena
// against descendants that use the JS responder system, so these buttons —
// close, listen, add-to-playlist — silently stopped responding to every tap.
// RNGH children compose with it instead, which is why tapping a word kept
// working: SkiaArabicWord already imports Pressable from here.
import { Pressable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GLASS_AVAILABLE = isLiquidGlassAvailable();
const GlassContainer = GLASS_AVAILABLE ? GlassView : View;

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

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
    const colors = useColors();
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

    // Fallback background for non-iOS-26 platforms
    const fallbackButtonStyle = {
      backgroundColor: colors.elevation1,
      opacity: LAYOUT.OPACITY.PRESSED,
    };

    const activeFallbackStyle = {
      backgroundColor: colors.elevation2,
      opacity: LAYOUT.OPACITY.ACTIVE,
    };

    return (
      <>
        {/* Close button - top left */}
        <Pressable
          onPress={handleClose}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          style={closeButtonStyle}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.ARTICLE_CLOSE_A11Y}
        >
          <GlassContainer
            style={[styles.glassButton, fallbackButtonStyle]}
            {...(GLASS_AVAILABLE && { isInteractive: true, glassEffectStyle: 'clear' })}
          >
            <Ionicons
              name="close"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.secondaryText}
            />
          </GlassContainer>
        </Pressable>

        {/* Action buttons - top right: [Listen] [Add to playlist] */}
        <View style={actionButtonsStyle}>
          {/* No hitSlop on the paired buttons: 12px slop would overlap the 4px
              gap and let the later sibling claim taps on its neighbour's edge.
              Both buttons already meet the 44px minimum touch target. */}
          <Pressable
            onPress={onToggleListen}
            accessibilityRole="button"
            accessibilityLabel={
              isListening ? STRINGS.ARTICLE_STOP_LISTENING_A11Y : STRINGS.ARTICLE_LISTEN_A11Y
            }
            accessibilityState={{ selected: isListening }}
          >
            <GlassContainer
              style={[
                styles.glassButton,
                isListening || isListenLoading ? activeFallbackStyle : fallbackButtonStyle,
              ]}
              {...(GLASS_AVAILABLE && { isInteractive: true })}
            >
              <Ionicons
                name={isListening || isListenLoading ? 'stop' : 'play'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={isListening || isListenLoading ? colors.tint : colors.secondaryText}
              />
            </GlassContainer>
          </Pressable>

          <Pressable
            onPress={handleOptimisticToggle}
            accessibilityRole="button"
            accessibilityLabel={
              optimisticIsInReadingList
                ? STRINGS.ARTICLE_REMOVE_FROM_PLAYLIST_A11Y
                : STRINGS.ARTICLE_ADD_TO_PLAYLIST_A11Y
            }
            accessibilityState={{ selected: optimisticIsInReadingList }}
          >
            <GlassContainer
              style={[
                styles.glassButton,
                optimisticIsInReadingList ? activeFallbackStyle : fallbackButtonStyle,
              ]}
              {...(GLASS_AVAILABLE && { isInteractive: true })}
            >
              <Ionicons
                name={optimisticIsInReadingList ? 'headset' : 'headset-outline'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={optimisticIsInReadingList ? colors.tint : colors.secondaryText}
              />
            </GlassContainer>
          </Pressable>
        </View>
      </>
    );
  },
);

FloatingActionButtons.displayName = 'FloatingActionButtons';

const styles = StyleSheet.create({
  glassButton: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
