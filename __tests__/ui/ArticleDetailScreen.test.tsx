import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Mock expo-blur before importing the component
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

// Mock expo-status-bar before importing the component
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }: { style: string }) => null,
  setStatusBarHidden: jest.fn(),
  setStatusBarStyle: jest.fn(),
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return {
    Image,
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock necessary services
jest.mock('../../services/articles', () => ({
  articlesService: {
    getArticle: jest.fn().mockResolvedValue({ id: '1', title: 'Test Article' }),
  },
}));

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useLocalSearchParams: jest.fn(() => ({ id: '1' })),
}));

// Mock hooks
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isLoading: false,
  }),
}));

jest.mock('../../hooks/useColors', () => ({
  useColors: () => ({
    text: '#000000',
    background: '#FFFFFF',
    tint: '#3333FF',
    cardBackground: '#F5F5F5',
    cardBorder: '#E0E0E0',
  }),
}));

jest.mock('../../hooks/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

// Mock the react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    FadeIn: {
      duration: jest.fn(() => ({
        delay: jest.fn().mockReturnValue({}),
      })),
    },
    useSharedValue: jest.fn(initial => ({ value: initial })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn(value => value),
    useDerivedValue: jest.fn(fn => ({ value: fn() })),
    interpolate: jest.fn(),
    Extrapolate: { CLAMP: 'clamp' },
    default: View,
  };
});

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 10, bottom: 10, left: 0, right: 0 })),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Simple test component
const TestComponent = () => {
  type Article = { id: string; title: string };
  const [article, setArticle] = React.useState<Article | null>(null);
  const { articlesService } = require('../../services/articles');

  React.useEffect(() => {
    const fetchArticle = async () => {
      const data = await articlesService.getArticle('1');
      setArticle(data);
    };
    fetchArticle();
  }, []);

  if (!article) return <Text>Loading...</Text>;
  return (
    <View>
      <Text>{article.title}</Text>
    </View>
  );
};

describe('Article Detail Screen Mocking Setup', () => {
  it('should properly mock the article service', async () => {
    const { articlesService } = require('../../services/articles');

    // Test direct mock calls
    const article = await articlesService.getArticle('1');
    expect(article.id).toBe('1');
    expect(article.title).toBe('Test Article');
  });

  it('should work with a simple component', async () => {
    const { getByText } = render(<TestComponent />);

    // Initially shows loading
    expect(getByText('Loading...')).toBeTruthy();

    // Eventually shows the article title
    await waitFor(() => {
      expect(getByText('Test Article')).toBeTruthy();
    });
  });
});
