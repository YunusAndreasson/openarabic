import type { ReactNode } from 'react';
jest.mock('@/utils/splashPolyfill');
jest.mock('expo', () => ({ requireOptionalNativeModule: () => undefined }));
jest.mock('../../store/store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
    subscribe: jest.fn(),
  },
  persistor: {
    subscribe: jest.fn(),
    getState: jest.fn(() => ({ bootstrapped: true })),
    persist: jest.fn(),
    purge: jest.fn(),
    flush: jest.fn(),
    pause: jest.fn(),
  },
}));

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('../../hooks/auth/useAuth', () => ({
  useAuth: () => ({ session: null, isLoading: false }),
}));

jest.mock('../../hooks/app/useAppPreloader', () => ({
  useAppPreloader: () => ({
    preloadAppData: jest.fn(),
    isLoaded: true,
  }),
}));

jest.mock('../../hooks/app/useArticlesAndDueWordsLoaded', () => ({
  useReadTabDataLoaded: () => true,
  useArticlesAndDueWordsLoaded: () => true, // Keep for backward compatibility
}));

jest.mock('../../hooks/theme/useColors', () => ({
  useColors: () => ({ tint: '#000' }),
}));

jest.mock('../../hooks/theme/useSystemUITheme', () => ({
  useSystemUITheme: jest.fn(),
}));

jest.mock('expo-router', () => ({
  Stack: ({ children }: { children: ReactNode }) => <>{children}</>,
  useRouter: () => ({ replace: jest.fn() }),
  useNavigationContainerRef: () => null,
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModalProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

test('app entry loads without crashing', () => {
  expect(() => require('../../app/_layout')).not.toThrow();
});
