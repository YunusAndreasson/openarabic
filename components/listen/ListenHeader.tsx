import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

interface ListenHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose?: () => void;
  onManageWord?: () => void;
  hasCurrentWord?: boolean;
}

const ListenHeader: FC<ListenHeaderProps> = ({
  progress,
  maxProgress,
  animationKey,
  onClose,
  onManageWord,
  hasCurrentWord = false,
}) => {
  const colors = useColors();

  // Handle close with haptic feedback
  const handleClose = useCallback(() => {
    if (onClose) {
      selectionFeedback();
      onClose();
    }
  }, [onClose]);

  const handleManagePress = () => {
    if (onManageWord && hasCurrentWord) {
      selectionFeedback();
      onManageWord();
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.progressContainer}>
        <ProgressBar key={animationKey} progress={Math.max(progress, maxProgress)} />
      </View>

      {/* Close button */}
      {onClose && (
        <Pressable
          style={[styles.closeButton, { backgroundColor: colors.elevation1 }]}
          onPress={handleClose}
          hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
          accessibilityRole="button"
          accessibilityLabel="Close practice session"
          android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.MEDIUM / 2 }}
        >
          <Ionicons
            name="close"
            size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
            color={colors.textTertiary}
          />
        </Pressable>
      )}

      {/* Word Management Icon */}
      {hasCurrentWord && (
        <Pressable
          style={[styles.manageButton, { backgroundColor: colors.elevation1 }]}
          onPress={handleManagePress}
          hitSlop={LAYOUT.HIT_SLOP.SMALL}
          testID="manage-word-button"
          android_ripple={{ color: colors.navigationRipple, radius: MIN_TOUCH_TARGET.SMALL / 2 }}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
            color={colors.secondaryText}
          />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: LAYOUT.BUTTON.HEIGHT.LARGE,
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
    width: '100%',
    zIndex: 1,
  },
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: 0.8,
  },
  manageButton: {
    width: MIN_TOUCH_TARGET.SMALL,
    height: MIN_TOUCH_TARGET.SMALL,
    borderRadius: MIN_TOUCH_TARGET.SMALL / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: 0.8,
  },
});

export default ListenHeader;
