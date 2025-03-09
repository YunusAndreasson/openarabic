const { execSync } = require('child_process');

try {
  console.log('Running useAnimationTrigger tests...');
  const output = execSync(
    'npx jest __tests__/hooks/useAnimationTrigger.test.ts --testTimeout=1000 --no-watchman --no-watch --forceExit',
    {
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1', NODE_OPTIONS: '--unhandled-rejections=strict' },
    }
  );
} catch (error) {
  console.error('Test execution failed:', error.message);
}
