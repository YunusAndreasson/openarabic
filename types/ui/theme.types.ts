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
  cardOverlayHeading: string;
  cardOverlayAuthor: string;
  subtitleText: string;
  metadataText: string;
  secondaryMetadataText: string;
  captionText: string;
  subtleLabelText: string;

  tint: string;
  tintBackground: string;
  onTint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  icon: string;
  disabled: string;
  disabledButtonBg: string;
  transparent: string;
  borderOverlay: string;
  shadow: string;
  elevation0: string;
  elevation1: string;
  elevation2: string;
  elevation3: string;
  white: string;
  black: string;
  textShadowDark: string;
  textShadowLight: string;
  info: string;
  accent: string;
  violet: string;

  modalIndicator: string;

  backdropOverlay: string;
  toastBorder: string;
  gradientOverlay: string;
  wordTooltipBg: string;
  wordTooltipText: string;
  wordTooltipBorder: string;
  wordTooltipShadow: string;

  navigationRipple: string;
  headerOverlay: string;
  tabBarOverlay: string;

  progressIndicator: string;
  progressBackground: string;
  readingProgressIndicator: string;
  readingProgressBackground: string;
  completionSuccess: string;

  // Chart UI colors
  chartGrid: string;
  chartThreshold: string;
  chartAccent: string;

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

export type GrammarColorName = keyof ThemeColors['grammar'];
