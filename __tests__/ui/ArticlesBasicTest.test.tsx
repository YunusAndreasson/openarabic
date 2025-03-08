import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Define a simple article type
interface Article {
  id: string;
  title: string;
}

// Mock the articles service
jest.mock('../../services/articles', () => ({
  articlesService: {
    getArticles: jest.fn().mockResolvedValue([
      { id: '1', title: 'Test Article 1' },
      { id: '2', title: 'Test Article 2' },
    ]),
  },
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

// Simple component for testing articles
const SimpleArticlesList: React.FC = () => {
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

  return (
    <View>
      {articles.map(article => (
        <Text key={article.id} testID={`article-${article.id}`}>
          {article.title}
        </Text>
      ))}
    </View>
  );
};

describe('Basic Articles Testing', () => {
  // Clear all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display the articles after loading', async () => {
    const { getByText, queryByText } = render(<SimpleArticlesList />);

    // Initially shows loading
    expect(getByText('Loading...')).toBeTruthy();

    // Eventually shows the articles
    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
      expect(getByText('Test Article 1')).toBeTruthy();
      expect(getByText('Test Article 2')).toBeTruthy();
    });
  });
});
