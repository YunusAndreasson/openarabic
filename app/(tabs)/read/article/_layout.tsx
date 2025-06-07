import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

export default function ArticleLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false, // Remove header entirely for clean article view
        }}
      />
    </Stack>
  );
}
