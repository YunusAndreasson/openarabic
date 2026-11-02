import { State } from 'ts-fsrs';

import { COOLDOWN_EXEMPT_STATES } from '@/constants/fsrs';
import { STARTER_ROOT_IDS, STARTER_WORD_COUNT } from '@/constants/starterWords';
import { STRINGS } from '@/constants/strings';
import { checkAuthentication, supabase } from '@/services/supabase';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { FSRSWordUpdate, GetFSRSWordsOptions } from '@/types/fsrs.types';
import type { StudyWord, StudyWordIntent } from '@/types/vocabulary.types';
import { MILLISECONDS_PER_HOUR } from '@/utils/dateTimeUtils';
import { createBulkFSRSEntries, createInitialFSRSEntry } from '@/utils/fsrsInitializers';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import {
  executeAuthenticatedQuery,
  executeQuery,
  fetchAllPages,
  signalOf,
  type RequestOptions,
} from '@/utils/supabaseHelpers';
import { mapToStudyWord } from '@/utils/typeMappers';

const errorConfig = {
  load: createServiceErrorConfig('study_words_fsrs', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_STUDY_WORDS,
    showToast: false,
  }),
  update: createServiceErrorConfig('word_and_review', 'update', {
    toastMessage: STRINGS.FAILED_TO_UPDATE_WORD_AND_REVIEW,
    showToast: false,
  }),
  toggleCheck: createServiceErrorConfig('study_word', 'check', {
    toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
    analyticsEventName: 'Toggle_Study_Word_Check_Error',
    showToast: false,
  }),
  toggleDelete: createServiceErrorConfig('study_word', 'delete', {
    toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
    analyticsEventName: 'Toggle_Study_Word_Delete_Error',
    showToast: false,
  }),
  toggleInsert: createServiceErrorConfig('study_word', 'add', {
    toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
    analyticsEventName: 'Toggle_Study_Word_Insert_Error',
    showToast: false,
  }),
  allRoots: createServiceErrorConfig('roots', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ALL_ROOTS,
    showToast: false,
  }),
  addMultipleCheck: createServiceErrorConfig('common_words', 'check', {
    toastMessage: STRINGS.FAILED_TO_ADD_COMMON_WORDS,
    analyticsEventName: 'Add_Multiple_Roots_Check_Error',
    showToast: false,
  }),
  addMultipleInsert: createServiceErrorConfig('common_words', 'add', {
    toastMessage: STRINGS.FAILED_TO_ADD_COMMON_WORDS,
    analyticsEventName: 'Add_Multiple_Roots_Insert_Error',
    showToast: false,
  }),
};

export interface StudyWordMutationResult {
  inStudyList: boolean;
  changed: boolean;
}

