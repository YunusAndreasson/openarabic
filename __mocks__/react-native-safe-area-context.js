const React = require('react');
const { jest } = require('@jest/globals');

const SafeAreaView = ({ children, style, ...props }) =>
  React.createElement('SafeAreaView', { ...props, style }, children);

const SafeAreaProvider = ({ children, ...props }) =>
  React.createElement('SafeAreaProvider', props, children);

const useSafeAreaInsets = jest.fn(() => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
}));

const SafeAreaConsumer = ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 });

const Edge = {
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
};

module.exports = {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
  SafeAreaConsumer,
  Edge,
  __esModule: true,
};
