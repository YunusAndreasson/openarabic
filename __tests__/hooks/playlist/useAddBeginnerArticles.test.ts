import { afterEach, expect, jest, test } from '@jest/globals';
import { dehydrate, hydrate, onlineManager, QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { articleId } from '@/__tests__/helpers/ids';
import { readingProgressQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/playlist/useAddBeginnerArticles';
import { bookmarkService } from '@/services/bookmark';
import { handleError } from '@/utils/errorHandling';
import { registerMutationDefaults } from '@/utils/mutationDefaults';
import { reportQueryFailure } from '@/utils/queryMeta';
import { SupabaseRequestError } from '@/utils/supabaseHelpers';

const mockShowToast = jest.fn();
jest.mock('@/components/providers', () => ({ useToast: () => ({ showToast: mockShowToast }) }));
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'reader' } }) }));
jest.mock('@/constants/queries', () => ({
  readingProgressQueries: { onListChanged: jest.fn() },
  articleQueries: {
    all: () => ({
      queryKey: ['articles'],
      queryFn: () => [{ id: 1, author: { id: 1 }, difficulty_level: 1, article_sentences: [] }],
    }),
  },
}));
jest.mock('@/services/bookmark', () => ({ bookmarkService: { addManyToReadingList: jest.fn() } }));
jest.mock('@/utils/errorHandling', () => ({ handleError: jest.fn() }));

afterEach(() => onlineManager.setOnline(true));

const serviceReport = { toastMessage: STRINGS.FAILED_TO_ADD_TO_READING_LIST };
test.each([
  [
    'uncategorized error',
    new Error('No network connection available'),
    { toastMessage: STRINGS.FAILED_TO_ADD_BEGINNER_ARTICLES },
  ],
  [
    'managed Supabase error',
    new SupabaseRequestError({ message: 'Network request failed' }, 0, serviceReport),
    serviceReport,
  ],
] as const)(
  'reports a failed save exactly once through the mutation cache (%s)',
  async (_case, offline, expectedReport) => {
    jest.mocked(bookmarkService.addManyToReadingList).mockRejectedValue(offline);
    const { wrapper, queryClient } = createHookTestWrapper({ withRedux: true });
    queryClient.getMutationCache().config.onError = (error, _variables, _context, mutation) =>
      reportQueryFailure(error, mutation.meta);
    const { result } = renderHook(() => useAddBeginnerArticles(), { wrapper });

    await waitFor(() => expect(result.current.hasArticlesAvailable).toBe(true));
    act(() => result.current.addArticles());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(offline, expectedReport);
  },
);

test('an offline tap restores the same reader and articles after a restart', async () => {
  const { wrapper, queryClient } = createHookTestWrapper({ withRedux: true });
  const { result, unmount } = renderHook(() => useAddBeginnerArticles(), { wrapper });
  await waitFor(() => expect(result.current.hasArticlesAvailable).toBe(true));
  onlineManager.setOnline(false);
  act(() => result.current.addArticles());
  await waitFor(() => expect(result.current.isLoading).toBe(true));
  const persisted = JSON.parse(JSON.stringify(dehydrate(queryClient)));
  unmount();
  queryClient.clear();

  const restored = new QueryClient();
  registerMutationDefaults(restored);
  hydrate(restored, persisted);
  onlineManager.setOnline(true);
  await restored.resumePausedMutations();

  expect(bookmarkService.addManyToReadingList).toHaveBeenCalledTimes(1);
  expect(bookmarkService.addManyToReadingList).toHaveBeenCalledWith(
    'reader',
    [articleId(1)],
    expect.objectContaining({ managed: true }),
  );
  expect(readingProgressQueries.onListChanged).toHaveBeenCalledWith(restored, 'reader');
  restored.clear();
});
