import { Stack } from 'expo-router';
import type { JSX } from 'react';

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
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="classicalTexts"
        options={createNavigationOptions(colors, {
          title: STRINGS.CLASSICAL_TEXTS,
        })}
      />
      <Stack.Screen
        name="learningMethod"
        options={createNavigationOptions(colors, {
          title: STRINGS.LEARNING_METHOD,
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
        })}
      />
    </Stack>
  );
}
