import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

import { useColors } from '@/hooks/theme/useColors';

export default function InsightsLayout(): JSX.Element {
  const colors = useColors();

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
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTitleStyle: {
              fontSize: 20,
              fontWeight: '600',
            },
            headerTintColor: colors.headingText,
            headerBackTitleStyle: {
              fontSize: 16,
            },
          };
        }}
      />
    </Stack>
  );
}
