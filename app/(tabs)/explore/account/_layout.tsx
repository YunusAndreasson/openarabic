import { Stack } from 'expo-router';

import { CloseButton } from '@/components/ui';
import { STRINGS } from '@/constants/strings';
import { createNavigationOptions } from '@/utils/navigation';
import { useColors } from '@/hooks/theme/useColors';

export default function AccountLayout() {
  const colors = useColors();

  // The `account` route is mounted as a modal from explore (_layout.tsx). The
  // index screen inherits that modal presentation. Sub-screens must push as
  // regular stack screens inside the modal — nesting `presentation: 'modal'`
  // here renders unreliably on Android (new modal lands behind the existing
  // one as a stacked DialogFragment).
  const indexOptions = createNavigationOptions(colors, {
    title: STRINGS.ACCOUNT,
    headerRight: () => <CloseButton />,
  });

  const subScreenOptions = (title: string) =>
    createNavigationOptions(colors, {
      title,
      headerRight: () => <CloseButton />,
      isRegularScreen: true,
    });

  return (
    <Stack>
      <Stack.Screen name="index" options={indexOptions} />
      <Stack.Screen name="FontSelector" options={subScreenOptions(STRINGS.ARABIC_FONT)} />
      <Stack.Screen name="DeleteAccount" options={subScreenOptions(STRINGS.DELETE_ACCOUNT)} />
      <Stack.Screen name="help" options={subScreenOptions(STRINGS.HELP_CENTER)} />
      <Stack.Screen name="feedback" options={subScreenOptions(STRINGS.CONTACT_SUPPORT)} />
      <Stack.Screen name="terms" options={subScreenOptions(STRINGS.TERMS_OF_SERVICE)} />
      <Stack.Screen name="privacy" options={subScreenOptions(STRINGS.PRIVACY_POLICY)} />
      <Stack.Screen name="legal" options={subScreenOptions(STRINGS.LEGAL_ATTRIBUTIONS)} />
    </Stack>
  );
}
