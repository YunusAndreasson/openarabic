import { renderHook, act } from '@testing-library/react-native';
import { Rating } from 'ts-fsrs';
import { useFSRS } from '../../../hooks/vocabulary/useFSRS';
import type { StudyWord } from '../../../types/vocabulary.types';

jest.mock('../../../services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(),
    updateWordAndReview: jest.fn().mockResolvedValue(true),
  },
  FSRS_QUERY_KEYS: {
    due: () => ['due'],
    all: () => ['all'],
  },
}));

const { studyWordsFSRSService } = require('../../../services/studyWordsFSRS');
const reactQuery = require('@tanstack/react-query');

const baseWord = (id: number, dueOffset = 0): StudyWord => {
  const now = Date.now();
  return {
    root_id: id,
    user_id: 'u1',
    created_at: new Date(now).toISOString(),
    fsrs_due: new Date(now + dueOffset * 3600 * 1000).toISOString(),
    fsrs_stability: 0,
    fsrs_difficulty: 6.5,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 0,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: 0,
    fsrs_last_review: null,
    difficulty: 0,
    success_streak: 0,
    root: undefined,
  } as unknown as StudyWord;
};

beforeEach(() => {
  jest.clearAllMocks();
  (reactQuery.useQuery as jest.Mock).mockReturnValue({
    data: [],
    isLoading: false,
    refetch: jest.fn(),
  });
});

it('initializes queue with due words', () => {
  const words = [baseWord(1, -1), baseWord(2, 1)];
  (reactQuery.useQuery as jest.Mock).mockReturnValue({
    data: words,
    isLoading: false,
    refetch: jest.fn(),
  });

  const { result } = renderHook(() => useFSRS({ userId: 'u1' }));

  act(() => {
    jest.runAllTimers();
  });

  expect(result.current.wordQueue.length).toBe(2);
  expect(result.current.currentWord?.root_id).toBe(1);
});

it('updates known word and completes session', async () => {
  const words = [baseWord(1, -1)];
  (reactQuery.useQuery as jest.Mock).mockReturnValue({
    data: words,
    isLoading: false,
    refetch: jest.fn(),
  });

  const { result } = renderHook(() => useFSRS({ userId: 'u1' }));

  act(() => {
    jest.runAllTimers();
  });

  await act(async () => {
    await result.current.updateWord(1, 'known');
    jest.runAllTimers();
  });

  expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
    'u1',
    1,
    expect.any(Object),
    Rating.Good,
    expect.any(Number)
  );
  expect(result.current.isComplete).toBe(true);
});

it('requeues word when marked vague', async () => {
  const words = [baseWord(1, -1), baseWord(2, -2)];
  (reactQuery.useQuery as jest.Mock).mockReturnValue({
    data: words,
    isLoading: false,
    refetch: jest.fn(),
  });

  const { result } = renderHook(() => useFSRS({ userId: 'u1' }));

  act(() => {
    jest.runAllTimers();
  });

  const firstId = result.current.currentWord?.root_id as number;

  await act(async () => {
    await result.current.updateWord(firstId, 'vague');
    jest.runAllTimers();
  });

  expect(result.current.wordQueue.length).toBe(1);
  expect(result.current.currentWord?.root_id).not.toBe(firstId);
  expect(result.current.isComplete).toBe(false);
});
