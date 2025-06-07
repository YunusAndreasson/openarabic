import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/theme/useColors';

import { useAuth } from '../hooks/auth/useAuth';

export default function Index() {
  const colors = useColors();
  const { session, isLoading } = useAuth();

  // Don't redirect while auth is still loading
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator color={colors.tint} size="large" />
      </ThemedView>
    );
  }

  // Once auth is loaded, redirect based on session state
  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  } else {
    return <Redirect href="/auth" />;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
