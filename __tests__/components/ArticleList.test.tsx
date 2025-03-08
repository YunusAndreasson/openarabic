import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Import the component after mocking
import ArticleList from '../../components/ArticleList';
import { Article } from '../../types/articles.types';

// Mock the native modules before importing components
jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock the hooks
jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    tint: '#007AFF',
    cardBackground: '#FFFFFF',
    text: '#000000',
    background: '#FFFFFF',
  }),
}));

// Mock Animated components
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.FadeIn = { duration: () => ({ delay: () => ({}) }) };
  return {
    ...Reanimated,
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
  };
});

// Mock the Article type
jest.mock('../../types/database.types', () => ({}));

// Create a mock store
const mockStore = configureStore({
  reducer: {
    theme: (state = { theme: 'light' }) => state,
  },
});

// Wrapper component with Provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<Provider store={mockStore}>{ui}</Provider>);
};

describe('ArticleList', () => {
  // Create mock articles that match the Article type
  const mockArticles: Article[] = [
    {
      id: 1,
      title: 'Test Article 1',
      category: { id: 1, name: 'Category 1' } as any,
      author: { id: 1, name: 'Author 1' } as any,
      image_url: 'https://example.com/image1.jpg',
      audio_url: null,
      author_id: 1,
      category_id: 1,
      created_at: '2023-01-01',
      difficulty_level: 1,
      summary: null,
      article_sentences: [],
    },
    {
      id: 2,
      title: 'Test Article 2',
      category: { id: 2, name: 'Category 2' } as any,
      author: { id: 2, name: 'Author 2' } as any,
      image_url: 'https://example.com/image2.jpg',
      audio_url: null,
      author_id: 2,
      category_id: 2,
      created_at: '2023-01-01',
      difficulty_level: 1,
      summary: null,
      article_sentences: [],
    },
  ];

  const mockProps = {
    articles: mockArticles,
    isLoading: false,
    isRefreshing: false,
    onRefresh: jest.fn(),
    onArticlePress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProvider(<ArticleList {...mockProps} />);
    // If it renders without throwing, the test passes
    expect(true).toBeTruthy();
  });

  it('renders with empty articles', () => {
    renderWithProvider(<ArticleList {...mockProps} articles={[]} isLoading={false} />);
    // If it renders without throwing, the test passes
    expect(true).toBeTruthy();
  });

  it('renders in loading state', () => {
    renderWithProvider(<ArticleList {...mockProps} isLoading={true} />);
    // If it renders without throwing, the test passes
    expect(true).toBeTruthy();
  });
});
