import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Mock necessary services
jest.mock('../../services/articles', () => ({
  articlesService: {
    getArticles: jest.fn().mockResolvedValue([
      { id: '1', title: 'Test Article 1' },
      { id: '2', title: 'Test Article 2' },
    ]),
    getArticle: jest.fn().mockResolvedValue({ id: '1', title: 'Test Article 1' }),
  },
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return {
    Image,
  };
});

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

describe('Articles Mocking Setup', () => {
  it('should properly mock the article service', async () => {
    const { articlesService } = require('../../services/articles');

    // Test direct mock calls
    const articles = await articlesService.getArticles();
    expect(articles).toHaveLength(2);
    expect(articles[0].title).toBe('Test Article 1');

    const article = await articlesService.getArticle('1');
    expect(article.title).toBe('Test Article 1');
  });

  it('should work with a simple component', async () => {
    const { getByText } = render(<TestComponent />);

    // Initially shows loading
    expect(getByText('Loading...')).toBeTruthy();

    // Eventually shows the article title
    await waitFor(() => {
      expect(getByText('Test Article 1')).toBeTruthy();
    });
  });
});
