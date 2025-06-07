/**
 * Pill variant types
 */

export type PillVariant = 'category' | 'filter' | 'horizontal-category';

/**
 * Base props for pill components
 */
export interface BasePillProps {
  /**
   * Unique identifier for the item
   */
  id: number | string;

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
  onSelect?: (id: number | string) => void;

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
  CategoryPillProps | FilterPillProps | HorizontalCategoryPillProps | BasePillProps & {
      /**
       * Variant of the pill
       */
      variant?: PillVariant;
    };


