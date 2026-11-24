import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { widgetBridge } from '@/services/widgets/native';
import {
  observePlacement,
  observeWidgetOffers,
  widgetOfferState,
  widgetOfferVisible,
  type WidgetSurface,
} from '@/services/widgets/placement';

export function useWidgetOffer(surface: WidgetSurface, eligible = true) {
  const focused = useIsFocused();
  const [value, setValue] = useState({ show: false, placed: false, widgetChosen: false });
  useEffect(() => {
    let live = true;
    async function read() {
      const session = currentReminderSession();
      if (!widgetBridge || !focused || !eligible || AppState.currentState !== 'active') {
        if (live) setValue({ show: false, placed: false, widgetChosen: false });
        return;
      }
      const next = await widgetOfferState(surface, session);
      if (!live) return;
      setValue(next);
      if (next.show && session && surface !== 'guest_settings')
        void widgetOfferVisible(surface, session).catch(() => undefined);
    }
    const refresh = () => {
      void read().catch(() => undefined);
    };
    if (surface !== 'receipt' && focused && eligible && AppState.currentState === 'active')
      void observePlacement(currentReminderSession()).catch(() => undefined);
    refresh();
    const stop = observeWidgetOffers(refresh);
    const sub = AppState.addEventListener('change', refresh);
    return () => {
      live = false;
      stop();
      sub.remove();
    };
  }, [surface, focused, eligible]);
  return value;
}
