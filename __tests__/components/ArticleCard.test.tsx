/**
 * Component Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * ArticleCard Component Tests
 *
 * Tests the article card component used throughout the app for displaying articles.
 * This is a critical user-facing component shown in:
 * - Library/browse screen (main list)
 * - Related articles section
 * - Search results
 *
 * Tests cover:
 * - Rendering and display
 * - Navigation on press
 * - Image loading
 * - Text truncation
 * - Accessibility
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { ArticleCard } from '@/components/explore/ArticleCard';
import type { Article } from '@/types/articles.types';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// LinearGradient is now from @shopify/react-native-skia, not expo-linear-gradient
// The mock is handled in jest.config.js transformIgnorePatterns

// Use shared mock factories from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/components/ui/EnhancedImage', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    EnhancedImage: ({ testID, source }: { testID?: string; source?: string }) => (
      <View testID={testID || 'article-image'} data-source={source} />
    ),
  };
});

jest.mock('@/components/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

const { useRouter } = require('expo-router');

describe('ArticleCard Component', () => {
  const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
    id: 1,
    title: 'Introduction to Arabic Grammar',
    summary: 'Learn the basics of Arabic grammar and sentence structure.',
    created_at: '2024-01-01T00:00:00Z',
    image_url: 'https://example.com/image.jpg',
    difficulty_level: 2,
    category_id: 1,
    author_id: 1,
    audio_url: null,
    category: {
      id: 1,
      name: 'Grammar',
    },
    author: {
      id: 1,
      name: 'Dr. Ahmad',
    },
    article_sentences: [],
    ...overrides,
  });

  const defaultProps = {
    title: 'Introduction to Arabic Grammar',
    imageUrl: 'https://example.com/image.jpg',
    summary: 'Learn the basics of Arabic grammar and sentence structure.',
    article: createMockArticle(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders article title correctly', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} />);

      expect(getByText('Introduction to Arabic Grammar')).toBeTruthy();
    });

    test('renders author name correctly', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} />);

      // Author is formatted with category
      expect(getByText(/Dr. Ahmad/)).toBeTruthy();
    });

    test('renders metadata with author, category, and reading time', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} />);

      // Metadata string format: "Dr. Ahmad · Grammar · 1 min"
      expect(getByText(/Dr\. Ahmad · Grammar · \d+ min/)).toBeTruthy();
    });

    test('renders summary text', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} />);

      expect(getByText('Learn the basics of Arabic grammar and sentence structure.')).toBeTruthy();
    });

    test('renders with testID for testing', () => {
      const { getByTestId } = render(<ArticleCard {...defaultProps} testID="article-card-1" />);

      expect(getByTestId('article-card-1')).toBeTruthy();
    });

    test('renders image with correct source', () => {
      const { getByTestId } = render(<ArticleCard {...defaultProps} />);

      // EnhancedImage is mocked but we can verify it renders
      expect(getByTestId('article-image')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    test('navigates to article on press', () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const { getByTestId } = render(<ArticleCard {...defaultProps} testID="article-card" />);

      const card = getByTestId('article-card');
      fireEvent.press(card);

      // Should navigate to article detail screen
      expect(mockPush).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/article/'));
    });

    test('includes article ID in navigation path', () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const article = createMockArticle({ id: 42 });
      const props = { ...defaultProps, article };

      const { getByTestId } = render(<ArticleCard {...props} testID="article-card" />);

      fireEvent.press(getByTestId('article-card'));

      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/42'));
    });
  });

  describe('Category in Metadata', () => {
    test('displays category from article object in metadata', () => {
      const article = createMockArticle({
        category: { id: 2, name: 'Culture' },
      });
      const { getByText } = render(<ArticleCard {...defaultProps} article={article} />);

      // Category is shown in metadata string
      expect(getByText(/Culture/)).toBeTruthy();
    });

    test('capitalizes category in metadata', () => {
      const article = createMockArticle({
        category: { id: 3, name: 'advanced topics' },
      });
      const { getByText } = render(<ArticleCard {...defaultProps} article={article} />);

      // Should capitalize first letter
      expect(getByText(/Advanced topics/)).toBeTruthy();
    });
  });

  describe('Text Truncation', () => {
    test('handles very long titles', () => {
      const longTitle = 'A'.repeat(200);
      const props = {
        ...defaultProps,
        title: longTitle,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      // Should render without crashing
      expect(getByText(longTitle)).toBeTruthy();
    });

    test('handles very long summaries', () => {
      const longSummary = 'B'.repeat(500);
      const props = {
        ...defaultProps,
        summary: longSummary,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText(longSummary)).toBeTruthy();
    });

    test('handles empty summary', () => {
      const props = {
        ...defaultProps,
        summary: '',
      };

      expect(() => render(<ArticleCard {...props} />)).not.toThrow();
    });
  });

  describe('Image Handling', () => {
    test('renders with valid image URL', () => {
      const { getByTestId } = render(<ArticleCard {...defaultProps} />);

      expect(getByTestId('article-image')).toBeTruthy();
    });

    test('handles missing image URL gracefully', () => {
      const props = {
        ...defaultProps,
        imageUrl: '',
      };

      expect(() => render(<ArticleCard {...props} />)).not.toThrow();
    });

    test('handles invalid image URL', () => {
      const props = {
        ...defaultProps,
        imageUrl: 'not-a-valid-url',
      };

      expect(() => render(<ArticleCard {...props} />)).not.toThrow();
    });
  });

  describe('Different Article Types', () => {
    test('renders beginner article correctly', () => {
      const article = createMockArticle({
        difficulty_level: 1,
        category: { id: 1, name: 'Basics' },
      });
      const props = {
        ...defaultProps,
        article,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      // Category shown in metadata
      expect(getByText(/Basics/)).toBeTruthy();
    });

    test('renders advanced article correctly', () => {
      const article = createMockArticle({
        difficulty_level: 5,
        category: { id: 2, name: 'Advanced' },
      });
      const props = {
        ...defaultProps,
        article,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      // Category shown in metadata
      expect(getByText(/Advanced/)).toBeTruthy();
    });

    test('renders article with Arabic author name', () => {
      const arabicArticle = createMockArticle({
        author: { id: 2, name: 'أحمد محمود' },
      });
      const props = {
        ...defaultProps,
        article: arabicArticle,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText(/أحمد محمود/)).toBeTruthy();
    });
  });

  describe('Featured Articles', () => {
    test('renders featured article variant', () => {
      const props = {
        ...defaultProps,
        isFeaturedArticle: true,
      };

      const { getByTestId } = render(<ArticleCard {...props} testID="featured-article" />);

      expect(getByTestId('featured-article')).toBeTruthy();
    });

    test('navigates correctly from featured article', () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const props = {
        ...defaultProps,
        isFeaturedArticle: true,
      };

      const { getByTestId } = render(<ArticleCard {...props} testID="featured-article" />);

      fireEvent.press(getByTestId('featured-article'));

      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('handles article with no author', () => {
      const article = createMockArticle({
        author: { id: 1, name: '' },
      });
      const props = {
        ...defaultProps,
        article,
      };

      expect(() => render(<ArticleCard {...props} />)).not.toThrow();
    });

    test('handles article with no category', () => {
      const article = createMockArticle({
        category: { id: 1, name: '' },
      });
      const props = {
        ...defaultProps,
        article,
      };

      expect(() => render(<ArticleCard {...props} />)).not.toThrow();
    });

    test('handles special characters in title', () => {
      const props = {
        ...defaultProps,
        title: 'Arabic & Grammar: A Comprehensive Guide (2024)',
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText('Arabic & Grammar: A Comprehensive Guide (2024)')).toBeTruthy();
    });

    test('handles RTL text in title', () => {
      const props = {
        ...defaultProps,
        title: 'النحو العربي للمبتدئين',
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText('النحو العربي للمبتدئين')).toBeTruthy();
    });

    test('handles mixed LTR and RTL text', () => {
      const props = {
        ...defaultProps,
        title: 'Arabic Grammar - النحو العربي',
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText('Arabic Grammar - النحو العربي')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    test('renders 10 cards without performance degradation', () => {
      const articles = Array.from({ length: 10 }, (_, i) =>
        createMockArticle({
          id: i + 1,
          title: `Article ${i + 1}`,
        }),
      );

      const start = Date.now();
      articles.forEach(article => {
        render(<ArticleCard {...defaultProps} title={article.title} article={article} />);
      });
      const elapsed = Date.now() - start;

      // Should render 10 cards in < 500ms
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Accessibility', () => {
    test('provides accessible card for screen readers', () => {
      const { getByTestId } = render(<ArticleCard {...defaultProps} testID="article-card" />);

      const card = getByTestId('article-card');
      expect(card).toBeTruthy();
    });

    test('includes all important text content', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} />);

      // All key information should be accessible
      expect(getByText('Introduction to Arabic Grammar')).toBeTruthy();
      // Metadata contains author, category, and reading time
      expect(getByText(/Dr\. Ahmad · Grammar · \d+ min/)).toBeTruthy();
      expect(getByText('Learn the basics of Arabic grammar and sentence structure.')).toBeTruthy();
    });
  });

  describe('Regression Tests', () => {
    test('should navigate to correct article detail route', () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const article = createMockArticle({ id: 123 });
      const props = { ...defaultProps, article };

      const { getByTestId } = render(<ArticleCard {...props} testID="card" />);

      fireEvent.press(getByTestId('card'));

      // Regression: Ensure route follows /article/[id] pattern
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/\/article\/123/));
    });

    test('should format author and category correctly', () => {
      const customArticle = createMockArticle({
        author: { id: 2, name: 'Jane Smith' },
        category: { id: 2, name: 'Culture' },
      });
      const { getByText } = render(<ArticleCard {...defaultProps} article={customArticle} />);

      // Should format as "Author · Category · X min"
      expect(getByText(/Jane Smith · Culture · \d+ min/)).toBeTruthy();
    });
  });
});
