import { Ionicons } from '@expo/vector-icons';
import { GlassView } from 'expo-glass-effect';
import { memo, startTransition, useOptimistic, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

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
    const fallbackButtonStyle = useMemo(
      () => ({
        backgroundColor: colors.elevation1,
        opacity: LAYOUT.OPACITY.PRESSED,
      }),
      [colors.elevation1],
    );

    const activeFallbackStyle = useMemo(
      () => ({
        backgroundColor: colors.elevation2,
        opacity: LAYOUT.OPACITY.ACTIVE,
      }),
      [colors.elevation2],
    );

    // Memoize static button positions
    const closeButtonStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.LARGE, // Comfortable edge spacing (16px on all sides)
        left: LAYOUT.SPACING.LARGE,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
      }),
      [],
    );

    const actionButtonsStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.LARGE, // Comfortable edge spacing (16px on all sides)
        right: LAYOUT.SPACING.LARGE,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
        flexDirection: 'row' as const,
        gap: LAYOUT.SPACING.TINY,
      }),
      [],
    );

    return (
      <>
        {/* Close button - top left */}
        <Pressable onPress={onClose} hitSlop={LAYOUT.HIT_SLOP.MEDIUM} style={closeButtonStyle}>
          <GlassView style={[styles.glassButton, fallbackButtonStyle]} isInteractive>
            <Ionicons
              name="close"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.secondaryText}
            />
          </GlassView>
        </Pressable>

        {/* Action buttons - top right */}
        <Pressable
          onPress={handleOptimisticToggle}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          style={actionButtonsStyle}
        >
          <GlassView
            style={[
              styles.glassButton,
              optimisticIsInReadingList ? activeFallbackStyle : fallbackButtonStyle,
            ]}
            isInteractive
          >
            <Ionicons
              name={optimisticIsInReadingList ? 'headset' : 'headset-outline'}
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={optimisticIsInReadingList ? colors.tint : colors.secondaryText}
            />
          </GlassView>
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
