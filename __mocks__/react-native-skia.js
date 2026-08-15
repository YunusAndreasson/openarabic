/**
 * Mock for @shopify/react-native-skia
 * Provides test doubles for Skia Canvas, Paragraph, and font APIs
 */

import React from 'react';

// Mock Skia Paragraph API
const createMockParagraph = () => ({
  getHeight: jest.fn(() => 40),
  getMaxWidth: jest.fn(() => 400),
  getLongestLine: jest.fn(() => 80), // Actual text width
  getMinIntrinsicWidth: jest.fn(() => 80),
  getMaxIntrinsicWidth: jest.fn(() => 85), // Slightly wider for accurate measurement
  layout: jest.fn(),
  // Null keeps callers on their estimate-based fallback, so canvas geometry in
  // tests stays deterministic instead of depending on mocked glyph outlines.
  getPath: jest.fn(() => null),
});

// Mock Skia ParagraphBuilder API
const createMockParagraphBuilder = () => ({
  pushStyle: jest.fn(),
  addText: jest.fn(),
  pop: jest.fn(),
  build: jest.fn(() => createMockParagraph()),
});

// Mock Skia Path API (immutable result of PathBuilder.build())
const createMockPath = () => ({
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  cubicTo: jest.fn(),
  close: jest.fn(),
  addArc: jest.fn(),
  toSVGString: jest.fn(() => 'M0,0'),
});

// Mock Skia PathBuilder API — chainable builder where every mutator returns
// `this` and `build()` produces a Path. Mirrors the runtime API documented at
// https://shopify.github.io/react-native-skia/docs/shapes/path-migration
const createMockPathBuilder = () => {
  const builder = {};
  const chainableMethods = [
    'moveTo',
    'lineTo',
    'quadTo',
    'cubicTo',
    'conicTo',
    'rMoveTo',
    'rLineTo',
    'rQuadTo',
    'rCubicTo',
    'rConicTo',
    'arcTo',
    'arcToOval',
    'arcToRotated',
    'addRect',
    'addOval',
    'addCircle',
    'addRRect',
    'addArc',
    'addPath',
    'close',
    'reset',
    'setFillType',
    'setIsVolatile',
  ];
  for (const name of chainableMethods) {
    builder[name] = jest.fn(() => builder);
  }
  builder.build = jest.fn(() => createMockPath());
  return builder;
};

// Mock RSXform — the (scos, ssin, tx, ty) transform Atlas draws each sprite with.
// `set` mutates in place because that is what useRSXformBuffer's modifier does.
const createMockRSXform = (scos = 1, ssin = 0, tx = 0, ty = 0) => {
  const xform = {
    scos,
    ssin,
    tx,
    ty,
    set: (nextScos, nextSsin, nextTx, nextTy) => {
      xform.scos = nextScos;
      xform.ssin = nextSsin;
      xform.tx = nextTx;
      xform.ty = nextTy;
    },
  };
  return xform;
};

// Mock Skia API
export const Skia = {
  Color: jest.fn(color => color),
  ParagraphBuilder: {
    Make: jest.fn(() => createMockParagraphBuilder()),
  },
  Path: {
    Make: jest.fn(() => createMockPath()),
  },
  PathBuilder: {
    Make: jest.fn(() => createMockPathBuilder()),
    MakeFromPath: jest.fn(() => createMockPathBuilder()),
  },
  RSXform: jest.fn((scos, ssin, tx, ty) => createMockRSXform(scos, ssin, tx, ty)),
  XYWHRect: jest.fn((x, y, width, height) => ({ x, y, width, height })),
};

// Mock Canvas component
export const Canvas = jest.fn(({ children, style }) =>
  React.createElement('View', { style, testID: 'skia-canvas' }, children),
);

// Mock Paragraph component (renamed to avoid conflicts)
export const Paragraph = jest.fn(() => null);

// Mock Text component
export const Text = jest.fn(() => null);

// Mock Rect component (for gradient rectangles)
export const Rect = jest.fn(() => null);

// Mock LinearGradient component
export const LinearGradient = jest.fn(() => null);

// Mock chart/shape components
export const Group = jest.fn(({ children }) =>
  React.createElement('View', { testID: 'skia-group' }, children),
);
export const Path = jest.fn(() => null);
export const Circle = jest.fn(() => null);
export const RoundedRect = jest.fn(() => null);
export const Line = jest.fn(() => null);
export const Mask = jest.fn(({ children }) =>
  React.createElement('View', { testID: 'skia-mask' }, children),
);

// Mock Atlas — draws N sprites of one texture in a single call. Rendered as a
// leaf so a test can assert it mounted without needing a real GPU surface.
export const Atlas = jest.fn(() => null);

// Mock DashPathEffect (dashed rules on charts)
export const DashPathEffect = jest.fn(() => null);

// Mock vec / rect helper functions (gradient + sprite coordinates)
export const vec = jest.fn((x, y) => ({ x, y }));
export const rect = jest.fn((x, y, width, height) => ({ x, y, width, height }));

// ---------------------------------------------------------------------------
// Reanimated-backed hooks.
//
// These normally run on the UI thread against a real Skia surface. Under Jest
// they return plain values of the right SHAPE — the modifier callbacks are
// invoked once, eagerly, so a buffer's contents are still a function of the data
// and a test can assert on them. `usePathInterpolation` returns the last path in
// the output range, which is the settled state every assertion cares about.
// ---------------------------------------------------------------------------

export const useTexture = jest.fn(() => ({ value: null }));

export const useRSXformBuffer = jest.fn((size, modifier) => {
  const buffer = Array.from({ length: size }, () => createMockRSXform());
  buffer.forEach((xform, index) => modifier(xform, index));
  return buffer;
});

export const useRectBuffer = jest.fn((size, modifier) => {
  const buffer = Array.from({ length: size }, () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    setXYWH(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    },
  }));
  buffer.forEach((entry, index) => modifier(entry, index));
  return buffer;
});

export const usePathInterpolation = jest.fn((_progress, _input, outputRange) => ({
  value: outputRange?.[outputRange.length - 1] ?? null,
}));

export const useVectorInterpolation = jest.fn((_progress, _input, outputRange) => ({
  value: outputRange?.[outputRange.length - 1] ?? { x: 0, y: 0 },
}));

// Mock matchFont API
export const matchFont = jest.fn(config => ({
  getSize: jest.fn(() => config.fontSize || 17),
  getTypeface: jest.fn(() => ({
    getFamilyName: jest.fn(() => config.fontFamily || 'System'),
  })),
}));

// Mock enums
export const TextAlign = {
  Left: 0,
  Right: 1,
  Center: 2,
  Justify: 3,
  Start: 4,
  End: 5,
};

export const TextDirection = {
  RTL: 0,
  LTR: 1,
};

export const FontSlant = {
  Upright: 0,
  Italic: 1,
  Oblique: 2,
};

export const BlendMode = {
  Clear: 0,
  Src: 1,
  Dst: 2,
  SrcOver: 3,
  DstOver: 4,
  SrcIn: 5,
  DstIn: 6,
  SrcATop: 9,
  Multiply: 24,
};

// Default export
export default {
  Canvas,
  Paragraph,
  Text,
  Rect,
  LinearGradient,
  Group,
  Path,
  Circle,
  RoundedRect,
  Line,
  Mask,
  Atlas,
  DashPathEffect,
  vec,
  rect,
  Skia,
  matchFont,
  useTexture,
  useRSXformBuffer,
  useRectBuffer,
  usePathInterpolation,
  useVectorInterpolation,
  TextAlign,
  TextDirection,
  FontSlant,
  BlendMode,
};
