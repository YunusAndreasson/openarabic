// The native fingerprint: what EAS reports for each build and what
// scripts/check-runtime.js records per runtime in native-runtimes.json. Both
// read this file, so a build's fingerprint on expo.dev and its runtime record
// stay the same hash.
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULT_SOURCE_SKIPS, SourceSkips } = require('expo/fingerprint');

const root = path.dirname(require.resolve('./package.json'));

// Yarn patches of packages that ship native code. The default fingerprint keys a
// native module by name and version, which a patch leaves unchanged. JS-only
// patches stay out, so editing one does not retire a runtime.
function nativePatchSources() {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  return Object.entries(pkg.dependencies ?? {})
    .filter(([, spec]) => spec.startsWith('patch:'))
    .filter(([name]) => {
      const dir = path.join(root, 'node_modules', name);
      // Not installed: count it, so a broken install cannot drop a source.
      return (
        !fs.existsSync(dir) ||
        fs.existsSync(path.join(dir, 'android')) ||
        fs.existsSync(path.join(dir, 'ios')) ||
        fs.readdirSync(dir).some(file => file.endsWith('.podspec'))
      );
    })
    .map(([, spec]) => ({
      type: 'file',
      filePath: spec.slice(spec.indexOf('#~/') + 3),
      reasons: ['native patches'],
    }));
}

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  // Neither package.json scripts nor .gitignore reach the binary. Hashed, editing
  // `yarn verify` or an ignore line would retire a runtime no binary changed for.
  sourceSkips: DEFAULT_SOURCE_SKIPS | SourceSkips.PackageJsonScriptsAll | SourceSkips.GitIgnore,
  ignorePaths: [
    // CNG: prebuild output is generated from the app config, plugins and native
    // packages hashed above. A local Android build leaves android/ behind.
    'modules/**/android/build/**',
    'modules/**/android/.gradle/**',
    'android/**',
    'ios/**',
    // From edenmind: react-native-executorch's postinstall downloads the runtime
    // for the CURRENT platform into third-party/, so it holds Android .so files on
    // Linux and iOS xcframeworks on the EAS macOS worker. Its package.json is
    // still hashed, so a new version still moves the fingerprint.
    '**/react-native-executorch/third-party/**',
    // A local Android build leaves Gradle output inside @sentry/react-native.
    '**/@sentry/react-native/android/expo-handler/build/**',
    '**/@sentry/react-native/android/expo-handler/.gradle/**',
    '**/@sentry/react-native/android/expo-handler/.cxx/**',
  ],
  extraSources: [
    ...nativePatchSources(),
    // Embedded gallery layouts, extension resources and the local bridge ship in the binary.
    ...['widgets', 'modules/word-widget'].map(filePath => ({
      type: 'dir',
      filePath,
      reasons: ['OpenArabic word widget'],
    })),
    ...[
      'constants/widgetEdition.ts',
      'plugins/withWordWidgetResources.js',
      'assets/fonts/Amiri.ttf',
    ].map(filePath => ({
      type: 'file',
      filePath,
      reasons: ['OpenArabic word widget resources'],
    })),
  ],
};
