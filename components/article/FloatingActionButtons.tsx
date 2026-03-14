import { Ionicons } from '@expo/vector-icons';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { memo, startTransition, useOptimistic } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GLASS_AVAILABLE = isLiquidGlassAvailable();
const GlassContainer = GLASS_AVAILABLE ? GlassView : View;

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export interface FloatingActionButtonsProps {
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  onClose: () => void;
}

/**
 * Floating action buttons component positioned over parallax header
 * Provides controls for adding to playlist and closing the article
 */
export const FloatingActionButtons = memo<FloatingActionButtonsProps>(
  ({ isInReadingList, onToggleReadingList, onClose }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const buttonTop = Platform.OS === 'android'
      ? insets.top
      : LAYOUT.SPACING.LARGE;

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
      // React 19: Optimistic update in transition for immediate UI feedback
      startTransition(() => {
        setOptimisticBookmark(!optimisticIsInReadingList);
      });
      // Fire async operation independently (don't await in transition)
      onToggleReadingList();
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
        <Pressable onPress={onClose} hitSlop={LAYOUT.HIT_SLOP.MEDIUM} style={closeButtonStyle}>
          <GlassContainer
            style={[styles.glassButton, fallbackButtonStyle]}
            {...(GLASS_AVAILABLE && { isInteractive: true })}
          >
            <Ionicons
              name="close"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.secondaryText}
            />
          </GlassContainer>
        </Pressable>

        {/* Action buttons - top right */}
        <Pressable
          onPress={handleOptimisticToggle}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          style={actionButtonsStyle}
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
