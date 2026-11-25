import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { memo } from 'react';

import { AuthScreenShell, SignInForm } from '@/components/auth';
import { usePendingReaderSave } from '@/hooks/onboarding/useReaderSave';
import { startReaderAttempt, type StartReaderAuth } from '@/services/readerSaveAuth';
import { STRINGS } from '@/constants/strings';

/**
 * Sign In Screen
 *
 * Dedicated screen for signing in with email and password.
 * Part of the progressive disclosure auth flow.
 *
 * User Journey:
 * Landing → "Continue with email" → "Sign In" → This Screen
 */
const SignInScreen = memo(function SignInScreen(): JSX.Element {
  const { saveIntent } = useLocalSearchParams<{ saveIntent?: string }>();
  const pending = usePendingReaderSave();
  const matchingIntent =
    pending?.phase === 'auth' && pending.id === saveIntent ? pending.id : undefined;
  const startAttempt: StartReaderAuth | undefined = matchingIntent
    ? provider => startReaderAttempt(matchingIntent, provider)
    : undefined;
  return (
    <AuthScreenShell subtitle={STRINGS.SIGN_IN_SUBTITLE}>
      <SignInForm returnToReader saveIntent={matchingIntent} startAttempt={startAttempt} />
    </AuthScreenShell>
  );
});

export default SignInScreen;
