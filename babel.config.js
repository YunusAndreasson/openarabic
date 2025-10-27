module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Order matters: Worklets first, Reanimated last (required for New Architecture)
    plugins: ['react-native-worklets/plugin', 'react-native-reanimated/plugin'],
  };
};
