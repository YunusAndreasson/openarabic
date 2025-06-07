import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  // Simply redirect to the read tab - the _layout will handle auth checks
  return <Redirect href="/(tabs)/read" />;
}
