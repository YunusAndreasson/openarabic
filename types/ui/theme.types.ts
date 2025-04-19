export interface ThemeColors {
  primary: string;
  background: string;
  text: string;
  secondaryText: string;
  textTertiary: string;
  border: string;
  card: string;
  cardBorder: string;
  error: string;
  success: string;
  warning: string;
  englishText: string;
  arabicText: string;
  authorText: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  icon: string;
  disabled: string;
  transparent: string;
  overlay: string;
  modalOverlay: string;
  borderOverlay: string;
  shadow: string;
  elevation1: string;
  elevation2: string;
  elevation3: string;
  white: string;
  black: string;
  textOverlay: string;
  info: string;
  [key: string]: string;
}

export interface ComponentColors {
  background?: string;
  text?: string;
  border?: string;
  tint?: string;
}

export interface ThemeProps {
  colors: ThemeColors;
}
