import { ProgressBar } from '@/components/common';
import { Ionicons } from '@/components/ui/Icon';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { FC } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

const GLASS_AVAILABLE = isLiquidGlassAvailable();
const GlassContainer = GLASS_AVAILABLE ? GlassView : View;

import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
const CLOSE_BUTTON_CONSTANTS = {
  SIZE: MIN_TOUCH_TARGET.SMALL, // 32px - matches bottom action buttons
} as const;

const STATIC_STYLES = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: LAYOUT.SPACING.XXLARGE, // Compact height for progress bar only (32px)
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  progressContainer: {
    flex: 1,
    marginBottom: LAYOUT.SPACING.TINY, // Bottom margin only for spacing
    marginRight: LAYOUT.SPACING.LARGE,
  },
  iconButton: {
    width: CLOSE_BUTTON_CONSTANTS.SIZE,
    height: CLOSE_BUTTON_CONSTANTS.SIZE,
    borderRadius: CLOSE_BUTTON_CONSTANTS.SIZE / 2, // Circular
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  voiceButtonSpacing: {
    marginRight: LAYOUT.SPACING.SMALL,
  },
});

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  onClose?: () => void;
  /** Show the voice mute toggle (only when voice grading is enabled). */
  showVoiceControl?: boolean;
  /** True when auto-listen is muted for this session — drives the mic icon. */
  voicePaused?: boolean;
  /** Toggle the session-local voice mute. */
  onToggleVoice?: () => void;
}

export const ReviewHeader: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  onClose,
  showVoiceControl = false,
  voicePaused = false,
  onToggleVoice,
}) => {
  const colors = useColors();

  const displayProgress = Math.max(progress, maxProgress);

  // Handle close
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Fallback background for non-iOS-26 platforms
  const fallbackButtonStyle = {
    backgroundColor: colors.elevation1,
    opacity: LAYOUT.OPACITY.PRESSED,
  };

  return (
    <View style={STATIC_STYLES.header}>
      <View style={STATIC_STYLES.progressContainer}>
        <ProgressBar
          animationDuration={TIMING_CONFIG.PROGRESS.duration}
          progress={displayProgress}
          height={LAYOUT.SPACING.MEDIUM}
        />
      </View>
      {showVoiceControl && onToggleVoice && (
        <Pressable
          onPress={onToggleVoice}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          accessibilityRole="button"
          accessibilityLabel={
            voicePaused ? STRINGS.VOICE_RESUME_LABEL : STRINGS.VOICE_PAUSE_LABEL
          }
          style={STATIC_STYLES.voiceButtonSpacing}
        >
          <GlassContainer
            style={[STATIC_STYLES.iconButton, fallbackButtonStyle]}
            {...(GLASS_AVAILABLE && { isInteractive: true, glassEffectStyle: 'clear' })}
          >
            <Ionicons
              name={voicePaused ? 'mic-off' : 'mic'}
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={voicePaused ? colors.secondaryText : colors.tint}
            />
          </GlassContainer>
        </Pressable>
      )}
      {onClose && (
        <Pressable onPress={handleClose} hitSlop={LAYOUT.HIT_SLOP.MEDIUM}>
          <GlassContainer
            style={[STATIC_STYLES.iconButton, fallbackButtonStyle]}
            {...(GLASS_AVAILABLE && { isInteractive: true, glassEffectStyle: 'clear' })}
          >
            <Ionicons
              name="close"
              size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
              color={colors.secondaryText}
            />
          </GlassContainer>
        </Pressable>
      )}
    </View>
  );
};

ReviewHeader.displayName = 'ReviewHeader';
