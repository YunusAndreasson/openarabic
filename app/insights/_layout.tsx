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
          headerShown: true,
          title: 'Insights',
          headerTitleAlign: 'center',
          headerTransparent: false,
          gestureEnabled: true, // Enable pull-down to dismiss
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          },
          headerTintColor: colors.headingText,
        }}
      />
      <Stack.Screen
        name="info/[type]"
        options={() => {
          return {
            headerShown: true,
            title: 'Insights',
            headerBackTitle: 'Back',
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
