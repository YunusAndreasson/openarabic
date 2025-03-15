const { execSync } = require('child_process');

// Run the tests one by one to avoid Jest watch mode issues
try {
  console.log('\n\n========== Testing useAnimationTrigger ==========');
  execSync('npx jest __tests__/hooks/useAnimationTrigger.test.ts --testTimeout=1000 --no-watch', {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1', NODE_OPTIONS: '--unhandled-rejections=strict' },
  });

  console.log('\n\n========== Testing useLoadingState ==========');
  execSync('npx jest __tests__/hooks/useLoadingState.test.ts --testTimeout=1000 --no-watch', {
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1', NODE_OPTIONS: '--unhandled-rejections=strict' },
  });

  console.log('\n\nAll tests completed successfully!');
} catch (error) {
  console.error('\n\nTest execution failed:', error.message);
  process.exit(1);
}
