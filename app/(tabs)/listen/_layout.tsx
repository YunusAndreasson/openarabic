import { Stack } from 'expo-router';
import type { JSX } from 'react';

import EditModeButton from '@/components/ui/EditModeButton';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab } from '@/types/enums';
import { createTabHeaderOptions } from '@/utils/navigation/createTabHeaderOptions';

export default function ListenLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.LISTEN,
          rightComponent: () => <EditModeButton type="listen" hideWhenEmpty={true} />,
          colors,
        })}
      />
    </Stack>
  );
}
