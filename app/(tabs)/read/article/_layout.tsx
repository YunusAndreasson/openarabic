import { Stack } from 'expo-router';
import type { JSX } from 'react';

export default function ArticleLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false, // Header is handled by parent read layout
        }}
      />
    </Stack>
  );
}
