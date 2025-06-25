import { Stack } from 'expo-router';
import type { JSX } from 'react';
import { useCallback } from 'react';

import DoneButton from '@/components/ui/DoneButton';
import { createNavigationOptions } from '@/constants/modal';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// Title mapping for info modals - exported for reuse
export const INFO_TITLES = {
  mastery: STRINGS.WORD_MASTERY,
  efficiency: STRINGS.LEARNING_PROGRESS,
  retrievability: STRINGS.REVIEW_TIMING,
} as const;

export default function InsightsLayout(): JSX.Element {
  const colors = useColors();

  const getInfoOptions = useCallback(
    ({ route }: { route: { params?: { type?: string } } }) => {
      const type = (route.params as { type?: string })?.type as keyof typeof INFO_TITLES;
      const title = type && INFO_TITLES[type] ? INFO_TITLES[type] : STRINGS.INFO;

      return createNavigationOptions(colors, {
        title,
        headerLeft: () => <DoneButton />,
        // Removed isRegularScreen: true to use modal presentation by default
      });
    },
    [colors]
  );

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createNavigationOptions(colors, {
          title: STRINGS.INSIGHTS,
          headerLeft: () => <DoneButton />,
        })}
      />
      <Stack.Screen name="info/[type]" options={getInfoOptions} />
    </Stack>
  );
}
