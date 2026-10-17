// Mock for @expo/ui/swift-ui/modifiers: each modifier is a plain descriptor, so
// a test can read which modifiers a view was given.
const modifier =
  name =>
  (...args) => ({ $type: name, args });

module.exports = {
  __esModule: true,
  labelsHidden: modifier('labelsHidden'),
  tint: modifier('tint'),
  toggleStyle: modifier('toggleStyle'),
};
