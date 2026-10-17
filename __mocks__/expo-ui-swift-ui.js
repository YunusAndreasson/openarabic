// Mock for @expo/ui/swift-ui (and, via expo-ui-jetpack-compose.js, the Compose
// entry). Same reason as expo-ui-datetime-picker.js: @expo/ui publishes
// untranspiled TypeScript that drags expo/src/Expo.fx.tsx into the Jest graph.
//
// Plain functions, not jest.fn(): `resetMocks` would strip a jest.fn's
// implementation and the components would render nothing. A native control is
// drawn as a View carrying its state, so a test can assert what is shown.
const React = require('react');
const { View } = require('react-native');

const Host = ({ children, style }) => React.createElement(View, { style }, children);

const Toggle = ({ isOn }) =>
  React.createElement(View, { testID: 'native-switch', nativeSwitchValue: isOn });

module.exports = {
  __esModule: true,
  Host,
  Toggle,
};
