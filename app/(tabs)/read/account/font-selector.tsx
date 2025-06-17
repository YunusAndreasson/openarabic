import type { FC } from 'react';

import { ThemedView } from '@/components/ThemedView';
import ArabicFontSelector from '@/components/settings/ArabicFontSelector';
import { LAYOUT } from '@/constants/layout';

const FLEX_ONE_STYLE = { flex: 1 } as const;
const FLEX_ONE_WITH_PADDING = { flex: 1, paddingTop: LAYOUT.SPACING.MEDIUM } as const;

const FontSelectorScreen: FC = () => {
  return (
    <ThemedView includeBottomInset={false} safeAreaEdges={['left', 'right']} style={FLEX_ONE_STYLE}>
      <ThemedView
        includeBottomInset={true}
        scrollable={false}
        style={FLEX_ONE_WITH_PADDING}
        useSafeArea={false}
      >
        <ArabicFontSelector />
      </ThemedView>
    </ThemedView>
  );
};

export default FontSelectorScreen;
