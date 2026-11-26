import { Stack, useLocalSearchParams } from 'expo-router';
import { useState, type JSX } from 'react';
import { StyleSheet } from 'react-native';

import { Auth, AuthScreenShell, SignInForm, SignUpForm } from '@/components/auth';
import { KEYBOARD_AWARE_SCROLL_PROPS, ThemedView } from '@/components/primitives/ThemedView';
import { CloseButton } from '@/components/ui/CloseButton';
import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useCloseAuth } from '@/hooks/auth/useCloseAuth';
import { usePendingReaderSave } from '@/hooks/onboarding/useReaderSave';
import { startReaderAttempt, type StartReaderAuth } from '@/services/readerSaveAuth';

export default function AuthScreen(): JSX.Element {
  // Keeping email on the same route gives system Back and swipe the same
  // dismissal target as Close. Only the email step's toolbar Back changes step.
  const [form, setForm] = useState<'sign-in' | 'sign-up'>();
  const { saveIntent } = useLocalSearchParams<{ saveIntent?: string }>();
  const pending = usePendingReaderSave();
  const matchingIntent =
    pending?.phase === 'auth' && pending.id === saveIntent ? pending.id : undefined;
  const startAttempt: StartReaderAuth | undefined = matchingIntent
    ? provider => startReaderAttempt(matchingIntent, provider)
    : undefined;
  const closeAuth = useCloseAuth();

  return (
    <>
      <Stack.Screen
        options={{
          title: form === 'sign-up' ? STRINGS.CREATE_ACCOUNT_TITLE : STRINGS.SIGN_IN_TITLE,
          headerRight: () => <CloseButton onPress={closeAuth} />,
          headerLeft: form
            ? () => (
                <TransparentHeaderButton
                  icon="chevron-back"
                  accessibilityLabel={STRINGS.AUTH_BACK_TO_OPTIONS}
                  onPress={() => setForm(undefined)}
                />
              )
            : undefined,
        }}
      />
      {form ? (
        <AuthScreenShell
          subtitle={form === 'sign-in' ? STRINGS.SIGN_IN_SUBTITLE : STRINGS.CREATE_ACCOUNT_SUBTITLE}
        >
          {form === 'sign-in' ? (
            <SignInForm
              returnToReader
              onCreateAccount={() => setForm('sign-up')}
              startAttempt={startAttempt}
            />
          ) : (
            <SignUpForm onSignIn={() => setForm('sign-in')} startAttempt={startAttempt} />
          )}
        </AuthScreenShell>
      ) : (
        <ThemedView
          scrollable
          useSafeArea={false}
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          scrollViewProps={KEYBOARD_AWARE_SCROLL_PROPS}
        >
          <Auth onEmailSelect={setForm} startAttempt={startAttempt} onProviderCancel={closeAuth} />
        </ThemedView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: LAYOUT.SPACING.XXLARGE,
    paddingTop: LAYOUT.SPACING.XXXLARGE,
  },
});
