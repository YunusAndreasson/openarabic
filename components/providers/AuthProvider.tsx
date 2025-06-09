import React, { createContext } from 'react';

import { useProvideAuth } from '@/hooks/auth/useProvideAuth';
import type { AuthResult } from '@/types/auth.types';

export const AuthContext = createContext<AuthResult | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

