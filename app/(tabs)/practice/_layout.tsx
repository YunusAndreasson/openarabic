import { Stack } from 'expo-router';
import type { JSX } from 'react';

import DoneButton from '@/components/ui/DoneButton';
import EditModeButton from '@/components/ui/EditModeButton';
import { createNavigationOptions } from '@/constants/modal';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useEditMode } from '@/hooks/ui/useEditMode';

export default function VocabularyLayout(): JSX.Element {
  const colors = useColors();
  const { editMode } = useEditMode('dictionary');

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="dictionary"
        options={createNavigationOptions(colors, {
          title: STRINGS.DICTIONARY,
          // Only show DoneButton when NOT in edit mode to avoid duplicate "Done" buttons
          headerLeft: editMode ? undefined : () => <DoneButton />,
          headerRight: () => <EditModeButton type="dictionary" />,
        })}
      />
    </Stack>
  );
}
