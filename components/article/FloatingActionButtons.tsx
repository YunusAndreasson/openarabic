import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { usePressAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
import { useOptimisticToggle } from '@/hooks/ui/useOptimisticToggle';
import { createAndroidRipple } from '@/utils/layoutUtils';

export interface FloatingActionButtonsProps {
  isInReadingList: boolean;
  onToggleReadingList: () => Promise<void>;
  hasAudio?: boolean;
  isPlaying?: boolean;
  onPlayPress?: () => void;
  showEnglish: boolean;
  onToggleLanguage: () => void;
  isLanguageOverridden: boolean;
  onClose: () => void;
}

/**
 * Floating action buttons component positioned over parallax header
 * Provides controls for bookmarking, audio playback, language toggle, and close
 */
export const FloatingActionButtons = memo<FloatingActionButtonsProps>(
  ({
    isInReadingList,
    onToggleReadingList,
    hasAudio = false,
    isPlaying = false,
    onPlayPress,
    showEnglish,
    onToggleLanguage,
    isLanguageOverridden,
    onClose,
  }) => {
    const colors = useColors();

    // Press animations for all buttons
    const closePressAnimation = usePressAnimation({ type: 'button' });
    const languagePressAnimation = usePressAnimation({ type: 'button' });
    const playPressAnimation = usePressAnimation({ type: 'button' });
    const bookmarkPressAnimation = usePressAnimation({ type: 'button' });

    // Use optimistic toggle hook for immediate UI feedback
    const { value: optimisticIsInReadingList, toggle: handleOptimisticToggle } =
      useOptimisticToggle(isInReadingList, onToggleReadingList);

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
        top: LAYOUT.SPACING.LARGE, // Increased from SMALL to LARGE for better spacing
        left: LAYOUT.SPACING.SMALL,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
      }),
      [],
    );

    const actionButtonsStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.LARGE, // Increased from SMALL to LARGE for better spacing
        right: LAYOUT.SPACING.SMALL,
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
          {/* Language toggle button - show/hide English text */}
          <Pressable
            onPress={onToggleLanguage}
            onPressIn={languagePressAnimation.handlePressIn}
            onPressOut={languagePressAnimation.handlePressOut}
            android_ripple={createAndroidRipple(colors)}
          >
            <Animated.View
              style={[
                isLanguageOverridden ? activeButtonStyle : buttonStyle,
                languagePressAnimation.animatedStyle,
              ]}
            >
              <Ionicons
                name={showEnglish ? 'eye' : 'eye-off'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={isLanguageOverridden ? colors.tint : colors.secondaryText}
              />
            </Animated.View>
          </Pressable>

          {/* Play button - only show if article has audio */}
          {hasAudio && onPlayPress && (
            <Pressable
              onPress={onPlayPress}
              onPressIn={playPressAnimation.handlePressIn}
              onPressOut={playPressAnimation.handlePressOut}
              android_ripple={createAndroidRipple(colors)}
            >
              <Animated.View
                style={[
                  isPlaying ? activeButtonStyle : buttonStyle,
                  playPressAnimation.animatedStyle,
                ]}
              >
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                  color={isPlaying ? colors.tint : colors.secondaryText}
                />
              </Animated.View>
            </Pressable>
          )}

          {/* Playlist button */}
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
