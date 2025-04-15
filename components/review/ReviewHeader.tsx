import React from 'react';
import type { ViewStyle } from 'react-native';
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
      <CloseButton onPress={onClose} size="large" iconSize={24} color={colors.tabIconDefault} />
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
