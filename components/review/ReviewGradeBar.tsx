import { useEffect, useState } from 'react';
import { TIMING_CONFIG } from '@/constants/animation';
import { ReviewChoiceRow, type ReviewChoiceTone } from '@/components/review/ReviewChoiceRow';
import { STRINGS } from '@/constants/strings';
import type { IntervalLabels, WordConfidence } from '@/types/review.types';

/**
 * How each grade is drawn: its label, and the tone ReviewChoiceRow turns into
 * red, amber or green. The review tutorial's grades step reads this too, so it
 * cannot drift from the bar it explains — it used to re-declare all three.
 */
export const GRADE_PRESENTATION = {
  unknown: { label: STRINGS.GRADE_FORGOT, tone: 'negative' },
  vague: { label: STRINGS.GRADE_GUESSED, tone: 'intermediate' },
  known: { label: STRINGS.GRADE_KNEW_IT, tone: 'positive' },
} as const satisfies Record<WordConfidence, { label: string; tone: ReviewChoiceTone }>;

interface ReviewGradeBarProps {
  /** Interval hint per grade ("10m"/"4d"), from useReview.intervalLabels.
   *  `null` while no card is current — every grade has a label or none do. */
  intervals?: IntervalLabels | null;
  onGrade: (confidence: WordConfidence) => void;
  disabled?: boolean;
}

/**
 * Ternary self-grade row, shown only AFTER the card's answer is revealed:
 * Forgot / Guessed / Knew it, each with the interval it buys. Reads as one
 * family with the card (faint tinted surface, rating-colour label), and shares
 * its button with the voice-miss row so the two states of the bottom band are
 * the same shape.
 */
export const ReviewGradeBar = ({ intervals, onGrade, disabled = false }: ReviewGradeBarProps) => {
  // The incoming buttons occupy the reveal button's touch area before their
  // entering animation is visible. Ignore the second tap of a double reveal.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), TIMING_CONFIG.FLIP.duration);
    return () => clearTimeout(timer);
  }, []);
  const blocked = disabled || !settled;
  const choice = (confidence: WordConfidence) => ({
    testID: `review-grade-${confidence}`,
    tone: GRADE_PRESENTATION[confidence].tone,
    label: GRADE_PRESENTATION[confidence].label,
    sublabel: intervals?.[confidence],
    disabled: blocked,
    onPress: () => {
      // The card's verdict supplies the haptic only when grading is accepted.
      if (!blocked) onGrade(confidence);
    },
  });

  return <ReviewChoiceRow choices={[choice('unknown'), choice('vague'), choice('known')]} />;
};

ReviewGradeBar.displayName = 'ReviewGradeBar';
