// Mock expo-application native module for tests (no ExpoApplication native
// module under jest). Provides the fields the app reads (voice telemetry uses
// nativeApplicationVersion; auth uses applicationId / nativeBuildVersion).
module.exports = {
  __esModule: true,
  nativeApplicationVersion: '1447.12.10',
  nativeBuildVersion: '235',
  applicationId: 'com.edenmind.openarabic',
};
