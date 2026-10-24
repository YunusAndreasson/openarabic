// Mock for expo-glass-effect
const React = require('react');
const { View } = require('react-native');

const GlassView = React.forwardRef((props, ref) => {
  const { children, style, ...rest } = props;
  return React.createElement(View, { ref, style, ...rest }, children);
});

GlassView.displayName = 'GlassView';

const GlassContainer = React.forwardRef((props, ref) => {
  const { children, style, ...rest } = props;
  return React.createElement(View, { ref, style, ...rest }, children);
});

GlassContainer.displayName = 'GlassContainer';

module.exports = {
  GlassView,
  GlassContainer,
  isLiquidGlassAvailable: () => false,
  isGlassEffectAPIAvailable: () => false,
};
