import { widgetGradeSubmitted } from '@/services/widgets/publish';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import type { PassageWord } from '@/services/firstPage';

import { ANALYTICS_EVENTS as EVENTS, type AnalyticsEventName } from '@/constants/analytics';
import { CONFIDENCE_TO_RATING } from '@/constants/fsrs';
import { scopedKey, STORAGE_KEYS } from '@/constants/storageKeys';
import { trackActivated } from '@/services/installAttribution';
import { TutorialId } from '@/constants/tutorials';
import { markTutorialCompleted } from '@/utils/tutorialStorage';
import { recordStudyDay } from '@/utils/studyDayLedger';
import { appendSession } from '@/utils/recallSignalStorage';
import { recordSessionCompleted } from '@/utils/notificationPromptStorage';
import { analytics } from '@/services/analytics';
import type { ReaderSave, SaveWord } from '@/services/readerSave';
import { loadFirstReviewCard, sendFirstReview } from '@/services/firstReviewRpc';
import type { RootId } from '@/types/branded.types';
import type { FSRSWordUpdate } from '@/types/fsrs.types';
import type { WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { gradeWord } from '@/utils/fsrsScheduler';

import {
  currentReminderSession,
  recordFirstReminderReview,
} from '@/services/reviewReminderJourney';

export interface ReviewCard {
  row: StudyWord;
  revision: string | null;
  letters: string;
  meaning: string;
  sentence: string;
  segments?: readonly (NonNullable<PassageWord['segments']>[number] & { offset: number })[];
  translation: string;
}
export interface GradeAttempt {
  id: string;
  grade: WordConfidence;
  session?: string;
  update: FSRSWordUpdate;
}
export interface FirstReview {
  id: string;
  owner: string;
  word: SaveWord;
  version: number;
  step: 'recall' | 'answer' | 'restudy' | 'writing' | 'error' | 'conflict' | 'complete';
  card?: ReviewCard;
  attempt?: GradeAttempt;
  previous?: string;
  due?: string;
  completionSession?: string;
  completedAt?: number;
  firstGrade?: WordConfidence;
}

const queue = createSerialQueue();
const key = (owner: string) => scopedKey(STORAGE_KEYS.FIRST_REVIEWS, owner);

async function read(owner: string): Promise<FirstReview[]> {
  const raw = await AsyncStorage.getItem(key(owner));
  if (!raw) return [];
  const rows = JSON.parse(raw) as FirstReview[];
  return rows.filter(r => r.owner === owner);
}
export const resumeFirstReview = (owner: string, root?: RootId) =>
  queue(async () => (await read(owner)).find(r => !root || r.word.rootId === root));

function event(
  review: FirstReview,
  name: AnalyticsEventName,
  extra: Record<string, string | number | boolean> = {},
) {
  void analytics.track(name, {
    source: 'first_review',
    placement: review.word.source,
    session_id: review.id,
    ...extra,
  });
}

export async function startFirstReview(save: ReaderSave) {
  const owner = save.owner;
  if (!owner || (save.phase !== 'saved' && save.phase !== 'existing'))
    throw new Error('Unconfirmed word');
  return queue(async () => {
    const rows = await read(owner);
    const existing = rows.find(
      r =>
        r.id === save.id ||
        (r.word.rootId === save.word.rootId && r.step !== 'complete' && (r.attempt || r.previous)),
    );
    if (existing) return existing;
    const next: FirstReview = { id: save.id, owner, word: save.word, version: 0, step: 'recall' };
    await AsyncStorage.setItem(key(owner), JSON.stringify([next, ...rows]));
    event(next, EVENTS.REVIEW_SESSION_STARTED, { word_count: 1, $insert_id: next.id + '-started' });
    return next;
  });
}

// Compare the local version too: a late response or a second tap must never
// replace a newer attempt. No write reaches the network until the journal settles.
async function change(review: FirstReview, patch: Partial<FirstReview>) {
  return queue(async () => {
    const rows = await read(review.owner);
    const i = rows.findIndex(r => r.id === review.id);
    const current = rows[i];
    if (current?.version !== review.version) throw new Error('Review changed');
    // Only an acknowledged, still-current drill teaches grading. Persist the
    // flag while the original attempt can still be replayed after a kill.
    if (patch.step === 'complete')
      await markTutorialCompleted(TutorialId.REVIEW_GRADES, review.owner);
    const next = { ...current, ...patch, version: current.version + 1 };
    rows[i] = next;
    await AsyncStorage.setItem(key(review.owner), JSON.stringify(rows));
    return next;
  });
}

export async function prepareFirstReview(review: FirstReview) {
  if (review.card && review.step !== 'conflict') return review;
  const card = await loadFirstReviewCard(review.owner, review.word);
  return change(review, { card, step: 'recall', previous: undefined });
}

export async function revealFirstReview(review: FirstReview) {
  if (review.step !== 'recall' || !review.card) return review;
  const next = await change(review, { step: 'answer' });
  event(next, EVENTS.FIRST_REVIEW_REVEALED, { $insert_id: next.id + '-reveal-' + next.version });
  return next;
}

export async function chooseFirstGrade(review: FirstReview, grade: WordConfidence) {
  if (review.step !== 'answer' || !review.card) return review;
  const attempt = {
    id: randomUUID(),
    session: currentReminderSession(),
    grade,
    update: gradeWord(review.card.row, CONFIDENCE_TO_RATING[grade], new Date()),
  };
  const next = await change(review, { attempt, step: grade === 'unknown' ? 'restudy' : 'writing' });
  return next.step === 'restudy' ? next : confirmFirstGrade(next);
}

export async function confirmFirstGrade(review: FirstReview) {
  const { card, attempt } = review;
  if (!card || !attempt || !['writing', 'error', 'restudy'].includes(review.step)) return review;
  const pending = review.step === 'writing' ? review : await change(review, { step: 'writing' });
  let result;
  try {
    widgetGradeSubmitted(review.owner);
    result = await sendFirstReview(pending, card, attempt);
  } catch {
    const next = await change(pending, { step: 'error' });
    event(next, EVENTS.FIRST_REVIEW_WRITE_RESULT, {
      attempt_id: attempt.id,
      outcome: 'unconfirmed',
      $insert_id: attempt.id + '-unconfirmed',
    });
    return next;
  }
  if (result.status === 'conflict') {
    const next = await change(pending, {
      step: 'conflict',
      attempt: undefined,
      previous: undefined,
    });
    event(next, EVENTS.FIRST_REVIEW_WRITE_RESULT, {
      attempt_id: attempt.id,
      outcome: 'conflict',
      $insert_id: attempt.id + '-conflict',
    });
    return next;
  }
  const next = await change(pending, {
    step: result.complete ? 'complete' : 'recall',
    attempt: undefined,
    previous: attempt.id,
    due: result.due,
    completedAt: result.complete ? Date.parse(result.reviewed) : undefined,
    completionSession: result.complete ? attempt.session : undefined,
    firstGrade: pending.firstGrade ?? attempt.grade,
    card: { ...card, revision: result.revision, row: { ...card.row, ...attempt.update } },
  });
  event(next, EVENTS.REVIEW_WORD_GRADED, {
    attempt_id: attempt.id,
    confidence: attempt.grade,
    $insert_id: attempt.id,
  });
  event(next, EVENTS.FIRST_REVIEW_WRITE_RESULT, {
    attempt_id: attempt.id,
    outcome: result.replayed ? 'reconciled' : 'confirmed',
    $insert_id: attempt.id + '-confirmed',
  });
  void recordStudyDay(new Date(result.reviewed));
  if (result.complete) {
    await recordFirstReminderReview(next.id, next.owner).catch(() => undefined);
    event(next, EVENTS.PRACTICE_SESSION_COMPLETE, {
      wordsReviewed: 1,
      $insert_id: next.id + '-complete',
    });
    void trackActivated();
    void recordSessionCompleted();
    void appendSession(
      next.firstGrade === 'unknown' ? 0 : 1,
      next.firstGrade === 'unknown' ? 1 : 0,
    );
  }
  return next;
}

export async function leaveFirstReview(review: FirstReview) {
  // Keep a submitted grade, or an unfinished drill, available after a cold start.
  if (review.step !== 'complete')
    event(review, EVENTS.REVIEW_SESSION_ABANDONED, {
      step: review.step,
      $insert_id: review.id + '-exit-' + review.version,
    });
  if (review.attempt || (review.previous && review.step !== 'complete')) return;
  await queue(async () => {
    const rows = await read(review.owner);
    const remaining = rows.filter(r => r.id !== review.id || r.version !== review.version);
    if (remaining.length) await AsyncStorage.setItem(key(review.owner), JSON.stringify(remaining));
    else await AsyncStorage.removeItem(key(review.owner));
  });
}
