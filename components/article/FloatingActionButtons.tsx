import { Ionicons } from '@expo/vector-icons';
import { memo, startTransition, useOptimistic, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { createAndroidRipple } from '@/utils/layoutUtils';

export interface FloatingActionButtonsProps {
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  onClose: () => void;
}

/**
 * Floating action buttons component positioned over parallax header
 * Provides controls for bookmarking and closing the article
 */
export const FloatingActionButtons = memo<FloatingActionButtonsProps>(
  ({ isInReadingList, onToggleReadingList, onClose }) => {
    const colors = useColors();

    // Press animations for buttons
    const closePressAnimation = usePressAnimation({ type: 'button' });
    const bookmarkPressAnimation = usePressAnimation({ type: 'button' });

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

    const buttonStyle = useMemo(
      () => ({
        width: MIN_TOUCH_TARGET.MEDIUM,
        height: MIN_TOUCH_TARGET.MEDIUM,
        borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
        backgroundColor: colors.elevation1,
        opacity: LAYOUT.OPACITY.PRESSED,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        ...LAYOUT.ELEVATION.SUBTLE,
      }),
      [colors.elevation1],
    );

    const activeButtonStyle = useMemo(
      () => ({
        ...buttonStyle,
        backgroundColor: colors.elevation2,
        opacity: LAYOUT.OPACITY.ACTIVE,
      }),
      [buttonStyle, colors.elevation2],
    );

    // Memoize static button positions
    const closeButtonStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.MEDIUM, // Match category pill spacing (12px on all sides)
        left: LAYOUT.SPACING.MEDIUM,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
      }),
      [],
    );

    const actionButtonsStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.MEDIUM, // Match category pill spacing (12px on all sides)
        right: LAYOUT.SPACING.MEDIUM,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
        flexDirection: 'row' as const,
        gap: LAYOUT.SPACING.TINY,
      }),
      [],
    );

    return (
      <>
        {/* Close button - top left */}
        <View style={closeButtonStyle}>
          <Pressable
            onPress={onClose}
            onPressIn={closePressAnimation.handlePressIn}
            onPressOut={closePressAnimation.handlePressOut}
            android_ripple={createAndroidRipple(colors)}
          >
            <Animated.View style={[buttonStyle, closePressAnimation.animatedStyle]}>
              <Ionicons
                name="close"
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={colors.secondaryText}
              />
            </Animated.View>
          </Pressable>
        </View>

        {/* Action buttons - top right */}
        <View style={actionButtonsStyle}>
          {/* Bookmark button */}
          <Pressable
            onPress={handleOptimisticToggle}
            onPressIn={bookmarkPressAnimation.handlePressIn}
            onPressOut={bookmarkPressAnimation.handlePressOut}
            android_ripple={createAndroidRipple(colors)}
          >
            <Animated.View
              style={[
                optimisticIsInReadingList ? activeButtonStyle : buttonStyle,
                bookmarkPressAnimation.animatedStyle,
              ]}
            >
              <Ionicons
                name={optimisticIsInReadingList ? 'bookmark' : 'bookmark-outline'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={optimisticIsInReadingList ? colors.tint : colors.secondaryText}
              />
            </Animated.View>
          </Pressable>
        </View>
      </>
    );
  },
);

FloatingActionButtons.displayName = 'FloatingActionButtons';
