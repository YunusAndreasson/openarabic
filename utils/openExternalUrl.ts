import { Linking } from 'react-native';

import { handleError, type ErrorOptions } from '@/utils/errorHandling';

/**
 * Hand a URL to the system — a web page, a store listing, a mail composer —
 * and report a failure the caller's way.
 *
 * No `Linking.canOpenURL` probe first. It only answers for schemes the app has
 * declared: on Android 11+ package visibility hides every handler the
 * manifest's `<queries>` does not list (ours lists https alone), and iOS says
 * false for any scheme missing from LSApplicationQueriesSchemes. So it returned
 * false for `mailto:` on phones that had a mail app, and the "Contact us" links
 * did nothing at all. `openURL` rejects when nothing can take the URL, which
 * is the one answer worth acting on.
 *
 * @param report How to report a failure: the caller's analytics event, Sentry
 *   tags and toast choice. The URL is added to the Sentry extras.
 * @returns whether the system accepted the URL
 */
export async function openExternalUrl(url: string, report: ErrorOptions): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    void handleError(error, { ...report, sentryExtra: { url, ...report.sentryExtra } });
    return false;
  }
}
