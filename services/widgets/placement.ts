import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ANALYTICS_EVENTS as E } from '@/constants/analytics';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { analytics } from '@/services/analytics';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { toLocalDateString } from '@/utils/dateTimeUtils';
import { widgetBridge, type Placement } from './native';

export type WidgetSurface = 'receipt' | 'settings' | 'guest_settings';
interface RecordState {
  first: number;
  firstSession: string;
  choice?: { session: string; channel: 'widget' | 'reminder' };
  seen?: Partial<Record<WidgetSurface, string>>;
  present?: boolean;
  confirmed?: boolean;
  firstObservedAt?: number;
  guideSession?: string;
  guideAt?: number;
  guideSurface?: WidgetSurface;
}
const queue = createSerialQueue();
const key = STORAGE_KEYS.WIDGET_OFFERS;
async function read(): Promise<RecordState | undefined> {
  const value = await AsyncStorage.getItem(key);
  return value ? (JSON.parse(value) as RecordState) : undefined;
}
async function write(value: RecordState) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
  listeners.forEach(fn => fn());
}
const listeners = new Set<() => void>();
export const observeWidgetOffers = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
export function widgetFirstForeground(session: string, now = Date.now()) {
  return queue(async () => {
    const prior = await read();
    if (!prior) await write({ first: now, firstSession: session });
  });
}
export const widgetInstallTime = async () => (await read())?.first ?? Date.now();
export async function widgetOfferState(surface: WidgetSurface, session?: string) {
  const r = await read();
  const later =
    !!r &&
    r.firstSession !== session &&
    toLocalDateString(new Date()) > toLocalDateString(new Date(r.first));
  const choice = r?.choice?.session === session ? r?.choice?.channel : undefined;
  return {
    show:
      !!widgetBridge && !!r && !!session && (surface === 'receipt' ? !r.present && !choice : later),
    widgetChosen: !!session && choice === 'widget',
    placed: !!r?.present,
  };
}
export function recordWidgetChoice(
  session: string,
  channel: 'widget' | 'reminder',
  surface?: WidgetSurface,
) {
  return queue(async () => {
    const r = await read();
    if (!r) return;
    r.choice = { session, channel };
    if (channel === 'widget') {
      r.guideSession = session;
      r.guideAt = Date.now();
      r.guideSurface = surface;
    }
    await write(r);
  });
}
export function widgetOfferVisible(surface: WidgetSurface, session: string) {
  return queue(async () => {
    const r = await read();
    if (!r || r.seen?.[surface] === session) return;
    r.seen = { ...r.seen, [surface]: session };
    await write(r);
    void analytics.track(E.WIDGET_OFFER_SHOWN, {
      surface,
      platform: Platform.OS,
      foreground_session_id: session,
    });
  });
}
export async function observePlacement(session?: string): Promise<Placement | undefined> {
  if (!widgetBridge) return;
  const observation = await widgetBridge.placement().catch(() => undefined);
  if (!observation) return;
  await queue(async () => {
    const r = await read();
    if (!r) return;
    const present = observation.families.length > 0;
    const callback = observation.pinObservedAt;
    const pinConfirmed = !!callback && callback >= r.first && callback <= Date.now();
    const firstPositive = !r.confirmed && (present || pinConfirmed);
    if (firstPositive) {
      r.confirmed = true;
      const now = Date.now();
      r.firstObservedAt = callback && callback >= r.first && callback <= now ? callback : now;
      void analytics.track(E.WIDGET_ADDED_CONFIRMED, {
        platform: Platform.OS,
        families: [
          ...new Set([
            ...observation.families,
            ...(pinConfirmed ? [observation.pinFamily ?? 'home'] : []),
          ]),
        ]
          .sort()
          .join(','),
        account_state: observation.accountState ?? 'unknown',
        surface: r.guideSurface ?? 'manual',
        guide_delay_ms:
          r.guideAt && r.firstObservedAt >= r.guideAt ? r.firstObservedAt - r.guideAt : undefined,
        observation: r.present === false ? 'transition' : 'already_present',
        observed_at: r.firstObservedAt,
        same_session_as_guide: !!session && session === r.guideSession,
        foreground_session_id: session,
        $insert_id: 'widget-' + r.first + '-placed',
      });
    }
    if (firstPositive || r.present !== present) {
      r.present = present;
      await write(r);
    }
  });
  return observation;
}
