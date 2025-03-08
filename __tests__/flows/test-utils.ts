// Test utilities for React Native testing
import { ReactTestInstance } from 'react-test-renderer';

/**
 * Gets the display text from a React Native TestInstance.
 * In React Native, the text content is often in the 'children' prop of Text components.
 */
export const getDisplayText = (element: any): string => {
  if (!element) return '';

  try {
    // If it's a text node, return its content
    if (element.props && typeof element.props.children === 'string') {
      return element.props.children;
    }

    // If it's a button, return its title
    if (element.props && element.props.title) {
      return element.props.title;
    }

    // If it has children, recursively get text content
    if (element.props && Array.isArray(element.props.children)) {
      return element.props.children
        .map((child: any) => {
          if (typeof child === 'string') return child;
          if (child && typeof child === 'object') return getDisplayText(child);
          return '';
        })
        .join('');
    }

    if (element.props && element.props.children && typeof element.props.children === 'object') {
      return getDisplayText(element.props.children);
    }

    // If it has a text property (ReactTestInstance specific)
    if (element.children && element.children.length) {
      return element.children
        .map((child: any) => {
          if (typeof child === 'string') return child;
          return getDisplayText(child);
        })
        .join('');
    }
  } catch (e) {
    console.error('Error getting display text:', e);
  }

  return '';
};

/**
 * Mocks for common services and hooks
 */
export const createServiceMocks = () => {
  const mockArticleService = {
    getArticleById: jest.fn(),
    getArticles: jest.fn(),
  };

  const mockReadingListService = {
    addToReadingList: jest.fn(),
    removeFromReadingList: jest.fn(),
    isInReadingList: jest.fn(),
  };

  const mockStudyWordsService = {
    getStudyWords: jest.fn(),
    updateWordReview: jest.fn(),
    toggleStudyWord: jest.fn(),
    getWordDetails: jest.fn(),
  };

  const mockSpacedRepetition = {
    getNextCard: jest.fn(),
    markHard: jest.fn(),
    markGood: jest.fn(),
    markEasy: jest.fn(),
    isReviewComplete: jest.fn(),
    currentCard: jest.fn(),
    totalCards: jest.fn(),
    completedCards: jest.fn(),
    remainingCards: jest.fn(),
  };

  return {
    mockArticleService,
    mockReadingListService,
    mockStudyWordsService,
    mockSpacedRepetition,
  };
};

// Add a test so Jest doesn't complain
describe('Test Utilities', () => {
  it('getDisplayText works with different input types', () => {
    expect(getDisplayText(null)).toBe('');
    expect(getDisplayText(undefined)).toBe('');
    expect(getDisplayText({ props: { children: 'Hello' } })).toBe('Hello');
    expect(getDisplayText({ props: { title: 'Submit' } })).toBe('Submit');
  });
});
