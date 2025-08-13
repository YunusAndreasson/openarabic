module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './',
            '@read': './components/read',
            '@listen': './components/listen',
            '@practice': './components/practice',
            '@account': './components/account',
            '@article': './components/article',
            '@common': './components/common',
            '@ui': './components/ui',
            '@charts': './components/common/charts',
          },
        },
      ],
      // This plugin must be last for correct React Native Reanimated setup
      'react-native-reanimated/plugin',
    ],
  };
};
