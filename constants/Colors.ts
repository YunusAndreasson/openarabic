import type { ThemeColors } from '../types/ui/theme.types';

export const Colors = {
  light: {
    // Core brand colors - sophisticated warm sage foundation
    primary: '#2B3C35', // Rich forest charcoal - perfect warmth/green balance
    background: '#FAFCF9', // Crisp warm white with subtle sage undertone
    text: '#1A2B23', // Deep forest text - optimal contrast with warm undertones
    secondaryText: '#4A5B52', // Balanced mid-tone sage - perfect hierarchy
    textTertiary: '#667A6D', // Sophisticated light sage - clear but gentle
    border: '#E8F1EC', // Refined sage border - subtle definition
    card: '#FFFFFF', // Pure white cards for maximum content clarity
    cardBorder: '#F2F7F4', // Whisper-soft sage card borders

    // Semantic colors - warm and natural
    error: '#C74A3A', // Warm terracotta red - natural yet urgent
    success: '#4C7F5A', // Deep forest success - trustworthy and calming
    warning: '#B8860B', // Rich goldenrod - organic warmth
    info: '#6B8471', // Muted sage-blue - sophisticated informational

    // Text hierarchy - perfectly balanced for reading
    englishText: '#4A5B52', // Consistent with secondaryText for harmony
    arabicText: '#1A2B23', // Deep clarity for Arabic script
    authorText: '#748A7C', // Refined author styling - subtle yet readable
    headingText: '#1A2B23', // Strong heading presence
    subtitleText: '#35463E', // Perfect subtitle balance
    metadataText: '#5C6F65', // Ideal metadata hierarchy
    captionText: '#6A7D74', // Optimal caption readability

    // Interactive elements
    tint: '#5B7F68', // Sophisticated sage tint - balanced saturation
    tabIconDefault: '#9AB5A4', // Clear inactive state
    tabIconSelected: '#5B7F68', // Consistent brand presence
    icon: '#748A7C', // Harmonious icon color
    disabled: '#D2DBD6', // Clear disabled state with sage harmony

    // Overlays and effects - scientifically optimized
    transparent: 'transparent',
    overlay: 'rgba(250, 252, 249, 0.92)', // Sophisticated light overlay
    modalOverlay: 'rgba(250, 252, 249, 0.97)', // Strong modal focus
    borderOverlay: 'rgba(91, 127, 104, 0.06)', // Subtle interactive feedback
    buttonOverlay: 'rgba(91, 127, 104, 0.08)', // Perfect button hover
    buttonOverlayActive: 'rgba(91, 127, 104, 0.12)', // Clear active state
    buttonBorderOverlay: 'rgba(255, 255, 255, 0.20)', // Refined button borders
    backdropOverlay: 'rgba(43, 60, 53, 0.68)', // Optimal modal backdrop
    contrastOverlay: 'rgba(43, 60, 53, 0.32)', // Enhanced text contrast

    // Elevation system - depth with warmth
    shadow: '#2B3C35', // Consistent shadow color
    elevation1: '#FFFFFF', // Pure white first level
    elevation2: '#F9FCF8', // Subtle second level
    elevation3: '#F2F7F4', // Clear third level

    // Reading experience - optimized for comfort
    audioHighlight: '#F9FCF8', // Gentle highlight for audio
    audioHighlightBorder: '#E8F1EC', // Subtle highlight border
    wordTooltipBg: '#FFFFFF', // Clear tooltip background
    wordTooltipText: '#1A2B23', // Sharp tooltip text
    wordTooltipBorder: '#E8F1EC', // Defined tooltip border
    wordTooltipShadow: 'rgba(43, 60, 53, 0.12)', // Sophisticated tooltip shadow
    wordSelectionUnderline: 'rgba(91, 127, 104, 0.28)', // Clear word selection
    wordDueUnderline: 'rgba(184, 134, 11, 0.42)', // Warm due word indicator
    audioControlBg: '#FFFFFF', // Clean audio controls
    audioControlBorder: '#E8F1EC', // Defined audio borders
    audioControlShadow: 'rgba(43, 60, 53, 0.08)', // Gentle audio shadows

    // Navigation - polished and branded
    navigationRipple: 'rgba(91, 127, 104, 0.10)', // Subtle navigation feedback
    headerOverlay: 'rgba(250, 252, 249, 0.96)', // Strong header clarity
    tabBarOverlay: 'rgba(250, 252, 249, 0.92)', // Clear tab bar

    // UI semantics - clear user feedback
    progressIndicator: '#5B7F68', // Brand-consistent progress
    progressBackground: 'rgba(91, 127, 104, 0.15)', // Clear progress track
    interactiveSecondary: '#748A7C', // Refined secondary interactions
    completionSuccess: '#4C7F5A', // Satisfying completion color
    repeatActive: '#B8860B', // Warm active repeat state
    socialIconBg: 'rgba(91, 127, 104, 0.10)', // Subtle social backgrounds

    // Utility colors
    imagePlaceholder: '#F2F7F4', // Harmonious image placeholders
    textOverlay: 'rgba(91, 127, 104, 0.04)', // Subtle text overlays
    textShadowDark: 'rgba(43, 60, 53, 0.75)', // Rich dark text shadow
    textShadowLight: 'rgba(255, 255, 255, 0.75)', // Crisp light text shadow
    white: '#FFFFFF',
    black: '#000000',
  } as ThemeColors,

  dark: {
    // Core brand colors - sophisticated dark sage foundation
    primary: '#F4F6F4', // Warm sage white - perfect for dark mode
    background: '#0E1512', // Rich dark forest - deep yet warm
    text: '#F4F6F4', // Consistent warm light text
    secondaryText: '#D8DDD9', // Refined sage light - perfect hierarchy
    textTertiary: '#B6C2B8', // Balanced mid-tone - clear but gentle
    border: '#2A352D', // Rich sage border - clear definition
    card: '#1A211C', // Warm dark forest cards
    cardBorder: '#2A352D', // Consistent card borders

    // Semantic colors - warm and natural for dark mode
    error: '#DD6B5A', // Warmer terracotta - visible yet comfortable
    success: '#72A47F', // Lighter forest success - clear in dark
    warning: '#D4A876', // Enriched gold - warm and visible
    info: '#92A99A', // Sophisticated sage-blue for dark mode

    // Text hierarchy - optimized for dark mode reading
    englishText: '#D8DDD9', // Consistent secondary text harmony
    arabicText: '#F4F6F4', // Clear Arabic script in dark mode
    authorText: '#B6C2B8', // Refined author styling for dark
    headingText: '#F4F6F4', // Strong heading presence
    subtitleText: '#E6EAE7', // Perfect dark mode subtitle
    metadataText: '#CAD3CC', // Ideal metadata hierarchy
    captionText: '#BDC6BF', // Optimal caption in dark mode

    // Interactive elements - sophisticated dark interactions
    tint: '#7FA08A', // Balanced sage tint for dark mode
    tabIconDefault: '#6E7F71', // Clear inactive state in dark
    tabIconSelected: '#7FA08A', // Consistent brand in dark
    icon: '#B6C2B8', // Harmonious dark mode icons
    disabled: '#3C453E', // Clear disabled state with dark sage

    // Overlays and effects - scientifically optimized for dark
    transparent: 'transparent',
    overlay: 'rgba(14, 21, 18, 0.92)', // Sophisticated dark overlay
    modalOverlay: 'rgba(14, 21, 18, 0.97)', // Strong dark modal focus
    borderOverlay: 'rgba(127, 160, 138, 0.08)', // Subtle dark interactive feedback
    buttonOverlay: 'rgba(127, 160, 138, 0.10)', // Perfect dark button hover
    buttonOverlayActive: 'rgba(127, 160, 138, 0.15)', // Clear dark active state
    buttonBorderOverlay: 'rgba(244, 246, 244, 0.15)', // Refined dark button borders
    backdropOverlay: 'rgba(14, 21, 18, 0.85)', // Optimal dark modal backdrop
    contrastOverlay: 'rgba(0, 0, 0, 0.52)', // Enhanced dark contrast

    // Elevation system - depth in dark mode
    shadow: '#000000', // Pure black shadows for depth
    elevation1: '#1A211C', // Consistent card level
    elevation2: '#2A352D', // Clear second level
    elevation3: '#3A453D', // Defined third level

    // Reading experience - optimized for dark mode comfort
    audioHighlight: '#2A352D', // Gentle dark highlight
    audioHighlightBorder: '#3A453D', // Subtle dark highlight border
    wordTooltipBg: '#2A352D', // Clear dark tooltip background
    wordTooltipText: '#F4F6F4', // Sharp light tooltip text
    wordTooltipBorder: '#3A453D', // Defined dark tooltip border
    wordTooltipShadow: 'rgba(0, 0, 0, 0.42)', // Rich dark tooltip shadow
    wordSelectionUnderline: 'rgba(127, 160, 138, 0.32)', // Clear dark word selection
    wordDueUnderline: 'rgba(212, 168, 118, 0.52)', // Warm dark due indicator
    audioControlBg: '#2A352D', // Clean dark audio controls
    audioControlBorder: '#3A453D', // Defined dark audio borders
    audioControlShadow: 'rgba(0, 0, 0, 0.32)', // Rich dark audio shadows

    // Navigation - polished dark navigation
    navigationRipple: 'rgba(127, 160, 138, 0.12)', // Subtle dark navigation feedback
    headerOverlay: 'rgba(14, 21, 18, 0.96)', // Strong dark header clarity
    tabBarOverlay: 'rgba(14, 21, 18, 0.92)', // Clear dark tab bar

    // UI semantics - clear dark user feedback
    progressIndicator: '#7FA08A', // Brand-consistent dark progress
    progressBackground: 'rgba(127, 160, 138, 0.20)', // Clear dark progress track
    interactiveSecondary: '#B6C2B8', // Refined dark secondary interactions
    completionSuccess: '#72A47F', // Satisfying dark completion
    repeatActive: '#D4A876', // Warm dark active repeat state
    socialIconBg: 'rgba(127, 160, 138, 0.10)', // Subtle dark social backgrounds

    // Utility colors
    imagePlaceholder: '#2A352D', // Harmonious dark placeholders
    textOverlay: 'rgba(127, 160, 138, 0.06)', // Subtle dark text overlays
    textShadowDark: 'rgba(0, 0, 0, 0.75)', // Rich dark shadow
    textShadowLight: 'rgba(244, 246, 244, 0.75)', // Crisp light shadow
    white: '#FFFFFF',
    black: '#000000',
  } as ThemeColors,
};

export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export type ColorName = keyof typeof Colors.light;
