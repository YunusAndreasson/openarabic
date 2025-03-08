import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Mock necessary services
jest.mock('../../services/articles', () => ({
  articlesService: {
    getArticles: jest.fn().mockResolvedValue([
      { id: '1', title: 'Test Article 1', category: { id: '1', name: 'Category 1' } },
      { id: '2', title: 'Test Article 2', category: { id: '2', name: 'Category 2' } },
    ]),
  },
}));

jest.mock('../../services/categories', () => ({
  categoriesService: {
    getCategories: jest.fn().mockResolvedValue([
      { id: '1', name: 'Category 1' },
      { id: '2', name: 'Category 2' },
    ]),
  },
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return {
    Image,
    ImageBackground: Image,
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock the router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(callback => callback()),
}));

// Simple test component
const ArticlesListTestComponent = () => {
  interface Article {
    id: string;
    title: string;
    category: {
      id: string;
      name: string;
    };
  }

  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { articlesService } = require('../../services/articles');

  React.useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const data = await articlesService.getArticles();
        setArticles(data);
      } catch (error) {
        console.error('Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, []);

  if (loading) return <Text>Loading...</Text>;
  if (articles.length === 0) return <Text>No articles found</Text>;

  return (
    <View>
      {articles.map(article => (
        <Text key={article.id}>{article.title}</Text>
      ))}
    </View>
  );
};

describe('Articles Screen Mocking Setup', () => {
  it('should properly mock the article service', async () => {
    const { articlesService } = require('../../services/articles');

    // Test direct mock calls
    const articles = await articlesService.getArticles();
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe('Test Article 1');
  });

  it('should work with a simple component', async () => {
    const { getByText } = render(<ArticlesListTestComponent />);

    // Initially shows loading
    expect(getByText('Loading...')).toBeTruthy();

    // Eventually shows the article titles
    await waitFor(() => {
      expect(getByText('Test Article 1')).toBeTruthy();
      expect(getByText('Test Article 2')).toBeTruthy();
    });
  });
});
