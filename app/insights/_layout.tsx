import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

export default function InsightsLayout(): JSX.Element {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: true, // Enable pull-down to dismiss
        }}
      />
    </Stack>
  );
}
