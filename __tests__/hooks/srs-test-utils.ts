/**
 * Utility functions for testing the spaced repetition system
 *
 * This file provides helper functions to generate parameterized tests
 * for the spaced repetition algorithm, making it easier to test various
 * learning scenarios and edge cases.
 *
 * @jest-environment node
 * @jest-environment-options {"skipTestFile": true}
 */

// Enum for review results
export enum ReviewResult {
  AGAIN = 'AGAIN',
  HARD = 'HARD',
  GOOD = 'GOOD',
  EASY = 'EASY',
}

// Interface for the initial state of a word
export interface SRSInitialState {
  easeFactor: number;
  interval: number;
  reviewCount: number;
  lastReviewedAt: Date | null;
}

// Interface for the expected state after a review
export interface SRSExpectedState {
  easeFactor: number;
  interval: number;
  reviewCount: number;
}

// Interface for a test case
export interface SRSTestCase {
  name: string;
  initialState: SRSInitialState;
  reviewResult: ReviewResult;
  expectedState: SRSExpectedState;
  description?: string;
}

// Interface for a learning path test case
export interface SRSLearningPathTestCase {
  name: string;
  initialState: SRSInitialState;
  reviewSequence: ReviewResult[];
  expectedFinalState: SRSExpectedState;
  description: string;
}

/**
 * Creates test cases for different review results with the same initial state
 * @param initialState The initial state of the word
 * @param expectedResults The expected results for each review result
 * @returns An array of test cases
 */
export function createReviewResultTestCases(
  initialState: SRSInitialState,
  expectedResults: Record<ReviewResult, SRSExpectedState>
): SRSTestCase[] {
  return Object.entries(expectedResults).map(([reviewResult, expectedState]) => ({
    name: `handles ${reviewResult} review correctly`,
    initialState,
    reviewResult: reviewResult as ReviewResult,
    expectedState,
    description: `When a word with ease factor ${initialState.easeFactor} and interval ${initialState.interval} is reviewed as ${reviewResult}, the ease factor should be ${expectedState.easeFactor} and the interval should be ${expectedState.interval}`,
  }));
}

/**
 * Creates test cases for different initial states with the same review result
 * @param initialStates The different initial states to test
 * @param reviewResult The review result to apply
 * @param getExpectedState A function that calculates the expected state based on the initial state
 * @returns An array of test cases
 */
export function createInitialStateTestCases(
  initialStates: SRSInitialState[],
  reviewResult: ReviewResult,
  getExpectedState: (initialState: SRSInitialState) => SRSExpectedState
): SRSTestCase[] {
  return initialStates.map(initialState => ({
    name: `handles ${reviewResult} review for word with ease factor ${initialState.easeFactor} and interval ${initialState.interval}`,
    initialState,
    reviewResult,
    expectedState: getExpectedState(initialState),
    description: `When a word with ease factor ${initialState.easeFactor} and interval ${initialState.interval} is reviewed as ${reviewResult}, the expected state should match the calculated values`,
  }));
}

/**
 * Creates a test case for a learning path (sequence of reviews)
 * @param name The name of the test case
 * @param initialState The initial state of the word
 * @param reviewSequence The sequence of reviews to apply
 * @param expectedFinalState The expected final state after all reviews
 * @param description A description of the test case
 * @returns A learning path test case
 */
export function createLearningPathTestCase(
  name: string,
  initialState: SRSInitialState,
  reviewSequence: ReviewResult[],
  expectedFinalState: SRSExpectedState,
  description: string
): SRSLearningPathTestCase {
  return {
    name,
    initialState,
    reviewSequence,
    expectedFinalState,
    description,
  };
}

/**
 * Creates test cases for edge cases in the spaced repetition system
 * @returns An array of test cases
 */
