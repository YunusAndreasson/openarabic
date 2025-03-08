# Spaced Repetition System Tests

This directory contains tests for our Spaced Repetition System (SRS) implementation. The tests are organized into several files with different focuses:

## Test Files

- **useSpacedRepetition.test.ts**: Implementation-focused tests that verify the specific behavior of the SRS functions.
- **srs-principles.test.ts**: Principle-focused tests that validate adherence to core SRS scientific principles.
- **useSpacedRepetitionHook.test.tsx**: Tests for the React hook implementation of the SRS system.
- **ease-factor-test.js**: Focused tests for ease factor behavior.
- **memoization-demo.js**: Demonstration of memoization benefits with simple tests.

## Testing Philosophy

Our SRS testing follows a dual approach:

1. **Implementation Testing**: Verifies that specific functions work as expected with various inputs.
2. **Principle Testing**: Validates that the algorithm adheres to established learning science principles.

This dual approach ensures that:

- The code works correctly at a technical level
- The learning algorithm follows scientifically-validated principles
- Future changes don't compromise the effectiveness of the SRS

## Running Tests

You can run the tests using the following npm scripts:

```bash
# Run all SRS-related tests
npm run test:srs

# Run only the SRS principles tests
npm run test:srs-principles
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

## Test Maintenance

When modifying the SRS algorithm:

1. Run both implementation and principle tests to ensure changes don't break existing functionality.
2. If changing core algorithm behavior, update the principle tests to reflect the new expected behavior.
3. Add new principle tests if implementing new learning science concepts.

Remember that the principle tests serve as both validation and documentation of the SRS algorithm's behavior.
