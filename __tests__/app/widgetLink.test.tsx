import { beforeEach, expect, jest, test } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import WordWidgetLink from '@/app/widget/[action]';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { ROUTE_PATHS } from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { widgetBridge } from '@/services/widgets/native';
import type { StudyWord } from '@/types/vocabulary.types';

const mockQuery = jest.fn<() => Promise<StudyWord[]>>();
const mockClient = { query: mockQuery, getQueryData: () => undefined };
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query'),
  useQueryClient: () => mockClient,
}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  Redirect: jest.fn(() => null),
}));
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/widgets/native', () => ({ widgetBridge: { matchesOwner: jest.fn() } }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/services/reviewReminderJourney', () => ({ currentReminderSession: () => 'session' }));
jest.mock('@/utils/smartReminderPrefs', () => ({ readSmartReminderPrefs: async () => undefined }));
const destination = () => jest.mocked(Redirect).mock.calls.at(-1)?.[0].href;
beforeEach(() => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ user: { id: 'active-owner' }, isLoading: false } as ReturnType<
      typeof useAuth
    >);
  jest.mocked(useLocalSearchParams).mockReturnValue({ action: 'practice', v: 'token' });
  jest.mocked(widgetBridge!.matchesOwner).mockReturnValue(true);
});
test('a verified private ingress recomputes eligibility and attributes the resulting review', async () => {
  mockQuery.mockResolvedValue([createTestWord({ fsrs_state: 0 })]);
  render(<WordWidgetLink />);
  await waitFor(() =>
    expect(destination()).toEqual({ pathname: ROUTE_PATHS.REVIEW, params: { source: 'widget' } }),
  );
});
test('a previous owner token opens the public reader without fetching private words', async () => {
  jest.mocked(widgetBridge!.matchesOwner).mockReturnValue(false);
  render(<WordWidgetLink />);
  await waitFor(() => expect(destination()).toBe(ROUTE_PATHS.FIRST_PAGE));
  expect(mockQuery).not.toHaveBeenCalled();
});
test('an offline private tap keeps Practice reachable', async () => {
  mockQuery.mockRejectedValue(new Error('offline'));
  render(<WordWidgetLink />);
  await waitFor(() => expect(destination()).toBe(ROUTE_PATHS.PRACTICE_TAB));
});
test('unrecognized intents recover to the public passage without counting a widget open', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ action: 'unknown' });
  render(<WordWidgetLink />);
  expect(destination()).toBe(ROUTE_PATHS.FIRST_PAGE);
  expect(analytics.track).not.toHaveBeenCalled();
});