export function createEdgeCaseTestCases(): SRSTestCase[] {
  return [
    // Minimum ease factor
    {
      name: 'handles minimum ease factor correctly',
      initialState: {
        easeFactor: 1.3,
        interval: 1,
        reviewCount: 10,
        lastReviewedAt: new Date('2023-01-01'),
      },
      reviewResult: ReviewResult.AGAIN,
      expectedState: {
        easeFactor: 1.3, // Should not go below 1.3
        interval: 1,
        reviewCount: 11,
      },
      description:
        'When a word with the minimum ease factor is reviewed as AGAIN, the ease factor should remain at the minimum',
    },
    // Maximum ease factor
    {
      name: 'handles maximum ease factor correctly',
      initialState: {
        easeFactor: 2.9,
        interval: 100,
        reviewCount: 20,
        lastReviewedAt: new Date('2023-01-01'),
      },
      reviewResult: ReviewResult.EASY,
      expectedState: {
        easeFactor: 3.0, // Should not go above 3.0
        interval: 300,
        reviewCount: 21,
      },
      description:
        'When a word with a high ease factor is reviewed as EASY, the ease factor should not exceed the maximum',
    },
    // New word
    {
      name: 'handles new word correctly',
      initialState: {
        easeFactor: 2.5,
        interval: 0,
        reviewCount: 0,
        lastReviewedAt: null,
      },
      reviewResult: ReviewResult.GOOD,
      expectedState: {
        easeFactor: 2.5,
        interval: 1,
        reviewCount: 1,
      },
      description: 'When a new word is reviewed as GOOD, the interval should be set to 1 day',
    },
    // Long interval
    {
      name: 'handles long interval correctly',
      initialState: {
        easeFactor: 2.5,
        interval: 365,
        reviewCount: 15,
        lastReviewedAt: new Date('2023-01-01'),
      },
      reviewResult: ReviewResult.GOOD,
      expectedState: {
        easeFactor: 2.5,
        interval: 913, // 365 * 2.5
        reviewCount: 16,
      },
      description:
        'When a word with a long interval is reviewed as GOOD, the interval should increase appropriately',
    },
  ];
}

