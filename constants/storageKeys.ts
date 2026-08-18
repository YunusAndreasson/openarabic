/**
 * Every AsyncStorage key the app writes, in one place.
 *
 * WHY THIS EXISTS: the keys were defined in twelve different modules under three
 * naming conventions (`@openarabic/…`, bare `snake_case`, `SCREAMING_CASE`), with
 * per-user scoping implemented three different ways, and `profile_photo_${userId}`
 * spelled out as a template literal in two files — so renaming it in one place
 * would silently break the avatar in the other. Nothing could enumerate them,
 * which is why account deletion could not clear them.
 *
 * WHY THE NAMES ARE NOT ALL NORMALISED: the bare `snake_case` keys below hold live
 * user data — the study-day ledger behind the streak, the daily add cap, the recall
 * history the pacing model reads. Renaming them into the `@openarabic/` namespace
 * would orphan that data on every installed device, and the only way to avoid it is
 * a permanent read-old-write-new compatibility layer. The names are cosmetic; the
 * data is not. They are recorded here verbatim instead, which is what actually
 * buys the enumeration.
 */

/**
 * redux-persist's own config key. It prefixes the stored key with `persist:`, so
 * this is the one place the two spellings are tied together instead of drifting.
 */
export const REDUX_PERSIST_KEY = 'root';

/** Static keys — the full value is the key. */
export const STORAGE_KEYS = {
  ONBOARDING_PROGRESS: '@openarabic/onboarding/progress',
  NOTIFICATION_PROMPT_STATE: '@openarabic/notifications/promptState',
  SMART_REMINDER_PREFS: '@openarabic/notifications/smartReminderPrefs',
  AUDIO_CACHE_LEGACY_SWEEP: '@openarabic/audioCache/legacySweepV1',

  TUTORIAL_WELCOME_INTRO: '@openarabic/tutorials/welcomeIntroSeen',
  TUTORIAL_WORD_TAP: '@openarabic/tutorials/wordTapCompleted',
  TUTORIAL_REVIEW_GRADES: '@openarabic/tutorials/reviewGradesCompleted',

  /** Local day ledger behind the practice streak. */
  STUDY_DAYS: 'study_day_keys',
  /** Rolling recall outcomes the adaptive new-word pacing reads. */
  RECENT_RECALL_SESSIONS: 'recent_recall_sessions',
  /** Words added today, and the day that count belongs to. */
  DAILY_WORD_COUNT: 'daily_word_count',
  DAILY_WORD_RESET_DATE: 'daily_word_reset_date',

  /** TanStack Query's persisted cache. `_V2` already superseded an earlier key. */
  QUERY_CACHE: 'REACT_QUERY_OFFLINE_CACHE_V2',
  QUERY_CACHE_LEGACY: 'REACT_QUERY_OFFLINE_CACHE',

  /**
   * redux-persist's blob (`persistConfig.key = 'root'`). Written by the library,
   * never by app code — it is listed so this file's "every key" claim is true.
   * Deliberately NOT swept on account deletion: it mixes account data (settings,
   * voiceAliases) with device preferences (theme), so removing the key would
   * reset the theme too. Clearing the account half needs slice-level resets
   * dispatched through the store, not a key delete.
   */
  REDUX_PERSIST_ROOT: `persist:${REDUX_PERSIST_KEY}`,
} as const;

/**
 * How long a key's contents outlive the account that wrote them.
 *
 * - `account`        — one fixed key whose contents belong to whoever is signed
 *                      in. Nothing in the key names the account, so it has to be
 *                      removed explicitly when that account goes.
 * - `account-scoped` — the key embeds the user id (see `scopedKey`), so it is
 *                      removed by rebuilding it for the departing account.
 * - `device`         — genuinely device-level; survives every account change.
 */
export type StorageKeyScope = 'account' | 'account-scoped' | 'device';

/**
 * Every entry in `STORAGE_KEYS` must classify itself here. The `satisfies
 * Record<keyof typeof STORAGE_KEYS, …>` is the whole point: adding a key above
 * without deciding whether it belongs to the account is a compile error, so
 * `accountOwnedStorageKeys` cannot silently go stale the way the hand-written
 * list it replaced would have.
 */
const STORAGE_KEY_SCOPES = {
  ONBOARDING_PROGRESS: 'account-scoped',
  TUTORIAL_WELCOME_INTRO: 'account-scoped',
  TUTORIAL_WORD_TAP: 'account-scoped',
  TUTORIAL_REVIEW_GRADES: 'account-scoped',

  /** Impressions and the accept/decline decision for one learner. */
  NOTIFICATION_PROMPT_STATE: 'account',
  /** Reminder time and cadence, chosen per learner. */
  SMART_REMINDER_PREFS: 'account',
  /** Streak ledger, pacing history and the daily add cap — all per learner. */
  STUDY_DAYS: 'account',
  RECENT_RECALL_SESSIONS: 'account',
  DAILY_WORD_COUNT: 'account',
  DAILY_WORD_RESET_DATE: 'account',
  /** Holds rows fetched for the signed-in account (study words, reading list). */
  QUERY_CACHE: 'account',
  QUERY_CACHE_LEGACY: 'account',

  /** One-time migration marker for files on this filesystem. */
  AUDIO_CACHE_LEGACY_SWEEP: 'device',
  /** See the note on the key itself — mixed contents, swept a different way. */
  REDUX_PERSIST_ROOT: 'device',
} satisfies Record<keyof typeof STORAGE_KEYS, StorageKeyScope>;

/**
 * Per-user key builders. Two shapes exist and both are kept, because both are
 * already written on real devices:
 *
 *   `scopedKey(key, userId)`  → `key:userId`   (onboarding, tutorials)
 *   the builders below        → `prefix_userId` (account media + permissions)
 */
export const scopedKey = (key: string, userId?: string | null): string =>
  userId ? `${key}:${userId}` : key;

export const USER_STORAGE_KEYS = {
  /** Locally cached avatar URI. Written by the picker, read by the header. */
  profilePhoto: (userId: string) => `profile_photo_${userId}`,
  /** iOS never re-prompts, so a denial has to be remembered to route the user to Settings. */
  photoPermissionDenied: (userId: string) => `photo_permission_denied_${userId}`,
  screenshotPermissionDenied: (userId?: string | null) =>
    `screenshot_permission_denied_${userId || 'anonymous'}`,
} as const;

const STORAGE_KEY_NAMES = Object.keys(STORAGE_KEY_SCOPES) as (keyof typeof STORAGE_KEYS)[];

/**
 * Every key holding data for `userId`, ready for `AsyncStorage.multiRemove`.
 *
 * Derived from the scope table and from `USER_STORAGE_KEYS` itself, so a new key
 * joins this list by being declared rather than by someone remembering to add it
 * in a second place. The one key it deliberately omits is
 * `STORAGE_KEYS.REDUX_PERSIST_ROOT` — see the note there.
 */
export const accountOwnedStorageKeys = (userId: string): string[] => {
  const userKeyBuilders: ((id: string) => string)[] = Object.values(USER_STORAGE_KEYS);

  return [
    ...STORAGE_KEY_NAMES.flatMap(name => {
      const scope: StorageKeyScope = STORAGE_KEY_SCOPES[name];
      if (scope === 'device') return [];
      const key = STORAGE_KEYS[name];
      return [scope === 'account-scoped' ? scopedKey(key, userId) : key];
    }),
    ...userKeyBuilders.map(build => build(userId)),
  ];
};
