import { Stack, router } from 'expo-router';
import type { JSX } from 'react';
import { View } from 'react-native';

import { DoneButton } from '@/components/ui';
import { MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { createNavigationOptions } from '@/utils/navigation';

export default function AuthLayout(): JSX.Element {
  const colors = useColors();

  const modalScreenOptions = createNavigationOptions(colors, {
    title: ' ',
    headerShown: true,
    headerLeft: () => <DoneButton onPress={() => router.back()} />,
    headerRight: () => <View style={{ width: 20, height: MIN_TOUCH_TARGET.MEDIUM }} />,
  });

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={modalScreenOptions} />
      <Stack.Screen name="sign-up" options={modalScreenOptions} />
      <Stack.Screen
        name="terms"
        options={createNavigationOptions(colors, {
          title: STRINGS.TERMS_OF_SERVICE,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
      <Stack.Screen
        name="privacy"
        options={createNavigationOptions(colors, {
          title: STRINGS.PRIVACY_POLICY,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
    </Stack>
  );
}
