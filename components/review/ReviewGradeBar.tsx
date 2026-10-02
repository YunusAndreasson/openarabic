import { useEffect, useState } from 'react';
import { TIMING_CONFIG } from '@/constants/animation';
import { ReviewChoiceRow } from '@/components/review/ReviewChoiceRow';
import { STRINGS } from '@/constants/strings';
import type { IntervalLabels, WordConfidence } from '@/types/review.types';

const GRADE_LABELS: Record<WordConfidence, string> = {
  unknown: STRINGS.GRADE_FORGOT,
  vague: STRINGS.GRADE_GUESSED,
  known: STRINGS.GRADE_KNEW_IT,
};

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
    label: GRADE_LABELS[confidence],
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
