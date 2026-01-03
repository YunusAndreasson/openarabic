// Mock for expo-router/unstable-native-tabs
const React = require('react');

const NativeTabs = ({ children }) => React.createElement('View', null, children);
NativeTabs.Trigger = ({ children }) => React.createElement('View', null, children);

module.exports = {
  NativeTabs,
  Icon: () => null,
  Label: () => null,
  Badge: () => null,
};
