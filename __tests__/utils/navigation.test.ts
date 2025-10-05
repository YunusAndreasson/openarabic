// Mock must be before imports for hoisting
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

import { router } from 'expo-router';

import { typedPush, typedReplace } from '@/utils/navigation';

describe('navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('typedPush', () => {
    it('should call router.push with article route and params', () => {
      typedPush({
        pathname: '/article/[id]',
        params: { id: 123 },
      });

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/article/[id]',
        params: { id: 123 },
      });
    });

    it('should call router.push with filter modal route and params', () => {
      typedPush({
        pathname: '/(tabs)/library/filterModal',
        params: {
          selectedCategoryIds: [1, 2],
          selectedAuthorIds: [3],
          dateRange: 'month',
        },
      });

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(tabs)/library/filterModal',
        params: {
          selectedCategoryIds: [1, 2],
          selectedAuthorIds: [3],
          dateRange: 'month',
        },
      });
    });

    it('should call router.push with review route and params', () => {
      typedPush({
        pathname: '/study/review',
        params: { mode: 'practice' },
      });

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/study/review',
        params: { mode: 'practice' },
      });
    });

    it('should call router.push with route without params', () => {
      typedPush({
        pathname: '/(tabs)/study',
      });

      expect(router.push).toHaveBeenCalledWith({
        pathname: '/(tabs)/study',
        params: undefined,
      });
    });

    it('should call router.push exactly once', () => {
      typedPush({
        pathname: '/',
      });

      expect(router.push).toHaveBeenCalledTimes(1);
    });
  });

  describe('typedReplace', () => {
    it('should call router.replace with article route and params', () => {
      typedReplace({
        pathname: '/article/[id]',
        params: { id: 456 },
      });

      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/article/[id]',
        params: { id: 456 },
      });
    });

    it('should call router.replace with filter modal route and params', () => {
      typedReplace({
        pathname: '/(tabs)/library/filterModal',
        params: {
          selectedCategoryIds: [4, 5],
          selectedAuthorIds: [],
          dateRange: 'week',
        },
      });

      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/(tabs)/library/filterModal',
        params: {
          selectedCategoryIds: [4, 5],
          selectedAuthorIds: [],
          dateRange: 'week',
        },
      });
    });

    it('should call router.replace with review route and params', () => {
      typedReplace({
        pathname: '/study/review',
        params: { mode: 'review' },
      });

      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/study/review',
        params: { mode: 'review' },
      });
    });

    it('should call router.replace with route without params', () => {
      typedReplace({
        pathname: '/(tabs)/bookmarks',
      });

      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/(tabs)/bookmarks',
        params: undefined,
      });
    });

    it('should call router.replace exactly once', () => {
      typedReplace({
        pathname: '/(tabs)',
      });

      expect(router.replace).toHaveBeenCalledTimes(1);
    });
  });
});
