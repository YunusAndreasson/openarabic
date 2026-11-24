import { act, renderHook } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { AppState, type AppStateStatus } from 'react-native';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { ROUTE_PATHS } from '@/constants/routes';
import { useFirstPage } from '@/hooks/onboarding/useFirstPage';
import { analytics } from '@/services/analytics';
import { accountSwitched } from '@/store/accountActions';

const mockDismiss = jest.fn();
jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  router: { dismissTo: (...args: unknown[]) => mockDismiss(...args) },
}));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));

describe('bundled reader', () => {
  beforeEach(() => {
    (AppState as { currentState: AppStateStatus }).currentState = 'active';
    jest
      .mocked(AppState.addEventListener)
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
        typeof AppState.addEventListener
      >);
  });
  test('a pair counts only when foreground, uncovered and scrolled into view, once across visits', () => {
    const { wrapper } = createHookTestWrapper({ withRedux: true });
    const first = renderHook(({ covered }: { covered: boolean }) => useFirstPage(covered), {
      wrapper,
      initialProps: { covered: true },
    });
    act(() => {
      first.result.current.setHeight(300);
      first.result.current.setPairTop(240);
      first.result.current.setArabicTop(100);
    });
    expect(analytics.track).not.toHaveBeenCalled();
    first.rerender({ covered: false });
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.FIRST_RUN_SHOWN, { version: 1 });
    expect(analytics.track).not.toHaveBeenCalledWith(
      ANALYTICS_EVENTS.FIRST_LINE_VISIBLE,
      expect.anything(),
    );
    act(() => first.result.current.scroll(100));
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.ARTICLE_VIEWED, {
      source: 'first_run_reader',
    });
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.FIRST_LINE_VISIBLE, {
      version: 1,
    });
    first.unmount();
    const next = renderHook(() => useFirstPage(false), { wrapper });
    act(() => {
      next.result.current.setHeight(300);
      next.result.current.setPairTop(240);
      next.result.current.setArabicTop(100);
    });
    expect(next.result.current.initialOffset).toBe(100);
    expect(
      jest
        .mocked(analytics.track)
        .mock.calls.filter(([name]) => name === ANALYTICS_EVENTS.FIRST_LINE_VISIBLE),
    ).toHaveLength(1);
  });
  test('hiding the hint keeps reading; Browse changes the next entry point and survives account switches', () => {
    const { wrapper, store } = createHookTestWrapper({ withRedux: true });
    const { result } = renderHook(() => useFirstPage(false), { wrapper });
    act(() => {
      result.current.hideTip();
      result.current.scroll(120);
      result.current.commitPosition();
    });
    expect(store?.getState().firstPage).toMatchObject({
      tipHidden: true,
      browsed: false,
      offset: 120,
    });
    act(() => result.current.exit('browse'));
    expect(mockDismiss).toHaveBeenCalledWith(ROUTE_PATHS.EXPLORE_TAB);
    expect(analytics.track).toHaveBeenCalledWith(ANALYTICS_EVENTS.FIRST_RUN_SKIPPED, {
      step: 'reader',
      method: 'browse',
    });
    act(() => {
      store?.dispatch(accountSwitched());
    });
    expect(store?.getState().firstPage).toMatchObject({ browsed: true, offset: 120 });
  });
  test('a background process cannot spend the first impression', () => {
    (AppState as { currentState: AppStateStatus }).currentState = 'background';
    const { wrapper } = createHookTestWrapper({ withRedux: true });
    const { result } = renderHook(() => useFirstPage(false), { wrapper });
    act(() => {
      result.current.setHeight(800);
      result.current.setPairTop(200);
      result.current.setArabicTop(100);
    });
    expect(analytics.track).not.toHaveBeenCalled();
  });
});
