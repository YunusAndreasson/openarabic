# Spaced Repetition System Tests

This directory contains tests for our Spaced Repetition System (SRS) implementation. The tests are organized into several files with different focuses:

## Test Files

- **useSpacedRepetition.test.ts**: Implementation-focused tests that verify the specific behavior of the SRS functions.
- **srs-principles.test.ts**: Principle-focused tests that validate adherence to core SRS scientific principles.
- **useSpacedRepetitionHook.test.tsx**: Tests for the React hook implementation of the SRS system.
- **ease-factor-test.js**: Focused tests for ease factor behavior.
- **srs-edge-cases.test.ts**: Tests for edge cases and real-world scenarios in the SRS system.
- **srs-loop-prevention.test.ts**: Tests for the loop prevention mechanism to avoid infinite processing of problematic words.
- **memoization-demo.js**: Demonstration of memoization benefits with simple tests.

## Testing Philosophy

Our SRS testing follows a multi-faceted approach:

1. **Implementation Testing**: Verifies that specific functions work as expected with various inputs.
2. **Principle Testing**: Validates that the algorithm adheres to established learning science principles.
3. **Edge Case Testing**: Ensures the system handles unusual or extreme scenarios gracefully.
4. **Loop Prevention Testing**: Verifies that the system can recover from potential infinite loops.

This comprehensive approach ensures that:

- The code works correctly at a technical level
- The learning algorithm follows scientifically-validated principles
- The system is robust against unexpected inputs and scenarios
- Future changes don't compromise the effectiveness of the SRS

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all SRS-related tests
npm run test:srs

# Run only the SRS principles tests
npm run test:srs-principles

# Run only the edge case tests
npm run test:srs-edge-cases

# Run only the loop prevention tests
npm run test:srs-loop-prevention

# Run all tests with coverage report
npm run test:srs:coverage
```

## Core SRS Principles Tested

The `srs-principles.test.ts` file tests these core principles:

1. **Exponential Interval Growth**: Intervals should grow exponentially with successful reviews, not linearly.
2. **Forgetting Curve Reset**: When a word is forgotten, intervals reset but some memory strength is retained.
3. **Ease Factor Personalization**: The algorithm adapts to individual word difficulty based on performance.
4. **Spacing Effect**: Longer previous intervals lead to better retention and larger interval boosts.
5. **Lapse Penalty**: Words forgotten multiple times receive shorter intervals to aid relearning.
6. **Learning Efficiency**: New and failed words are requeued optimally for effective learning.
7. **Long-Term Memory Formation**: Consistent success leads to very long intervals, supporting permanent retention.

## Edge Cases Tested

The `srs-edge-cases.test.ts` file tests these edge cases:

1. **Single Word Reviews**: Handling review sessions with only one word.
2. **Repeated Failures**: Managing words that are repeatedly failed.
3. **Empty Queues**: Gracefully handling empty review queues.
4. **Progress Calculation**: Ensuring accurate progress calculation in various scenarios.
5. **Completion Logic**: Verifying review completion logic in edge cases.
6. **Requeuing Logic**: Testing word requeuing in various scenarios.
7. **Reinsert Position**: Validating position calculation for requeued words.
8. **Input Validation**: Ensuring the system handles invalid inputs gracefully.

## Loop Prevention Tested

The `srs-loop-prevention.test.ts` file tests these loop prevention mechanisms:

1. **Processing Attempts Tracking**: Verifying that the system tracks how many times a word has been processed.
2. **Problematic Word Handling**: Ensuring the system can complete reviews even with problematic words.
3. **Progress Calculation**: Validating that progress calculation works correctly with problematic words.

## Test Coverage

The current test coverage focuses on the pure algorithm functions extracted for testability. The React hook implementation has lower coverage because it's more challenging to test without a full React testing environment.

Coverage breakdown:

- **Pure Functions**: High coverage of the core algorithm functions
- **React Hooks**: Lower coverage, primarily tested through the hook exports
- **Services**: Low coverage, as these are primarily tested through integration tests

When making changes to the SRS system, prioritize maintaining high coverage of the pure functions, as these contain the core algorithm logic.

## Test Maintenance

When modifying the SRS algorithm:

1. Run both implementation and principle tests to ensure changes don't break existing functionality.
2. If changing core algorithm behavior, update the principle tests to reflect the new expected behavior.
3. Add new principle tests if implementing new learning science concepts.
4. Check edge cases to ensure the system remains robust.
5. Verify that loop prevention mechanisms still work correctly.

Remember that these tests serve as both validation and documentation of the SRS algorithm's behavior.
