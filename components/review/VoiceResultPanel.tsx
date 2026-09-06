/**
 * Post-grade voice result, shown when the recognizer couldn't confirm a match —
 * a correct answer just proceeds. Framed as a neutral self-grade rather than a
 * verdict, so the learner judges their own answer against the shown meaning
 * instead of ratifying the ASR — this also recovers gracefully from a mishear.
 *
 * One line of evidence (what was heard → what the answer was) over the same
 * three-up row the self-grade bar uses. It used to be a floating card carrying
 * a title, two labelled rows and a full-width retry: ~244px against the grade
 * bar's 60, in a bottom slot that sizes itself. Every voice miss therefore took
 * ~184px away from the card above and jerked the Arabic upward at the exact
 * moment the learner started reading the result. Now both states of the band
 * are the same shape, and the card never moves.
 */
import { memo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ReviewChoiceRow } from '@/components/review/ReviewChoiceRow';
import { ThemedText } from '@/components/primitives/ThemedText';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { VoiceResult } from '@/hooks/review/useVoiceReview';
import { selectionFeedback } from '@/utils/haptics';

interface VoiceResultPanelProps {
  result: VoiceResult;
  /** The spoken answer was right → mark Known. */
  onAccept: () => void;
  /** The learner didn't know it → mark Unknown. */
  onReject: () => void;
  /** Re-open the mic for another attempt on the same card. */
  onRetry: () => void;
}

export const VoiceResultPanel: FC<VoiceResultPanelProps> = memo(
  ({ result, onAccept, onReject, onRetry }) => {
    const heardSomething = result.heard.length > 0;

    return (
      <Animated.View entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)} style={styles.panel}>
        {/* What was HEARD, and only that. The answer used to sit beside it as a
            second caption, which put the one word the learner had just failed
            to recall in the smallest type in the app, in the action band, away
            from the Arabic it belongs to. It is on the card now, under the word,
            at the same size the answer face gives it.

            The transcript stays here because it is evidence about the
            recognizer rather than about the language: it is what makes the
            override an informed choice instead of a guess, and a miss must
            never be graded without showing it. */}
        <View style={styles.detailRow}>
          <ThemedText
            type="caption"
            colorName={heardSomething ? 'text' : 'textTertiary'}
            numberOfLines={1}
            style={styles.heard}
          >
            {heardSomething
              ? STRINGS.VOICE_RESULT_HEARD_TEMPLATE(result.heard)
              : STRINGS.VOICE_RESULT_NOT_HEARD}
          </ThemedText>
        </View>

        <ReviewChoiceRow
          choices={[
            {
              label: STRINGS.VOICE_RESULT_REJECT_SHORT,
              accessibilityLabel: STRINGS.VOICE_RESULT_REJECT,
              onPress: () => {
                // Agreeing with the verdict already on the card. The card went red
                // the moment the mishear landed and fired its error haptic then,
                // and the grade this commits is the same outcome — so the verdict
                // layer suppresses a replay and this tap would otherwise land in
                // silence. A quiet tick acknowledges the press without restating
                // a conclusion the learner has already felt.
                selectionFeedback();
                onReject();
              },
            },
            {
              label: STRINGS.VOICE_RESULT_RETRY,
              onPress: () => {
                // Grades nothing, so no verdict is coming and this tap would
                // otherwise land in silence.
                selectionFeedback();
                onRetry();
              },
            },
            {
              label: STRINGS.VOICE_RESULT_ACCEPT_SHORT,
              accessibilityLabel: STRINGS.VOICE_RESULT_ACCEPT,
              // No tick here. This overturns the red already on the card, and the
              // green verdict that replaces it fires its own haptic on the frame
              // the colour lands — a press tick as well would buzz the reversal
              // twice, the earlier of the two saying nothing about which way it
              // went.
              onPress: onAccept,
            },
          ]}
        />
      </Animated.View>
    );
  },
);

VoiceResultPanel.displayName = 'VoiceResultPanel';

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    gap: LAYOUT.SPACING.SMALL,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LAYOUT.SPACING.TINY,
    height: LAYOUT.SPACING.XLARGE,
  },
  heard: {
    flexShrink: 1,
  },
});
