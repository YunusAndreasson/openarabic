import { Stack } from 'expo-router';
import type { JSX } from 'react';

import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';

export default function ListenLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Use tab header for main screen
        }}
      />
      <Stack.Screen
        name="NowPlaying"
        options={createNavigationOptions(colors, {
          headerShown: false, // Full-screen modal without header
          presentation: 'modal',
          gestureEnabled: true,
        })}
      />
    </Stack>
  );
}
