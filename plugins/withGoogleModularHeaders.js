const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Enables CocoaPods modular headers for the Google pods that don't define modules.
 *
 * @react-native-google-signin/google-signin pulls in the Swift pod `AppCheckCore`,
 * which depends on `GoogleUtilities` and `RecaptchaInterop`. Those two don't define
 * Clang modules, so `pod install` fails to integrate AppCheckCore as a static library:
 *
 *   [!] The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *       `RecaptchaInterop`, which do not define modules.
 *
 * Declaring them with `:modular_headers => true` makes CocoaPods generate module maps
 * for them so AppCheckCore can import them from Swift. Targeted (not a global
 * `use_modular_headers!`) to avoid disturbing React Native / Hermes pods.
 */
const MODULAR_HEADER_PODS = ['GoogleUtilities', 'RecaptchaInterop'];
const MARKER = '# withGoogleModularHeaders';
const ANCHOR = 'use_expo_modules!';

const buildBlock = () =>
  [
    `  ${MARKER} — module maps so Swift pod AppCheckCore links statically`,
    ...MODULAR_HEADER_PODS.map(pod => `  pod '${pod}', :modular_headers => true`),
  ].join('\n');

const withGoogleModularHeaders = config => {
  return withDangerousMod(config, [
    'ios',
    config => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes(MARKER)) {
        return config;
      }

      const block = buildBlock();

      if (contents.includes(ANCHOR)) {
        contents = contents.replace(ANCHOR, `${ANCHOR}\n${block}`);
      } else {
        // Fallback: inject right after the first target block opening.
        contents = contents.replace(/(target\s+['"][^'"]+['"]\s+do\n)/, `$1${block}\n`);
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};

module.exports = withGoogleModularHeaders;
