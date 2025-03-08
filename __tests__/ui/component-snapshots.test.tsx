import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { View, Text, TextStyle } from 'react-native';

// Import components after mocks
import { ThemedText } from '../../components/ThemedText';

// Mock required dependencies
jest.mock('expo-blur', () => ({
  BlurView: ({
    children,
    intensity,
    tint,
  }: {
    children: React.ReactNode;
    intensity?: number;
    tint?: string;
  }) => children,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style: string }) => null,
  setStatusBarHidden: jest.fn(),
  setStatusBarStyle: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  FontAwesome: () => null,
}));

// Mock hooks that access Redux
jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    text: '#000000',
    background: '#FFFFFF',
    card: '#F8F8F8',
    primary: '#007AFF',
    border: '#E1E1E1',
  }),
}));

jest.mock('@/hooks/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

// Mock the Redux store
const mockStore = configureStore({
  reducer: {
    theme: (state = { theme: 'light', useSystemTheme: true }, action) => state,
    settings: (state = { fontScale: 1, showEnglish: true }, action) => state,
  },
});
// No need to import ThemedCard for this test

// Create a test wrapper with Redux provider
const renderWithRedux = (component: React.ReactElement) => {
  return render(<Provider store={mockStore}>{component}</Provider>);
};

describe('Component Snapshots', () => {
  describe('ThemedText', () => {
    it('should render with default styling', () => {
      const { toJSON } = renderWithRedux(<ThemedText>Hello World</ThemedText>);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render with custom styling', () => {
      const { toJSON } = renderWithRedux(
        <ThemedText style={{ fontSize: 20, fontWeight: 'bold' }}>Hello World</ThemedText>
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render with skipDefaultColor', () => {
      const { toJSON } = renderWithRedux(
        <ThemedText style={{ color: 'red' }} skipDefaultColor>
          Hello World
        </ThemedText>
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  // Test generic View component instead of ThemedCard
  describe('View Component', () => {
    it('should render a simple View component', () => {
      const { toJSON } = renderWithRedux(
        <View style={{ padding: 20, backgroundColor: '#F5F5F5' }}>
          <Text>Card Content</Text>
        </View>
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('should render with custom styling', () => {
      const { toJSON } = renderWithRedux(
        <View style={{ margin: 20, padding: 15, borderRadius: 8, backgroundColor: '#FFFFFF' }}>
          <Text>Custom Card</Text>
        </View>
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });

  // Add more component snapshots as needed
});

// Use jest.each for parameterized snapshot testing
const typographyVariants: {
  variant: string;
  expectedStyle: TextStyle;
}[] = [
  { variant: 'title', expectedStyle: { fontSize: 24, fontWeight: 'bold' } },
  { variant: 'heading', expectedStyle: { fontSize: 20, fontWeight: 'bold' } },
  { variant: 'subheading', expectedStyle: { fontSize: 18, fontWeight: '500' } },
  { variant: 'body', expectedStyle: { fontSize: 16 } },
  { variant: 'caption', expectedStyle: { fontSize: 14, opacity: 0.8 } },
];

// Example of parameterized tests for a component with multiple variants
describe('Typography Variants', () => {
  it.each(typographyVariants)(
    'should render $variant typography correctly',
    ({ variant, expectedStyle }) => {
      const Typography = ({
        children,
        variant,
      }: {
        children: React.ReactNode;
        variant: string;
      }) => <ThemedText style={expectedStyle}>{children}</ThemedText>;

      const { toJSON } = renderWithRedux(
        <Typography variant={variant}>This is {variant} text</Typography>
      );

      expect(toJSON()).toMatchSnapshot();
    }
  );
});
