import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { DictionaryButton } from '@/components/practice/DictionaryButton';
import { CloseButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';
import { AppTab } from '@/types/enums';

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
          title: STRINGS.ALL_WORDS,
          headerRight: () => <CloseButton />,
        })}
      />
      {/* Word detail lives in THIS stack, not the root one. `dictionary` is
          presented as a modal (createNavigationOptions defaults to modal), and
          a root-level formSheet pushed from inside a modal presents behind it —
          the word screen opened to nothing. Same rule the account layout
          documents: sub-screens of a modal push as regular pages inside it
          rather than stacking modal-on-modal. */}
      {/* Explicit CloseButton rather than relying on the platform back chevron.
          On device this screen rendered with no visible way out at all — just
          the title — so the learner had to know the system back gesture. An X
          we render ourselves cannot be suppressed by header configuration, and
          it matches `dictionary` directly above it: the same affordance in the
          same corner throughout this flow. `headerBackVisible: false` keeps it
          to one exit if the platform does supply a chevron here; both do
          router.back() anyway, so they would only look like a choice. */}
      <Stack.Screen
        name="word"
        options={createNavigationOptions(colors, {
          title: STRINGS.WORD_DETAIL_TITLE,
          isRegularScreen: true,
          headerBackVisible: false,
          headerRight: () => <CloseButton />,
        })}
      />
    </Stack>
  );
}
