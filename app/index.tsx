import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/ThemedView';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '../hooks/useAuth';

export default function Index() {
  const colors = useColors();
  const { session, isLoading } = useAuth();

  // Don't redirect while auth is still loading
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={colors.tint} />
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
