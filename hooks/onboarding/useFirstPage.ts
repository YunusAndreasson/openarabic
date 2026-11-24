import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { ROUTE_PATHS } from '@/constants/routes';
import { analytics } from '@/services/analytics';
import {
  browseTexts,
  firstLineSeen,
  hideReaderTip,
  pageShown,
  saveReaderOffset,
} from '@/store/firstPageSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

const subscribe = (change: () => void) => {
  const subscription = AppState.addEventListener('change', change);
  return () => subscription.remove();
};
const isActive = () => AppState.currentState === 'active';

export function useFirstPage(covered: boolean) {
  const dispatch = useAppDispatch();
  const page = useAppSelector(state => state.firstPage);
  const focused = useIsFocused();
  const foreground = useSyncExternalStore(subscribe, isActive);
  const [initialOffset] = useState(page.offset);
  const lastPosition = useRef(initialOffset);
  const [height, setHeight] = useState(0);
  const [offset, setOffset] = useState(initialOffset);
  const [pairTop, setPairTop] = useState<number | undefined>();
  const [arabicTop, setArabicTop] = useState<number | undefined>();
  const viewed = useRef(false);
  const shown = useRef(page.shown);
  const lineSeen = useRef(page.firstLineSeen);
  const visible = focused && foreground && !covered && height > 0;
  // Require both sides of the bilingual pair in the viewport. At large type,
  // the boundary between them can enter view only after a deliberate scroll.
  const boundary =
    pairTop !== undefined && arabicTop !== undefined ? pairTop + arabicTop : undefined;
  useEffect(() => {
    if (!visible) return;
    if (!shown.current) {
      shown.current = true;
      dispatch(pageShown());
      if (!page.returningInstall)
        void analytics.track(ANALYTICS_EVENTS.FIRST_RUN_SHOWN, { version: page.version });
    }
    if (boundary === undefined || boundary <= offset || boundary >= offset + height) return;
    if (!viewed.current) {
      viewed.current = true;
      void analytics.track(ANALYTICS_EVENTS.ARTICLE_VIEWED, {
        source: page.browsed || page.returningInstall ? 'continue' : 'first_run_reader',
      });
    }
    if (!lineSeen.current) {
      lineSeen.current = true;
      dispatch(firstLineSeen());
      if (!page.returningInstall)
        void analytics.track(ANALYTICS_EVENTS.FIRST_LINE_VISIBLE, { version: page.version });
    }
  }, [
    visible,
    boundary,
    offset,
    height,
    dispatch,
    page.version,
    page.browsed,
    page.returningInstall,
  ]);

  // Persist on a settled scroll and on losing the foreground, including an interrupted drag.
  useEffect(() => {
    if (!focused || !foreground) dispatch(saveReaderOffset(lastPosition.current));
    return () => {
      dispatch(saveReaderOffset(lastPosition.current));
    };
  }, [dispatch, focused, foreground]);
  function commitPosition() {
    dispatch(saveReaderOffset(lastPosition.current));
  }
  function exit(method: 'browse' | 'back') {
    if (!page.browsed && !page.returningInstall)
      void analytics.track(ANALYTICS_EVENTS.FIRST_RUN_SKIPPED, { step: 'reader', method });
    dispatch(browseTexts());
    router.dismissTo(ROUTE_PATHS.EXPLORE_TAB);
  }
  function hideTip() {
    dispatch(hideReaderTip());
    void analytics.track(ANALYTICS_EVENTS.READER_TIP_DISMISSED, { step: 'reader' });
  }
  function scroll(y: number) {
    const position = Math.max(0, y);
    lastPosition.current = position;
    if (!viewed.current) setOffset(position);
  }
  return {
    focused,
    initialOffset,
    setHeight,
    setPairTop,
    setArabicTop,
    scroll,
    commitPosition,
    exit,
    hideTip,
    tipHidden: page.tipHidden,
  };
}
