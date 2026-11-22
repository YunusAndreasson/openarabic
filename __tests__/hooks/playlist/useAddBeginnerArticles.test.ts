import { expect, jest, test } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/playlist/useAddBeginnerArticles';
import { bookmarkService } from '@/services/bookmark';
import { handleError } from '@/utils/errorHandling';

const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'reader' } }) }));
jest.mock('@/constants/queries', () => ({
  articleQueries: {
    all: () => ({
      queryKey: ['articles'],
      queryFn: () => [{ id: 1, author: { id: 1 }, difficulty_level: 1, article_sentences: [] }],
    }),
  },
}));
jest.mock('@/services/bookmark', () => ({ bookmarkService: { addManyToReadingList: jest.fn() } }));
jest.mock('@/utils/errorHandling', () => ({ handleError: jest.fn() }));

test('a failed save leaves the connection toast to the shared error handler', async () => {
  const offline = new Error('No network connection available');
  jest.mocked(bookmarkService.addManyToReadingList).mockRejectedValue(offline);
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  const { result } = renderHook(() => useAddBeginnerArticles(), { wrapper });

  await waitFor(() => expect(result.current.hasArticlesAvailable).toBe(true));
  act(() => result.current.addArticles());
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(mockShowToast).not.toHaveBeenCalled();
  expect(handleError).toHaveBeenCalledWith(offline, {
    toastMessage: STRINGS.FAILED_TO_ADD_BEGINNER_ARTICLES,
  });
});
