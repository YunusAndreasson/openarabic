import type { ReactNode } from 'react';

import { useProvideAuth } from '@/hooks/auth/useProvideAuth';
import type { AuthResult } from '@/types/auth.types';
import { createRequiredContext } from '@/utils/createRequiredContext';

/**
 * `AuthContext` stays exported for the one reader that may sit outside the
 * provider and wants `null` there (useTutorialManager); everything else reads
 * through `useAuth`, which throws instead.
 */
export const [AuthContext, useAuthContext] = createRequiredContext<AuthResult>(
  'AuthContext',
  'useAuth must be used within an AuthProvider. Check that AuthProvider wraps your component tree.',
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const auth = useProvideAuth();
  return <AuthContext value={auth}>{children}</AuthContext>;
};
