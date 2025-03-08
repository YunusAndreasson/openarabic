#!/usr/bin/env node

/**
 * This script runs a specific test with a very short timeout.
 * Usage: node scripts/run-test-with-timeout.js <test-file-path> [timeout-ms]
 * Example: node scripts/run-test-with-timeout.js components/__tests__/AudioPlayer-test.tsx 500
 */

const { execSync } = require('child_process');
const path = require('path');

// Get the test file path from command line arguments
const testFilePath = process.argv[2];
if (!testFilePath) {
  console.error('Please provide a test file path');
  process.exit(1);
}

// Get the timeout from command line arguments or use default
const timeout = process.argv[3] || 500;

// Construct the Jest command
const jestCommand = `npx jest ${testFilePath} --no-watch --testTimeout=${timeout} --bail`;

console.log(`Running test with timeout ${timeout}ms: ${jestCommand}`);

try {
  // Run the Jest command
  execSync(jestCommand, { stdio: 'inherit' });
} catch (error) {
  // Jest will exit with a non-zero code if tests fail, which will throw an error
  process.exit(1);
}
