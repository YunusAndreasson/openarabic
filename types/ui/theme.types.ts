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

  // Enhanced typography-specific colors for sophisticated text relationships
  headingText: string; // Primary heading color - rich and commanding
  subtitleText: string; // Sophisticated subtitle balance between primary and secondary
  metadataText: string; // Refined metadata color - perfect hierarchy balance
  captionText: string; // Enhanced caption color for optimal readability

  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  icon: string;
  disabled: string;
  imagePlaceholder: string;
  transparent: string;
  overlay: string;
  modalOverlay: string;
  borderOverlay: string;
  buttonOverlay: string;
  buttonOverlayActive: string;
  buttonBorderOverlay: string;
  shadow: string;
  elevation1: string;
  elevation2: string;
  elevation3: string;
  white: string;
  black: string;
  textOverlay: string;
  textShadowDark: string;
  textShadowLight: string;
  info: string;

  // Enhanced theme-aware colors
  backdropOverlay: string;
  contrastOverlay: string;
  socialIconBg: string;

  // Article reading specific colors
  audioHighlight: string;
  audioHighlightBorder: string;
  wordTooltipBg: string;
  wordTooltipText: string;
  wordTooltipBorder: string;
  wordTooltipShadow: string;
  wordSelectionUnderline: string;
  wordDueUnderline: string;
  audioControlBg: string;
  audioControlBorder: string;
  audioControlShadow: string;

  // Navigation branding colors
  navigationRipple: string;
  headerOverlay: string;
  tabBarOverlay: string;

  // Semantic UI colors for better UX
  progressIndicator: string;
  progressBackground: string;
  interactiveSecondary: string;
  completionSuccess: string;
  repeatActive: string;

  [key: string]: string;
}

