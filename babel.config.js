module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          // Enable React 19 features
          jsxImportSource: '@emotion/react',
          jsxRuntime: 'automatic',
        },
      ],
    ],
    plugins: [
      // React 19 optimizations
      [
        '@babel/plugin-transform-react-jsx',
        {
          runtime: 'automatic',
          development: process.env.NODE_ENV === 'development',
        },
      ],
      '@babel/plugin-transform-runtime',
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './',
          },
        },
      ],
      // React Native 0.79 optimizations
      [
        '@babel/plugin-proposal-decorators',
        {
          legacy: true,
        },
      ],
      // Performance optimizations
      [
        'babel-plugin-transform-remove-console',
        {
          exclude: ['error', 'warn'],
        },
      ],
      // This plugin must be last for correct React Native Reanimated setup
      'react-native-reanimated/plugin',
    ],
    env: {
      production: {
        plugins: [
          // Additional production optimizations
          'babel-plugin-transform-remove-console',
          [
            'babel-plugin-transform-imports',
            {
              '@react-native-async-storage/async-storage': {
                transform: '@react-native-async-storage/async-storage/lib/{{member}}',
                preventFullImport: true,
              },
              lodash: {
                transform: 'lodash/{{member}}',
                preventFullImport: true,
              },
            },
          ],
        ],
      },
      development: {
        plugins: [
          // Development-specific optimizations
          [
            '@babel/plugin-transform-react-jsx-development',
            {
              runtime: 'automatic',
            },
          ],
        ],
      },
    },
  };
};
