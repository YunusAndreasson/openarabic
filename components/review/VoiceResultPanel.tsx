/**
 * Post-grade voice result, shown when the recognizer couldn't confirm a match —
 * a correct answer just proceeds. Framed as a neutral self-grade rather than a
 * verdict, so the learner judges their own answer against the shown meaning
 * instead of ratifying the ASR — this also recovers gracefully from a mishear.
 *
 * The same three-up row the self-grade bar uses, and nothing else. The evidence
 * the choice rests on — the answer, and what the recognizer heard — is on the
 * card above, under the Arabic (`discloseAnswer` / `discloseCaption` on
 * `ReviewFlipCard`).
 *
 * It used to be a floating card carrying a title, two labelled rows and a
 * full-width retry: ~244px against the grade bar's 60, in a bottom slot that
 * sizes itself, so every voice miss jerked the Arabic upward. Then a row with
 * one "heard" line above it, which kept the card still but made the band
 * reserve that line in every state. Now every state of the band is the button
 * row alone, and the card never moves.
 */
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ReviewChoiceRow } from '@/components/review/ReviewChoiceRow';
import { TIMING_CONFIG } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';
import { selectionFeedback } from '@/utils/haptics';

interface VoiceResultPanelProps {
  /** The spoken answer was right → mark Known. */
  onAccept: () => void;
  /** The learner didn't know it → mark Unknown. */
  onReject: () => void;
  /** Re-open the mic for another attempt on the same card. */
  onRetry: () => void;
  /**
   * The card is already marked wrong — the recognizer heard a different word —
   * so "Missed it" commits an outcome the learner has already felt, and the
   * verdict layer will not replay it. False after a hearing failure, where
   * nothing has been marked and "Missed it" plays its own verdict.
   */
  missMarked: boolean;
}

/**
 * Fail on the left, pass on the right — the grade bar's order — with "Try
 * again" between them in a neutral ink. It used to lead the row in amber, which
 * put a non-grade in "Forgot"'s slot wearing "Barely"'s colour, and moved the
 * red miss into the middle where the grade bar keeps a pass.
 */
export const VoiceResultPanel = memo(
  ({ onAccept, onReject, onRetry, missMarked }: VoiceResultPanelProps) => {
    return (
      <Animated.View entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)} style={styles.panel}>
        <ReviewChoiceRow
          choices={[
            {
              tone: 'negative',
              label: STRINGS.VOICE_RESULT_REJECT_SHORT,
              accessibilityLabel: STRINGS.VOICE_RESULT_REJECT,
              onPress: () => {
                // One decision, one haptic. When the card is already red the
                // verdict layer suppresses a replay, so this tap would land in
                // silence: a quiet tick acknowledges it without restating a
                // conclusion the learner has already felt. When nothing was
                // marked, the verdict this commits supplies the haptic itself.
                if (missMarked) selectionFeedback();
                onReject();
              },
            },
            {
              tone: 'neutral',
              label: STRINGS.VOICE_RESULT_RETRY,
              onPress: () => {
                // Grades nothing, so no verdict is coming and this tap would
                // otherwise land in silence.
                selectionFeedback();
                onRetry();
              },
            },
            {
              tone: 'positive',
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
  },
});
