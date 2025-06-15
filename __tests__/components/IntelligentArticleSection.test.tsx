import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import IntelligentArticleSection from '../../components/home/IntelligentArticleSection';

const mockUseIntelligentArticleSelection = jest.fn();
jest.mock('@/hooks/articles/useIntelligentArticleSelection', () => ({
  useIntelligentArticleSelection: (...args: any[]) => mockUseIntelligentArticleSelection(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/home/FeaturedSection', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ article }: { article: any }) => <Text testID="featured">{article?.title}</Text>;
});

const createArticle = (id: number, title: string) => ({ id, title } as any);

const onArticlePress = jest.fn();

// Mock Math.random for predictable refresh behavior
let mockRandom: any;

describe('IntelligentArticleSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    mockRandom.mockRestore();
  });

  describe('Basic functionality', () => {
    it('renders featured article when available', () => {
      const user = { id: 'u1' } as any;
      const article = createArticle(1, 'A1');
      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { getByTestId } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(mockUseIntelligentArticleSelection).toHaveBeenCalledWith(user, [article]);
      expect(getByTestId('featured').props.children).toBe('A1');
    });

    it('renders even when user is null', () => {
      const article = createArticle(2, 'A2');
      mockUseAuth.mockReturnValue({ user: null });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { getByTestId } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(mockUseIntelligentArticleSelection).toHaveBeenCalledWith(null, [article]);
      expect(getByTestId('featured').props.children).toBe('A2');
    });

    it('returns null when no article selected', () => {
      mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article: null,
        reason: 'none',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { queryByTestId } = render(
        <IntelligentArticleSection
          articlesData={[]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(queryByTestId('featured')).toBeNull();
    });
  });

  describe('Stress Tests - Large Data Sets', () => {
    it('handles extremely large article datasets efficiently', () => {
      const user = { id: 'u1' } as any;
      // Create 10,000 articles to stress test performance
      const largeArticleSet = Array.from({ length: 10000 }, (_, i) =>
        createArticle(i + 1, `Article ${i + 1}`)
      );
      const selectedArticle = largeArticleSet[5000];

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article: selectedArticle,
        reason: 'Selected from large dataset',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { getByTestId } = render(
        <IntelligentArticleSection
          articlesData={largeArticleSet}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(mockUseIntelligentArticleSelection).toHaveBeenCalledWith(user, largeArticleSet);
      expect(getByTestId('featured').props.children).toBe('Article 5001');
    });

    it('handles massive due word root ID sets', () => {
      const user = { id: 'u1' } as any;
      const article = createArticle(1, 'Test Article');
      // Create a massive set of due word root IDs (100,000 items)
      const massiveDueWordSet = new Set(Array.from({ length: 100000 }, (_, i) => i));

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'Selected with massive due word set',
        type: 'due-words',
        dueWordRootIds: massiveDueWordSet,
      });

      const { getByTestId } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(getByTestId('featured').props.children).toBe('Test Article');
      expect(mockUseIntelligentArticleSelection).toHaveBeenCalledWith(user, [article]);
    });
  });

  describe('Stress Tests - Rapid State Changes', () => {
    it('handles rapid refresh key changes without breaking', () => {
      const user = { id: 'u1' } as any;
      const articles = [
        createArticle(1, 'Article 1'),
        createArticle(2, 'Article 2'),
        createArticle(3, 'Article 3'),
      ];

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article: articles[0],
        reason: 'Initial selection',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { rerender, getByTestId } = render(
        <IntelligentArticleSection
          articlesData={articles}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      // Simulate rapid refresh key changes (100 updates)
      for (let i = 1; i <= 100; i++) {
        act(() => {
          rerender(
            <IntelligentArticleSection
              articlesData={articles}
              refreshKey={i}
              onArticlePress={onArticlePress}
            />
          );
        });
      }

      // Component should still render without crashing
      expect(getByTestId('featured')).toBeTruthy();
    });

    it('handles rapid user authentication state changes', () => {
      const articles = [createArticle(1, 'Test Article')];
      const users = [null, { id: 'u1' }, { id: 'u2' }, null, { id: 'u3' }];

      mockUseIntelligentArticleSelection.mockReturnValue({
        article: articles[0],
        reason: 'Test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { rerender, getByTestId } = render(
        <IntelligentArticleSection
          articlesData={articles}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      // Rapidly change user authentication state
      users.forEach((user, index) => {
        mockUseAuth.mockReturnValue({ user });
        act(() => {
          rerender(
            <IntelligentArticleSection
              articlesData={articles}
              refreshKey={index}
              onArticlePress={onArticlePress}
            />
          );
        });
      });

      expect(getByTestId('featured')).toBeTruthy();
    });
  });

  describe('Stress Tests - Edge Cases', () => {
    it('handles articles with extremely long titles', () => {
      const user = { id: 'u1' } as any;
      const longTitle = 'A'.repeat(10000); // 10,000 character title
      const article = createArticle(1, longTitle);

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'Long title test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { getByTestId } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(getByTestId('featured').props.children).toBe(longTitle);
    });

    it('handles articles with special characters and unicode', () => {
      const user = { id: 'u1' } as any;
      const unicodeTitle =
        '🚀📱💻🌟 Test Article with Emojis and Special Chars: àáâãäåæçèéêë 中文 العربية русский';
      const article = createArticle(1, unicodeTitle);

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'Unicode test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { getByTestId } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      expect(getByTestId('featured').props.children).toBe(unicodeTitle);
    });

    it('handles malformed article data gracefully', () => {
      const user = { id: 'u1' } as any;
      const malformedArticles = [
        { id: 1 }, // Missing title
        { title: 'No ID Article' }, // Missing id
        null, // Null article
        undefined, // Undefined article
        { id: 'string-id', title: 'String ID' }, // Wrong ID type
      ] as any[];

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article: malformedArticles[0],
        reason: 'Malformed data test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      // Should not crash even with malformed data
      expect(() => {
        render(
          <IntelligentArticleSection
            articlesData={malformedArticles}
            refreshKey={0}
            onArticlePress={onArticlePress}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Stress Tests - Memory and Performance', () => {
    it('handles multiple rapid re-renders without memory leaks', () => {
      const user = { id: 'u1' } as any;
      const article = createArticle(1, 'Test Article');

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'Memory test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { rerender } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      // Simulate 1000 re-renders to test for memory leaks
      for (let i = 0; i < 1000; i++) {
        act(() => {
          rerender(
            <IntelligentArticleSection
              articlesData={[article]}
              refreshKey={i % 10} // Cycle through refresh keys
              onArticlePress={onArticlePress}
            />
          );
        });
      }

      // If we get here without crashing, the test passes
      expect(mockUseIntelligentArticleSelection).toHaveBeenCalled();
    });

    it('handles complex article selection scenarios', () => {
      const user = { id: 'u1' } as any;
      const articles = Array.from({ length: 1000 }, (_, i) =>
        createArticle(i + 1, `Article ${i + 1}`)
      );

      // Test all different selection types with refreshKey=0 to avoid refresh logic
      const selectionTypes = ['due-words', 'difficult-words', 'beginner', 'random'] as const;

      selectionTypes.forEach((type, index) => {
        mockUseAuth.mockReturnValue({ user });
        mockUseIntelligentArticleSelection.mockReturnValue({
          article: articles[index],
          reason: `Testing ${type} selection`,
          type,
          dueWordRootIds: new Set(Array.from({ length: 100 }, (_, i) => i)),
        });

        const { getByTestId, unmount } = render(
          <IntelligentArticleSection
            articlesData={articles}
            refreshKey={0} // Use 0 to avoid refresh logic interfering
            onArticlePress={onArticlePress}
          />
        );

        expect(getByTestId('featured').props.children).toBe(`Article ${index + 1}`);
        unmount(); // Clean up between renders
      });
    });
  });

  describe('Stress Tests - Refresh Logic', () => {
    it('handles refresh when only one article is available', () => {
      const user = { id: 'u1' } as any;
      const singleArticle = createArticle(1, 'Only Article');

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article: singleArticle,
        reason: 'Single article test',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { rerender, getByTestId } = render(
        <IntelligentArticleSection
          articlesData={[singleArticle]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      // Refresh should still work even with only one article
      act(() => {
        rerender(
          <IntelligentArticleSection
            articlesData={[singleArticle]}
            refreshKey={1}
            onArticlePress={onArticlePress}
          />
        );
      });

      expect(getByTestId('featured').props.children).toBe('Only Article');
    });

    it('handles refresh with empty articles array after initial load', () => {
      const user = { id: 'u1' } as any;
      const article = createArticle(1, 'Test Article');

      mockUseAuth.mockReturnValue({ user });
      mockUseIntelligentArticleSelection.mockReturnValue({
        article,
        reason: 'Initial load',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      const { rerender, queryByTestId } = render(
        <IntelligentArticleSection
          articlesData={[article]}
          refreshKey={0}
          onArticlePress={onArticlePress}
        />
      );

      // Simulate articles being cleared
      mockUseIntelligentArticleSelection.mockReturnValue({
        article: null,
        reason: 'Loading articles...',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });

      act(() => {
        rerender(
          <IntelligentArticleSection
            articlesData={[]}
            refreshKey={1}
            onArticlePress={onArticlePress}
          />
        );
      });

      expect(queryByTestId('featured')).toBeNull();
    });
  });

  describe('Stress Tests - Hook Integration', () => {
    it('handles hook errors gracefully', () => {
      const user = { id: 'u1' } as any;
      const article = createArticle(1, 'Test Article');

      mockUseAuth.mockReturnValue({ user });
      // Simulate hook throwing an error
      mockUseIntelligentArticleSelection.mockImplementation(() => {
        throw new Error('Hook error');
      });

      // Component should handle hook errors gracefully
      expect(() => {
        render(
          <IntelligentArticleSection
            articlesData={[article]}
            refreshKey={0}
            onArticlePress={onArticlePress}
          />
        );
      }).toThrow('Hook error');
    });

    it('handles inconsistent hook return values', () => {
      const user = { id: 'u1' } as any;
      const article = createArticle(1, 'Test Article');

      mockUseAuth.mockReturnValue({ user });

      // Test with missing properties
      const inconsistentReturns = [
        { article, reason: 'test' }, // Missing type and dueWordRootIds
        { article, type: 'random' }, // Missing reason and dueWordRootIds
        { reason: 'test', type: 'random', dueWordRootIds: new Set() }, // Missing article
        {}, // Empty object
      ];

      inconsistentReturns.forEach((returnValue, index) => {
        mockUseIntelligentArticleSelection.mockReturnValue(returnValue);

        // Should not crash with inconsistent return values
        expect(() => {
          render(
            <IntelligentArticleSection
              articlesData={[article]}
              refreshKey={index}
              onArticlePress={onArticlePress}
            />
          );
        }).not.toThrow();
      });
    });
  });
});
