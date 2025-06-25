import { Stack } from 'expo-router';
import type { JSX } from 'react';

import DoneButton from '@/components/ui/DoneButton';
import { createNavigationOptions } from '@/constants/modal';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout(): JSX.Element {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createNavigationOptions(colors, {
          title: STRINGS.ACCOUNT,
          headerLeft: () => <DoneButton />,
        })}
      />
      <Stack.Screen
        name="classicalTexts"
        options={createNavigationOptions(colors, {
          title: STRINGS.CLASSICAL_TEXTS,
          headerLeft: () => <DoneButton />,
        })}
      />
      <Stack.Screen
        name="learningMethod"
        options={createNavigationOptions(colors, {
          title: STRINGS.LEARNING_METHOD,
          headerLeft: () => <DoneButton />,
        })}
      />
      <Stack.Screen
        name="islamicCalendar"
        options={createNavigationOptions(colors, {
          title: STRINGS.ISLAMIC_CALENDAR,
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="font-selector"
        options={createNavigationOptions(colors, {
          title: STRINGS.ARABIC_FONT,
          headerLeft: () => <DoneButton />,
        })}
      />
    </Stack>
  );
}
