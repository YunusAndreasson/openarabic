import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LAYOUT } from '@/constants/layout';
import { ProgressBar } from '@/components/ProgressBar';
import CloseButton from '@/components/CloseButton';

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
  return (
    <View style={styles.header}>
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={Math.max(Math.round(progress), maxProgress)}
          animationTriggered={animationKey > 1}
          key={animationKey}
          animationDuration={500}
        />
      </View>
      <CloseButton onPress={onClose} />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    height: 44,
    zIndex: 999,
  } as ViewStyle,
  progressContainer: {
    flex: 1,
    marginVertical: LAYOUT.SPACING.MEDIUM,
    marginRight: LAYOUT.SPACING.SMALL,
  } as ViewStyle,
});

export default ReviewHeader;
