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
  /** The database ID of the word for debugging and reference */
  wordId?: number;
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
}

/**
 * Generic base props for modal components
 */
export interface BaseModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Function to close the modal */
  onClose: () => void;
  /** Optional children to render inside the modal */
  children?: React.ReactNode;
}
