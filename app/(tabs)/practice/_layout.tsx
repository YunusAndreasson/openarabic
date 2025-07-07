import { Stack } from 'expo-router';
import type { JSX } from 'react';

import DoneButton from '@/components/ui/DoneButton';
import EditModeButton from '@/components/ui/EditModeButton';
import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';

export default function VocabularyLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="dictionary"
        options={createNavigationOptions(colors, {
          title: 'Dictionary',
          headerLeft: () => <DoneButton />,
          headerRight: () => <EditModeButton type="dictionary" />,
        })}
      />
    </Stack>
  );
}
