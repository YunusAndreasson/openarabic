import { createContext, type FC, type ReactNode } from 'react';

import { useProvideAuth } from '@/hooks/auth/useProvideAuth';
import type { AuthResult } from '@/types/auth.types';

export const AuthContext = createContext<AuthResult | null>(null);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useProvideAuth();
  return <AuthContext value={auth}>{children}</AuthContext>;
};