// Add a dummy test to satisfy Jest's requirement for at least one test
describe('SRS Test Utils', () => {
  it('should export utility functions', () => {
    expect(createReviewResultTestCases).toBeDefined();
    expect(createInitialStateTestCases).toBeDefined();
    expect(createLearningPathTestCase).toBeDefined();
    expect(createEdgeCaseTestCases).toBeDefined();
  });

  it('should create review result test cases correctly', () => {
    const initialState: SRSInitialState = {
      easeFactor: 2.5,
      interval: 10,
      reviewCount: 5,
      lastReviewedAt: new Date('2023-01-01'),
    };

    const expectedResults: Record<ReviewResult, SRSExpectedState> = {
      [ReviewResult.AGAIN]: { easeFactor: 2.3, interval: 1, reviewCount: 6 },
      [ReviewResult.HARD]: { easeFactor: 2.4, interval: 6, reviewCount: 6 },
      [ReviewResult.GOOD]: { easeFactor: 2.5, interval: 25, reviewCount: 6 },
      [ReviewResult.EASY]: { easeFactor: 2.6, interval: 35, reviewCount: 6 },
    };

    const testCases = createReviewResultTestCases(initialState, expectedResults);

    // Check that we have the correct number of test cases
    expect(testCases.length).toBe(4);

    // Check that each test case has the correct properties
    testCases.forEach((testCase, index) => {
      const reviewResult = Object.values(ReviewResult)[index];
      expect(testCase.name).toContain(reviewResult);
      expect(testCase.initialState).toEqual(initialState);
      expect(testCase.reviewResult).toBe(reviewResult);
      expect(testCase.expectedState).toEqual(expectedResults[reviewResult]);
      expect(testCase.description).toBeDefined();
    });
  });

  it('should create initial state test cases correctly', () => {
    const initialStates: SRSInitialState[] = [
      { easeFactor: 1.5, interval: 1, reviewCount: 1, lastReviewedAt: new Date('2023-01-01') },
      { easeFactor: 2.0, interval: 5, reviewCount: 3, lastReviewedAt: new Date('2023-01-01') },
      { easeFactor: 2.5, interval: 10, reviewCount: 5, lastReviewedAt: new Date('2023-01-01') },
    ];

    const reviewResult = ReviewResult.GOOD;

    const getExpectedState = (initialState: SRSInitialState): SRSExpectedState => ({
      easeFactor: initialState.easeFactor,
      interval: Math.round(initialState.interval * initialState.easeFactor),
      reviewCount: initialState.reviewCount + 1,
    });

    const testCases = createInitialStateTestCases(initialStates, reviewResult, getExpectedState);

    // Check that we have the correct number of test cases
    expect(testCases.length).toBe(initialStates.length);

    // Check that each test case has the correct properties
    testCases.forEach((testCase, index) => {
      const initialState = initialStates[index];
      expect(testCase.name).toContain(`ease factor ${initialState.easeFactor}`);
      expect(testCase.name).toContain(`interval ${initialState.interval}`);
      expect(testCase.initialState).toEqual(initialState);
      expect(testCase.reviewResult).toBe(reviewResult);
      expect(testCase.expectedState).toEqual(getExpectedState(initialState));
      expect(testCase.description).toBeDefined();
    });
  });

  it('should create learning path test case correctly', () => {
    const name = 'test learning path';
    const initialState: SRSInitialState = {
      easeFactor: 2.5,
      interval: 0,
      reviewCount: 0,
      lastReviewedAt: null,
    };
    const reviewSequence: ReviewResult[] = [
      ReviewResult.GOOD,
      ReviewResult.GOOD,
      ReviewResult.AGAIN,
      ReviewResult.GOOD,
    ];
    const expectedFinalState: SRSExpectedState = {
      easeFactor: 2.3,
      interval: 2,
      reviewCount: 4,
    };
    const description = 'Test description';

    const testCase = createLearningPathTestCase(
      name,
      initialState,
      reviewSequence,
      expectedFinalState,
      description
    );

    // Check that the test case has the correct properties
    expect(testCase.name).toBe(name);
    expect(testCase.initialState).toEqual(initialState);
    expect(testCase.reviewSequence).toEqual(reviewSequence);
    expect(testCase.expectedFinalState).toEqual(expectedFinalState);
    expect(testCase.description).toBe(description);
  });

  it('should create edge case test cases correctly', () => {
    const edgeCases = createEdgeCaseTestCases();

    // Check that we have edge cases
    expect(edgeCases.length).toBeGreaterThan(0);

    // Check that each edge case has the required properties
    edgeCases.forEach(edgeCase => {
      expect(edgeCase.name).toBeDefined();
      expect(edgeCase.initialState).toBeDefined();
      expect(edgeCase.reviewResult).toBeDefined();
      expect(edgeCase.expectedState).toBeDefined();
      expect(edgeCase.description).toBeDefined();
    });

    // Check specific edge cases
    const minEaseFactorCase = edgeCases.find(c => c.name.includes('minimum ease factor'));
    expect(minEaseFactorCase).toBeDefined();
    expect(minEaseFactorCase?.initialState.easeFactor).toBe(1.3);
    expect(minEaseFactorCase?.reviewResult).toBe(ReviewResult.AGAIN);
    expect(minEaseFactorCase?.expectedState.easeFactor).toBe(1.3); // Should not go below minimum

    const maxEaseFactorCase = edgeCases.find(c => c.name.includes('maximum ease factor'));
    expect(maxEaseFactorCase).toBeDefined();
    expect(maxEaseFactorCase?.initialState.easeFactor).toBe(2.9);
    expect(maxEaseFactorCase?.reviewResult).toBe(ReviewResult.EASY);
    expect(maxEaseFactorCase?.expectedState.easeFactor).toBe(3.0); // Should not go above maximum
  });
});
