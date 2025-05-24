import React from 'react';
import { View, StyleSheet } from 'react-native';

import { CloseButton } from '@/components/CloseButton';
import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose: () => void;
}

const ReviewHeader: React.FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  animationKey,
  onClose,
}) => {
  const colors = useColors();

  return (
    <View style={styles.header}>
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={Math.max(progress, maxProgress)}
          animationTriggered={animationKey > 1}
          key={animationKey}
          animationDuration={500}
        />
      </View>
      <CloseButton
        onPress={onClose}
        size="large"
        iconSize={24}
        color={colors.interactiveSecondary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    zIndex: 1,
  },
  progressContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
});

export default ReviewHeader;
