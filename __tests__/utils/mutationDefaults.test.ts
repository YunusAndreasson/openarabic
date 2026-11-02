/**
 * Offline writes must land in the order they were made.
 *
 * A grade writes a card's whole FSRS state, so whichever write lands last wins.
 * `resumePausedMutations` — on reconnect, or on restart through the persisted
 * cache — continues every paused mutation at once, so without a shared scope a
 * slow first write lands after the later ones and its older state wins.
 */

import { describe, expect, jest, test, afterEach } from '@jest/globals';
import {
  MutationObserver,
  QueryClient,
  dehydrate,
  hydrate,
  onlineManager,
} from '@tanstack/react-query';
import { State } from 'ts-fsrs';

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    updateWordAndReview: jest.fn(),
    setFSRSStudyRoot: jest.fn(),
  },
}));

jest.mock('@/services/bookmark', () => ({
  bookmarkService: {
    addToReadingList: jest.fn(),
    removeFromReadingList: jest.fn(),
  },
}));

import { bookmarkService } from '@/services/bookmark';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { FSRSWordUpdate } from '@/types/fsrs.types';
import type { ArticleId, RootId } from '@/types/branded.types';
import {
  fsrsGradeMutation,
  readingListAddMutation,
  readingListRemoveMutation,
  registerMutationDefaults,
  studyWordToggleMutation,
  type FSRSGradeVariables,
  type ReadingListVariables,
} from '@/utils/mutationDefaults';

const gradeWithReps = (reps: number): FSRSWordUpdate => ({
  fsrs_difficulty: 5,
  fsrs_due: '2026-10-02T00:00:00.000Z',
  fsrs_lapses: 0,
  fsrs_last_review: '2026-10-01T00:00:00.000Z',
  fsrs_learning_steps: 0,
  fsrs_model: 'FSRS-6',
  fsrs_stability_fast: null,
  fsrs_fast_reviewed_at: null,
  fsrs_reps: reps,
  fsrs_scheduled_days: 1,
  fsrs_stability: 1,
  fsrs_state: State.Review,
});

function createClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: { mutations: { networkMode: 'online', retry: false } },
  });
  registerMutationDefaults(client);
  return client;
}

/** Queue a grade the way a restored mutation runs: key only, mutationFn from the defaults. */
function queueGrade(client: QueryClient, reps: number): void {
  const observer = new MutationObserver<unknown, Error, FSRSGradeVariables>(client, {
    mutationKey: fsrsGradeMutation.mutationKey,
  });
  observer.mutate({ userId: 'user-1', rootId: 7 as RootId, update: gradeWithReps(reps) });
}

/** Kill and relaunch: whatever was paused goes through the persisted cache. */
function restart(client: QueryClient): QueryClient {
  const persisted = JSON.parse(JSON.stringify(dehydrate(client))) as ReturnType<typeof dehydrate>;
  client.clear(); // the killed process takes its in-memory writes with it
  const restartedClient = createClient();
  hydrate(restartedClient, persisted);
  return restartedClient;
}

describe('registerMutationDefaults', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  test('paused grades resume one at a time, so the newest grade is the one stored', async () => {
    // The "row" the writes land on. The first write is the slowest, which is
    // exactly the case where parallel resumption stores the oldest state.
    let storedReps: number | null = null;
    const inFlight: number[] = [];
    let maxConcurrent = 0;
    jest
      .mocked(studyWordsFSRSService.updateWordAndReview)
      .mockImplementation(async (_userId, _rootId, update) => {
        inFlight.push(update.fsrs_reps);
        maxConcurrent = Math.max(maxConcurrent, inFlight.length);
        const delayMs = update.fsrs_reps === 1 ? 30 : 0;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        storedReps = update.fsrs_reps;
        inFlight.splice(inFlight.indexOf(update.fsrs_reps), 1);
      });

    onlineManager.setOnline(false);
    const offlineClient = createClient();
    queueGrade(offlineClient, 1); // Forgot
    queueGrade(offlineClient, 2); // Knew it (drill)
    queueGrade(offlineClient, 3); // Knew it (drill)

    // Let them reach the paused state (execute() awaits onMutate before it
    // can pause) — the state the app is in when it is killed while offline.
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(
      offlineClient
        .getMutationCache()
        .getAll()
        .map(m => m.state.isPaused),
    ).toEqual([true, true, true]);

    const restartedClient = restart(offlineClient);

    onlineManager.setOnline(true);
    await restartedClient.resumePausedMutations();

    expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(3);
    expect(maxConcurrent).toBe(1);
    expect(storedReps).toBe(3);
  });

  // The playlist's delete and the reader's bookmark now go through these
  // mutations, so a paused one has to survive a restart like a grade does.
  test('a playlist change made offline still runs after a restart', async () => {
    jest.mocked(bookmarkService.removeFromReadingList).mockResolvedValue(undefined);

    onlineManager.setOnline(false);
    const offlineClient = createClient();
    new MutationObserver<unknown, Error, ReadingListVariables>(offlineClient, {
      mutationKey: readingListRemoveMutation.mutationKey,
    }).mutate({ userId: 'user-1', articleId: 3 as ArticleId });
    await new Promise(resolve => setTimeout(resolve, 0));

    const restartedClient = restart(offlineClient);
    onlineManager.setOnline(true);
    await restartedClient.resumePausedMutations();

    expect(bookmarkService.removeFromReadingList).toHaveBeenCalledWith(
      'user-1',
      3 as ArticleId,
      expect.objectContaining({ managed: true }),
    );
  });

  // The guarantee that replaced a "keep the two in sync" comment: the hooks
  // spread these very objects, so the registered default IS the hook's options.
  test.each([
    ['grade', fsrsGradeMutation],
    ['study-word toggle', studyWordToggleMutation],
    ['reading-list add', readingListAddMutation],
    ['reading-list remove', readingListRemoveMutation],
  ] as const)('registers the %s mutation under its own key', (_name, mutation) => {
    const client = createClient();

    expect(client.getMutationDefaults(mutation.mutationKey)).toMatchObject({
      mutationFn: mutation.mutationFn,
      scope: mutation.scope,
    });
  });
});
