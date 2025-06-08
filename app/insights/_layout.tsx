import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

export default function InsightsLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          presentation: 'modal',
          headerShown: false,
          gestureEnabled: true, // Enable pull-down to dismiss
        }}
      />
      <Stack.Screen
        name="info/[type]"
        options={({ route }) => {
          const params = route.params as { type: string };
          const typeMap: Record<string, string> = {
            mastery: 'Word Mastery',
            retrievability: 'Review Timing',
            efficiency: 'Learning Progress',
            progress: 'Learning Progress',
            recommendation: 'What To Do Next',
          };

          return {
            headerShown: true,
            title: typeMap[params.type] || 'Info',
            headerBackTitle: 'Insights',
            headerTitleAlign: 'center',
            headerTransparent: false,
            presentation: 'modal',
            gestureEnabled: true,
          };
        }}
      />
    </Stack>
  );
}
