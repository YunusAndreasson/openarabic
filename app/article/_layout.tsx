import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { JSX } from 'react';

export default function ArticleLayout(): JSX.Element {
  return (
    <>
      <StatusBar hidden />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="[id]" />
      </Stack>
    </>
  );
}
