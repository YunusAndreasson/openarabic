import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
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
    onToggleLanguage,
    isLanguageOverridden,
    onClose,
  }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // Use optimistic toggle hook for immediate UI feedback
    const { value: optimisticIsInReadingList, toggle: handleOptimisticToggle } =
      useOptimisticToggle(isInReadingList, onToggleReadingList);

    const buttonStyle = useMemo(
      () => ({
        width: MIN_TOUCH_TARGET.MEDIUM,
        height: MIN_TOUCH_TARGET.MEDIUM,
        borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
        backgroundColor: colors.elevation1,
        opacity: 0.65, // 2025 best practice: More subtle circular background
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        ...LAYOUT.ELEVATION.SUBTLE,
      }),
      [colors.elevation1]
    );

    const activeButtonStyle = useMemo(
      () => ({
        ...buttonStyle,
        backgroundColor: colors.elevation2,
        opacity: 0.75, // 2025 best practice: Slightly more visible when active
      }),
      [buttonStyle, colors.elevation2]
    );

    // Memoize button positions with safe area insets
    const closeButtonStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: LAYOUT.SPACING.LARGE, // Increased from SMALL to LARGE for better spacing
        left: LAYOUT.SPACING.SMALL,
        zIndex: LAYOUT.Z_INDEX.OVERLAY,
      }),
      [insets.top]
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
      [insets.top]
    );

    return (
      <>
        {/* Close button - top left */}
        <View style={closeButtonStyle}>
          <Pressable
            style={buttonStyle}
            onPress={onClose}
            android_ripple={createAndroidRipple(colors)}
          >
            <Ionicons
              name="close"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.secondaryText}
            />
          </Pressable>
        </View>

        {/* Action buttons - top right */}
        <View style={actionButtonsStyle}>
          {/* Language toggle button - show/hide English text */}
          <Pressable
            style={isLanguageOverridden ? activeButtonStyle : buttonStyle}
            onPress={onToggleLanguage}
            android_ripple={createAndroidRipple(colors)}
          >
            <Ionicons
              name="language"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={isLanguageOverridden ? colors.tint : colors.secondaryText}
            />
          </Pressable>

          {/* Play button - only show if article has audio */}
          {hasAudio && onPlayPress && (
            <Pressable
              style={isPlaying ? activeButtonStyle : buttonStyle}
              onPress={onPlayPress}
              android_ripple={createAndroidRipple(colors)}
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                color={isPlaying ? colors.tint : colors.secondaryText}
              />
            </Pressable>
          )}

          {/* Playlist button */}
          <Pressable
            style={optimisticIsInReadingList ? activeButtonStyle : buttonStyle}
            onPress={handleOptimisticToggle}
            android_ripple={createAndroidRipple(colors)}
          >
            <Ionicons
              name="bookmark"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={optimisticIsInReadingList ? colors.tint : colors.secondaryText}
            />
          </Pressable>
        </View>
      </>
    );
  }
);

FloatingActionButtons.displayName = 'FloatingActionButtons';
