import type { FC } from 'react';
import { StyleSheet } from 'react-native';

import { FeedbackForm } from '@/components/account';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';

const FeedbackScreen: FC = () => {
  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={true}
        scrollable={true}
        style={styles.content}
        useSafeArea={false}
      >
        <FeedbackForm />
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
});

export default FeedbackScreen;
