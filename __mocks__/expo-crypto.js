// Mock expo-crypto for tests. The real package imports 'expo', whose Expo.fx reads
// a native object that doesn't exist under jest, so merely importing it fails the
// suite (the same failure as expo-blur since SDK 58). services/analyticsInstall
// imports it for install_id, and services/analytics imports that. A suite that
// cares what comes out of it brings its own factory.
let lastId = 0;

module.exports = {
  __esModule: true,
  randomUUID: () => {
    lastId += 1;
    return `test-uuid-${lastId}`;
  },
};
