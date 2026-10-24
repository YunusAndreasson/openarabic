/**
 * Onboarding storage utilities
 * Persists the "Get started" checklist progress as a single JSON blob with
 * fail-safe error handling (mirrors utils/tutorialStorage.ts). The last state
 * read or written is held in an external store, so UI updates live when steps
 * complete from anywhere in the app (mutation callbacks, audio playback, etc.).
 */

import {
  ONBOARDING_STATE_VERSION,
  ONBOARDING_STORAGE_KEY,
  type OnboardingProgressState,
  type OnboardingStep,
} from '@/constants/onboarding';
import { scopedKey } from '@/constants/storageKeys';
import { createExternalStore } from '@/utils/createExternalStore';
import { createJsonStore, decodeFields } from '@/utils/createJsonStore';
import { createSerialQueue } from '@/utils/createSerialQueue';

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

/**
 * The blob at one account's key. Built per operation from the key captured
 * when the operation started — never derived from the active user later, so
 * a write that lands after an account switch cannot reach the new account.
 */
const progressStore = (storageKey: string) =>
  createJsonStore<OnboardingProgressState>({
    key: storageKey,
    decode: raw =>
      decodeFields(raw, createState(), {
        version: 'number',
        initializedAt: 'string',
        dismissed: 'boolean',
        readFirstText: 'boolean',
        saveFirstWord: 'boolean',
        listenToAudio: 'boolean',
        practiceFirstWord: 'boolean',
        completedAt: 'string',
      }),
    empty: () => createState(),
    // FAIL-SAFE: a dismissed state, so the checklist and welcome intro never
    // show to an unknown cohort. Not persisted, so a transient error is retried
    // next launch.
    onReadError: () => createState({ dismissed: true, initializedAt: new Date().toISOString() }),
    report: {
      read: { showToast: false, analyticsEventName: 'Onboarding_Storage_Read_Error' },
      write: { showToast: false, analyticsEventName: 'Onboarding_Storage_Write_Error' },
    },
  });

/** The active account's state as last read or written; null until the first load. */
const progress = createExternalStore<OnboardingProgressState | null>(null);
let activeUserId: string | null = null;
let accountGeneration = 0;
let stateRevision = 0;
const enqueueMutation = createSerialQueue();

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

/** Switch the in-memory/persistent checklist scope when the auth user changes. */
export function setOnboardingStorageUser(userId: string | null): void {
  if (activeUserId === userId) return;
  activeUserId = userId;
  accountGeneration += 1;
  stateRevision += 1;
  progress.set(null);
}

/**
 * Subscribe to onboarding state changes (fires after every write).
 * Returns an unsubscribe function. Designed for useSyncExternalStore.
 */
export function subscribeOnboarding(listener: () => void): () => void {
  return progress.subscribe(listener);
}

/** Synchronous snapshot for useSyncExternalStore; null until first load. */
export function getCachedOnboardingState(): OnboardingProgressState | null {
  return progress.get();
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
  const cached = progress.get();
  if (isCurrentScope(scope) && cached) return cached;
  const revisionAtStart = stateRevision;
  const loadedState = await progressStore(scope.storageKey).read();

  // Ignore reads made stale by either an account switch or a newer mutation.
  if (isCurrentScope(scope) && revisionAtStart === stateRevision) {
    progress.set(loadedState);
  }
  return loadedState;
}

async function writeState(next: OnboardingProgressState, scope: AccountScope): Promise<void> {
  if (!isCurrentScope(scope)) return;

  stateRevision += 1;
  progress.set(next);
  // Use the key captured with the operation. Never derive a destination from
  // mutable auth state after asynchronous work has started.
  await progressStore(scope.storageKey).write(next);
}

/**
 * Queued read-modify-write, bound to the account that was active when the
 * caller asked. `update` returns the next state, or null to leave it untouched.
 */
async function updateState(
  update: (state: OnboardingProgressState) => OnboardingProgressState | null,
): Promise<void> {
  const scope = captureAccountScope();
  await enqueueMutation(async () => {
    if (!isCurrentScope(scope)) return;
    const state = await loadOnboardingStateForScope(scope);
    if (!isCurrentScope(scope)) return;
    const next = update(state);
    if (next) await writeState(next, scope);
  });
}

/**
 * Mark a checklist step as done. Idempotent, fire-and-forget safe —
 * call from mutation callbacks / playback start without awaiting.
 */
export async function markOnboardingStep(step: OnboardingStep): Promise<void> {
  await updateState(state => (state[step] ? null : { ...state, [step]: true }));
}

/**
 * Record the one-time eligibility decision. `dismissed: true` permanently
 * suppresses the checklist and welcome intro (established accounts).
 */
export async function initializeOnboarding(options: { dismissed: boolean }): Promise<void> {
  await updateState(state => ({
    ...state,
    dismissed: options.dismissed,
    initializedAt: new Date().toISOString(),
  }));
}

/** Persist that the checklist finished (all steps done, card collapsed). */
export async function markChecklistCompleted(): Promise<void> {
  await updateState(state =>
    state.completedAt ? null : { ...state, completedAt: new Date().toISOString() },
  );
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
