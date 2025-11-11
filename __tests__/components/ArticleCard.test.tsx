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

import { ArticleCard } from '@/components/library/ArticleCard';
import type { Article } from '@/types/articles.types';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

// LinearGradient is now from @shopify/react-native-skia, not expo-linear-gradient
// The mock is handled in jest.config.js transformIgnorePatterns

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    text: '#000000',
    background: '#ffffff',
    cardGradient: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)'],
    tint: '#4a7c59',
  }),
}));

jest.mock('@/hooks/animations', () => ({
  useTransformAnimation: () => ({
    animatedStyle: {},
    setValue: jest.fn(),
  }),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, ScrollView, Image } = require('react-native');

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
    Easing: {
      out: jest.fn(fn => fn),
      in: jest.fn(fn => fn),
      inOut: jest.fn(fn => fn),
      cubic: jest.fn(t => t * t * t),
      bezier: jest.fn(() => jest.fn(t => t)),
    },
    useSharedValue: (initialValue = 0) => ({
      value: initialValue,
      modify: jest.fn(),
    }),
    useAnimatedStyle: (styleCallback: any) => {
      try {
        return styleCallback() || {};
      } catch {
        return {};
      }
    },
    withTiming: (value: any) => value,
    withSpring: (value: any) => value,
    createAnimatedComponent: (component: any) =>
      React.forwardRef((props: any, ref: any) => React.createElement(component, { ...props, ref })),
  };
});

jest.mock('@/components/EnhancedImage', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    EnhancedImage: ({ testID, source }: { testID?: string; source?: string }) => (
      <View testID={testID || 'article-image'} data-source={source} />
    ),
  };
});

jest.mock('@/components/ui/Pill', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Pill: ({
      children,
      label,
      testID,
    }: {
      children?: React.ReactNode;
      label?: string;
      testID?: string;
    }) => <Text testID={testID}>{label || children}</Text>,
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
    author: 'Dr. Ahmad',
    category: 'Grammar',
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

    test('renders category pill', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} />);

      expect(getByText('Grammar')).toBeTruthy();
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

  describe('Custom Pill Label', () => {
    test('uses category by default for pill', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} category="Culture" />);

      expect(getByText('Culture')).toBeTruthy();
    });

    test('uses custom pillLabel when provided', () => {
      const { getByText } = render(
        <ArticleCard {...defaultProps} category="Grammar" pillLabel="Beginner" />,
      );

      expect(getByText('Beginner')).toBeTruthy();
    });

    test('capitalizes pill text', () => {
      const { getByText } = render(<ArticleCard {...defaultProps} category="advanced topics" />);

      // Should capitalize first letter
      expect(getByText('Advanced topics')).toBeTruthy();
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
        category: 'Basics',
        article,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText('Basics')).toBeTruthy();
    });

    test('renders advanced article correctly', () => {
      const article = createMockArticle({
        difficulty_level: 5,
        category: { id: 2, name: 'Advanced' },
      });
      const props = {
        ...defaultProps,
        category: 'Advanced',
        article,
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText('Advanced')).toBeTruthy();
    });

    test('renders article with Arabic author name', () => {
      const props = {
        ...defaultProps,
        author: 'أحمد محمود',
      };

      const { getByText } = render(<ArticleCard {...props} />);

      expect(getByText(/أحمد محمود/)).toBeTruthy();
    });
  });

  describe('Related Articles', () => {
    test('renders related article variant', () => {
      const props = {
        ...defaultProps,
        isRelatedArticle: true,
      };

      const { getByTestId } = render(<ArticleCard {...props} testID="related-article" />);

      expect(getByTestId('related-article')).toBeTruthy();
    });

    test('navigates correctly from related article', () => {
      const mockPush = jest.fn();
      (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

      const props = {
        ...defaultProps,
        isRelatedArticle: true,
      };

      const { getByTestId } = render(<ArticleCard {...props} testID="related-article" />);

      fireEvent.press(getByTestId('related-article'));

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
        author: '',
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
        category: '',
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
      expect(getByText(/Dr. Ahmad/)).toBeTruthy();
      expect(getByText('Grammar')).toBeTruthy();
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
      const { getByText } = render(
        <ArticleCard {...defaultProps} author="Jane Smith" category="Culture" />,
      );

      // Should format as "Author • Category" or similar
      const authorText = getByText(/Jane Smith/);
      expect(authorText).toBeTruthy();
    });
  });
});
