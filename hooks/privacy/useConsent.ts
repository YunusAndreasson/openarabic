import { useSyncExternalStore } from 'react';

import { getConsentState, subscribeConsent, type ConsentState } from '@/services/consent';

/** The consent choice, re-rendering when it loads or changes. */
export const useConsent = (): ConsentState =>
  useSyncExternalStore(subscribeConsent, getConsentState, getConsentState);
