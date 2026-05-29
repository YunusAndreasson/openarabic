const React = require('react');
const { Text } = require('react-native');

const MockIcon = props =>
  React.createElement(
    Text,
    {
      ...props,
      testID: props.testID || `mock-icon-${props.name}`,
    },
    props.name,
  );

MockIcon.displayName = 'MockIonicons';

module.exports = MockIcon;
module.exports.Ionicons = MockIcon;
module.exports.default = MockIcon;
