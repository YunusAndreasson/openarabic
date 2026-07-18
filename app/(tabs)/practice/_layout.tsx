import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { CloseButton, DictionaryButton } from '@/components/ui';
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
    </Stack>
  );
}
