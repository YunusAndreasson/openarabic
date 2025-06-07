import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

export default function PracticeLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="review/index"
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: true, // Enable pull-down to dismiss
        }}
      />
      <Stack.Screen
        name="audio/index"
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: true, // Enable pull-down to dismiss
        }}
      />
    </Stack>
  );
}
