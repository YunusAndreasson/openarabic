import * as Sentry from '@sentry/react-native';
import { AppState } from 'react-native';
import { Skia } from 'react-native-skia';

import { createExternalStore, type ExternalStore } from '@/utils/createExternalStore';

/**
 * Whether Skia can draw right now.
 *
 * Skia 3 renders through the GPU (Metal on iOS, Vulkan 1.1 on Android). Play
 * filters out Android devices without Vulkan 1.1, so the GPU is normally there
 * — but a driver reset or GPU memory exhaustion can still lose the device while
 * the app runs. Every canvas mounted after that stays blank, which in the reader
 * means sentences with no Arabic at all. Callers that paint Arabic read this and
 * fall back to plain `Text` when it is false.
 *
 * `Skia.gpu.isAvailable` is a plain property with no change event, so it is read
 * once, then again each time the app returns to the foreground (where a reset
 * most plausibly shows up), and shared across every subscriber.
 */

let lossReported = false;

const readGpu = (): boolean => {
  const { isAvailable } = Skia.gpu;
  if (!isAvailable && !lossReported) {
    lossReported = true;
    Sentry.captureMessage('Skia GPU unavailable: Arabic falls back to Text', {
      level: 'warning',
      contexts: { skia_gpu: getSkiaGpuContext() },
    });
  }
  return isAvailable;
};

let appStateSubscription: { remove: () => void } | null = null;

const onAppStateChange = (state: string) => {
  if (state !== 'active') return;
  // An unchanged reading notifies no one (the store compares with Object.is).
  getGpuStore().set(readGpu());
};

/**
 * Created on first read, not at import: the first reading is taken when a
 * component first asks, as it always was, and the AppState listener exists only
 * while something is subscribed.
 */
let gpuStore: ExternalStore<boolean> | null = null;

const getGpuStore = (): ExternalStore<boolean> => {
  gpuStore ??= createExternalStore(readGpu(), {
    onFirstSubscribe: () => {
      appStateSubscription = AppState.addEventListener('change', onAppStateChange);
    },
    onLastUnsubscribe: () => {
      appStateSubscription?.remove();
      appStateSubscription = null;
    },
  });
  return gpuStore;
};

/** The adapter Skia renders with, for Sentry: a blank-canvas report names its GPU. */
export const getSkiaGpuContext = () => {
  const { isAvailable, backend, vendor, device, error } = Skia.gpu;
  return { isAvailable, backend, vendor, device, error };
};

export const useSkiaGpuAvailable = (): boolean => getGpuStore().useValue();
