import { ProgressBar } from '@common/ProgressBar';
import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
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
    marginBottom: LAYOUT.SPACING.TINY, // Bottom margin only for spacing
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

export const ReviewHeader: FC<ReviewHeaderProps> = ({ progress, maxProgress, onClose }) => {
  const colors = useColors();

  const displayProgress = Math.max(progress, maxProgress);

  // Handle close with haptic feedback
  const handleClose = () => {
    if (onClose) {
      selectionFeedback();
      onClose();
    }
  };

  const closeButtonStyle = [STATIC_STYLES.closeButton, { backgroundColor: colors.elevation1 }];

  return (
    <View style={STATIC_STYLES.header}>
      <View style={STATIC_STYLES.progressContainer}>
        <ProgressBar
          animationDuration={TIMING_CONFIG.PROGRESS.duration}
          progress={displayProgress}
          height={LAYOUT.SPACING.MEDIUM}
        />
      </View>
      {onClose && (
        <Pressable style={closeButtonStyle} onPress={handleClose} hitSlop={LAYOUT.HIT_SLOP.MEDIUM}>
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

ReviewHeader.displayName = 'ReviewHeader';
