import type { ReactNode } from 'react';

import { ThemedText } from '@/components/ThemedText';

interface BoldTextProps {
  children: ReactNode;
}

/**
 * BoldText component for inline bold formatting in coaching messages
 * Uses React Native's text nesting for zero-bundle-impact bold styling
 *
 * Visual hierarchy:
 * - Bold weight for stronger emphasis
 * - Primary text color for better contrast against secondaryText parent
 *
 * @example
 * <Text>You have <BoldText>5 words</BoldText> due today</Text>
 */
export function BoldText({ children }: BoldTextProps) {
  return (
    <ThemedText weight="bold" colorName="text">
      {children}
    </ThemedText>
  );
}

BoldText.displayName = 'BoldText';
