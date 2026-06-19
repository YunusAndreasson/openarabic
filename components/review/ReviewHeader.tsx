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
// 44pt is the Apple HIG minimum tap target (Material prefers 48dp); the visible
// button now matches the touch target so no hitSlop is needed and adjacent hit
// areas can't overlap. Shared by the mic toggle and the close button.
const ICON_BUTTON_CONSTANTS = {
  SIZE: MIN_TOUCH_TARGET.MEDIUM, // 44px - Apple HIG minimum tap target
} as const;

const STATIC_STYLES = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: MIN_TOUCH_TARGET.MEDIUM, // 44px - fits the tap-target-sized icon buttons
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    width: '100%',
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  progressContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.LARGE,
  },
  iconButton: {
    width: ICON_BUTTON_CONSTANTS.SIZE,
    height: ICON_BUTTON_CONSTANTS.SIZE,
    borderRadius: ICON_BUTTON_CONSTANTS.SIZE / 2, // Circular
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  voiceButtonSpacing: {
    marginRight: LAYOUT.SPACING.MEDIUM, // 12px gap ≥ Material's 8dp min between targets
  },
});

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  onClose?: () => void;
  /** Show the voice mute toggle (only when voice grading is enabled). */
  showVoiceControl?: boolean;
  /** True when auto-listen is muted for this session — drives the mic glyph. */
  voicePaused?: boolean;
  /** True only while the mic is actively listening — tints the mic icon so the
   *  brand color reads as a live "listening now" cue. At rest the mic stays the
   *  same neutral color as the close button. */
  voiceListening?: boolean;
  /** Toggle the session-local voice mute. */
  onToggleVoice?: () => void;
}

export const ReviewHeader: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  onClose,
  showVoiceControl = false,
  voicePaused = false,
  voiceListening = false,
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
          accessibilityRole="button"
          accessibilityLabel={voicePaused ? STRINGS.VOICE_RESUME_LABEL : STRINGS.VOICE_PAUSE_LABEL}
          style={STATIC_STYLES.voiceButtonSpacing}
        >
          <GlassContainer
            style={[STATIC_STYLES.iconButton, fallbackButtonStyle]}
            {...(GLASS_AVAILABLE && { isInteractive: true, glassEffectStyle: 'clear' })}
          >
            <Ionicons
              name={voicePaused ? 'mic-off' : 'mic'}
              size={LAYOUT.BUTTON.ICON_SIZE.LARGE}
              // Tint only while actively listening; neutral at rest so it reads
              // as the same chrome control as the close button.
              color={voiceListening ? colors.tint : colors.secondaryText}
            />
          </GlassContainer>
        </Pressable>
      )}
      {onClose && (
        <Pressable onPress={handleClose}>
          <GlassContainer
            style={[STATIC_STYLES.iconButton, fallbackButtonStyle]}
            {...(GLASS_AVAILABLE && { isInteractive: true, glassEffectStyle: 'clear' })}
          >
            <Ionicons
              name="close"
              size={LAYOUT.BUTTON.ICON_SIZE.LARGE}
              color={colors.secondaryText}
            />
          </GlassContainer>
        </Pressable>
      )}
    </View>
  );
};

ReviewHeader.displayName = 'ReviewHeader';
