import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose?: () => void;
}

const ReviewHeader: React.FC<ReviewHeaderProps> = ({
  progress,
  maxProgress,
  animationKey,
  onClose: _onClose,
}) => {
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
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
});

export default ReviewHeader;
