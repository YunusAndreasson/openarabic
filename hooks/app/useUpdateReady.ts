import { useUpdates } from 'expo-updates';
import { useEffect, useRef } from 'react';

import { useToast } from '@/components/providers/ToastProvider';
import { STRINGS } from '@/constants/strings';

/**
 * Says so, once, when an over-the-air update has finished downloading.
 *
 * `app.json` sets no `fallbackToCacheTimeout`, so it defaults to 0: the app never
 * waits for an update at launch. Every release therefore lands the same way —
 * the cached bundle starts, the new one downloads behind it, and it is the
 * launch AFTER this one that runs the new code. Until now nothing anywhere said
 * that had happened, so the only route to a fix was to guess that reopening the
 * app twice might help.
 *
 * `isUpdatePending`, not `isUpdateAvailable`: pending means the bundle is
 * already on the device and will be used on the next launch. Available only
 * means the server has one.
 *
 * It does not offer to restart, and does not restart on its own. `Toast` is
 * `pointerEvents="none"` by design, so it can carry no action; and a reload is a
 * cold start, which would drop a review session mid-sitting — review state is
 * not in the redux-persist whitelist, so nothing would bring it back.
 *
 * Fires once per app run: `isUpdatePending` stays true once set, and a toast on
 * every re-render of it would be nagging. Silent in development and in Expo Go,
 * where nothing is ever pending.
 */
export function useUpdateReady(): void {
  const { isUpdatePending } = useUpdates();
  const { showToast } = useToast();
  const announcedRef = useRef(false);

  useEffect(() => {
    if (!isUpdatePending || announcedRef.current) return;
    announcedRef.current = true;
    showToast(STRINGS.UPDATE_DOWNLOADED);
  }, [isUpdatePending, showToast]);
}
