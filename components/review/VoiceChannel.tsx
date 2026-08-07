/**
 * The voice channel: one continuous strip in the question face's lower half,
 * present from the moment a card appears until it is graded.
 *
 * It replaces a text label that rendered `null` in three of its six phases —
 * which meant the app's most distinctive feature (speak the answer, get graded
 * on it) was represented on screen by nothing at all for most of a card, and
 * the learner had no way to tell "the mic is about to open" from "the mic is
 * never opening". Every state now says what to DO — listen, wait, speak — and
 * the strip is the mic's control as well as its readout:
 *
 *   tap  while the prompt plays → skip the rest of it and open the mic now
 *   hold anywhere on the strip  → take the mic over, release to grade
 *
 * The meter is driven from a Reanimated shared value the recorder writes ten
 * times a second (see VoiceGradingProvider.micLevel), so a moving bar costs no
 * React render. Bars, not a canvas: at seven bars a Skia surface buys nothing.
 */
import type { FC } from 'react';
import { memo, useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoicePhase } from '@/hooks/review/useVoiceReview';
import { useColors } from '@/hooks/theme/useColors';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';

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
/** Resting height as a fraction of the full bar. Never zero — a collapsed
 *  meter reads as broken, and the strip has to hold its height anyway. */
const BAR_MIN_SCALE = 0.14;
const BAR_HEIGHT = LAYOUT.SPACING.LARGE * 2; // 32
const BAR_WIDTH = 3;

/** Smoothing between the recorder's ~10 Hz buffers. Slightly longer than the
 *  buffer interval so each level carries into the next without visible steps;
 *  much longer and the meter lags the voice enough to feel disconnected. */
const LEVEL_TIMING = { duration: 130 } as const;

/**
 * Waiting states breathe. State-driven, so per the house split (see
 * ReviewFlipCard) it belongs on Reanimated's CSS API, and it sits on the row
 * container's opacity while the bars keep their worklet transforms — one
 * mechanism per node, never both on the same one.
 */
const WAITING_PULSE: ReanimatedCSSAnimationStyle = {
  animationName: {
    '0%': { opacity: LAYOUT.OPACITY.SUBTLE },
    '50%': { opacity: LAYOUT.OPACITY.HOVER },
    '100%': { opacity: LAYOUT.OPACITY.SUBTLE },
  },
  animationDuration: 1400,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
};