export const studyWordsFSRSService = {
  // Fetch study words with FSRS parameters
  async getFSRSWords(
    userId: string,
    options: GetFSRSWordsOptions = {},
    request: RequestOptions = {},
  ): Promise<StudyWord[]> {
    // Builds the query fresh each call so an unbounded fetch (see below) can
    // re-run it per page — a Postgrest query builder can't be re-ranged after
    // it has already been awaited once.
    const buildFilteredQuery = () => {
      const query = supabase.from('study_words');

      // Define the selection based on options
      let selectQuery;
      if (options.forStats) {
        // For stats, we only need core fields, not all the relationships.
        //
        // Spelled out, like the branch below — supabase-js parses a select
        // string as a TEMPLATE LITERAL TYPE against the generated schema, so
        // this list is checked, and the row it produces is what has to satisfy
        // `StudyWordQueryRow` at `mapToStudyWord`. Add an `fsrs_*` column to the
        // table and that call stops compiling until this list names it. Build
        // the string at runtime (`COLUMNS.join(',')`) and it widens to `string`,
        // which the parser rejects and which throws that check away.
        selectQuery = query.select(
          `
          fsrs_due,
          fsrs_stability,
          fsrs_stability_fast,
          fsrs_fast_reviewed_at,
          fsrs_model,
          fsrs_difficulty,
          fsrs_scheduled_days,
          fsrs_reps,
          fsrs_learning_steps,
          fsrs_lapses,
          fsrs_state,
          fsrs_last_review,
          root_id,
          created_at`,
        );
      } else {
        // Get full data with relationships - root is the only relation we need
        // Spelled out as a literal, deliberately: supabase-js parses this
        // string as a TEMPLATE LITERAL TYPE against the generated schema, so a
        // renamed or misspelled column fails to compile here and the row type
        // flows through typed. Building it at runtime (`COLUMNS.join(',')`)
        // widens it to `string`, which the parser rejects outright — this is
        // already the most strongly checked part of the query.
        const columns = `
          root_id,
          user_id,
          fsrs_due,
          fsrs_stability,
          fsrs_stability_fast,
          fsrs_fast_reviewed_at,
          fsrs_model,
          fsrs_difficulty,
          fsrs_scheduled_days,
          fsrs_reps,
          fsrs_learning_steps,
          fsrs_lapses,
          fsrs_state,
          fsrs_last_review,
          created_at,
          root:roots (id, letters, meaning, audio_url, audio_url_en)
        `;
        selectQuery = query.select(columns);
      }

      // Add filters after the select
      let filteredQuery = selectQuery.eq('user_id', userId);

      // Add due date filter if requested
      if (options.onlyDue) {
        const now = new Date().toISOString();
        // Include both:
        // 1. Words with due date <= now
        // 2. New words, which are always due for their first review
        filteredQuery = filteredQuery.or(`fsrs_due.lte.${now},fsrs_state.eq.${State.New}`);
      }

      // Session cooldown: after finishing a session, don't immediately re-serve
      // the words that session covered.
      //
      // It applies ONLY to Review-state words. Learning and Relearning are
      // exempt, and that exemption is the whole point: those are the words the
      // learner has NOT got right yet, and FSRS deliberately schedules them minutes
      // out (learning_steps 1m/10m, relearning_steps 5m/10m). Cooling them by
      // `fsrs_last_review` hid exactly the words that most needed practising —
      // measured on a real account 2026-08-08: 5 words due 21 seconds after the
      // session ended, all 5 suppressed, and the learner shown "nothing to
      // practice" while nothing had actually been learned.
      //
      // Nothing is lost by exempting them, because a word that WAS answered
      // correctly leaves the short steps for a multi-day interval and is already
      // excluded by the `onlyDue` filter above. The cooldown keeps its job (a
      // finished session stays finished) and stops doing the other one.
      if (options.sessionCooldownHours && options.sessionCooldownHours > 0) {
        const cooldownTime = new Date(
          Date.now() - options.sessionCooldownHours * MILLISECONDS_PER_HOUR,
        );
        filteredQuery = filteredQuery.or(
          `fsrs_state.in.(${COOLDOWN_EXEMPT_STATES.join(',')}),` +
            `fsrs_last_review.is.null,fsrs_last_review.lt.${cooldownTime.toISOString()}`,
        );
      }

      // Due date first, then `root_id`: unique per user, so the order is total.
      // Bulk-added words share one `fsrs_due` (one `now` stamps them all), and
      // pages of a tied order have no stable boundary — a heavy learner's full
      // list could repeat a word on two pages and lose another entirely.
      return filteredQuery.order('fsrs_due', { ascending: true }).order('root_id');
    };

    const queryErrorConfig = {
      ...errorConfig.load,
      analyticsProperties: {
        ...(options.onlyDue !== undefined && { onlyDue: options.onlyDue }),
        ...(options.forStats !== undefined && { forStats: options.forStats }),
      },
    };

    let data;
    if (options.limit) {
      // Caller wants a specific page/cap (e.g. the due-review chunk) — a
      // single request is correct here.
      const limit = options.limit;
      data = await executeAuthenticatedQuery(
        userId,
        () => buildFilteredQuery().limit(limit).abortSignal(signalOf(request)),
        queryErrorConfig,
        request,
      );
    } else {
      // No cap requested: the caller wants this user's FULL word list (used
      // for the vocabulary total, dictionary, and every stat derived from
      // it). A plain `.select()` with no `.range()`/`.limit()` silently
      // truncates at PostgREST's implicit 1000-row default — invisible on a
      // normal account, but a heavy learner's real total, dictionary
      // listing, and search all went quietly wrong past 1000 saved words.
      // Page through everything instead.
      await checkAuthentication(userId);
      data = await fetchAllPages(
        (from, to, signal) => buildFilteredQuery().range(from, to).abortSignal(signal),
        { errorConfig: queryErrorConfig, request },
      );
    }

    // Type-safe mapping from database rows to StudyWord interface
    return data.map(row => mapToStudyWord(row, userId));
  },

  // Update FSRS parameters for a study word
  async updateWordAndReview(
    userId: string,
    rootId: RootId,
    update: FSRSWordUpdate,
    request: RequestOptions = {},
  ): Promise<void> {
    // Direct UPDATE - simpler than RPC, no database migration needed
    // RLS policies ensure user can only update their own words
    await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('study_words')
          .update({
            fsrs_due: update.fsrs_due,
            fsrs_stability: update.fsrs_stability,
            fsrs_stability_fast: update.fsrs_stability_fast,
            fsrs_fast_reviewed_at: update.fsrs_fast_reviewed_at,
            fsrs_model: update.fsrs_model,
            fsrs_difficulty: update.fsrs_difficulty,
            fsrs_scheduled_days: update.fsrs_scheduled_days,
            fsrs_learning_steps: update.fsrs_learning_steps,
            fsrs_reps: update.fsrs_reps,
            fsrs_lapses: update.fsrs_lapses,
            fsrs_state: update.fsrs_state,
            fsrs_last_review: update.fsrs_last_review,
          })
          .eq('user_id', userId)
          .eq('root_id', rootId),
      {
        ...errorConfig.update,
        analyticsProperties: { rootId },
      },
      request,
    );
  },

  // Toggle FSRS study for roots
  /**
   * Toggle a root in the study list. When `intent` is given, the operation is
   * idempotent in that direction: 'add' never deletes and 'remove' never
   * inserts, even when the caller's view of the study list was stale — the
   * user's tap can then never silently invert into the opposite action.
   * Without `intent`, direction falls back to server-side existence (legacy
   * toggle). Returns whether the root is in the study list afterwards.
   */
  async setFSRSStudyRoot(
    userId: string,
    rootId: RootId,
    intent?: StudyWordIntent,
    request: RequestOptions = {},
  ): Promise<StudyWordMutationResult> {
    // Check if a study entry already exists for this root
    // Using maybeSingle() returns null instead of throwing PGRST116 error
    const existing = await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('study_words')
          .select('root_id')
          .eq('user_id', userId)
          .eq('root_id', rootId)
          .maybeSingle(),
      {
        ...errorConfig.toggleCheck,
        analyticsProperties: { rootId },
      },
      request,
    );

    if (intent === 'add' && existing) {
      return { inStudyList: true, changed: false };
    }

    if (existing || intent === 'remove') {
      if (existing) {
        await executeAuthenticatedQuery(
          userId,
          () => supabase.from('study_words').delete().eq('user_id', userId).eq('root_id', rootId),
          {
            ...errorConfig.toggleDelete,
            analyticsProperties: { rootId },
          },
          request,
        );
      }
      return { inStudyList: false, changed: !!existing };
    }

    // Create a new FSRS card for the root with proper initial values
    const newEntry = createInitialFSRSEntry(userId, rootId);

    await executeAuthenticatedQuery(
      userId,
      () => supabase.from('study_words').insert(newEntry),
      {
        ...errorConfig.toggleInsert,
        analyticsProperties: { rootId },
      },
      request,
    );

    return { inStudyList: true, changed: true };
  },

  /**
   * Get the curated starter roots for a brand-new learner's first deck.
   *
   * The list itself lives in `constants/starterWords.ts` — see the comment there
   * for why this is an explicit, vetted set rather than an ordering over
   * `roots`. Every candidate ordering available in the database (by id, by
   * corpus usage) produces a deck with duplicate English answers in it.
   */
  async getCommonRoots(
    limit: number = STARTER_WORD_COUNT,
    request: RequestOptions = {},
  ): Promise<Tables<'roots'>[]> {
    const data = await executeQuery(
      () =>
        supabase
          .from('roots')
          .select('id, letters, meaning, audio_url, audio_url_en')
          .in('id', [...STARTER_ROOT_IDS]),
      errorConfig.allRoots,
      request,
    );

    if (!data) return [];

    // `.in()` gives no ordering guarantee, and the curated sequence is the
    // point — concrete nouns first. Restore it, then take the requested count,
    // so a row missing from the dictionary drops out of the tail rather than
    // leaving a hole where a learner's first card should be.
    const byId = new Map(data.map(root => [root.id, root]));

    return STARTER_ROOT_IDS.map(id => byId.get(id))
      .filter((root): root is Tables<'roots'> => root !== undefined)
      .slice(0, limit);
  },

  /**
   * Add multiple roots to the user's study list at once.
   * Skips roots that are already in the study list.
   */
  async addMultipleRoots(
    userId: string,
    rootIds: RootId[],
    request: RequestOptions = {},
  ): Promise<number> {
    if (rootIds.length === 0) return 0;

    // Get existing study words to avoid duplicates
    const existingData = await executeAuthenticatedQuery(
      userId,
      () =>
        supabase.from('study_words').select('root_id').eq('user_id', userId).in('root_id', rootIds),
      errorConfig.addMultipleCheck,
      request,
    );

    // In the caller's order (a Set keeps insertion order), each root once.
    const newRootIds = [
      ...new Set(rootIds).difference(new Set(existingData.map(row => row.root_id))),
    ];

    if (newRootIds.length === 0) return 0;

    const entries = createBulkFSRSEntries(userId, newRootIds);

    await executeAuthenticatedQuery(
      userId,
      () => supabase.from('study_words').insert(entries),
      errorConfig.addMultipleInsert,
      request,
    );

    return newRootIds.length;
  },
};
