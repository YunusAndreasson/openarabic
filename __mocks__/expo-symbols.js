// Mock for expo-symbols. SymbolView is a native view; a View carrying the
// requested symbol is a faithful stand-in and lets a test read which SF Symbol
// was asked for. A plain function, not jest.fn(), so `resetMocks` cannot strip it.
const React = require('react');
const { View } = require('react-native');

const SymbolView = ({ name, ...props }) =>
  React.createElement(View, {
    ...props,
    testID: props.testID || 'symbol-view',
    symbolName: typeof name === 'object' ? name.ios : name,
  });

module.exports = {
  __esModule: true,
  SymbolView,
};
