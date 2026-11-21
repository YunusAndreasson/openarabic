/**
 * Where Skia has no GPU at all, a chart is not mounted: its canvas could only
 * stay blank. A lost device is not that: react-native-skia replaces it and the
 * canvas draws again on its own, so the chart stays.
 */

import { afterEach, describe, expect, test } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Skia } from 'react-native-skia';

import { SkiaDrawing } from '@/components/common/charts/SkiaDrawing';

// The Skia mock's GPU reading is module state: each test sets it and this restores it.
const gpu = Skia.gpu as { isAvailable: boolean; backend: string };
const workingGpu = { ...gpu };

afterEach(() => {
  Object.assign(gpu, workingGpu);
});

const renderDrawing = () =>
  render(
    <SkiaDrawing>
      <Text>chart</Text>
    </SkiaDrawing>,
  );

describe('SkiaDrawing', () => {
  test('draws where Skia has a GPU', () => {
    renderDrawing();

    expect(screen.getByText('chart')).toBeOnTheScreen();
  });

  test('mounts nothing where Dawn found no GPU adapter', () => {
    // As OPENARABIC-T7's device read: unavailable, and no backend at all.
    Object.assign(gpu, { isAvailable: false, backend: '' });

    renderDrawing();

    expect(screen.queryByText('chart')).toBeNull();
  });

  test('keeps the drawing through a lost device, which Skia replaces', () => {
    Object.assign(gpu, { isAvailable: false, backend: 'Metal' });

    renderDrawing();

    expect(screen.getByText('chart')).toBeOnTheScreen();
  });
});
