import { wordManagementService } from '../../services/wordManagement';
import type { StudyWord } from '../../types/vocabulary.types';
import { fsrs, generatorParameters, Rating } from 'ts-fsrs';

jest.mock('../../services/supabase', () => {
  const eqFinal = jest.fn().mockResolvedValue({ error: null });
  const eqFirst = jest.fn(() => ({ eq: eqFinal }));
  const update = jest.fn(() => ({ eq: eqFirst }));
  const from = jest.fn(() => ({ update }));
  return {
    supabase: { from },
    checkAuthentication: jest.fn().mockResolvedValue(undefined),
    __mocks: { from, update, eqFirst, eqFinal },
  };
});

jest.mock('ts-fsrs', () => ({
  fsrs: jest.fn(),
  generatorParameters: jest.fn(() => ({})),
  Rating: { Good: 'Good', Again: 'Again' },
  createEmptyCard: jest.fn(),
}));

const { supabase, __mocks } = require('../../services/supabase');

const baseWord = (): StudyWord => ({
  root_id: 1,
  user_id: 'u1',
  created_at: '2024-01-01',
  fsrs_due: '2024-01-01T00:00:00.000Z',
  fsrs_stability: 1,
  fsrs_difficulty: 5,
  fsrs_elapsed_days: 0,
  fsrs_scheduled_days: 0,
  fsrs_learning_steps: 0,
  fsrs_reps: 0,
  fsrs_lapses: 0,
  fsrs_state: 0,
  fsrs_last_review: null,
  difficulty: 0,
  success_streak: 0,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
});

afterEach(() => {
  jest.useRealTimers();
});

it('markAsEasy calculates adjusted card data and updates the database', async () => {
  const newCard = {
    due: new Date('2024-01-02T00:00:00.000Z'),
    stability: 2,
    difficulty: 5,
    elapsed_days: 1,
    scheduled_days: 2,
    learning_steps: 0,
    reps: 1,
    lapses: 2,
    state: 1,
  };
  (fsrs as jest.Mock).mockReturnValue({ next: jest.fn(() => ({ card: newCard })) });

  await wordManagementService.markAsEasy('u1', baseWord());

  const expected = {
    fsrs_due: newCard.due.toISOString(),
    fsrs_stability: 3,
    fsrs_difficulty: 4,
    fsrs_elapsed_days: 1,
    fsrs_scheduled_days: 2,
    fsrs_reps: 1,
    fsrs_learning_steps: 0,
    fsrs_lapses: 1,
    fsrs_state: 1,
    fsrs_last_review: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  };

  expect(__mocks.update).toHaveBeenCalledWith(expected);
  expect(__mocks.eqFirst).toHaveBeenCalledWith('user_id', 'u1');
  expect(__mocks.eqFinal).toHaveBeenCalledWith('root_id', 1);
});

it('markAsHard increases difficulty and reduces stability as expected', async () => {
  const newCard = {
    due: new Date('2024-01-05T00:00:00.000Z'),
    stability: 3,
    difficulty: 4,
    elapsed_days: 1,
    scheduled_days: 3,
    learning_steps: 0,
    reps: 1,
    lapses: 0,
    state: 1,
  };
  (fsrs as jest.Mock).mockReturnValue({ next: jest.fn(() => ({ card: newCard })) });

  await wordManagementService.markAsHard('u1', baseWord());

  const expected = {
    fsrs_due: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    fsrs_stability: 3*0.7,
    fsrs_difficulty: 5,
    fsrs_elapsed_days: 1,
    fsrs_scheduled_days: 3,
    fsrs_reps: 1,
    fsrs_learning_steps: 0,
    fsrs_lapses: 1,
    fsrs_state: 1,
    fsrs_last_review: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  };

  expect(__mocks.update).toHaveBeenCalledWith(expected);
});

it('skipForToday sets the due date to tomorrow at 9 AM', async () => {
  await wordManagementService.skipForToday('u1', 1);
  const expectedDate = new Date('2024-01-02T09:00:00.000Z').toISOString();
  expect(__mocks.update).toHaveBeenCalledWith({ fsrs_due: expectedDate });
  expect(__mocks.eqFirst).toHaveBeenCalledWith('user_id', 'u1');
  expect(__mocks.eqFinal).toHaveBeenCalledWith('root_id', 1);
});
