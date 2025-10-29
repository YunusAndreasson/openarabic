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
});

// Mock Skia ParagraphBuilder API
const createMockParagraphBuilder = () => ({
  pushStyle: jest.fn(),
  addText: jest.fn(),
  pop: jest.fn(),
  build: jest.fn(() => createMockParagraph()),
});

// Mock Skia API
export const Skia = {
  Color: jest.fn(color => color),
  ParagraphBuilder: {
    Make: jest.fn(() => createMockParagraphBuilder()),
  },
};

// Mock Canvas component
export const Canvas = jest.fn(({ children, style }) =>
  React.createElement('View', { style, testID: 'skia-canvas' }, children),
);

// Mock Paragraph component (renamed to avoid conflicts)
export const Paragraph = jest.fn(() => null);

// Mock Text component
export const Text = jest.fn(() => null);

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

// Default export
export default {
  Canvas,
  Paragraph,
  Text,
  Skia,
  matchFont,
  TextAlign,
  TextDirection,
  FontSlant,
};
