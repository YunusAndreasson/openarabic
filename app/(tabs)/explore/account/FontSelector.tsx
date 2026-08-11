import { ScreenScaffold } from '@/components/common';
import type { FC } from 'react';

import { ArabicFontSelector } from '@/components/account';

// Not scrollable: ArabicFontSelector owns its own ScrollView.
const FontSelectorScreen: FC = () => (
  <ScreenScaffold padded={false} scrollable={false}>
    <ArabicFontSelector />
  </ScreenScaffold>
);

export default FontSelectorScreen;
