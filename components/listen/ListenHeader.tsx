import React from 'react';
import { View, StyleSheet } from 'react-native';

import { CloseButton } from '@/components/CloseButton';
import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface ListenHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
  onClose: () => void;
}

const ListenHeader: React.FC<ListenHeaderProps> = ({
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
        accessibilityHint="Ends the audio session and returns to previous screen"
        accessibilityLabel="Stop listening session"
        color={colors.interactiveSecondary}
        hapticFeedback={false}
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
    height: 48,
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.SMALL,
    width: '100%',
    zIndex: 1,
  },
  progressContainer: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
});

export default ListenHeader;
