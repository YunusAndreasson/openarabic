import type { FC } from 'react';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { PROGRESS_BAR_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';

// ===== STATIC CONSTANTS EXTRACTION (CRITICAL FOR PERFORMANCE) =====
const REVIEW_HEADER_CONSTANTS = {
  MIN_PROGRESS_VALUE: 1,
} as const;

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
const STATIC_STYLES = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: LAYOUT.HEADER.NAV_HEIGHT,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    zIndex: 1,
  },
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
});

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
}

// ===== HELPER FUNCTIONS EXTRACTED (PURE FUNCTIONS OUTSIDE COMPONENT) =====
const calculateDisplayProgress = (progress: number, maxProgress: number): number =>
  Math.max(progress, maxProgress);

const shouldTriggerAnimation = (animationKey: number): boolean =>
  animationKey > REVIEW_HEADER_CONSTANTS.MIN_PROGRESS_VALUE;

// ===== COMPONENT WITH ADVANCED OPTIMIZATION =====
const ReviewHeaderInternal: FC<ReviewHeaderProps> = ({ progress, maxProgress, animationKey }) => {
  // ===== MEMOIZED VALUES (PREVENT EXPENSIVE RECALCULATIONS) =====
  const displayProgress = useMemo(
    () => calculateDisplayProgress(progress, maxProgress),
    [progress, maxProgress]
  );

  const animationTriggered = useMemo(() => shouldTriggerAnimation(animationKey), [animationKey]);

  // ===== MEMOIZED CHILD PROPS (PREVENT CHILD RE-RENDERS) =====
  const progressBarProps = useMemo(
    () => ({
      animationDuration: PROGRESS_BAR_ANIMATION_DURATION,
      animationTriggered,
      progress: displayProgress,
    }),
    [animationTriggered, displayProgress]
  );

  return (
    <View style={STATIC_STYLES.header}>
      <View style={STATIC_STYLES.progressContainer}>
        <ProgressBar key={animationKey} {...progressBarProps} />
      </View>
    </View>
  );
};

// ===== CUSTOM MEMO COMPARISON FUNCTION (PREVENTS UNNECESSARY RE-RENDERS) =====
const ReviewHeaderComparison = (
  prevProps: ReviewHeaderProps,
  nextProps: ReviewHeaderProps
): boolean => {
  // Compare primitive values first (fastest)
  if (prevProps.progress !== nextProps.progress) return false;
  if (prevProps.maxProgress !== nextProps.maxProgress) return false;
  if (prevProps.animationKey !== nextProps.animationKey) return false;

  return true;
};

export const ReviewHeader = memo(ReviewHeaderInternal, ReviewHeaderComparison);

ReviewHeader.displayName = 'ReviewHeader';

export default ReviewHeader;
