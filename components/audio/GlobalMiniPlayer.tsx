import { router, usePathname } from 'expo-router';
import { memo } from 'react';

import { ARTICLE_ROUTE_PREFIX, SHEET_ROUTE_PATHS } from '@/constants/routes';
import type { ArticleId } from '@/types/branded.types';
import { getArticleRoute } from '@/utils/routeBuilders';
import { useAudioProgress, useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';

import { MiniPlayer } from './MiniPlayer';
import type { MiniPlayerPlacement } from './MiniPlayer';

export interface GlobalMiniPlayerProps {
  /**
   * `root` — the app-wide overlay mounted next to the navigator in `app/_layout`.
   * `screen` — mounted by a screen that is presented as a native modal.
   */
  readonly placement?: MiniPlayerPlacement;
}

export const GlobalMiniPlayer = memo(function GlobalMiniPlayer({
  placement = 'root',
}: GlobalMiniPlayerProps) {
  const globalAudioState = useGlobalAudioState();
  const { position, duration } = useAudioProgress();
  const shouldShow = useShouldShowMiniPlayer();
  const pathname = usePathname();

  // The article reader is `presentation: 'modal'`, so on iOS it is a separate
  // view controller presented *above* the whole React root view. No zIndex can
  // lift the root overlay over it, and the glass surface would sample the
  // covered tab screen rather than what the user is looking at. The article
  // screen therefore mounts its own `placement="screen"` instance, and the root
  // one stands down so the two never overlap mid-dismiss.
  const hostedByArticleScreen = placement === 'root' && pathname.startsWith(ARTICLE_ROUTE_PREFIX);

  // The root-level `formSheet` routes (SHEET_ROUTES). Unlike the article
  // reader's full `modal`, a formSheet does NOT get its own isolated view
  // controller/window on Android, so the root overlay's zIndex still wins and
  // draws on top of the sheet instead of behind it — e.g. the sleep timer's
  // "Set timer" button sits right where the root card renders and becomes
  // unreadable and hard to tap. All of these are reachable from a screen the
  // root instance already covers (the mini player itself, or a Practice stat
  // card), so there is nothing lost by standing the root instance down while
  // one is open.
  const hostedByFormSheet = placement === 'root' && SHEET_ROUTE_PATHS.has(pathname);

  if (
    hostedByArticleScreen ||
    hostedByFormSheet ||
    !shouldShow ||
    !globalAudioState.currentArticle
  ) {
    return null;
  }

  const article = globalAudioState.currentArticle;
  // On the playing article's own reader the body has nowhere to go. Any other
  // screen — another article's reader included — opens it.
  const isOnArticleReader = pathname === `${ARTICLE_ROUTE_PREFIX}${article.id}`;
  const handleOpenArticle = () => {
    router.push(getArticleRoute(article.id as ArticleId));
  };

  return (
    <MiniPlayer
      placement={placement}
      article={article}
      isTimerActive={globalAudioState.isTimerActive}
      position={position}
      duration={duration}
      queuePosition={globalAudioState.queuePosition}
      isPlaying={globalAudioState.playing || globalAudioState.isLoading}
      onTogglePause={globalAudioState.onTogglePause}
      onStop={globalAudioState.onStop}
      onTimerPress={globalAudioState.onTimerPress}
      onOpenArticle={isOnArticleReader ? undefined : handleOpenArticle}
    />
  );
});

GlobalMiniPlayer.displayName = 'GlobalMiniPlayer';
