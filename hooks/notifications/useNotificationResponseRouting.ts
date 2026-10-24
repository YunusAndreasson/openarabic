import { router } from 'expo-router';
import { useEffect } from 'react';

import { observeNotificationResponses } from '@/services/notificationService';

/**
 * Open the screen a tapped notification points at — the tap that launched the
 * app, and every tap while it runs.
 *
 * `enabled` holds routing back until the navigator can take it (the root
 * layout passes `appReady`): a launch tap read any earlier would navigate a
 * stack that is not mounted yet. Mount once, at the root.
 */
export function useNotificationResponseRouting(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    return observeNotificationResponses(path => {
      router.navigate(path);
    });
  }, [enabled]);
}
