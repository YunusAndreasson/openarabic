import { ProgressBar } from '@/components/common/ProgressBar';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeaderIconButton } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

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

    return (
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          <ProgressBar key={animationKey} progress={Math.max(progress, maxProgress)} />
        </View>

        {/* Close button */}
        {onClose && (
          <HeaderIconButton
            iconName="close"
            onPress={onClose}
            size="medium"
            iconColor={colors.textTertiary}
          />
        )}

        {/* Word Management Icon */}
        {hasCurrentWord && onManageWord && (
          <HeaderIconButton
            iconName="ellipsis-horizontal"
            onPress={onManageWord}
            size="small"
            iconColor={colors.secondaryText}
            hitSlop="small"
            testID="manage-word-button"
          />
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
    zIndex: LAYOUT.Z_INDEX.HEADER,
  },
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
});
