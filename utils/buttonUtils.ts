import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';

// ===== FLOATING ACTION BUTTON CONSTANTS =====
export const FLOATING_ACTION_BUTTON_CONSTANTS = {
  BUTTON_SIZE: MIN_TOUCH_TARGET.MEDIUM,
  BUTTON_RADIUS: MIN_TOUCH_TARGET.MEDIUM / 2,
  RIPPLE_RADIUS: MIN_TOUCH_TARGET.MEDIUM / 2,
  ICON_SIZE: LAYOUT.BUTTON.ICON_SIZE.MEDIUM,
  SPACING: LAYOUT.SPACING.SMALL,
  TOP_MARGIN: LAYOUT.SPACING.SMALL,
  SIDE_MARGIN: LAYOUT.SPACING.SMALL,
  Z_INDEX: LAYOUT.Z_INDEX.OVERLAY,
} as const;

// ===== BUTTON STYLE INTERFACES =====
export interface ButtonStyleConfig {
  width: number;
  height: number;
  borderRadius: number;
  backgroundColor: string;
  alignItems: 'center';
  justifyContent: 'center';
  opacity: number;
  level?: number;
  shadowOffset?: { width: number; height: number };
  shadowOpacity?: number;
  shadowRadius?: number;
  elevation?: number;
}

export interface ButtonPositionConfig {
  position: 'absolute';
  top: number;
  left?: number;
  right?: number;
  zIndex: number;
  flexDirection?: 'row';
  gap?: number;
}
