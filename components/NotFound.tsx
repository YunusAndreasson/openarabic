import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 0, // Will be set dynamically with insets
  },
});

type NotFoundProps = {
  message?: string;
};

export const NotFound = ({ message = 'Not found' }: NotFoundProps) => {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container} useSafeArea={false}>
      <View style={[styles.notFoundContainer, { paddingTop: insets.top }]}>
        <ThemedText>{message}</ThemedText>
      </View>
    </ThemedView>
  );
};

export const ArticleNotFound = () => {
  return <NotFound message="Article not found" />;
};
