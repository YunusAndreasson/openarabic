module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // If you insist on pinning the plugin manually, keep it last:
    // plugins: ['react-native-worklets/plugin'],
  };
};
