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

// The suite-wide mock replaces QueryClient; this exercises the real scheduler.
jest.unmock('@tanstack/react-query');

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    updateWordAndReview: jest.fn(),
    setFSRSStudyRoot: jest.fn(),
  },
}));

import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { FSRSWordUpdate } from '@/types/fsrs.types';
import type { RootId } from '@/types/branded.types';
import { FSRS_GRADE_MUTATION_KEY, registerMutationDefaults } from '@/utils/mutationDefaults';

type GradeVariables = { userId: string; rootId: RootId; update: FSRSWordUpdate };

const gradeWithReps = (reps: number): FSRSWordUpdate => ({
  fsrs_difficulty: 5,
  fsrs_due: '2026-10-02T00:00:00.000Z',
  fsrs_lapses: 0,
  fsrs_last_review: '2026-10-01T00:00:00.000Z',
  fsrs_learning_steps: 0,
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
  const observer = new MutationObserver<unknown, Error, GradeVariables>(client, {
    mutationKey: FSRS_GRADE_MUTATION_KEY,
  });
  observer.mutate({ userId: 'user-1', rootId: 7 as RootId, update: gradeWithReps(reps) });
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
        return true;
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

    // Kill and relaunch: the paused writes go through the persisted cache.
    const persisted = JSON.parse(JSON.stringify(dehydrate(offlineClient))) as ReturnType<
      typeof dehydrate
    >;
    offlineClient.clear(); // the killed process takes its in-memory writes with it
    const restartedClient = createClient();
    hydrate(restartedClient, persisted);

    onlineManager.setOnline(true);
    await restartedClient.resumePausedMutations();

    expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(3);
    expect(maxConcurrent).toBe(1);
    expect(storedReps).toBe(3);
  });
});
