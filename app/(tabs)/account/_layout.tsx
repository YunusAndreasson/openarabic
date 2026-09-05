import { Stack } from 'expo-router';
import { useCallback } from 'react';

import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { AppTab } from '@/types/enums';
import { createNavigationOptions, createTabHeaderOptions } from '@/utils/navigation';

export default function AccountLayout() {
  const colors = useColors();

  // Account is a tab root now, not a modal pushed from Explore's header. Two
  // things follow from that, and both are why this layout no longer renders a
  // CloseButton anywhere:
  //   - The index has nothing to close. It is a destination you switch away
  //     from with the tab bar, exactly like Explore or Practice.
  //   - Sub-screens (FontSelector, Help, Terms, …) push inside this stack, so
  //     the platform back chevron is the way out. Keeping an X beside it would
  //     offer two affordances that do the same thing.
  const screenOptions = useCallback(
    (title: string) =>
      createNavigationOptions(colors, {
        title,
        isRegularScreen: true,
      }),
    [colors],
  );

  return (
    <Stack>
      <Stack.Screen name="index" options={createTabHeaderOptions({ title: AppTab.ACCOUNT })} />
      <Stack.Screen name="FontSelector" options={screenOptions(STRINGS.ARABIC_FONT)} />
      <Stack.Screen name="DeleteAccount" options={screenOptions(STRINGS.DELETE_ACCOUNT)} />
      <Stack.Screen name="help" options={screenOptions(STRINGS.HELP_CENTER)} />
      <Stack.Screen name="feedback" options={screenOptions(STRINGS.CONTACT_SUPPORT)} />
      <Stack.Screen name="advanced" options={screenOptions(STRINGS.ADVANCED_VOICE_GRADING)} />
      <Stack.Screen name="terms" options={screenOptions(STRINGS.TERMS_OF_SERVICE)} />
      <Stack.Screen name="privacy" options={screenOptions(STRINGS.PRIVACY_POLICY)} />
      <Stack.Screen name="legal" options={screenOptions(STRINGS.LEGAL_ATTRIBUTIONS)} />
    </Stack>
  );
}
