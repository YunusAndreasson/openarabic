/**
 * This file demonstrates the performance benefits of memoization.
 *
 * To run this demonstration:
 * 1. Save this file
 * 2. Run it with: node __tests__/hooks/memoization-demo.js
 */

/**
 * A simple calculation function that simulates an expensive operation
 */
function expensiveCalculation(a, b, c) {
  // Simulate CPU work (could be complex UI calculations in React)
  let result = 0;
  for (let i = 0; i < 1000000; i++) {
    result += Math.sin(i * a * b * c);
  }
  return Math.round((a / (b + c)) * 100);
}

/**
 * Creates a memoized version of a calculation function
 */
function createMemoizedCalculator(calculationFn) {
  const cache = new Map();
  let hits = 0;
  let misses = 0;

  function memoizedFn(a, b, c) {
    const cacheKey = `${a}-${b}-${c}`;

    if (cache.has(cacheKey)) {
      hits++;
      return cache.get(cacheKey);
    }

    misses++;
    const result = calculationFn(a, b, c);
    cache.set(cacheKey, result);

    // Keep cache from growing too large
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }

  // Expose stats for demonstration
  memoizedFn.getStats = () => ({ hits, misses, cacheSize: cache.size });

  return memoizedFn;
}

// Create a memoized version of our expensive calculation
const memoizedCalculator = createMemoizedCalculator(expensiveCalculation);

// Demo: Non-memoized version
console.log('=== Non-memoized Performance ===');
let startTime = Date.now();

// Repeated calculations with the same inputs
for (let i = 0; i < 10; i++) {
  expensiveCalculation(5, 10, 2);
}
console.log(`Time for 10 non-memoized calculations: ${Date.now() - startTime}ms`);

// Demo: Memoized version
console.log('\n=== Memoized Performance ===');
startTime = Date.now();

// Repeated calculations with the same inputs
for (let i = 0; i < 10; i++) {
  memoizedCalculator(5, 10, 2);
}

console.log(`Time for 10 memoized calculations: ${Date.now() - startTime}ms`);
console.log(`Cache stats: ${JSON.stringify(memoizedCalculator.getStats())}`);

// Demo: Mixed inputs
console.log('\n=== Memoized Performance with Mixed Inputs ===');
startTime = Date.now();

// Calculations with varying inputs
for (let i = 0; i < 5; i++) {
  // Same inputs several times
  memoizedCalculator(5, 10, 2);
  memoizedCalculator(5, 10, 2);

  // Different inputs
  memoizedCalculator(i, 10, 2);
}

console.log(`Time for mixed inputs: ${Date.now() - startTime}ms`);
console.log(`Cache stats: ${JSON.stringify(memoizedCalculator.getStats())}`);

/**
 * Expected output will show dramatically improved performance with memoization
 * when the same inputs are used repeatedly.
 *
 * In a React application, this translates to much smoother UI rendering, especially
 * during rapid state updates that would otherwise recalculate the same values.
 */
