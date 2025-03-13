#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  console.log('Running useProgressAnimation tests...');
  const progressAnimationOutput = execSync(
    'npm test -- __tests__/hooks/animations/useProgressAnimation.test.ts --watchAll=false',
    { stdio: 'inherit' }
  );

  console.log('Running useScreenFocusRefresh tests...');
  const screenFocusRefreshOutput = execSync(
    'npm test -- __tests__/hooks/useScreenFocusRefresh.test.ts --watchAll=false',
    { stdio: 'inherit' }
  );

  console.log('All tests passed!');
} catch (error) {
  console.error('Tests failed:', error.message);
  process.exit(1);
}
