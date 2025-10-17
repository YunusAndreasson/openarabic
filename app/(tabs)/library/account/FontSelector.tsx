import type { FC } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { ArabicFontSelector } from '@/components/account/ArabicFontSelector';
import { LAYOUT } from '@/constants/layout';

const FontSelectorScreen: FC = () => {
  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={true}
        scrollable={false}
        style={styles.content}
        useSafeArea={false}
      >
        <ArabicFontSelector />
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

export default FontSelectorScreen;
