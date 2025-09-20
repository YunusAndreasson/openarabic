import {
  getArticleRoute,
  getCategoryFilterRoute,
  getFilterModalRoute,
  getStudyReviewRoute,
  ROUTE_PATHS,
} from '../../constants/routes';

describe('routes', () => {
  describe('getArticleRoute', () => {
    it('should generate basic article route', () => {
      const result = getArticleRoute(123);
      expect(result).toBe('/article/123');
    });

    it('should include header title when provided', () => {
      const result = getArticleRoute(123, 'Test Article');
      expect(result).toContain('/article/123');
      expect(result).toContain('headerTitle=Test+Article');
    });

    it('should handle special characters in header title', () => {
      const result = getArticleRoute(123, 'Test (Article)');
      expect(result).toContain('headerTitle=Test+%28Article%29');
    });
  });

  describe('getFilterModalRoute', () => {
    it('should generate filter modal route with category ID', () => {
      const result = getFilterModalRoute(456);
      expect(result).toBe('/(tabs)/read/filterModal?categoryId=456');
    });
  });

  describe('getCategoryFilterRoute', () => {
    it('should generate category filter route', () => {
      const result = getCategoryFilterRoute(789);
      expect(result).toBe('/(tabs)/read/filter?type=category&id=789');
    });

    it('should include name when provided', () => {
      const result = getCategoryFilterRoute(789, 'Test Category');
      expect(result).toContain('/(tabs)/read/filter');
      expect(result).toContain('type=category');
      expect(result).toContain('id=789');
      expect(result).toContain('name=Test+Category');
    });

    it('should handle special characters in category name', () => {
      const result = getCategoryFilterRoute(789, 'Test (Category)');
      expect(result).toContain('name=Test+%28Category%29');
    });
  });

  describe('getStudyReviewRoute', () => {
    it('should return base route when no params', () => {
      const result = getStudyReviewRoute();
      expect(result).toBe('/study/review');
    });

    it('should include rootId parameter', () => {
      const result = getStudyReviewRoute({ rootId: 123 });
      expect(result).toContain('/study/review');
      expect(result).toContain('rootId=123');
    });

    it('should include mode parameter', () => {
      const result = getStudyReviewRoute({ mode: 'random' });
      expect(result).toContain('mode=random');
    });

    it('should include count parameter', () => {
      const result = getStudyReviewRoute({ count: 10 });
      expect(result).toContain('count=10');
    });

    it('should include fromRemember parameter', () => {
      const result = getStudyReviewRoute({ fromRemember: 'test' });
      expect(result).toContain('fromRemember=test');
    });

    it('should combine multiple parameters', () => {
      const result = getStudyReviewRoute({
        rootId: 123,
        mode: 'random',
        count: 10,
        fromRemember: 'test',
      });
      expect(result).toContain('rootId=123');
      expect(result).toContain('mode=random');
      expect(result).toContain('count=10');
      expect(result).toContain('fromRemember=test');
    });

    it('should handle special characters in parameters', () => {
      const result = getStudyReviewRoute({ fromRemember: 'test (value)' });
      expect(result).toContain('fromRemember=test+%28value%29');
    });
  });

  describe('ROUTE_PATHS', () => {
    it('should contain expected static routes', () => {
      expect(ROUTE_PATHS.AUTH).toBe('/auth');
      expect(ROUTE_PATHS.TABS).toBe('/(tabs)');
      expect(ROUTE_PATHS.LIBRARY_TAB).toBe('/(tabs)/library');
      expect(ROUTE_PATHS.STUDY_TAB).toBe('/(tabs)/study');
      expect(ROUTE_PATHS.BOOKMARKS_TAB).toBe('/(tabs)/bookmarks');
      expect(ROUTE_PATHS.ACCOUNT).toBe('/(tabs)/library/account');
    });
  });
});
