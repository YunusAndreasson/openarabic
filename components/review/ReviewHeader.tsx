import type { FC } from 'react';
import { View, StyleSheet } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { PROGRESS_BAR_ANIMATION_DURATION } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';

interface ReviewHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
}

const ReviewHeader: FC<ReviewHeaderProps> = ({ progress, maxProgress, animationKey }) => {
  return (
    <View style={styles.header}>
      <View style={styles.progressContainer}>
        <ProgressBar
          key={animationKey}
          animationDuration={PROGRESS_BAR_ANIMATION_DURATION}
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
});

export default ReviewHeader;
