/** The key a visitor's analytics choice is stored under. Read by an inline script too. */
export const ANALYTICS_CONSENT_KEY = 'oa-analytics-consent';

export type AnalyticsChoice = 'granted' | 'denied';

const CHANGED_EVENT = 'oa-analytics-consent-changed';

/** Holds the choice for this visit when the browser blocks storage. */
let thisVisit: AnalyticsChoice | null = null;

/** A blocked or failed read means no choice has been made, so nothing is measured. */
export function readAnalyticsChoice(): AnalyticsChoice | null {
  try {
    const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : thisVisit;
  } catch {
    return thisVisit;
  }
}

export function saveAnalyticsChoice(choice: AnalyticsChoice): void {
  thisVisit = choice;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, choice);
  } catch {
    // Kept for this visit, and the banner returns next time.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** Forget the choice, which brings the question back. */
export function clearAnalyticsChoice(): void {
  thisVisit = null;
  try {
    window.localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    // Nothing was stored.
  }
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function subscribeAnalyticsChoice(listener: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, listener);
  return () => window.removeEventListener(CHANGED_EVENT, listener);
}
