module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Order matters: Router first, Reanimated last
    plugins: ['react-native-worklets/plugin'],
  };
};
