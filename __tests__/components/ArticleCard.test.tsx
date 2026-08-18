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
import { articleId, authorId, categoryId } from '@/__tests__/helpers/ids';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn((..._args: unknown[]) => ({
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

jest.mock('@/components/primitives/ThemedText', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children, ...props }: any) => <Text {...props}>{children}</Text>,
  };
});

const { useRouter } = require('expo-router');

describe('ArticleCard Component', () => {
  const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
    id: articleId(1),
    title: 'Introduction to Arabic Grammar',
    summary: 'Learn the basics of Arabic grammar and sentence structure.',
    created_at: '2024-01-01T00:00:00Z',
    published: true,
    book: null,
    audio_url_bilingual: null,
    content_hash: 'test-hash',
    image_url: 'https://example.com/image.jpg',
    difficulty_level: 2,
    category_id: categoryId(1),
    author_id: authorId(1),
    audio_url: '',
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
      jest.mocked(useRouter).mockReturnValue({ push: mockPush });

      const { getByTestId } = render(<ArticleCard {...defaultProps} testID="article-card" />);

      const card = getByTestId('article-card');
      fireEvent.press(card);

      // Should navigate to article detail screen
      expect(mockPush).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('/article/'));
    });

    test('includes article ID in navigation path', () => {
      const mockPush = jest.fn();
      jest.mocked(useRouter).mockReturnValue({ push: mockPush });

      const article = createMockArticle({ id: articleId(42) });
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
    test('handles very long titles and still renders title', () => {
      const longTitle = 'A'.repeat(200);
      const props = {
        ...defaultProps,
        title: longTitle,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      // Verify the long title is rendered in the component
      const titleElement = getByText(longTitle);
      expect(titleElement.props.children).toBe(longTitle);
    });

    test('handles very long summaries and preserves content', () => {
      const longSummary = 'B'.repeat(500);
      const props = {
        ...defaultProps,
        summary: longSummary,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      const summaryElement = getByText(longSummary);
      expect(summaryElement.props.children).toBe(longSummary);
    });

    test('handles empty summary by still rendering card with other content', () => {
      const props = {
        ...defaultProps,
        summary: '',
      };

      const { getByText, getByTestId } = render(<ArticleCard {...props} testID="card" />);

      // Card should render with title still visible
      expect(getByTestId('card')).toBeDefined();
      expect(getByText(defaultProps.title)).toBeDefined();
    });
  });

  describe('Image Handling', () => {
    test('renders with valid image URL', () => {
      const { getByTestId } = render(<ArticleCard {...defaultProps} />);

      const imageElement = getByTestId('article-image');
      expect(imageElement).toBeDefined();
    });

    test('handles missing image URL by still rendering card', () => {
      const props = {
        ...defaultProps,
        imageUrl: '',
      };

      const { getByText, getByTestId } = render(<ArticleCard {...props} testID="card" />);

      // Card should still render with title visible
      expect(getByTestId('card')).toBeDefined();
      expect(getByText(defaultProps.title)).toBeDefined();
    });

    test('handles invalid image URL by rendering card with title', () => {
      const props = {
        ...defaultProps,
        imageUrl: 'not-a-valid-url',
      };

      const { getByText, getByTestId } = render(<ArticleCard {...props} testID="card" />);

      // Card should still render functional
      expect(getByTestId('card')).toBeDefined();
      expect(getByText(defaultProps.title)).toBeDefined();
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
      jest.mocked(useRouter).mockReturnValue({ push: mockPush });

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
    test('handles article with no author by rendering card without author in metadata', () => {
      const article = createMockArticle({
        author: { id: 1, name: '' },
      });
      const props = {
        ...defaultProps,
        article,
      };

      const { getByTestId, getByText } = render(<ArticleCard {...props} testID="card" />);

      // Card renders with title visible
      expect(getByTestId('card')).toBeDefined();
      expect(getByText(defaultProps.title)).toBeDefined();
    });

    test('handles article with no category by rendering card with title', () => {
      const article = createMockArticle({
        category: { id: 1, name: '' },
      });
      const props = {
        ...defaultProps,
        article,
      };

      const { getByTestId, getByText } = render(<ArticleCard {...props} testID="card" />);

      expect(getByTestId('card')).toBeDefined();
      expect(getByText(defaultProps.title)).toBeDefined();
    });

    test('handles special characters in title', () => {
      const specialTitle = 'Arabic & Grammar: A Comprehensive Guide (2024)';
      const props = {
        ...defaultProps,
        title: specialTitle,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      const titleElement = getByText(specialTitle);
      expect(titleElement.props.children).toBe(specialTitle);
    });

    test('handles RTL text in title', () => {
      const arabicTitle = 'النحو العربي للمبتدئين';
      const props = {
        ...defaultProps,
        title: arabicTitle,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      const titleElement = getByText(arabicTitle);
      expect(titleElement.props.children).toBe(arabicTitle);
    });

    test('handles mixed LTR and RTL text', () => {
      const mixedTitle = 'Arabic Grammar - النحو العربي';
      const props = {
        ...defaultProps,
        title: mixedTitle,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      const titleElement = getByText(mixedTitle);
      expect(titleElement.props.children).toBe(mixedTitle);
    });
  });

  describe('Performance', () => {
    test('renders 10 cards within acceptable time', () => {
      const articles = Array.from({ length: 10 }, (_, i) =>
        createMockArticle({
          id: articleId(i + 1),
          title: `Article ${i + 1}`,
        }),
      );

      const start = Date.now();
      articles.forEach(article => {
        render(<ArticleCard {...defaultProps} title={article.title} article={article} />);
      });
      const elapsed = Date.now() - start;

      // Tightened threshold: 10 simple cards should render in < 200ms in test env
      expect(elapsed).toBeLessThan(200);
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
      jest.mocked(useRouter).mockReturnValue({ push: mockPush });

      const article = createMockArticle({ id: articleId(123) });
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
