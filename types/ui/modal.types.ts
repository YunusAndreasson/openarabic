/**
 * Props for the WordTooltip component
 */
export interface WordTooltipProps {
  /** Whether the tooltip is visible */
  visible: boolean;
  /** The text to display in the tooltip */
  text?: string;
  /** The Arabic word to analyze and display with color-coding */
  arabicWord?: string;
  /** Layout information for positioning the tooltip */
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Function to close the tooltip */
  onClose: () => void;
  /** Optional zIndex value to control tooltip stacking order */
  zIndex?: number;
  /** Function to handle adding/removing word from study list */
  onStudyListToggle?: () => void;
  /** Optional word root ID for study list functionality */
  wordRootId?: number;
}

/**
 * Generic base props for modal components
 */
export interface BaseModalProps {
  /** Whether the modal is visible */
  visible: boolean;
}
