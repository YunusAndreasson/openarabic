import { Stack } from 'expo-router';
import type { JSX } from 'react';

export default function ListenLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Use tab header for main screen
        }}
      />
      <Stack.Screen
        name="now-playing"
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'fade',
        }}
      />
    </Stack>
  );
}
