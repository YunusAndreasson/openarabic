import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';

export default function InsightsLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createNavigationOptions(colors, {
          title: 'Insights',
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="info/[type]"
        options={createNavigationOptions(colors, {
          isRegularScreen: true,
        })}
      />
    </Stack>
  );
}
