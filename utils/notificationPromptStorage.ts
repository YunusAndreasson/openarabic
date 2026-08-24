/**
 * Notification priming prompt state
 * Device-local funnel state for the "turn on smart reminders" card on the
 * review completion screen (mirrors utils/onboardingStorage.ts: single JSON
 * blob, in-module cache + listener set for useSyncExternalStore, fail-safe
 * reads). Kept out of Redux — this is prompt bookkeeping, not a preference.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { handleError } from '@/utils/errorHandling';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const PROMPT_STORAGE_KEY = STORAGE_KEYS.NOTIFICATION_PROMPT_STATE;
const PROMPT_STATE_VERSION = 1;

export interface NotificationPromptState {
  version: number;
  /** Total completed review sessions (drives the re-ask window) */
  sessionsCompleted: number;
  /** Times the priming card has been shown */
  impressions: number;
  /** sessionsCompleted value at the last impression */
  lastImpressionSession: number;
  /** User pressed "Turn on reminders" (any OS outcome) or enabled from settings */
  accepted: boolean;
}

function createState(overrides: Partial<NotificationPromptState> = {}): NotificationPromptState {
  return {
    version: PROMPT_STATE_VERSION,
    sessionsCompleted: 0,
    impressions: 0,
    lastImpressionSession: 0,
    accepted: false,
    ...overrides,
  };
}

let cachedState: NotificationPromptState | null = null;

/**
 * FAIL-SAFE: a read/parse error yields an exhausted state (impressions maxed,
 * not persisted) so a storage problem can never turn into a nagging prompt.
 */
export async function loadNotificationPromptState(): Promise<NotificationPromptState> {
  if (cachedState) return cachedState;
  try {
    const raw = await AsyncStorage.getItem(PROMPT_STORAGE_KEY);
    cachedState = raw
      ? { ...createState(), ...(JSON.parse(raw) as Partial<NotificationPromptState>) }
      : createState();
  } catch (error) {
    void handleError(error, { showToast: false });
    cachedState = createState({ impressions: Number.MAX_SAFE_INTEGER });
  }
  return cachedState;
}

async function writeState(next: NotificationPromptState): Promise<void> {
  cachedState = next;
  try {
    await AsyncStorage.setItem(PROMPT_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    void handleError(error, { showToast: false });
  }
}

/** Increment the completed-session counter. Fire-and-forget safe. */
export async function recordSessionCompleted(): Promise<void> {
  const state = await loadNotificationPromptState();
  await writeState({ ...state, sessionsCompleted: state.sessionsCompleted + 1 });
}

/** Record that the priming card was shown this session. */
export async function recordImpression(): Promise<void> {
  const state = await loadNotificationPromptState();
  await writeState({
    ...state,
    impressions: state.impressions + 1,
    lastImpressionSession: state.sessionsCompleted,
  });
}

/** Record the user's choice — the card never shows again after this. */
export async function recordAccepted(): Promise<void> {
  const state = await loadNotificationPromptState();
  if (state.accepted) return;
  await writeState({ ...state, accepted: true });
}
