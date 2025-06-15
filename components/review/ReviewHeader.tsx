import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { selectionFeedback } from '@/utils/haptics';

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onManageWord?: () => void;
  hasCurrentWord?: boolean;
}

const ReviewHeader: FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  animationKey,
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
          style={[styles.manageButton, { backgroundColor: colors.card }]}
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

export default ReviewHeader;