const STATIC_STYLES = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
    gap: LAYOUT.SPACING.TINY + 1,
    // Stated rather than implied, so that when WAITING_PULSE is removed
    // mid-cycle there is a defined value for the opacity to settle back to.
    opacity: LAYOUT.OPACITY.FULL,
  },
  bar: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: LAYOUT.BORDER_RADIUS.MICRO,
  },
  // Fixed-height text slots. The label changes on every phase and the hint
  // comes and goes; without reserved height the whole strip — and the replay
  // button above it — would shuffle on each transition.
  labelSlot: {
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
  },
  hintSlot: {
    height: LAYOUT.SPACING.XLARGE,
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
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

interface VoiceChannelProps {
  phase: VoicePhase;
  /** 0..1 input level from VoiceGradingProvider. */
  level: SharedValue<number>;
  /** True while this card's Arabic prompt is still playing. */
  promptPlaying: boolean;
  /** Session-local mute, from the header's mic toggle. */
  paused: boolean;
  /** Open the mic now — used by both the prompt skip and the hold. */
  onSpeakNow: () => void;
  /** Hold released: grade what was captured. */
  onStopSpeaking: () => void;
}

interface ChannelCopy {
  label: string;
  hint: string;
  /** Bars are lit (tint) only while the mic is genuinely capturing. */
  live: boolean;
  /** Waiting states breathe; settled ones don't. */
  waiting: boolean;
  interactive: boolean;
}

function copyFor(phase: VoicePhase, promptPlaying: boolean, paused: boolean): ChannelCopy {
  if (paused) {
    return {
      label: STRINGS.VOICE_PAUSED,
      hint: '',
      live: false,
      waiting: false,
      interactive: false,
    };
  }
  switch (phase) {
    case 'loading':
      return {
        label: STRINGS.VOICE_PREPARING,
        hint: '',
        live: false,
        waiting: true,
        interactive: false,
      };
    case 'denied':
      return {
        label: STRINGS.VOICE_MIC_OFF,
        hint: '',
        live: false,
        waiting: false,
        interactive: false,
      };
    case 'listening':
      return {
        label: STRINGS.VOICE_SAY_MEANING,
        hint: '',
        live: true,
        waiting: false,
        interactive: true,
      };
    case 'checking':
      return {
        label: STRINGS.VOICE_CHECKING,
        hint: '',
        live: false,
        waiting: true,
        interactive: false,
      };
    case 'arming':
      // Named rather than blank. The old indicator deliberately showed nothing
      // across this window so nobody would speak into a mic that wasn't
      // capturing yet — but silence answered the wrong question: it hid that
      // anything was coming at all.
      return {
        label: STRINGS.VOICE_ARMING,
        hint: '',
        live: false,
        waiting: true,
        interactive: true,
      };
    case 'idle':
    case 'result':
    default:
      if (promptPlaying) {
        return {
          label: STRINGS.VOICE_PROMPT_PLAYING,
          hint: STRINGS.VOICE_SKIP_PROMPT,
          live: false,
          waiting: true,
          interactive: true,
        };
      }
      // Post-prompt idle means the automatic arm didn't happen — it gave up, or
      // the session isn't ready. This is exactly the card the learner would
      // otherwise be stuck on, so the escape hatch names itself here.
      return {
        label: '',
        hint: STRINGS.VOICE_HOLD_TO_SPEAK,
        live: false,
        waiting: false,
        interactive: true,
      };
  }
}

export const VoiceChannel: FC<VoiceChannelProps> = ({
  phase,
  level,
  promptPlaying,
  paused,
  onSpeakNow,
  onStopSpeaking,
}) => {
  const colors = useColors();
  const copy = copyFor(phase, promptPlaying, paused);

  // Only a press that became a HOLD gets to stop the recording on release. A
  // plain tap arms and then leaves the energy gate in charge, which is the
  // right behaviour for someone who tapped to skip the prompt and is about to
  // start talking.
  const holdingRef = useRef(false);

  const handleLongPress = useCallback(() => {
    holdingRef.current = true;
    onSpeakNow();
  }, [onSpeakNow]);

  const handlePressOut = useCallback(() => {
    if (!holdingRef.current) return;
    holdingRef.current = false;
    onStopSpeaking();
  }, [onStopSpeaking]);

  // A short tap is "get to the mic": skip what's left of the prompt, or open
  // the mic on a card whose arm never happened. Both are the same call — it
  // stops the prompt on its way in.
  const handlePress = useCallback(() => {
    if (holdingRef.current) return;
    onSpeakNow();
  }, [onSpeakNow]);

  // Smoothed once, here, rather than once per bar: seven timing animations
  // chasing the same input would be seven times the work for identical output.
  const smoothed = useDerivedValue(() => {
    'worklet';
    return withTiming(copy.live ? level.get() : 0, LEVEL_TIMING);
  });

  const barColor = copy.live ? colors.tint : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={STRINGS.VOICE_CHANNEL_LABEL}
      accessibilityHint={copy.hint || copy.label}
      accessibilityState={{ disabled: !copy.interactive, busy: copy.waiting }}
      disabled={!copy.interactive}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
      delayLongPress={TIMING_CONFIG.SLOW.duration}
      hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
      style={STATIC_STYLES.pressable}
    >
      <Animated.View style={[STATIC_STYLES.barRow, copy.waiting && WAITING_PULSE]}>
        {BARS.map(bar => (
          <VoiceBar key={bar.id} level={smoothed} weight={bar.weight} color={barColor} />
        ))}
      </Animated.View>

      <View style={STATIC_STYLES.labelSlot}>
        {copy.label ? (
          <ThemedText
            type="label"
            colorName={copy.live ? 'tint' : 'secondaryText'}
            style={STATIC_STYLES.centered}
          >
            {copy.label}
          </ThemedText>
        ) : null}
      </View>

      <View style={STATIC_STYLES.hintSlot}>
        {copy.hint ? (
          <ThemedText type="caption" colorName="textTertiary" style={STATIC_STYLES.centered}>
            {copy.hint}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
};

VoiceChannel.displayName = 'VoiceChannel';
