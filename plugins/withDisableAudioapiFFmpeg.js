const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Sets the `disableAudioapiFFmpeg` Gradle property so react-native-audio-api does
 * NOT bundle its own FFmpeg shared libraries (libavcodec.so, libavformat.so, …).
 *
 * react-native-sherpa-onnx (on-device Parakeet ASR) already ships FFmpeg, and
 * bundling both produces duplicate `lib/<abi>/libavcodec.so` inputs that fail the
 * Android `mergeReleaseNativeLibs` task during a release build.
 *
 * The app uses react-native-audio-api only for PCM mic capture (AudioRecorder) and
 * audio-session control (AudioManager) in lib/voice/recording.ts — it never decodes
 * compressed audio through it — so dropping audio-api's FFmpeg is safe, and sherpa
 * keeps the FFmpeg it needs for ASR.
 */
const PROPERTY_KEY = 'disableAudioapiFFmpeg';

const withDisableAudioapiFFmpeg = config => {
  return withGradleProperties(config, config => {
    // Drop any existing entry first so the plugin is idempotent across prebuilds.
    const properties = config.modResults.filter(
      item => !(item.type === 'property' && item.key === PROPERTY_KEY),
    );

    properties.push({
      type: 'property',
      key: PROPERTY_KEY,
      value: 'true',
    });

    config.modResults = properties;
    return config;
  });
};

module.exports = withDisableAudioapiFFmpeg;
