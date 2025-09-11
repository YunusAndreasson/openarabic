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
      // Reanimated plugin has been moved to worklets in Expo 54
      'react-native-worklets/plugin',
    ],
  };
};
