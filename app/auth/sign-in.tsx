import type { JSX } from 'react';
import { memo } from 'react';

import { AuthScreenShell, SignInForm } from '@/components/auth';
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
  return (
    <AuthScreenShell subtitle={STRINGS.SIGN_IN_SUBTITLE}>
      <SignInForm />
    </AuthScreenShell>
  );
});

export default SignInScreen;
