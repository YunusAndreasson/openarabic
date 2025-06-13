import { Stack } from 'expo-router';
import type { JSX } from 'react';

export default function AuthLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
