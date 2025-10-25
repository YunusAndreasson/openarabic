export interface ThemeColors {
  primary: string;
  secondary: string;
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

  headingText: string;
  subtitleText: string;
  metadataText: string;
  secondaryMetadataText: string;
  captionText: string;

  tint: string;
  tintBackground: string;
  tabIconDefault: string;
  tabIconSelected: string;
  icon: string;
  disabled: string;
  transparent: string;
  overlay: string;
  modalOverlay: string;
  borderOverlay: string;
  buttonOverlay: string;
  shadow: string;
  elevation0: string;
  elevation1: string;
  elevation2: string;
  elevation3: string;
  white: string;
  black: string;
  textOverlay: string;
  textShadowDark: string;
  textShadowLight: string;
  info: string;
  accent: string;
  violet: string;
  indigo: string;
  coral: string;

  modalIndicator: string;

  backdropOverlay: string;
  wordTooltipBg: string;
  wordTooltipText: string;
  wordTooltipBorder: string;
  wordTooltipShadow: string;

  navigationRipple: string;
  headerOverlay: string;
  tabBarOverlay: string;

  progressIndicator: string;
  progressBackground: string;
  interactiveSecondary: string;
  completionSuccess: string;

  // Chart UI colors - simplified (main chart colors use tint directly)
  chartGrid: string;
  chartThreshold: string;

  // Card gradients - pre-computed for performance
  cardGradient: readonly string[];

  // Grammar color palette - dedicated educational colors for grammar concepts
  grammar: {
    preposition: string;
    possessive: string;
    particle: string;
    interrogative: string;
    verbConjugation: string;
    negation: string;
    subjectPrefix: string;
    plural: string;
    demonstrative: string;
    conjunction: string;
    futureTense: string;
    definiteArticle: string;
  };
}

export type ThemeColorName = keyof ThemeColors;
export type GrammarColorName = keyof ThemeColors['grammar'];
