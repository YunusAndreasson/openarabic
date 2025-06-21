import { wordManagementService } from '../../services/wordManagement';
import type { StudyWord } from '../../types/vocabulary.types';
import { fsrs, generatorParameters, Rating } from 'ts-fsrs';
import { supabase } from '../../services/supabase';

// Mock supabase
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
  checkAuthentication: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('ts-fsrs', () => ({
  fsrs: jest.fn(),
  generatorParameters: jest.fn(() => ({})),
  Rating: { Good: 'Good', Again: 'Again' },
  createEmptyCard: jest.fn(),
}));

const fromMock = supabase.from as jest.Mock;

const createUpdateBuilder = (response: any = { error: null }) => {
  const builder: any = {
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
  };
  // Make the final eq call return a promise
  builder.eq.mockImplementation((field: string, value: any) => {
    if (builder.eq.mock.calls.length === 2) {
      return Promise.resolve(response);
    }
    return builder;
  });
  return builder;
};

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

  const builder = createUpdateBuilder();
  fromMock.mockReturnValue(builder);

  await wordManagementService.markAsEasy('u1', baseWord());

  const expected = {
    fsrs_due: newCard.due.toISOString(),
    fsrs_stability: 3, // 2 * 1.5
    fsrs_difficulty: 4, // 5 - 1
    fsrs_elapsed_days: 1,
    fsrs_scheduled_days: 2,
    fsrs_reps: 1,
    fsrs_learning_steps: 0,
    fsrs_lapses: 1, // Math.max(0, 2 - 1)
    fsrs_state: 1,
    fsrs_last_review: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  };

  expect(fromMock).toHaveBeenCalledWith('study_words');
  expect(builder.update).toHaveBeenCalledWith(expected);
  expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
  expect(builder.eq).toHaveBeenCalledWith('root_id', 1);
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

  const builder = createUpdateBuilder();
  fromMock.mockReturnValue(builder);

  await wordManagementService.markAsHard('u1', baseWord());

  const expected = {
    fsrs_due: new Date('2024-01-01T00:00:00.000Z').toISOString(),
    fsrs_stability: 3 * 0.7, // 3 * 0.7
    fsrs_difficulty: 5, // min(10, 4 + 1)
    fsrs_elapsed_days: 1,
    fsrs_scheduled_days: 3,
    fsrs_reps: 1,
    fsrs_learning_steps: 0,
    fsrs_lapses: 1, // 0 + 1
    fsrs_state: 1,
    fsrs_last_review: new Date('2024-01-01T00:00:00.000Z').toISOString(),
  };

  expect(fromMock).toHaveBeenCalledWith('study_words');
  expect(builder.update).toHaveBeenCalledWith(expected);
  expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
  expect(builder.eq).toHaveBeenCalledWith('root_id', 1);
});

it('skipForToday sets the due date to tomorrow at 9 AM', async () => {
  const builder = createUpdateBuilder();
  fromMock.mockReturnValue(builder);

  await wordManagementService.skipForToday('u1', 1);

  const expectedDate = new Date('2024-01-02T09:00:00.000Z').toISOString();

  expect(fromMock).toHaveBeenCalledWith('study_words');
  expect(builder.update).toHaveBeenCalledWith({ fsrs_due: expectedDate });
  expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1');
  expect(builder.eq).toHaveBeenCalledWith('root_id', 1);
});
