/**
 * Notification priming prompt state
 * Device-local funnel state for the "turn on smart reminders" card on the
 * review completion screen: a single JSON blob, read through an in-module
 * cache, with fail-safe reads. Kept out of Redux — this is prompt
 * bookkeeping, not a preference.
 *
 * The key belongs to whoever is signed in, and an account switch removes it
 * (utils/accountSwitch), which resets the cache here too — otherwise the
 * previous learner's impressions and "accepted" flag were written back under
 * the new account by the next update.
 */

import { STORAGE_KEYS } from '@/constants/storageKeys';
import { createJsonStore, decodeFields } from '@/utils/createJsonStore';

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

const promptStore = createJsonStore<NotificationPromptState>({
  key: STORAGE_KEYS.NOTIFICATION_PROMPT_STATE,
  decode: raw =>
    decodeFields(raw, createState(), {
      version: 'number',
      sessionsCompleted: 'number',
      impressions: 'number',
      lastImpressionSession: 'number',
      accepted: 'boolean',
    }),
  empty: () => createState(),
  // FAIL-SAFE: a read/parse error yields an exhausted state (impressions maxed,
  // not persisted) so a storage problem can never turn into a nagging prompt.
  onReadError: () => createState({ impressions: Number.MAX_SAFE_INTEGER }),
  cache: true,
});

export function loadNotificationPromptState(): Promise<NotificationPromptState> {
  return promptStore.read();
}

/**
 * Forget the cached state. Called once the key it mirrors has been removed
 * for an account switch, so the next read starts from the new account's
 * (empty) storage instead of the previous account's copy in memory.
 */
export function resetNotificationPromptState(): void {
  promptStore.reset();
}

/** Increment the completed-session counter. Fire-and-forget safe. */
export async function recordSessionCompleted(): Promise<void> {
  const state = await loadNotificationPromptState();
  await promptStore.write({ ...state, sessionsCompleted: state.sessionsCompleted + 1 });
}

/** Record that the priming card was shown this session. */
export async function recordImpression(): Promise<void> {
  const state = await loadNotificationPromptState();
  await promptStore.write({
    ...state,
    impressions: state.impressions + 1,
    lastImpressionSession: state.sessionsCompleted,
  });
}

/** Record the user's choice — the card never shows again after this. */
export async function recordAccepted(): Promise<void> {
  const state = await loadNotificationPromptState();
  if (state.accepted) return;
  await promptStore.write({ ...state, accepted: true });
}
