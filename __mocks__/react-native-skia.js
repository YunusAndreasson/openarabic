module.exports = {
  Canvas: 'Canvas',
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
