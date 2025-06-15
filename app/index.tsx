import { Redirect } from 'expo-router';
import type { JSX } from 'react';

export default function Index(): JSX.Element {
  // Simply redirect to the read tab - the _layout will handle auth checks
  return <Redirect href="/(tabs)/read" />;
}
