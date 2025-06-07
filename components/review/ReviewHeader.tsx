import React from 'react';
import { View, StyleSheet } from 'react-native';

import { CloseButton } from '@/components/CloseButton';
import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

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
          key={animationKey}
          animationDuration={500}
          animationTriggered={animationKey > 1}
          progress={Math.max(progress, maxProgress)}
        />
      </View>
      <CloseButton
        accessibilityHint="Ends the review session and returns to previous screen"
        accessibilityLabel="Stop review session"
        color={colors.interactiveSecondary}
        iconSize={24}
        size="large"
        onPress={onClose}
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
