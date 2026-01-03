import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { EditModeButton } from '@/components/ui/EditModeButton';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab } from '@/types/enums';
import { createTabHeaderOptions } from '@/utils/navigation';

export default function BookmarksLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createTabHeaderOptions({
          title: AppTab.PLAYLIST,
          rightComponent: () => <EditModeButton type="playlist" />,
          colors,
        })}
      />
    </Stack>
  );
}
