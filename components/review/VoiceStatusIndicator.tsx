/**
 * Prominent voice-grading status pill shown above the Practice bottom actions.
 * Gives the learner an unmistakable read on what the mic pipeline is doing:
 *
 * - listening → pulsing mic, brand tint  ("Listening…")
 * - checking  → spinning indicator, accent ("Grading…")
 * - disabled  → spinning indicator, muted  ("Preparing voice…")
 * - revealed  → static refresh, muted      ("Try again or tap to grade")
 * - idle      → renders nothing
 *
 * Looping motion uses the reanimated v4 CSS-keyframe pattern (same as
 * PulsatingLoader) so there's no useEffect/withRepeat and it's New-Arch safe.
 */
import { memo, type FC } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';
import { useColors } from '@/hooks/theme/useColors';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import type { ThemeColors } from '@/types/ui/theme.types';

const ICON_SIZE = LAYOUT.BUTTON.ICON_SIZE.MEDIUM; // 20

const pulseStyle = {
  animationName: {
    '0%': { transform: [{ scale: 0.82 }], opacity: 0.55 },
    '100%': { transform: [{ scale: 1.08 }], opacity: 1 },
  },
  animationDuration: '650ms',
  animationIterationCount: 'infinite' as const,
  animationDirection: 'alternate' as const,
  animationTimingFunction: 'ease-in-out',
} as ReanimatedCSSAnimationStyle;

const spinStyle = {
  animationName: {
    '0%': { transform: [{ rotate: '0deg' }] },
    '100%': { transform: [{ rotate: '360deg' }] },
  },
  animationDuration: '850ms',
  animationIterationCount: 'infinite' as const,
  animationTimingFunction: 'linear',
} as ReanimatedCSSAnimationStyle;

type Motion = 'pulse' | 'spin' | 'none';
/** Restricted to theme keys so ThemedText keeps the label at full opacity. */
type IndicatorColor = Extract<keyof ThemeColors, 'tint' | 'accent' | 'secondaryText'>;

interface IndicatorConfig {
  label: string;
  icon: IoniconName;
  motion: Motion;
  color: IndicatorColor;
}

function configFor(phase: VoicePhase): IndicatorConfig | null {
  switch (phase) {
    case 'listening':
      return { label: STRINGS.VOICE_LISTENING, icon: 'mic', motion: 'pulse', color: 'tint' };
    case 'checking':
      return { label: STRINGS.VOICE_CHECKING, icon: 'sync', motion: 'spin', color: 'accent' };
    case 'disabled':
      return {
        label: STRINGS.VOICE_PREPARING,
        icon: 'sync',
        motion: 'spin',
        color: 'secondaryText',
      };
    case 'revealed':
      return {
        label: STRINGS.VOICE_TRY_AGAIN,
        icon: 'refresh',
        motion: 'none',
        color: 'secondaryText',
      };
    case 'idle':
    default:
      return null;
  }
}

export const VoiceStatusIndicator: FC<{ phase: VoicePhase }> = memo(({ phase }) => {
  const colors = useColors();
  const config = configFor(phase);
  if (!config) return null;

  const tint = colors[config.color];
  const motionStyle =
    config.motion === 'pulse' ? pulseStyle : config.motion === 'spin' ? spinStyle : undefined;

  return (
    // Keyed by phase so the icon/label cross-fade when the state changes.
    <Animated.View
      key={phase}
      entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
      style={[
        styles.pill,
        {
          backgroundColor: colors.card,
          borderColor: tint,
          shadowColor: colors.shadow,
        },
      ]}
    >
      <Animated.View style={[styles.iconWrap, motionStyle]}>
        <Ionicons name={config.icon} size={ICON_SIZE} color={tint} />
      </Animated.View>
      <ThemedText type="label" colorName={config.color} style={styles.label}>
        {config.label}
      </ThemedText>
    </Animated.View>
  );
});

VoiceStatusIndicator.displayName = 'VoiceStatusIndicator';

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    borderWidth: 1.5,
    ...LAYOUT.ELEVATION.FLOATING,
  },
  iconWrap: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
});
