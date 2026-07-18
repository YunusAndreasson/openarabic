/**
 * Onboarding storage utilities
 * Persists the "Get started" checklist progress as a single JSON blob with
 * fail-safe error handling (mirrors utils/tutorialStorage.ts). A small
 * in-module cache + listener set lets UI update live when steps complete
 * from anywhere in the app (mutation callbacks, audio playback, etc.).
 */

import {
  ONBOARDING_STATE_VERSION,
  ONBOARDING_STORAGE_KEY,
  type OnboardingProgressState,
  type OnboardingStep,
} from '@/constants/onboarding';
import { handleError } from '@/utils/errorHandling';
import { storage } from '@/utils/safeAsyncStorage';

function createState(overrides: Partial<OnboardingProgressState> = {}): OnboardingProgressState {
  return {
    version: ONBOARDING_STATE_VERSION,
    dismissed: false,
    readFirstText: false,
    saveFirstWord: false,
    listenToAudio: false,
    ...overrides,
  };
}

let cachedState: OnboardingProgressState | null = null;
const listeners = new Set<() => void>();

/**
 * Subscribe to onboarding state changes (fires after every write).
 * Returns an unsubscribe function. Designed for useSyncExternalStore.
 */
export function subscribeOnboarding(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Synchronous snapshot for useSyncExternalStore; null until first load. */
export function getCachedOnboardingState(): OnboardingProgressState | null {
  return cachedState;
}

/**
 * Load onboarding progress.
 * FAIL-SAFE: returns a dismissed state on read/parse error so the checklist
 * and welcome intro never show to an unknown cohort. The fail-safe state is
 * not persisted, so a transient error is retried next launch.
 */
export async function loadOnboardingState(): Promise<OnboardingProgressState> {
  if (cachedState) return cachedState;
  try {
    const raw = await storage.getItem(ONBOARDING_STORAGE_KEY);
    cachedState = raw
      ? { ...createState(), ...(JSON.parse(raw) as Partial<OnboardingProgressState>) }
      : createState();
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Onboarding_Storage_Read_Error',
    });
    cachedState = createState({ dismissed: true, initializedAt: new Date().toISOString() });
  }
  notifyListeners();
  return cachedState;
}

function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

async function writeState(next: OnboardingProgressState): Promise<void> {
  cachedState = next;
  notifyListeners();
  try {
    await storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    handleError(error as Error, {
      showToast: false,
      analyticsEventName: 'Onboarding_Storage_Write_Error',
    });
  }
}

/**
 * Mark a checklist step as done. Idempotent, fire-and-forget safe —
 * call from mutation callbacks / playback start without awaiting.
 */
export async function markOnboardingStep(step: OnboardingStep): Promise<void> {
  const state = await loadOnboardingState();
  if (state[step]) return;
  await writeState({ ...state, [step]: true });
}

/**
 * Record the one-time eligibility decision. `dismissed: true` permanently
 * suppresses the checklist and welcome intro (established accounts).
 */
export async function initializeOnboarding(options: { dismissed: boolean }): Promise<void> {
  const state = await loadOnboardingState();
  await writeState({
    ...state,
    dismissed: options.dismissed,
    initializedAt: new Date().toISOString(),
  });
}

/** Persist that the checklist finished (all steps done, card collapsed). */
export async function markChecklistCompleted(): Promise<void> {
  const state = await loadOnboardingState();
  if (state.completedAt) return;
  await writeState({ ...state, completedAt: new Date().toISOString() });
}

/**
 * Re-enable onboarding from Account → Reset tutorials. Writes a fresh
 * initialized state, deliberately bypassing the established-user heuristic —
 * an explicit reset means "show me this again".
 */
export async function resetOnboarding(): Promise<void> {
  await writeState(createState({ initializedAt: new Date().toISOString() }));
}
