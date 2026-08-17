import type { JSX } from 'react';
import { memo } from 'react';

import { AuthScreenShell, SignUpForm } from '@/components/auth';
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
  return (
    <AuthScreenShell subtitle={STRINGS.CREATE_ACCOUNT_SUBTITLE}>
      <SignUpForm />
    </AuthScreenShell>
  );
});

export default SignUpScreen;
