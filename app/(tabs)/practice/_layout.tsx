import { Stack, router } from 'expo-router';
import type { JSX } from 'react';

import {
  CloseButton,
  DictionaryButton,
  EditModeButton,
  PracticeHeaderButtons,
} from '@/components/ui';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { AppTab, UiAction } from '@/types/enums';

export default function StudyLayout(): JSX.Element {
  const colors = useColors();
  const { editMode } = useEditMode('dictionary');

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.PRACTICE,
          rightComponent: () => (
            <PracticeHeaderButtons DictionaryComponent={<DictionaryButton />} />
          ),
          colors,
        })}
      />
      <Stack.Screen
        name="dictionary"
        options={createNavigationOptions(colors, {
          title: UiAction.ALL_WORDS,
          // Only show CloseButton when NOT in edit mode to avoid duplicate buttons
          headerLeft: editMode ? undefined : () => <CloseButton onPress={() => router.back()} />,
          headerRight: () => <EditModeButton type="dictionary" hideWhenEmpty={false} />,
        })}
      />
      <Stack.Screen
        name="review"
        options={createNavigationOptions(colors, {
          headerShown: false,
        })}
      />
    </Stack>
  );
}
