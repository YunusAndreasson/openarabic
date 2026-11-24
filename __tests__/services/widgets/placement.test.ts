import { beforeEach, expect, jest, test } from '@jest/globals';
import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { ANALYTICS_EVENTS as E } from '@/constants/analytics';
import { analytics } from '@/services/analytics';
import { widgetBridge } from '@/services/widgets/native';
import {
  observePlacement,
  recordWidgetChoice,
  widgetFirstForeground,
  widgetOfferState,
  widgetOfferVisible,
} from '@/services/widgets/placement';
jest.mock('@/services/widgets/native', () => ({ widgetBridge: { placement: jest.fn() } }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
beforeEach(mockReviewStorage);
test('the receipt and Settings have independent session/day eligibility; choosing a channel suppresses the other', async () => {
  const day1 = new Date(2026, 10, 23, 10);
  jest.setSystemTime(day1);
  await widgetFirstForeground('first', +day1);
  expect((await widgetOfferState('receipt', 'first')).show).toBe(true);
  expect((await widgetOfferState('settings', 'later')).show).toBe(false);
  await recordWidgetChoice('first', 'reminder');
  expect((await widgetOfferState('receipt', 'first')).show).toBe(false);
  jest.setSystemTime(+day1 + 86400000);
  expect((await widgetOfferState('settings', 'first')).show).toBe(false);
  expect((await widgetOfferState('guest_settings', 'later')).show).toBe(true);
  await Promise.all([
    widgetOfferVisible('settings', 'later'),
    widgetOfferVisible('settings', 'later'),
  ]);
  expect(
    jest.mocked(analytics.track).mock.calls.filter(([e]) => e === E.WIDGET_OFFER_SHOWN),
  ).toHaveLength(1);
});
test('only an enumerated instance confirms placement, once across duplicate observations and removal', async () => {
  await widgetFirstForeground('s');
  const read = jest.mocked(widgetBridge!.placement);
  read
    .mockResolvedValueOnce({ families: [], canPin: true })
    .mockRejectedValueOnce(new Error('unavailable'));
  await observePlacement('s');
  await recordWidgetChoice('s', 'widget');
  await observePlacement('s');
  expect(analytics.track).not.toHaveBeenCalledWith(E.WIDGET_ADDED_CONFIRMED, expect.anything());
  read.mockResolvedValue({ families: ['home', 'home'], canPin: true });
  await Promise.all([observePlacement('s'), observePlacement('s')]);
  read.mockResolvedValueOnce({ families: [], canPin: true });
  await observePlacement('later');
  await observePlacement('later');
  expect(
    jest.mocked(analytics.track).mock.calls.filter(([e]) => e === E.WIDGET_ADDED_CONFIRMED),
  ).toHaveLength(1);
});

test('removal before foreground preserves the first confirmed Android pin without marking it present', async () => {
  const now = Date.now();
  await widgetFirstForeground('s', now - 1000);
  jest
    .mocked(widgetBridge!.placement)
    .mockResolvedValue({ families: [], canPin: true, pinObservedAt: now, pinFamily: 'compact' });
  await observePlacement('s');
  await observePlacement('s');
  const calls = jest
    .mocked(analytics.track)
    .mock.calls.filter(([e]) => e === E.WIDGET_ADDED_CONFIRMED);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.[1]).toMatchObject({ families: 'compact', observed_at: now });
  expect((await widgetOfferState('receipt', 's')).placed).toBe(false);
});
