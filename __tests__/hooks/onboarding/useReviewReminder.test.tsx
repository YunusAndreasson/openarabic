import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { rootId } from '@/__tests__/helpers/ids';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { createPermissionsMock } from '@/__tests__/helpers/serviceMocks';
import { fsrsQueries } from '@/constants/queries';
import type { FirstReview } from '@/services/firstReview';
import {
  backgroundReminderSession,
  claimReminderOffer,
  recordSettingsReminderChoice,
  currentReminderSession,
  enterReminderSession,
} from '@/services/reviewReminderJourney';
import { useReviewReminder } from '@/hooks/onboarding/useReviewReminder';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn(), registerSuperProperties: jest.fn() },
}));
jest.mock('@/services/analyticsInstall', () => ({
  loadInstallRecord: async () => ({ installKind: 'new', firstOpenSent: false }),
}));
const mockWord = createTestWord({
  fsrs_state: 0,
  root: { id: 1, letters: 'كِتاب', meaning: 'book', audio_url: '', audio_url_en: '' },
});
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: async () => [mockWord] },
}));
const now = +new Date(2026, 10, 23, 9);
beforeEach(mockReviewStorage);

test('the receipt waits for a tap; denial keeps practice, recovery is once and opens settings only on tap', async () => {
  jest.setSystemTime(now);
  Platform.OS = 'ios';
  jest.mocked(Linking.openURL).mockResolvedValue(undefined);
  await enterReminderSession(true);
  const session = currentReminderSession();
  const permissions = jest.mocked(Notifications.getPermissionsAsync);
  const ask = jest.mocked(Notifications.requestPermissionsAsync);
  permissions.mockResolvedValue(
    createPermissionsMock('undetermined', {
      iosStatus: Notifications.IosAuthorizationStatus.NOT_DETERMINED,
      canAskAgain: true,
    }),
  );
  ask.mockImplementation(async () => {
    const denied = createPermissionsMock('denied', {
      iosStatus: Notifications.IosAuthorizationStatus.DENIED,
      canAskAgain: false,
    });
    permissions.mockResolvedValue(denied);
    return denied;
  });
  const { wrapper, queryClient } = createHookTestWrapper({ withRedux: true });
  queryClient.setQueryData(fsrsQueries.all('a').queryKey, [mockWord]);
  const receipt: FirstReview = {
    id: 'r',
    owner: 'a',
    step: 'complete',
    version: 1,
    completedAt: now,
    completionSession: session,
    word: {
      source: 'first_run_reader',
      form: 'x',
      gloss: 'x',
      occurrenceId: 1,
      rootId: mockWord.root_id,
    },
  };
  const first = renderHook(() => useReviewReminder('a', receipt), { wrapper });
  await waitFor(() => expect(first.result.current.state).toBe('offer'));
  expect(ask).not.toHaveBeenCalled();
  await act(() => first.result.current.act());
  await waitFor(() => expect(first.result.current.state).toBe('off'));
  expect(ask).toHaveBeenCalledTimes(1);
  first.unmount();
  await backgroundReminderSession(now);
  jest.setSystemTime(now + 86400000);
  await enterReminderSession(false);
  const later = renderHook(() => useReviewReminder('a'), { wrapper });
  await waitFor(() => expect(later.result.current.state).toBe('recovery'));
  expect(later.result.current.settingsAction).toBe(true);
  expect(Linking.openURL).not.toHaveBeenCalled();
  await act(() => later.result.current.act());
  expect(Linking.openURL).toHaveBeenCalledWith('app-settings:notifications');
  later.unmount();
  const next = renderHook(() => useReviewReminder('a'), { wrapper });
  await waitFor(() => expect(next.result.current.state).toBe('off'));
  expect(ask).toHaveBeenCalledTimes(1);
});

test('the recovery target obeys the same Review cooldown as Practice', async () => {
  jest.setSystemTime(now);
  await enterReminderSession(true, now, 'a');
  await claimReminderOffer('a', 'r', currentReminderSession(), now, () => true);
  await recordSettingsReminderChoice('a', false);
  await backgroundReminderSession(now);
  jest.setSystemTime(now + 86400000);
  await enterReminderSession(false, Date.now(), 'a');
  Platform.OS = 'ios';
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(
    createPermissionsMock('denied', {
      iosStatus: Notifications.IosAuthorizationStatus.DENIED,
      canAskAgain: false,
    }),
  );
  const { wrapper, queryClient } = createHookTestWrapper({ withRedux: true });
  const recentlyReviewed = {
    ...mockWord,
    root_id: rootId(21),
    fsrs_state: 2 as const,
    fsrs_due: new Date(Date.now() - 1000).toISOString(),
    fsrs_last_review: new Date().toISOString(),
  };
  queryClient.setQueryData(fsrsQueries.all('a').queryKey, [recentlyReviewed, mockWord]);
  queryClient.setQueryData(fsrsQueries.lastCompletedAtKey('a'), Date.now());
  const view = renderHook(() => useReviewReminder('a'), { wrapper });
  await waitFor(() => expect(view.result.current.state).toBe('recovery'));
  expect(view.result.current.due?.root_id).toBe(mockWord.root_id);
});
