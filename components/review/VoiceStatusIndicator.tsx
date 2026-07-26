/**
 * Lightweight voice-grading status label shown above the Practice bottom
 * actions. Plain text, no icon or looping motion — just the word, which carries
 * the state on its own:
 *
 * - listening → "Listening…"      (brand tint)
 * - checking  → "Grading…"        (accent)
 * - disabled  → "Preparing voice…" (muted)
 * - arming    → renders nothing
 * - idle      → renders nothing
 * - result    → renders nothing (the verdict is owned by VoiceResultPanel)
 *
 * The arming/listening split still matters — the mic needs a few hundred ms
 * after arm() before it captures, and promising "Listening…" across that window
 * loses the learner's first syllables — but narrating it ("Opening mic…") read
 * as debug output. Showing nothing says the same thing: no cue yet, so don't
 * speak yet, and "Listening…" still lands the moment capture actually starts.
 *
 * A gentle FadeIn cross-fades the label when the state changes; there is
 * deliberately no pulsing/spinning indicator (it read as distracting flicker).
 */
import { memo, type FC } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';
import type { ThemeColors } from '@/types/ui/theme.types';

/** Restricted to theme keys so ThemedText keeps the label at full opacity. */
type IndicatorColor = Extract<keyof ThemeColors, 'tint' | 'accent' | 'secondaryText'>;

interface IndicatorConfig {
  label: string;
  color: IndicatorColor;
}

function configFor(phase: VoicePhase): IndicatorConfig | null {
  switch (phase) {
    case 'listening':
      return { label: STRINGS.VOICE_LISTENING, color: 'tint' };
    case 'checking':
      return { label: STRINGS.VOICE_CHECKING, color: 'accent' };
    case 'disabled':
      return { label: STRINGS.VOICE_PREPARING, color: 'secondaryText' };
    case 'arming':
    case 'idle':
    case 'result':
    default:
      // 'result' is rendered by VoiceResultPanel, not this indicator.
      return null;
  }
}

export const VoiceStatusIndicator: FC<{ phase: VoicePhase }> = memo(({ phase }) => {
  const config = configFor(phase);
  if (!config) return null;

  return (
    // Keyed by phase so the label cross-fades when the state changes.
    <Animated.View key={phase} entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}>
      <ThemedText type="label" colorName={config.color} style={styles.label}>
        {config.label}
      </ThemedText>
    </Animated.View>
  );
});

VoiceStatusIndicator.displayName = 'VoiceStatusIndicator';

const styles = StyleSheet.create({
  label: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
  },
});
