import { Stack, router } from 'expo-router';
import type { JSX } from 'react';

import DoneButton from '@/components/ui/DoneButton';
import EditModeButton from '@/components/ui/EditModeButton';
import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { AppTab, UiAction } from '@/types/enums';
import { createTabHeaderOptions } from '@/utils/navigation/createTabHeaderOptions';

import { DictionaryButton } from '../_layout';

export default function StudyLayout(): JSX.Element {
  const colors = useColors();
  const { editMode } = useEditMode('dictionary');

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.PRACTICE,
          rightComponent: () => <DictionaryButton hideWhenEmpty={true} />,
          colors,
        })}
      />
      <Stack.Screen
        name="dictionary"
        options={createNavigationOptions(colors, {
          title: UiAction.DICTIONARY,
          // Only show DoneButton when NOT in edit mode to avoid duplicate "Done" buttons
          headerLeft: editMode ? undefined : () => <DoneButton onPress={() => router.back()} />,
          headerRight: () => <EditModeButton type="dictionary" />,
        })}
      />
      <Stack.Screen
        name="review"
        options={{
          headerShown: false,
          presentation: 'modal',
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}
