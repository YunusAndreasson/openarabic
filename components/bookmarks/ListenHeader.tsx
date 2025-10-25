import { ProgressBar } from '@common/ProgressBar';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';
import { createAndroidRipple } from '@/utils/layoutUtils';

interface ListenHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose?: () => void;
  onManageWord?: () => void;
  hasCurrentWord?: boolean;
}

export const ListenHeader = memo<ListenHeaderProps>(
  ({ progress, maxProgress, animationKey, onClose, onManageWord, hasCurrentWord = false }) => {
    const colors = useColors();

    // Memoize dynamic styles for better performance
    const closeButtonStyle = useMemo(
      () => [styles.closeButton, { backgroundColor: colors.elevation1 }],
      [colors.elevation1],
    );

    const manageButtonStyle = useMemo(
      () => [styles.manageButton, { backgroundColor: colors.elevation1 }],
      [colors.elevation1],
    );

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
            style={closeButtonStyle}
            onPress={handleClose}
            hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
            android_ripple={createAndroidRipple(colors)}
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
            style={manageButtonStyle}
            onPress={handleManagePress}
            hitSlop={LAYOUT.HIT_SLOP.SMALL}
            testID="manage-word-button"
            android_ripple={createAndroidRipple(colors, 'small')}
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
  },
);

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
    opacity: LAYOUT.OPACITY.HOVER,
  },
  manageButton: {
    width: MIN_TOUCH_TARGET.MEDIUM,
    height: MIN_TOUCH_TARGET.MEDIUM,
    borderRadius: MIN_TOUCH_TARGET.MEDIUM / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.HOVER,
  },
});
