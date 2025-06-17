import { test } from '@jest/globals';
import React from 'react';
import { measureRenders } from 'reassure';

import { EnhancedImage } from '@/components/EnhancedImage';

// Measure simple render of EnhancedImage component

test('EnhancedImage render performance', async () => {
  await measureRenders(
    <EnhancedImage
      source="https://example.com/photo.jpg"
      alt="Example"
      testID="image"
    />,
    { runs: 5 }
  );
});
