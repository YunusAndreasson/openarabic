/**
 * The reminders ask after the first saved word (useFirstWordNotificationPriming),
 * and the source both priming surfaces now carry into their events.
 *
 * Until this, the ask lived only on the review completion screen, which about
 * one in twenty new learners reached: ten people ever saw it.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));

const mockDispatch = jest.fn();
let mockRemindersEnabled = false;
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({ settings: { reminderTime: { enabled: mockRemindersEnabled } } }),
}));

let mockIntroPending = false;
jest.mock('@/components/providers', () => ({
  useTutorialContext: () => ({ shouldShowTutorial: () => mockIntroPending }),
}));

// The completion-screen hook in the same module reads this; unused here.
jest.mock('@/hooks/review/useVoicePriming', () => ({ useVoiceOfferEligible: () => false }));

jest.mock('@/services/notificationService', () => ({
  getPermissionStatus: jest.fn(),
  ensurePermissions: jest.fn(),
}));

jest.mock('@/utils/notificationPromptStorage', () => ({
  loadNotificationPromptState: jest.fn(),
  recordAccepted: jest.fn(),
  recordFirstWordOffer: jest.fn(),
  recordImpression: jest.fn(),
}));

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useFirstWordNotificationPriming } from '@/hooks/review/useNotificationPriming';
import { analytics } from '@/services/analytics';
import { ensurePermissions, getPermissionStatus } from '@/services/notificationService';
import {
  loadNotificationPromptState,
  recordFirstWordOffer,
} from '@/utils/notificationPromptStorage';

const promptState = (overrides = {}) => ({
  version: 1,
  sessionsCompleted: 0,
  impressions: 0,
  lastImpressionSession: 0,
  accepted: false,
  firstWordOfferShown: false,
  ...overrides,
});

describe('useFirstWordNotificationPriming', () => {
  beforeEach(() => {
    mockRemindersEnabled = false;
    mockIntroPending = false;
    jest.mocked(loadNotificationPromptState).mockResolvedValue(promptState());
    jest.mocked(getPermissionStatus).mockResolvedValue('undetermined');
    jest.mocked(ensurePermissions).mockResolvedValue(true);
    jest.mocked(recordFirstWordOffer).mockResolvedValue(undefined);
  });

  const offerOnce = async () => {
    const hook = renderHook(() => useFirstWordNotificationPriming());
    act(() => hook.result.current.offer());
    await act(async () => {
      await Promise.resolve();
    });
    return hook;
  };

  test('shows once the OS has never been asked, and remembers that it did', async () => {
    const { result } = await offerOnce();

    await waitFor(() => expect(result.current.showPrimingCard).toBe(true));
    expect(recordFirstWordOffer).toHaveBeenCalledTimes(1);
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_SHOWN, {
      source: 'first_word_saved',
    });
  });

  test.each([
    ['the OS already answered', () => jest.mocked(getPermissionStatus).mockResolvedValue('denied')],
    [
      'it was shown before',
      () =>
        jest
          .mocked(loadNotificationPromptState)
          .mockResolvedValue(promptState({ firstWordOfferShown: true })),
    ],
    [
      'the review card was accepted',
      () =>
        jest.mocked(loadNotificationPromptState).mockResolvedValue(promptState({ accepted: true })),
    ],
    [
      'reminders are already on',
      () => {
        mockRemindersEnabled = true;
      },
    ],
    [
      'the welcome intro is still to come',
      () => {
        mockIntroPending = true;
      },
    ],
  ])('does not show when %s', async (_reason, arrange) => {
    arrange();

    const { result } = await offerOnce();
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.showPrimingCard).toBe(false);
    expect(recordFirstWordOffer).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalled();
  });

  test('accepting asks the OS as a primed ask from this moment, and turns reminders on', async () => {
    const { result } = await offerOnce();
    await waitFor(() => expect(result.current.showPrimingCard).toBe(true));

    await act(async () => {
      await result.current.accept();
    });

    expect(ensurePermissions).toHaveBeenCalledWith({ source: 'first_word_saved', primed: true });
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_ACCEPTED, {
      source: 'first_word_saved',
    });
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'settings/remindersToggled', payload: true }),
    );
    expect(result.current.showPrimingCard).toBe(false);
  });

  test('declining hides it and asks the OS nothing', async () => {
    const { result } = await offerOnce();
    await waitFor(() => expect(result.current.showPrimingCard).toBe(true));

    act(() => result.current.decline());

    expect(result.current.showPrimingCard).toBe(false);
    expect(ensurePermissions).not.toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.NOTIFICATION_PRIMING_DECLINED, {
      source: 'first_word_saved',
    });
  });
});
