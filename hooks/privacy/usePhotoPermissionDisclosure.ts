import { useCallback, useEffect, useRef, useState } from 'react';

import { PHOTO_PERMISSION_CONSENT_KEY } from '@/constants/privacy';
import { storage } from '@/utils/safeAsyncStorage';

const CONSENT_GRANTED_VALUE = 'granted';

let cachedConsent: boolean | null = null;
let consentPromise: Promise<boolean> | null = null;

const readStoredConsent = async (): Promise<boolean> => {
  if (cachedConsent !== null) {
    return cachedConsent;
  }

  if (!consentPromise) {
    consentPromise = storage
      .getItem(PHOTO_PERMISSION_CONSENT_KEY)
      .then(value => {
        const isGranted = value === CONSENT_GRANTED_VALUE;
        cachedConsent = isGranted;
        return isGranted;
      })
      .catch(error => {
        // AsyncStorage errors should not block the disclosure flow
        console.warn('Failed to read photo permission consent:', error);
        cachedConsent = false;
        return false;
      });
  }

  return consentPromise;
};

export function usePhotoPermissionDisclosure() {
  const [isVisible, setIsVisible] = useState(false);
  const resolverRef = useRef<((accepted: boolean) => void) | null>(null);

  const closeDisclosure = useCallback(() => {
    setIsVisible(false);
  }, []);

  const resolveAndReset = useCallback((accepted: boolean) => {
    const resolver = resolverRef.current;
    resolverRef.current = null;
    if (resolver) {
      resolver(accepted);
    }
  }, []);

  const acceptDisclosure = useCallback(async () => {
    closeDisclosure();
    cachedConsent = true;
    consentPromise = Promise.resolve(true);
    try {
      await storage.setItem(PHOTO_PERMISSION_CONSENT_KEY, CONSENT_GRANTED_VALUE);
    } catch (error) {
      console.warn('Failed to persist photo permission consent:', error);
    }
    resolveAndReset(true);
  }, [closeDisclosure, resolveAndReset]);

  const declineDisclosure = useCallback(() => {
    closeDisclosure();
    cachedConsent = false;
    consentPromise = Promise.resolve(false);
    resolveAndReset(false);
  }, [closeDisclosure, resolveAndReset]);

  const ensureDisclosureAccepted = useCallback(async () => {
    const hasConsent = await readStoredConsent();
    if (hasConsent) {
      return true;
    }

    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
      setIsVisible(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (resolverRef.current) {
        const resolver = resolverRef.current;
        resolverRef.current = null;
        resolver(false);
      }
    };
  }, []);

  return {
    isVisible,
    ensureDisclosureAccepted,
    acceptDisclosure,
    declineDisclosure,
  };
}
