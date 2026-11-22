import { onlineManager } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { useExploreCatalog } from '@/hooks/explore/useExploreCatalog';
import { articlesService } from '@/services/articles';

jest.mock('@/services/articles');

test('a cold offline Explore offers retry and finishes loading after reconnect', async () => {
  const { wrapper, queryClient } = createHookTestWrapper();
  const originallyOnline = onlineManager.isOnline();
  onlineManager.setOnline(false);
  jest.mocked(articlesService.getArticles).mockResolvedValue([]);
  try {
    const { result } = renderHook(() => useExploreCatalog(false), { wrapper });
    expect(result.current.isCatalogLoading).toBe(false);
    expect(result.current.hasCatalogFailed).toBe(true);
    expect(articlesService.getArticles).not.toHaveBeenCalled();

    await act(async () => {
      void result.current.refetchCatalog();
      onlineManager.setOnline(true);
    });
    await waitFor(() => expect(result.current.hasCatalogFailed).toBe(false));
    expect(result.current.isCatalogLoading).toBe(false);
    expect(articlesService.getArticles).toHaveBeenCalledTimes(1);
  } finally {
    queryClient.clear();
    onlineManager.setOnline(originallyOnline);
  }
});
