// Mock for @expo/ui/jetpack-compose. See expo-ui-swift-ui.js for why it exists
// and why it uses plain functions.
const React = require('react');
const { View } = require('react-native');

const Host = ({ children, style }) => React.createElement(View, { style }, children);

const Switch = ({ value }) =>
  React.createElement(View, { testID: 'native-switch', nativeSwitchValue: value });

// TimePicker.android.tsx's dialog: a native window with no JS-visible output.
const TimePickerDialog = () => null;

module.exports = {
  __esModule: true,
  Host,
  Switch,
  TimePickerDialog,
};
