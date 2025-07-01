const React = require('react');
const { Text } = require('react-native');

// Mock icon component that renders as Text with icon name
const createMockIcon = name => {
  const MockIcon = props =>
    React.createElement(
      Text,
      {
        ...props,
        testID: `mock-icon-${name}`,
        accessibilityLabel: `icon ${props.name || name}`,
      },
      props.name || name
    );

  MockIcon.displayName = `Mock${name}`;
  return MockIcon;
};

// Export all commonly used icon sets
module.exports = {
  Ionicons: createMockIcon('Ionicons'),
  MaterialIcons: createMockIcon('MaterialIcons'),
  MaterialCommunityIcons: createMockIcon('MaterialCommunityIcons'),
  AntDesign: createMockIcon('AntDesign'),
  Feather: createMockIcon('Feather'),
  FontAwesome: createMockIcon('FontAwesome'),
  Foundation: createMockIcon('Foundation'),
  Octicons: createMockIcon('Octicons'),
  Zocial: createMockIcon('Zocial'),
  EvilIcons: createMockIcon('EvilIcons'),
  SimpleLineIcons: createMockIcon('SimpleLineIcons'),
  Entypo: createMockIcon('Entypo'),
  FontAwesome5: createMockIcon('FontAwesome5'),
};
