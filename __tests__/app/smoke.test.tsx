import React, { type ReactNode } from 'react';
jest.mock('@/utils/splashPolyfill');
jest.mock('expo', () => ({ requireOptionalNativeModule: () => undefined }));

// Mock React Native Dimensions for layout constants
jest.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: 375, height: 812, scale: 2, fontScale: 1 }),
  },
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios || obj.default,
  },
}));

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
