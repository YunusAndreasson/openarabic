/**
 * What the microphone is doing, shown on the card.
 *
 * It used to be inside the button: the label cycled "Opening mic…" →
 * "Listening…" → "Grading…" while a meter grew out of a mic glyph, so the one
 * control the learner had to aim at kept changing its name, its height and its
 * meaning underneath them. State and action were the same object.
 *
 * They are separate now. The button below the card says what you can do ("Tap
 * to answer" / "Done"), and this says what is happening — on the card, where
 * the word being practised is, which is where the learner is already looking
 * when they speak. It takes the replay control's slot on the question face,
 * because replaying the Arabic into an open microphone is not something to
 * offer.
 *
 * Mostly it shows rather than tells: bars that breathe while the mic opens and
 * move with the voice once it is live. The caption is one quiet line, and only
 * where a shape cannot carry the meaning.
 *
 * The meter is driven from a Reanimated shared value the recorder writes ten
 * times a second (VoiceGradingProvider.micLevel), so a moving bar costs no
 * React render. Bars, not a canvas: at seven bars a Skia surface buys nothing.
 */
import type { FC } from 'react';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';
import { useColors } from '@/hooks/theme/useColors';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';

/**
 * The three beats worth showing. `null` everywhere else: an idle card shows its
 * replay control instead, and a paused / refused / still-downloading recognizer
 * shows nothing at all rather than explaining itself.
 */
export type VoiceIndicatorState = 'opening' | 'live' | 'grading';

export function voiceIndicatorState(
  phase: VoicePhase,
  paused: boolean,
): VoiceIndicatorState | null {
  if (paused) return null;
  switch (phase) {
    case 'arming':
      return 'opening';
    case 'listening':
      return 'live';
    case 'checking':
      return 'grading';
    default:
      return null;
  }
}

/** Symmetric weights: the meter reads as one voice, loudest in the middle,
 *  rather than pretending to be a spectrum it never measured. Named because the
 *  weights repeat, so they cannot identify their own bar. */
const BARS = [
  { id: 'far-left', weight: 0.4 },
  { id: 'mid-left', weight: 0.62 },
  { id: 'near-left', weight: 0.85 },
  { id: 'centre', weight: 1 },
  { id: 'near-right', weight: 0.85 },
  { id: 'mid-right', weight: 0.62 },
  { id: 'far-right', weight: 0.4 },
] as const;

/** Resting height as a fraction of the full bar. Never zero — a collapsed meter
 *  reads as broken, and the row has to hold its height anyway. */
const BAR_MIN_SCALE = 0.14;
const BAR_HEIGHT = LAYOUT.BUTTON.ICON_SIZE.LARGE;
const BAR_WIDTH = 2;

/** Smoothing between the recorder's ~10 Hz buffers. Slightly longer than the
 *  buffer interval so each level carries into the next without visible steps;
 *  much longer and the meter lags the voice enough to feel disconnected. */
const LEVEL_TIMING = { duration: 130 } as const;

/**
 * Opening the mic. Deliberately wordless — the old copy said "Opening mic…",
 * which is the app talking about itself. A breathing meter says the same thing
 * and then becomes the live meter without a change of shape. State-driven, so
 * per the house split it belongs on Reanimated's CSS API.
 */
const OPENING_PULSE: ReanimatedCSSAnimationStyle = {
  animationName: {
    from: { opacity: LAYOUT.OPACITY.MEDIUM },
    to: { opacity: LAYOUT.OPACITY.FULL },
  },
  animationDuration: 700,
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate',
};

const STATIC_STYLES = StyleSheet.create({
  // Matches the replay button it stands in for, so the question face's body
  // does not resize when the mic opens.
  container: {
    height: LAYOUT.BUTTON.HEIGHT.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    gap: LAYOUT.SPACING.HALF_TINY + 1,
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MICRO,
  },
});

/** One bar. Its own component so each gets a hook of its own — the alternative
 *  is calling useAnimatedStyle inside a map, which is a lint error for good
 *  reasons even when the array length is constant. */
const VoiceBar: FC<{ level: SharedValue<number>; weight: number; color: string }> = memo(
  ({ level, weight, color }) => {
    const style = useAnimatedStyle(() => {
      'worklet';
      return {
        transform: [{ scaleY: BAR_MIN_SCALE + (1 - BAR_MIN_SCALE) * level.get() * weight }],
      };
    });
    return <Animated.View style={[STATIC_STYLES.bar, { backgroundColor: color }, style]} />;
  },
);

VoiceBar.displayName = 'VoiceBar';

interface VoiceListeningIndicatorProps {
  state: VoiceIndicatorState;
  /** 0..1 input level from VoiceGradingProvider. */
  level: SharedValue<number>;
}

export const VoiceListeningIndicator: FC<VoiceListeningIndicatorProps> = ({ state, level }) => {
  const colors = useColors();
  const isLive = state === 'live';

  // Smoothed once, here, rather than once per bar: seven timing animations
  // chasing the same input would be seven times the work for identical output.
  const smoothed = useDerivedValue(() => {
    'worklet';
    return withTiming(isLive ? level.get() : 0, LEVEL_TIMING);
  });

  // Grading is over in a beat and the bars are frozen through it, so they step
  // back to the neutral the rest of the card's chrome uses; live is the tint,
  // which is the only place on this face that colour means "you".
  const barColor = isLive ? colors.tint : colors.secondaryText;
  const caption = isLive
    ? STRINGS.VOICE_LISTENING
    : state === 'grading'
      ? STRINGS.VOICE_CHECKING
      : '';

  return (
    <View
      style={STATIC_STYLES.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={caption || STRINGS.VOICE_CHANNEL_LABEL}
    >
      <Animated.View style={[STATIC_STYLES.barRow, state === 'opening' && OPENING_PULSE]}>
        {BARS.map(bar => (
          <VoiceBar key={bar.id} level={smoothed} weight={bar.weight} color={barColor} />
        ))}
      </Animated.View>
      {caption ? (
        <ThemedText type="caption" colorName="textTertiary">
          {caption}
        </ThemedText>
      ) : null}
    </View>
  );
};

VoiceListeningIndicator.displayName = 'VoiceListeningIndicator';
