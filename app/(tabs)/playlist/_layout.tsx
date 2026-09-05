import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { EditModeButton } from '@/components/playlist/EditModeButton';
import { PlayAllButton } from '@/components/playlist/PlayAllButton';
import { AppTab } from '@/types/enums';
import { createTabHeaderOptions } from '@/utils/navigation';

const renderEditModeButton = () => <EditModeButton type="playlist" />;
const renderPlayAllButton = () => <PlayAllButton />;

export default function BookmarksLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        // Leading: the tab's own tool (reorder / remove). Trailing: the one
        // action the tab exists for, in words rather than a glyph.
        options={createTabHeaderOptions({
          title: AppTab.PLAYLIST,
          leftComponent: renderEditModeButton,
          rightComponent: renderPlayAllButton,
        })}
      />
    </Stack>
  );
}
