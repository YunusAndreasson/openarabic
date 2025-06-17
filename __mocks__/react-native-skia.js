const React = require('react');

module.exports = {
  Canvas: 'Canvas',
  Group: () => React.createElement('Group'),
  Line: () => React.createElement('Line'),
  useSharedValueEffect: () => {},
  useDerivedValue: () => ({}),
  useValue: () => ({ value: 0 }),
  runOnJS: () => {},
  Skia: {
    Paint: () => ({}),
    Path: {
      Make: () => ({
        addArc: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadTo: () => {},
        close: () => {},
      }),
    },
  },
};
