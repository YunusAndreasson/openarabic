import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { CloseButton, DictionaryButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';
import { AppTab, UiAction } from '@/types/enums';

export default function StudyLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.PRACTICE,
          rightComponent: () => <DictionaryButton />,
          colors,
        })}
      />
      <Stack.Screen
        name="dictionary"
        options={createNavigationOptions(colors, {
          title: UiAction.ALL_WORDS,
          headerRight: () => <CloseButton />,
        })}
      />
      {/* Word detail lives in THIS stack, not the root one. `dictionary` is
          presented as a modal (createNavigationOptions defaults to modal), and
          a root-level formSheet pushed from inside a modal presents behind it —
          the word screen opened to nothing. Same rule the account layout
          documents: sub-screens of a modal push as regular pages inside it
          rather than stacking modal-on-modal. */}
      <Stack.Screen
        name="word"
        options={createNavigationOptions(colors, {
          title: STRINGS.WORD_DETAIL_TITLE,
          isRegularScreen: true,
        })}
      />
    </Stack>
  );
}
