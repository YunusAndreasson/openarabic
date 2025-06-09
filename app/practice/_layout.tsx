import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';

export default function PracticeLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="review/index"
        options={createNavigationOptions(colors, {
          headerShown: false,
        })}
      />
      <Stack.Screen
        name="audio/index"
        options={createNavigationOptions(colors, {
          headerShown: false,
        })}
      />
    </Stack>
  );
}
