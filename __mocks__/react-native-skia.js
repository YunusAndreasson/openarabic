// Mock for @shopify/react-native-skia
module.exports = {
  Canvas: 'Canvas',
  Path: 'Path',
  Line: 'Line',
  Circle: 'Circle',
  Group: 'Group',
  BlurMask: 'BlurMask',
  LinearGradient: 'LinearGradient',
  vec: (x, y) => ({ x, y }),
  Skia: {
    Path: {
      Make: () => ({}),
    },
  },
};
