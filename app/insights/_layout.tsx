import { Stack } from 'expo-router';
import type { JSX } from 'react';

import DoneButton from '@/components/ui/DoneButton';
import { createNavigationOptions } from '@/constants/modal';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

// Title mapping for charts - exported for reuse
export const INFO_TITLES = {
  mastery: STRINGS.WORD_MASTERY,
  efficiency: STRINGS.LEARNING_PROGRESS,
  retrievability: STRINGS.REVIEW_TIMING,
} as const;

export default function InsightsLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createNavigationOptions(colors, {
          title: STRINGS.INSIGHTS,
          headerLeft: () => <DoneButton />,
        })}
      />
    </Stack>
  );
}
