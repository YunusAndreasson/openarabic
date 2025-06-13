import type { ReactNode } from 'react';

/**
 * Props for the simplified Pill component
 */
export interface PillProps {
  /**
   * Unique identifier for the item
   */
  id: number | string;

  /**
   * Label text or ReactNode to display in the pill
   */
  label: ReactNode;

  /**
   * Whether the pill is currently selected
   */
  isSelected?: boolean;

  /**
   * Callback when the pill is selected
   */
  onSelect?: (id: number | string) => void;

  /**
   * Variant of the pill
   */
  variant?: 'filter' | 'category';

  /**
   * Custom background color for the pill
   */
  pillBg?: string;

  /**
   * Custom style overrides for the pill container
   */
  pillStyle?: object;
}
