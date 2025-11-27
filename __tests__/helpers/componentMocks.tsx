/**
 * Component Mock Factories
 *
 * Shared mocks for component tests - useColors, theming, and react-native-reanimated.
 * These mocks eliminate duplication across 18+ component test files.
 *
 * Usage:
 * ```typescript
 * // In your test file, use require() inside jest.mock() for hoisting compatibility:
 * jest.mock('@/hooks/theme/useColors', () =>
 *   require('@/__tests__/helpers/componentMocks').useColorsMockFactory()
 * );
 *
 * jest.mock('react-native-reanimated', () =>
 *   require('@/__tests__/helpers/componentMocks').createReanimatedMock()
 * );
 * ```
 */

import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';

// ============================================================================
// THEME / COLORS MOCKS
// ============================================================================

/**
 * Comprehensive mock colors covering all usage across the test suite.
 * Includes: basic colors, grammar colors, elevation colors, state colors.
 */
export const mockColors = {
  // Basic text colors
  text: '#000000',
  arabicText: '#1a1a1a',
  secondaryText: '#666666',
  textTertiary: '#999999',
  headingText: '#1a1a1a',
  subtitleText: '#4a4a4a',
  white: '#FFFFFF',
  black: '#000000',

  // Theme colors
  tint: '#4a7c59',
  background: '#ffffff',
  transparent: 'transparent',

  // State colors
  disabled: '#cccccc',
  error: '#F44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#2196F3',

  // Grammar/category colors
  primary: '#2563eb',
  secondary: '#7c3aed',
  accent: '#dc2626',
  tertiary: '#ea580c',
  quaternary: '#059669',
  violet: '#8B5CF6',

  // Elevation colors
  elevation1: '#F5F5F5',
  elevation2: '#EEEEEE',
  elevation3: '#FFFFFF',
  card: '#f5f5f5',

  // UI element colors
  border: '#DDDDDD',
  borderOverlay: '#DDDDDD',
  cardBorder: '#CCCCCC',
  shadow: '#000000',
  icon: '#666666',
  modalIndicator: '#BDBDBD',

  // Tab/navigation colors
  tabIconDefault: '#888888',
  tabIconSelected: '#4A9B8E',
  navigationRipple: '#000000',
  tabBarOverlay: '#ffffff',
  headerOverlay: '#ffffff',
  textShadowLight: '#ffffff',
  textShadowDark: '#000000',

  // Special colors
  cardGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
  completionSuccess: '#10b981',
  progressIndicator: '#3b82f6',
  wordDueUnderline: '#FF5722',

  // Grammar colors (nested object for ColorCodedText)
  grammar: {
    preposition: '#AF8E2A',
    possessive: '#6B9B77',
    particle: '#A4A537',
    interrogative: '#3BACDA',
    verbConjugation: '#4AB088',
    negation: '#8D9544',
    subjectPrefix: '#6D9DCE',
    plural: '#94A642',
    demonstrative: '#2B9BBF',
    conjunction: '#8996D1',
    futureTense: '#9B8DD6',
    definiteArticle: '#C7894A',
  },
};

/**
 * Creates a useColors mock with optional overrides.
 * Returns the mock factory object for jest.mock().
 */
export const useColorsMockFactory = (overrides: Partial<typeof mockColors> = {}) => ({
  useColors: () => ({ ...mockColors, ...overrides }),
});

/**
 * Creates a useThemeDetection mock.
 * Returns the mock factory object for jest.mock().
 */
export const useThemeDetectionMockFactory = (isDarkMode = false) => ({
  useIsDarkMode: () => isDarkMode,
});

// ============================================================================
// REACT-NATIVE-REANIMATED MOCK
// ============================================================================

/**
 * Creates a comprehensive react-native-reanimated mock.
 * Covers all commonly used exports across component tests.
 */
