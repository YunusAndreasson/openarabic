import type { FC } from 'react';

import { ThemedView } from '@/components/ThemedView';
import ArabicFontSelector from '@/components/settings/ArabicFontSelector';
import { LAYOUT } from '@/constants/layout';

const FontSelectorScreen: FC = () => {
  return (
    <ThemedView includeBottomInset={false} safeAreaEdges={['left', 'right']} style={{ flex: 1 }}>
      <ThemedView
        includeBottomInset={true}
        scrollable={false}
        style={{ flex: 1, paddingTop: LAYOUT.SPACING.MEDIUM }}
        useSafeArea={false}
      >
        <ArabicFontSelector />
      </ThemedView>
    </ThemedView>
  );
};

export default FontSelectorScreen;
