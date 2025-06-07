import React, { createContext } from 'react';

import { useProvideAuth, type AuthResult } from '@/hooks/auth/useProvideAuth';

export const AuthContext = createContext<AuthResult | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useProvideAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

