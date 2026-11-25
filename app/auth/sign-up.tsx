import { useLocalSearchParams } from 'expo-router';
import type { JSX } from 'react';
import { memo } from 'react';

import { AuthScreenShell, SignUpForm } from '@/components/auth';
import { usePendingReaderSave } from '@/hooks/onboarding/useReaderSave';
import { startReaderAttempt, type StartReaderAuth } from '@/services/readerSaveAuth';
import { STRINGS } from '@/constants/strings';

/**
 * Sign Up Screen
 *
 * Dedicated screen for creating a new account with email and password.
 * Part of the progressive disclosure auth flow.
 *
 * User Journey:
 * Landing → "Continue with email" → "Create Account" → This Screen
 */
const SignUpScreen = memo(function SignUpScreen(): JSX.Element {
  const { saveIntent } = useLocalSearchParams<{ saveIntent?: string }>();
  const pending = usePendingReaderSave();
  const matchingIntent =
    pending?.phase === 'auth' && pending.id === saveIntent ? pending.id : undefined;
  const startAttempt: StartReaderAuth | undefined = matchingIntent
    ? provider => startReaderAttempt(matchingIntent, provider)
    : undefined;
  return (
    <AuthScreenShell subtitle={STRINGS.CREATE_ACCOUNT_SUBTITLE}>
      <SignUpForm saveIntent={matchingIntent} startAttempt={startAttempt} />
    </AuthScreenShell>
  );
});

export default SignUpScreen;
