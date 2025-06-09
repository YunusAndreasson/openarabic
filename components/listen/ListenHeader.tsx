import React from 'react';
import { View, StyleSheet } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { LAYOUT } from '@/constants/layout';

interface ListenHeaderProps {
  progress: number;
  maxProgress: number;
  animationKey: number;
}

const ListenHeader: React.FC<ListenHeaderProps> = ({ progress, maxProgress, animationKey }) => {
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
    height: 48,
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
});

export default ListenHeader;
