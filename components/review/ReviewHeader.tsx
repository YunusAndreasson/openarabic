import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { PROGRESS_BAR_ANIMATION_DURATION, REVIEW_MIN_PROGRESS_VALUE } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

// ===== STATIC CONSTANTS EXTRACTION (CRITICAL FOR PERFORMANCE) =====
const REVIEW_HEADER_CONSTANTS = {
  MIN_PROGRESS_VALUE: REVIEW_MIN_PROGRESS_VALUE,
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
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  closeButton: {
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2, // Circular
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: MIN_TOUCH_TARGET.MEDIUM,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
  },
});

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose?: () => void;
}

// ===== HELPER FUNCTIONS EXTRACTED (PURE FUNCTIONS OUTSIDE COMPONENT) =====
const calculateDisplayProgress = (progress: number, maxProgress: number): number =>
  Math.max(progress, maxProgress);

const shouldTriggerAnimation = (animationKey: number): boolean =>
  animationKey > REVIEW_HEADER_CONSTANTS.MIN_PROGRESS_VALUE;

// ===== COMPONENT WITH ADVANCED OPTIMIZATION =====
const ReviewHeaderInternal: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  animationKey,
  onClose,
}) => {
  const colors = useColors();

  // ===== MEMOIZED VALUES (PREVENT EXPENSIVE RECALCULATIONS) =====
  const displayProgress = useMemo(
    () => calculateDisplayProgress(progress, maxProgress),
    [progress, maxProgress]
  );

  const animationTriggered = useMemo(() => shouldTriggerAnimation(animationKey), [animationKey]);

  // Handle close with haptic feedback
  const handleClose = useCallback(() => {
    if (onClose) {
      selectionFeedback();
      onClose();
    }
  }, [onClose]);

  // ===== MEMOIZED CHILD PROPS (PREVENT CHILD RE-RENDERS) =====
  const progressBarProps = useMemo(
    () => ({
      animationDuration: PROGRESS_BAR_ANIMATION_DURATION,
      animationTriggered,
      progress: displayProgress,
    }),
    [animationTriggered, displayProgress]
  );

  const closeButtonStyle = useMemo(
    () => [STATIC_STYLES.closeButton, { backgroundColor: colors.elevation1 }],
    [colors.elevation1]
  );

  return (
    <View style={STATIC_STYLES.header}>
      <View style={STATIC_STYLES.progressContainer}>
        <ProgressBar key={animationKey} {...progressBarProps} />
      </View>
      {onClose && (
        <Pressable
          style={closeButtonStyle}
          onPress={handleClose}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          accessibilityRole="button"
          accessibilityLabel="Close practice session"
        >
          <Ionicons
            name="close"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={colors.textTertiary}
          />
        </Pressable>
      )}
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
  if (prevProps.onClose !== nextProps.onClose) return false;

  return true;
};

export const ReviewHeader = memo(ReviewHeaderInternal, ReviewHeaderComparison);

ReviewHeader.displayName = 'ReviewHeader';

export default ReviewHeader;
