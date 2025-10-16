import { ProgressBar } from '@common/ProgressBar';
import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';


import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

// ===== STATIC STYLES USING STYLESHEET.CREATE =====
const STATIC_STYLES = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: LAYOUT.SPACING.XXLARGE, // Compact height for progress bar only (32px)
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    zIndex: 1,
  },
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.TINY, // Minimal margin for highest positioning
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
  onClose?: () => void;
}

const ReviewHeaderInternal: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  onClose,
}) => {
  const colors = useColors();

  const displayProgress = useMemo(
    () => Math.max(progress, maxProgress),
    [progress, maxProgress]
  );

  // Handle close with haptic feedback
  const handleClose = useCallback(() => {
    if (onClose) {
      selectionFeedback();
      onClose();
    }
  }, [onClose]);

  const progressBarProps = useMemo(
    () => ({
      animationDuration: TIMING_CONFIG.PROGRESS.duration,
      progress: displayProgress,
      height: LAYOUT.SPACING.MEDIUM, // Standard height (12px)
    }),
    [displayProgress]
  );

  const closeButtonStyle = useMemo(
    () => [STATIC_STYLES.closeButton, { backgroundColor: colors.elevation1 }],
    [colors.elevation1]
  );

  return (
    <View style={STATIC_STYLES.header}>
      <View style={STATIC_STYLES.progressContainer}>
        <ProgressBar {...progressBarProps} />
      </View>
      {onClose && (
        <Pressable
          style={closeButtonStyle}
          onPress={handleClose}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
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

const ReviewHeaderComparison = (
  prevProps: ReviewHeaderProps,
  nextProps: ReviewHeaderProps
): boolean => {
  // Compare primitive values first (fastest)
  if (prevProps.progress !== nextProps.progress) return false;
  if (prevProps.maxProgress !== nextProps.maxProgress) return false;
  if (prevProps.onClose !== nextProps.onClose) return false;

  return true;
};

export const ReviewHeader = memo(ReviewHeaderInternal, ReviewHeaderComparison);

ReviewHeader.displayName = 'ReviewHeader';

export default ReviewHeader;