export const createReanimatedMock = () => {
  const mockAnimation = {
    duration: () => mockAnimation,
    delay: () => mockAnimation,
    springify: () => mockAnimation,
    damping: () => mockAnimation,
    stiffness: () => mockAnimation,
  };

  const mockEasing = {
    linear: (x: number) => x,
    ease: (x: number) => x,
    quad: (x: number) => x * x,
    cubic: (x: number) => x * x * x,
    in: (easing: (x: number) => number) => easing,
    out: (easing: (x: number) => number) => easing,
    inOut: (easing: (x: number) => number) => easing,
    bezier: () => (x: number) => x,
  };

  return {
    __esModule: true,
    default: {
      View: React.forwardRef((props: any, ref: any) =>
        React.createElement(View, { ...props, ref }),
      ),
      Text: React.forwardRef((props: any, ref: any) =>
        React.createElement(Text, { ...props, ref }),
      ),
      ScrollView: React.forwardRef((props: any, ref: any) =>
        React.createElement(ScrollView, { ...props, ref }),
      ),
      Image: React.forwardRef((props: any, ref: any) =>
        React.createElement(Image, { ...props, ref }),
      ),
      createAnimatedComponent: (component: any) =>
        React.forwardRef((props: any, ref: any) =>
          React.createElement(component, { ...props, ref }),
        ),
    },
    Easing: mockEasing,
    // Layout animations
    FadeIn: mockAnimation,
    FadeInUp: mockAnimation,
    FadeInDown: mockAnimation,
    FadeOut: mockAnimation,
    FadeOutUp: mockAnimation,
    FadeOutDown: mockAnimation,
    SlideInRight: mockAnimation,
    SlideOutLeft: mockAnimation,
    ZoomIn: mockAnimation,
    ZoomOut: mockAnimation,
    // Hooks
    useSharedValue: (initialValue: any = 0) => ({
      value: initialValue,
      modify: jest.fn(),
    }),
    useAnimatedStyle: (styleCallback: () => any) => {
      try {
        return styleCallback() || {};
      } catch {
        return {};
      }
    },
    useDerivedValue: (derivation: () => any) => ({
      value: derivation(),
    }),
    useAnimatedProps: (propsCallback: () => any) => {
      try {
        return propsCallback() || {};
      } catch {
        return {};
      }
    },
    // Animation functions
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
    withDelay: (_delay: number, value: any) => value,
    withSequence: (...values: any[]) => values[values.length - 1],
    withRepeat: (value: any) => value,
    // Utilities
    runOnJS: (fn: Function) => fn,
    runOnUI: (fn: Function) => fn,
    interpolate: (value: number) => value,
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
    // Component creator
    createAnimatedComponent: (component: any) =>
      React.forwardRef((props: any, ref: any) =>
        React.createElement(component, { ...props, ref }),
      ),
  };
};

// ============================================================================
// SAFE AREA CONTEXT MOCK
// ============================================================================

/**
 * Creates a react-native-safe-area-context mock.
 */
export const createSafeAreaContextMock = (insets = { top: 44, bottom: 34, left: 0, right: 0 }) => ({
  useSafeAreaInsets: () => insets,
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
});

// ============================================================================
// ANIMATION HOOKS MOCK
// ============================================================================

/**
 * Creates mocks for @/hooks/animations.
 */
export const createAnimationHooksMock = () => ({
  useTransformAnimation: () => ({
    animatedStyle: {},
    setValue: jest.fn(),
  }),
  useOpacityAnimation: () => ({
    opacity: { value: 1 },
    fadeIn: jest.fn(),
    fadeOut: jest.fn(),
  }),
  useToggleAnimation: () => ({
    animatedStyle: {},
    toggle: jest.fn(),
    isActive: false,
  }),
});

// ============================================================================
// RESET UTILITIES
// ============================================================================

/**
 * Resets any stateful mocks.
 * Call in beforeEach for clean test isolation.
 */
export function resetComponentMocks() {
  // Currently stateless, but available for future use
}
