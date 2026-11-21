import { describe, expect, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useConsent } from '@/hooks/privacy/useConsent';
import { getConsent, loadConsent, saveConsent } from '@/services/consent';

describe('useConsent', () => {
  // One scenario rather than three tests, because the store lives in the module:
  // loading it or making a decision cannot be undone for the next test, and a fresh
  // copy would bring its own React along.
  test('follows the choice through not loaded, loaded with none, and decided', async () => {
    const { result } = renderHook(() => useConsent());

    expect(result.current).toEqual({ isLoaded: false, consent: null });

    await act(async () => {
      await loadConsent();
    });
    expect(result.current).toEqual({ isLoaded: true, consent: null });

    await act(async () => {
      await saveConsent({ analytics: true, measurement: false });
    });
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.consent).toMatchObject({ analytics: true, measurement: false });
    expect(result.current.consent).toBe(getConsent());

    await act(async () => {
      await saveConsent({ analytics: false, measurement: false });
    });
    expect(result.current.consent).toMatchObject({ analytics: false, measurement: false });
  });
});
