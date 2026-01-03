import { Stack, router } from 'expo-router';

import { DoneButton } from '@/components/ui/DoneButton';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout() {
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
        name="DeleteAccount"
        options={createNavigationOptions(colors, {
          title: STRINGS.DELETE_ACCOUNT,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />

      <Stack.Screen
        name="help"
        options={createNavigationOptions(colors, {
          title: STRINGS.HELP_CENTER,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
      <Stack.Screen
        name="feedback"
        options={createNavigationOptions(colors, {
          title: STRINGS.CONTACT_SUPPORT,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
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
      <Stack.Screen
        name="legal"
        options={createNavigationOptions(colors, {
          title: STRINGS.LEGAL_ATTRIBUTIONS,
          headerLeft: () => <DoneButton onPress={() => router.back()} />,
        })}
      />
    </Stack>
  );
}
