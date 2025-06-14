import { Stack } from 'expo-router';
import type { JSX } from 'react';
import React from 'react';

import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';

// Title mapping for info modals - exported for reuse
export const INFO_TITLES = {
  mastery: 'Word Mastery',
  efficiency: 'Learning Progress',
  retrievability: 'Review Timing',
} as const;

export default function InsightsLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createNavigationOptions(colors, {
          title: 'Insights',
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="info/[type]"
        options={({ route }) => {
          const type = (route.params as { type?: string })?.type as keyof typeof INFO_TITLES;
          const title = type && INFO_TITLES[type] ? INFO_TITLES[type] : 'Info';

          return createNavigationOptions(colors, {
            title,
            // Removed isRegularScreen: true to use modal presentation by default
          });
        }}
      />
    </Stack>
  );
}
