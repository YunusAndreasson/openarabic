// Mock for expo-blur
//
// Since SDK 58, expo-blur imports `requireNativeView` from 'expo', and loading
// 'expo' runs expo/src/Expo.fx.tsx, which reads NativeModules off the
// jest.setup.js react-native mock (where it is undefined) and throws on
// EXDevLauncher before any test runs. A blur is visual only, so a View stands in.
const React = require('react');
const { View } = require('react-native');

const BlurView = React.forwardRef((props, ref) => {
  const { children, style, testID } = props;
  return React.createElement(View, { ref, style, testID }, children);
});

BlurView.displayName = 'BlurView';

const BlurTargetView = React.forwardRef((props, ref) => {
  const { children, style, testID } = props;
  return React.createElement(View, { ref, style, testID }, children);
});

BlurTargetView.displayName = 'BlurTargetView';

module.exports = {
  BlurView,
  BlurTargetView,
};
