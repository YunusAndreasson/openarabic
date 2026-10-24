/**
 * openExternalUrl: hand a URL to the system and report a refusal.
 *
 * The bug it replaces: EmailLink asked `Linking.canOpenURL('mailto:…')` first.
 * That answers only for declared schemes — false on Android 11+ (the
 * manifest's <queries> lists https alone) and on iOS without
 * LSApplicationQueriesSchemes — so "Contact us" did nothing on phones that had
 * a mail app. The helper never probes; it opens, and reports a rejection.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { Linking } from 'react-native';

import { handleError } from '@/utils/errorHandling';
import { openExternalUrl } from '@/utils/openExternalUrl';

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const mockHandleError = jest.mocked(handleError);

describe('openExternalUrl', () => {
  let openURL: jest.SpiedFunction<typeof Linking.openURL>;
  let canOpenURL: jest.SpiedFunction<typeof Linking.canOpenURL>;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    // What the old probe said for `mailto:` on Android 11+.
    canOpenURL = jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
  });

  test('opens a mailto link without asking canOpenURL first', async () => {
    await expect(
      openExternalUrl('mailto:hello@example.com', { analyticsEventName: 'Email_Link_Failed' }),
    ).resolves.toBe(true);

    expect(openURL).toHaveBeenCalledWith('mailto:hello@example.com');
    expect(canOpenURL).not.toHaveBeenCalled();
    expect(mockHandleError).not.toHaveBeenCalled();
  });

  test("reports a refusal the caller's way, with the URL, and resolves false", async () => {
    const refusal = new Error('No app can handle this URL');
    openURL.mockRejectedValue(refusal);

    await expect(
      openExternalUrl('https://example.com/terms', {
        analyticsEventName: 'Legal_Link_Failed',
        sentryTags: { location: 'legal_document' },
        sentryExtra: { section: 'terms' },
        showToast: false,
        sentrySeverity: 'info',
      }),
    ).resolves.toBe(false);

    expect(mockHandleError).toHaveBeenCalledWith(refusal, {
      analyticsEventName: 'Legal_Link_Failed',
      sentryTags: { location: 'legal_document' },
      sentryExtra: { url: 'https://example.com/terms', section: 'terms' },
      showToast: false,
      sentrySeverity: 'info',
    });
  });
});
