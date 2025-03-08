// Mock for @expo/vector-icons
import React from 'react';
import { Text } from 'react-native';

// Create a component that renders the icon name as text for testing
const createIconSet = () => {
  return ({ name, size, color, ...props }) => <Text {...props}>{name}</Text>;
};

// Mock all the icon sets
const Ionicons = createIconSet();
const MaterialIcons = createIconSet();
const FontAwesome = createIconSet();
const FontAwesome5 = createIconSet();
const MaterialCommunityIcons = createIconSet();
const Entypo = createIconSet();
const Feather = createIconSet();
const AntDesign = createIconSet();
const SimpleLineIcons = createIconSet();
const Octicons = createIconSet();
const Foundation = createIconSet();
const EvilIcons = createIconSet();
const Fontisto = createIconSet();
const Zocial = createIconSet();

export {
  Ionicons,
  MaterialIcons,
  FontAwesome,
  FontAwesome5,
  MaterialCommunityIcons,
  Entypo,
  Feather,
  AntDesign,
  SimpleLineIcons,
  Octicons,
  Foundation,
  EvilIcons,
  Fontisto,
  Zocial,
};
