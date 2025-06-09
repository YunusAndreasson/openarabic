import { Stack } from 'expo-router';

import { createNavigationOptions } from '@/constants/modal';
import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout() {
  const colors = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={createNavigationOptions(colors, {
          title: 'Account',
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="classicalTexts"
        options={createNavigationOptions(colors, {
          title: 'Classical Texts',
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="learningMethod"
        options={createNavigationOptions(colors, {
          title: 'Learning Method',
          isRegularScreen: true,
        })}
      />
      <Stack.Screen
        name="islamicCalendar"
        options={createNavigationOptions(colors, {
          title: 'Islamic Calendar',
          isRegularScreen: true,
        })}
      />
    </Stack>
  );
}
