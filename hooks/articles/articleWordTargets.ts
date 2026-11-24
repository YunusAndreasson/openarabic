import { createContext, type ComponentRef } from 'react';
import type { View } from 'react-native';

/** Only the word targets mounted by this reader, keyed by occurrence (not root). */
export const ArticleWordTargets = createContext<Map<number, ComponentRef<typeof View>> | null>(
  null,
);
