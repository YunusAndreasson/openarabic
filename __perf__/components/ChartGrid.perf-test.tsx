import { test } from '@jest/globals';
import React from 'react';
import { measureRenders } from 'reassure';

import { ChartGrid } from '@/components/vocabulary/shared/ChartGrid';

// Measure ChartGrid render performance

test('ChartGrid render performance', async () => {
  await measureRenders(
    <ChartGrid width={300} height={200} gridLines={4} topPadding={10} />, 
    { runs: 5 }
  );
});
