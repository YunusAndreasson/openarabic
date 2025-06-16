import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';
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
  onClose: _onClose,
  onManageWord,
  hasCurrentWord = false,
}) => {
  const colors = useColors();

  const handleManagePress = () => {
    if (onManageWord && hasCurrentWord) {
      selectionFeedback();
      onManageWord();
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.progressContainer}>
        <ProgressBar
          key={animationKey}
          animationDuration={500}
          animationTriggered={animationKey > 1}
          progress={Math.max(progress, maxProgress)}
        />
      </View>

      {/* Word Management Icon */}
      {hasCurrentWord && (
        <TouchableOpacity
          style={[styles.manageButton, { backgroundColor: colors.elevation1 }]}
          onPress={handleManagePress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID="manage-word-button"
        >
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.secondaryText} />
        </TouchableOpacity>
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
  manageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: LAYOUT.SPACING.SMALL,
    opacity: 0.8,
  },
});

export default ListenHeader;
