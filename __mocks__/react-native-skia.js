/**
 * Mock for @shopify/react-native-skia
 * Provides test doubles for Skia Canvas, Paragraph, and font APIs
 */

import React from 'react';

/**
 * WHY THE NON-COMPONENT EXPORTS BELOW ARE PLAIN FUNCTIONS, NOT `jest.fn()`.
 *
 * `resetMocks: true` in jest.config.js strips the implementation off EVERY
 * `jest.fn()` before each test — including the ones declared here. So a factory
 * written as `jest.fn(() => builder)` returned `undefined` in every suite that
 * ever called it, and `Skia.PathBuilder.Make().moveTo(...)` died with "Cannot
 * read properties of undefined". The mock looked complete and was inert.
 *
 * Builders, geometry helpers and the Reanimated-backed hooks are therefore
 * plain functions: nothing asserts on their call records, and they only have to
 * return values of the right shape.
 *
 * KNOWN LIMITATION, not a design choice. The COMPONENT exports further down are
 * still `jest.fn()`, so `resetMocks` strips them too — including `Canvas`,
 * `Group` and `Mask`, which are written to render their children and are reset
 * to rendering nothing. Anything nested inside a `<Canvas>` (a chart's axis
 * labels, a legend row) is therefore absent from the tree, and a
 * `queryByText(...)).toBeNull()` about it passes for the wrong reason. They are
 * left as they are because every existing suite's assertions were written
 * against that output; converting them would surface previously-invisible text
 * and would need those suites re-checked. Fix them together, not by accident.
 */

// Mock Skia Paragraph API
const createMockParagraph = () => ({
  getHeight: () => 40,
  getMaxWidth: () => 400,
  getLongestLine: () => 80, // Actual text width
  getMinIntrinsicWidth: () => 80,
  getMaxIntrinsicWidth: () => 85, // Slightly wider for accurate measurement
  layout: () => {},
  // Null keeps callers on their estimate-based fallback, so canvas geometry in
  // tests stays deterministic instead of depending on mocked glyph outlines.
  getPath: () => null,
});

// Mock Skia ParagraphBuilder API
const createMockParagraphBuilder = () => ({
  pushStyle: () => {},
  addText: () => {},
  pop: () => {},
  build: () => createMockParagraph(),
});

// Mock Skia Path API (immutable result of PathBuilder.build()).
//
// Deliberately has NO mutators (`moveTo`, `lineTo`, `close`, …). Skia 2.14
// removed them from `SkPath` — paths are grown on a PathBuilder only — and
// while this mock still offered them, `WordMemoryCurve` kept passing its tests
// on an API the library no longer had. Typecheck caught it; this would not have.
const createMockPath = () => ({
  copy: () => createMockPath(),
  toSVGString: () => 'M0,0',
  // Real Skia refuses to interpolate two paths with different verb counts, and
  // `usePathInterpolation` THROWS on the mismatch rather than degrading — which
  // is why WeekAheadBars checks this before handing a pair over. Every mock path
  // is built by the same code path here, so the honest answer is `true`; a chart
  // that guards correctly must not be punished for it under test.
  isInterpolatable: () => true,
  interpolate: () => createMockPath(),
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
    builder[name] = () => builder;
  }
  builder.build = () => createMockPath();
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
  Color: color => color,
  ParagraphBuilder: {
    Make: () => createMockParagraphBuilder(),
  },
  Path: {
    Make: () => createMockPath(),
  },
  PathBuilder: {
    Make: () => createMockPathBuilder(),
    MakeFromPath: () => createMockPathBuilder(),
  },
  RSXform: (scos, ssin, tx, ty) => createMockRSXform(scos, ssin, tx, ty),
  XYWHRect: (x, y, width, height) => ({ x, y, width, height }),
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
export const vec = (x, y) => ({ x, y });
export const rect = (x, y, width, height) => ({ x, y, width, height });

// ---------------------------------------------------------------------------
// Reanimated-backed hooks.
//
// These normally run on the UI thread against a real Skia surface. Under Jest
// they return plain values of the right SHAPE — the modifier callbacks are
// invoked once, eagerly, so a buffer's contents are still a function of the data
// and a test can assert on them. `usePathInterpolation` returns the last path in
// the output range, which is the settled state every assertion cares about.
// ---------------------------------------------------------------------------

export const useTexture = () => ({ value: null });

export const useRSXformBuffer = (size, modifier) => {
  const buffer = Array.from({ length: size }, () => createMockRSXform());
  buffer.forEach((xform, index) => modifier(xform, index));
  return buffer;
};

export const useRectBuffer = (size, modifier) => {
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
};

export const usePathInterpolation = (_progress, _input, outputRange) => ({
  value: outputRange?.[outputRange.length - 1] ?? null,
});

export const useVectorInterpolation = (_progress, _input, outputRange) => ({
  value: outputRange?.[outputRange.length - 1] ?? { x: 0, y: 0 },
});

// Mock matchFont API
export const matchFont = config => ({
  getSize: () => config.fontSize || 17,
  getTypeface: () => ({
    getFamilyName: () => config.fontFamily || 'System',
  }),
});

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
