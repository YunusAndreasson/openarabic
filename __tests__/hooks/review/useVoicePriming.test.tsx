/**
 * useVoicePriming — the `rendered` gate.
 *
 * The gate exists because the completion screen shares one slot with the
 * notification ask, and notification eligibility resolves asynchronously. Before
 * it, the voice impression fired from eligibility alone, so every session where
 * the reminders card took the slot still logged a voice impression and the
 * funnel's denominator was inflated. These tests hold that line: the previous
 * suite mocked the hook wholesale, so the argument could have been dropped
 * entirely and nothing would have gone red.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));

const mockDispatch = jest.fn();
let mockSettings: { voiceEnabled: boolean; voiceOfferDismissed: boolean };

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelectorShallow: (selector: (state: unknown) => unknown) =>
    selector({ settings: mockSettings }),
}));

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { useVoiceOfferEligible, useVoicePriming } from '@/hooks/review/useVoicePriming';
import { analytics } from '@/services/analytics';

describe('useVoicePriming', () => {
  beforeEach(() => {
    // repo jest config sets resetMocks:true — implementations must be reinstalled
    mockSettings = { voiceEnabled: false, voiceOfferDismissed: false };
    jest.mocked(analytics.track).mockImplementation(async () => undefined);
  });

  test('reports an impression when this surface actually gets the slot', () => {
    renderHook(() => useVoicePriming('completion', true));

    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.VOICE_PRIMING_SHOWN, {
      source: 'completion',
    });
  });

  test('reports NO impression when another card took the slot', () => {
    renderHook(() => useVoicePriming('completion', false));

    expect(analytics.track).not.toHaveBeenCalled();
  });

  test('does not claim to be showing a card it is not counting', () => {
    const { result } = renderHook(() => useVoicePriming('completion', false));

    // The flag and the impression answer the same question. If this ever returns
    // true while the impression is suppressed, a caller can render an uncounted
    // card and the funnel silently under-reports instead of over-reporting.
    expect(result.current.showPrimingCard).toBe(false);
  });

  test('carries the surface through to the accept and decline events', () => {
    const { result } = renderHook(() => useVoicePriming('review_header'));

    result.current.accept();
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.VOICE_PRIMING_ACCEPTED, {
      source: 'review_header',
    });

    result.current.decline();
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.VOICE_PRIMING_DECLINED, {
      source: 'review_header',
    });
  });

  test('stays silent once the learner has answered, on every surface', () => {
    mockSettings = { voiceEnabled: false, voiceOfferDismissed: true };
    const { result } = renderHook(() => useVoicePriming('review_header'));

    expect(result.current.showPrimingCard).toBe(false);
    expect(analytics.track).not.toHaveBeenCalled();
  });
});

describe('useVoiceOfferEligible', () => {
  beforeEach(() => {
    mockSettings = { voiceEnabled: false, voiceOfferDismissed: false };
  });

  test('is open only while voice is off and unrefused', () => {
    expect(renderHook(() => useVoiceOfferEligible()).result.current).toBe(true);

    mockSettings = { voiceEnabled: true, voiceOfferDismissed: false };
    expect(renderHook(() => useVoiceOfferEligible()).result.current).toBe(false);

    mockSettings = { voiceEnabled: false, voiceOfferDismissed: true };
    expect(renderHook(() => useVoiceOfferEligible()).result.current).toBe(false);
  });
});
