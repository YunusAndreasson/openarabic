import { act, renderHook } from '@testing-library/react-native';
import { useWordManagement } from '../../../hooks/vocabulary/useWordManagement';

jest.mock('../../../hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('@tanstack/react-query', () => {
  const invalidateQueries = jest.fn();
  return {
    __esModule: true,
    useQueryClient: () => ({ invalidateQueries }),
    __invalidateQueries: invalidateQueries,
  };
});

const { __invalidateQueries: invalidateQueries } = require('@tanstack/react-query');

jest.mock('../../../services/wordManagement', () => {
  const removeFromStudy = jest.fn().mockResolvedValue(undefined);
  const resetProgress = jest.fn().mockResolvedValue(undefined);
  const skipForToday = jest.fn().mockResolvedValue(undefined);
  const markAsEasy = jest.fn().mockResolvedValue(undefined);
  const markAsHard = jest.fn().mockResolvedValue(undefined);
  return {
    __esModule: true,
    wordManagementService: {
      removeFromStudy,
      resetProgress,
      skipForToday,
      markAsEasy,
      markAsHard,
    },
    __mocks: {
      removeFromStudy,
      resetProgress,
      skipForToday,
      markAsEasy,
      markAsHard,
    },
  };
});

const {
  __mocks: { removeFromStudy, resetProgress, skipForToday, markAsEasy, markAsHard },
} = require('../../../services/wordManagement');

jest.mock('../../../utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

jest.mock('../../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const baseWord: any = {
  root_id: 1,
  user_id: 'u1',
  root: { letters: 'كتاب', meaning: 'book' },
  created_at: '',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useWordManagement', () => {
  it('shows and hides the management modal', () => {
    const { result } = renderHook(() => useWordManagement());

    act(() => {
      result.current.showWordManagement(baseWord);
    });

    const { selectionFeedback } = require('../../../utils/haptics');
    expect(selectionFeedback).toHaveBeenCalled();
    expect(result.current.isModalVisible).toBe(true);
    expect(result.current.selectedWord).toBe(baseWord);

    act(() => {
      result.current.hideWordManagement();
    });

    expect(result.current.isModalVisible).toBe(false);
    expect(result.current.selectedWord).toBeNull();
  });

  const actions: Array<
    [
      keyof ReturnType<typeof useWordManagement>,
      string,
      'onWordRemoved' | 'onWordUpdated',
      (word: any) => any
    ]
  > = [
    ['handleRemoveFromStudy', 'removeFromStudy', 'onWordRemoved', w => w.root_id],
    ['handleResetProgress', 'resetProgress', 'onWordUpdated', w => w.root_id],
    ['handleSkipForToday', 'skipForToday', 'onWordUpdated', w => w.root_id],
    ['handleMarkAsEasy', 'markAsEasy', 'onWordUpdated', w => w],
    ['handleMarkAsHard', 'markAsHard', 'onWordUpdated', w => w],
  ];

  test.each(actions)(
    '%s calls service and invalidates queries',
    async (action, serviceMethod, callbackKey, argFn) => {
      const callbacks = { onWordRemoved: jest.fn(), onWordUpdated: jest.fn() };
      const { result } = renderHook(() => useWordManagement(callbacks));

      await act(async () => {
        // @ts-ignore dynamic access
        await result.current[action](baseWord);
      });

      const service = require('../../../services/wordManagement').wordManagementService;
      expect(service[serviceMethod]).toHaveBeenCalledWith('u1', argFn(baseWord));
      expect(invalidateQueries).toHaveBeenCalledTimes(5);
      expect(callbacks[callbackKey]).toHaveBeenCalledWith(baseWord);
    }
  );
});
