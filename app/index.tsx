import { Redirect } from 'expo-router';
import React from 'react';

import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const { session, isLoading } = useAuth();

  // Don't redirect while auth is still loading
  if (isLoading) {
    return null;
  }

  // Once auth is loaded, redirect based on session state
  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/auth" />;
  }
}
