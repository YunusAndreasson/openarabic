import { expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import TabLayout from '@/app/(tabs)/_layout';

const mockTab = jest.fn<(name: string) => void>();
const mockDueCount = jest.fn<(options: { userId?: string }) => number>(() => 0);
jest.mock('expo-router', () => ({ usePathname: () => '/explore', router: {} }));
jest.mock('expo-router/native-tabs', () => {
  function NativeTabs({ children }: { children: ReactNode }) {
    return children;
  }
  NativeTabs.Trigger = Object.assign(
    ({ name }: { name: string }) => {
      mockTab(name);
      return null;
    },
    { Icon: () => null, Label: () => null, Badge: () => null },
  );
  return { NativeTabs };
});
jest.mock('@/hooks/auth', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useDueWordsCount: (options: { userId?: string }) => mockDueCount(options),
}));
jest.mock('@/hooks/ui/useTabBarAutoHide', () => ({ useIsTabBarHidden: () => false }));

test('guests and signed-in readers use the same native tabs, with no guest due badge', () => {
  mockDueCount.mockReturnValue(0);
  render(<TabLayout />);
  expect(mockTab.mock.calls.flat()).toEqual(['explore', 'playlist', 'practice', 'account']);
  expect(mockDueCount).toHaveBeenCalledWith(expect.objectContaining({ userId: undefined }));
});
