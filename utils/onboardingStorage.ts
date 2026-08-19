/**
 * Onboarding storage utilities
 * Persists the "Get started" checklist progress as a single JSON blob with
 * fail-safe error handling (mirrors utils/tutorialStorage.ts). A small
 * in-module cache + listener set lets UI update live when steps complete
 * from anywhere in the app (mutation callbacks, audio playback, etc.).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ONBOARDING_STATE_VERSION,
  ONBOARDING_STORAGE_KEY,
  type OnboardingProgressState,
  type OnboardingStep,
} from '@/constants/onboarding';
import { handleError } from '@/utils/errorHandling';
import { scopedKey } from '@/constants/storageKeys';

function createState(overrides: Partial<OnboardingProgressState> = {}): OnboardingProgressState {
  return {
    version: ONBOARDING_STATE_VERSION,
    dismissed: false,
    readFirstText: false,
    saveFirstWord: false,
    listenToAudio: false,
    practiceFirstWord: false,
    ...overrides,
  };
}

let cachedState: OnboardingProgressState | null = null;
let activeUserId: string | null = null;
let accountGeneration = 0;
let stateRevision = 0;
let mutationQueue: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

const getStorageKey = (): string => scopedKey(ONBOARDING_STORAGE_KEY, activeUserId);

interface AccountScope {
  storageKey: string;
  generation: number;
}

function captureAccountScope(): AccountScope {
  return { storageKey: getStorageKey(), generation: accountGeneration };
}

function isCurrentScope(scope: AccountScope): boolean {
  return scope.generation === accountGeneration && scope.storageKey === getStorageKey();
}

function enqueueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

/** Switch the in-memory/persistent checklist scope when the auth user changes. */
export function setOnboardingStorageUser(userId: string | null): void {
  if (activeUserId === userId) return;
  activeUserId = userId;
  accountGeneration += 1;
  stateRevision += 1;
  cachedState = null;
  notifyListeners();
}

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
  return loadOnboardingStateForScope(captureAccountScope());
}

async function loadOnboardingStateForScope(scope: AccountScope): Promise<OnboardingProgressState> {
  if (isCurrentScope(scope) && cachedState) return cachedState;
  const revisionAtStart = stateRevision;
  try {
    const raw = await AsyncStorage.getItem(scope.storageKey);
    const loadedState = raw
      ? { ...createState(), ...(JSON.parse(raw) as Partial<OnboardingProgressState>) }
      : createState();

    // Ignore reads made stale by either an account switch or a newer mutation.
    if (isCurrentScope(scope) && revisionAtStart === stateRevision) {
      cachedState = loadedState;
      notifyListeners();
    }
    return loadedState;
  } catch (error) {
    handleError(error, {
      showToast: false,
      analyticsEventName: 'Onboarding_Storage_Read_Error',
    });
    const failSafe = createState({ dismissed: true, initializedAt: new Date().toISOString() });
    if (isCurrentScope(scope) && revisionAtStart === stateRevision) {
      cachedState = failSafe;
      notifyListeners();
    }
    return failSafe;
  }
}

function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

async function writeState(next: OnboardingProgressState, scope: AccountScope): Promise<void> {
  if (!isCurrentScope(scope)) return;

  stateRevision += 1;
  cachedState = next;
  notifyListeners();
  try {
    // Use the key captured with the operation. Never derive a destination from
    // mutable auth state after asynchronous work has started.
    await AsyncStorage.setItem(scope.storageKey, JSON.stringify(next));
  } catch (error) {
    handleError(error, {
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
  const scope = captureAccountScope();
  await enqueueMutation(async () => {
    if (!isCurrentScope(scope)) return;
    const state = await loadOnboardingStateForScope(scope);
    if (!isCurrentScope(scope) || state[step]) return;
    await writeState({ ...state, [step]: true }, scope);
  });
}

/**
 * Record the one-time eligibility decision. `dismissed: true` permanently
 * suppresses the checklist and welcome intro (established accounts).
 */
export async function initializeOnboarding(options: { dismissed: boolean }): Promise<void> {
  const scope = captureAccountScope();
  await enqueueMutation(async () => {
    if (!isCurrentScope(scope)) return;
    const state = await loadOnboardingStateForScope(scope);
    if (!isCurrentScope(scope)) return;
    await writeState(
      {
        ...state,
        dismissed: options.dismissed,
        initializedAt: new Date().toISOString(),
      },
      scope,
    );
  });
}

/** Persist that the checklist finished (all steps done, card collapsed). */
export async function markChecklistCompleted(): Promise<void> {
  const scope = captureAccountScope();
  await enqueueMutation(async () => {
    if (!isCurrentScope(scope)) return;
    const state = await loadOnboardingStateForScope(scope);
    if (!isCurrentScope(scope) || state.completedAt) return;
    await writeState({ ...state, completedAt: new Date().toISOString() }, scope);
  });
}

/**
 * Re-enable onboarding from Account → Reset tutorials. Writes a fresh
 * initialized state, deliberately bypassing the established-user heuristic —
 * an explicit reset means "show me this again".
 */
export async function resetOnboarding(): Promise<void> {
  const scope = captureAccountScope();
  await enqueueMutation(async () => {
    if (!isCurrentScope(scope)) return;
    await writeState(createState({ initializedAt: new Date().toISOString() }), scope);
  });
}
