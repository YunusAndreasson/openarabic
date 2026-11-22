import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const packageRoot = dirname(require.resolve('react-native-draggable-flatlist/package.json'));

// The playlist uses the Metro entry on device. Other resolvers can load either
// compiled entry. Reading InteractionManager from React Native 0.88 throws.
it.each([
  'src/components/DraggableFlatList.tsx',
  'lib/module/components/DraggableFlatList.js',
  'lib/commonjs/components/DraggableFlatList.js',
])('keeps the reorder path compatible with the installed React Native in %s', entry => {
  const source = readFileSync(join(packageRoot, entry), 'utf8');
  expect(source.includes('InteractionManager')).toBe(false);
});
