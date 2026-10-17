// Global stand-in for components/ui/Icon (jest.setup.js). Renders the icon's
// NAME as text under `mock-icon-<name>`, exactly as the Ionicons mock did before
// Icon moved to native symbols, so every test that asserts which icon a
// component shows keeps asserting it. The names are unchanged (constants/icons.ts
// keys are the old Ionicons names).
//
// The real Icon — the SF Symbol / Material Symbol choice per platform — is
// tested on its own in __tests__/components/ui/Icon.test.tsx, which unmocks it.
const React = require('react');
const { Text } = require('react-native');

const Icon = props =>
  React.createElement(
    Text,
    { ...props, testID: props.testID || `mock-icon-${props.name}` },
    props.name,
  );

module.exports = {
  __esModule: true,
  Icon,
};
