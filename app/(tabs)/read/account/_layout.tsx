import { Stack, router } from 'expo-router';
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
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
      <Stack.Screen
        name="FontSelector"
        options={createNavigationOptions(colors, {
          title: STRINGS.ARABIC_FONT,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />

      <Stack.Screen
        name="help"
        options={createNavigationOptions(colors, {
          title: STRINGS.HELP,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
      <Stack.Screen
        name="islamicCalendar"
        options={createNavigationOptions(colors, {
          title: STRINGS.ISLAMIC_CALENDAR,
          isRegularScreen: true,
        })}
      />
    </Stack>
  );
}
