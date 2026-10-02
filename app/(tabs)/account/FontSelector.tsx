import { ScreenScaffold } from '@/components/common';

import { ArabicFontSelector } from '@/components/account';

// Not scrollable: ArabicFontSelector owns its own ScrollView.
const FontSelectorScreen = () => (
  <ScreenScaffold padded={false} scrollable={false}>
    <ArabicFontSelector />
  </ScreenScaffold>
);

export default FontSelectorScreen;
