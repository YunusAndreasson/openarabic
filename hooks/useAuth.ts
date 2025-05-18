import { useContext } from 'react';
import { AuthContext } from '@/components/AuthProvider';
import type { AuthResult } from './useProvideAuth';

export function useAuth(): AuthResult {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export type { AuthResult, UserSession } from './useProvideAuth';

