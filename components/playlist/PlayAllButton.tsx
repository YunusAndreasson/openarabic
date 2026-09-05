import { useCallback, type JSX } from 'react';

import { HeaderTextButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth';
import { usePlaylistHeaderActions } from '@/hooks/playlist/usePlaylistHeaderActions';
import { useReadingListCount } from '@/hooks/playlist/useReadingListCount';

/**
 * The Playlist tab's `headerRight` — starts the whole queue.
 *
 * It used to be a full-width pill pinned above the tab bar, which spent a
 * thumb's worth of the screen and a Skia scrim on an action taken once per
 * session. In the header it costs two words and no list space, and it stays put
 * while the list scrolls under it.
 *
 * Deliberately NOT hidden while the mini player is up, which the pinned button
 * did (it would have overlapped the player). Nothing overlaps in the header, and
 * a primary action that disappears once you press it is a worse trade than one
 * that can be pressed twice.
 *
 * Lives here rather than in `components/ui` because it reads playlist data and
 * the audio service; a `components/ui` component should be driveable by props.
 */
export function PlayAllButton(): JSX.Element | null {
  const { user } = useAuth();
  const readingListCount = useReadingListCount(user?.id);
  const { handlePlayAll, isLoading } = usePlaylistHeaderActions();

  const handlePress = useCallback(() => {
    void handlePlayAll();
  }, [handlePlayAll]);

  // Nothing queued yet — the empty state carries its own call to action.
  if (readingListCount <= 0) {
    return null;
  }

  return <HeaderTextButton title={STRINGS.PLAY_ALL} loading={isLoading} onPress={handlePress} />;
}
