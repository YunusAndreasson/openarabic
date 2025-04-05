/**
 * Pill variant types
 */
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';

export type PillVariant = 'filter' | 'category' | 'horizontal-category';

/**
 * Base props for pill components
 */
export interface BasePillProps {
  /**
   * Unique identifier for the item
   */
  id: string | number;

  /**
   * Label text to display in the pill
   */
  label: string;

  /**
   * Whether the pill is currently selected
   */
  isSelected?: boolean;

  /**
   * Callback when the pill is selected
   */
  onSelect?: (id: string | number) => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;

  /**
   * Whether the pill should be positioned absolutely
   */
  absolute?: boolean;
}

/**
 * Props for filter variant of Pill
 */
export interface FilterPillProps extends BasePillProps {
  /**
   * Variant of the pill
   */
  variant: 'filter';
}

/**
 * Props for category variant of Pill
 */
export interface CategoryPillProps extends BasePillProps {
  /**
   * Variant of the pill
   */
  variant: 'category';
}

/**
 * Props for horizontal-category variant of Pill
 */
export interface HorizontalCategoryPillProps extends BasePillProps {
  /**
   * Variant of the pill
   */
  variant: 'horizontal-category';
}

/**
 * Props for the Pill component
 */
export type PillProps =
  | FilterPillProps
  | CategoryPillProps
  | HorizontalCategoryPillProps
  | (BasePillProps & {
      /**
       * Variant of the pill
       */
      variant?: PillVariant;
    });

/**
 * Interface for filter items
 */
export interface FilterItem {
  /**
   * Unique identifier for the item
   */
  id: number;

  /**
   * Display name for the item
   */
  name: string;

  /**
   * Allow for additional properties
   */
  [key: string]: string | number;
}

/**
 * Props for the FilterList component
 */
export interface FilterListProps<T extends FilterItem> {
  /**
   * Title for the filter section
   */
  title: string;

  /**
   * Array of items to display in the filter list
   */
  items: T[];

  /**
   * ID of the currently selected item
   */
  selectedId: number | null;

  /**
   * Callback when an item is selected
   */
  onSelect: (id: number) => void;

  /**
   * Callback when filters are cleared
   */
  onClearFilter?: () => void;

  /**
   * Animation delay in milliseconds
   */
  animationDelay?: number;

  /**
   * Base animation delay for individual items
   */
  itemAnimationDelay?: number;
}

export interface PillStyleProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
  [key: string]: StyleProp<ViewStyle | TextStyle> | string | number | undefined;
}
