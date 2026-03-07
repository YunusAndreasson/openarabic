/**
 * Color segment reconstruction and formatting for Arabic word analysis
 */

import {
  COMPONENT_TYPE_CONFIG,
  ComponentType,
  GRAMMATICAL_ROLE_COLORS,
} from '@/constants/arabicWordComponents';

import { DIACRITIC_REGEX } from './constants';
import { normalizeArabic } from './normalization';
import type { AnalyzedComponent, WordAnalysis } from './types';

/**
 * Maps a position from normalized text to original text (accounting for diacritics)
 */
export function mapToOriginalPosition(
  original: string,
  normalizedLength: number,
  fromEnd = false,
): number {
  let position = fromEnd ? original.length : 0;
  let count = 0;

  if (fromEnd) {
    // Count backwards from end
    for (let i = original.length - 1; i >= 0 && count < normalizedLength; i--) {
      const char = original[i];
      if (char && !DIACRITIC_REGEX.test(char)) {
        count++;
      }
      position = i;
    }
  } else {
    // Count forwards from start
    let i = 0;
    for (; i < original.length && count < normalizedLength; i++) {
      const char = original[i];
      if (char && !DIACRITIC_REGEX.test(char)) {
        count++;
      }
    }
    // After reaching the target number of base characters, include any
    // immediately trailing diacritics so they stay attached to the segment
    while (i < original.length) {
      const nextChar = original[i];
      if (nextChar && DIACRITIC_REGEX.test(nextChar)) {
        i++;
        continue;
      }
      break;
    }
    position = i;
  }

  return position;
}

/**
 * Get the appropriate color name for a component based on role or type
 * Uses role-based color if available, otherwise falls back to type-based color
 */
export function getComponentColorName(
  component: AnalyzedComponent | undefined,
  defaultType: ComponentType,
): string {
  if (!component) {
    return COMPONENT_TYPE_CONFIG[defaultType].colorName;
  }

  return component.role
    ? GRAMMATICAL_ROLE_COLORS[component.role]
    : COMPONENT_TYPE_CONFIG[defaultType].colorName;
}

/**
 * Get the appropriate color name for a diacritic based on color inheritance
 * Must match the exact color logic used by the component it inherits from (including role-based colors)
 */
export function getDiacriticColorName(
  diacritic: AnalyzedComponent | undefined,
  analysis?: WordAnalysis,
): string {
  if (!diacritic) return 'text';

  // If diacritic inherits color from a related component, use that component's color logic
  if (diacritic.inheritColorFrom === ComponentType.SUFFIX && analysis?.suffix) {
    // Match suffix color logic: use role-based color if available, otherwise type-based
    return getComponentColorName(analysis.suffix, ComponentType.SUFFIX);
  }

  if (diacritic.inheritColorFrom === ComponentType.PREFIX && analysis?.prefixes) {
    // Match prefix color logic: also uses role-based colors
    // Use LAST prefix for grammatical correctness (e.g., preposition → genitive kasra)
    // In multi-prefix words like وَلِلْبَيْتِ (and for the house), the genitive ِ relates
    // to the preposition ل (last prefix), not the conjunction و (first prefix)
    const prefix = analysis.prefixes[analysis.prefixes.length - 1]; // Get last prefix (most grammatically relevant for diacritic)
    return getComponentColorName(prefix, ComponentType.PREFIX);
  }

  if (diacritic.inheritColorFrom) {
    // Fallback for other component types (infix, etc.)
    return COMPONENT_TYPE_CONFIG[diacritic.inheritColorFrom].colorName;
  }

  // Otherwise use the diacritic's own color
  return COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].colorName;
}

/** Segment type for internal use */
interface Segment {
  text: string;
  colorName: string;
  type: string;
}

/**
 * Adds pre-infix root and infix segments, returns infixEnd position for the caller to handle post-infix.
 */
function addInfixToSegments(
  remainingText: string,
  infixArabic: string,
  infixColorName: string,
  segments: Segment[],
): number {
  const normalizedRemaining = normalizeArabic(remainingText);
  const infixIndex = normalizedRemaining.indexOf(infixArabic);
  const infixStart = infixIndex > 0 ? mapToOriginalPosition(remainingText, infixIndex) : 0;

  if (infixStart > 0) {
    segments.push({ text: remainingText.substring(0, infixStart), colorName: 'arabicText', type: 'root' });
  }

  const infixEnd = mapToOriginalPosition(remainingText, infixIndex + infixArabic.length);
  segments.push({ text: remainingText.substring(infixStart, infixEnd), colorName: infixColorName, type: 'infix' });

  return infixEnd;
}

/**
 * Helper to split text and optionally extract a trailing diacritic.
 * Returns array of segments: [main segment] or [main segment, diacritic segment].
 * Handles the common pattern of checking for diacritic at end of text and splitting.
 */
function splitWithDiacritic(
  text: string,
  mainColorName: string,
  mainType: string,
  analysis: WordAnalysis,
): Segment[] {
  if (analysis.diacritic && text.endsWith(analysis.diacritic.arabicMatch)) {
    const mainText = text.substring(0, text.length - analysis.diacritic.arabicMatch.length);
    const segments: Segment[] = [];
    if (mainText) {
      segments.push({ text: mainText, colorName: mainColorName, type: mainType });
    }
    segments.push({
      text: analysis.diacritic.arabicMatch,
      colorName: getDiacriticColorName(analysis.diacritic, analysis),
      type: 'diacritic',
    });
    return segments;
  }
  return [{ text, colorName: mainColorName, type: mainType }];
}

/**
 * Optimized reconstruction for coloring with infix and diacritic support
 */
export function reconstructWithColors(analysis: WordAnalysis) {
  const segments: { text: string; colorName: string; type: string }[] = [];
  const { arabic } = analysis.original;
  let processed = 0;

  // Add all prefix segments with role-based colors
  if (analysis.prefixes && analysis.prefixes.length > 0) {
    for (let i = 0; i < analysis.prefixes.length; i++) {
      const prefix = analysis.prefixes[i];
      if (!prefix) continue; // TypeScript strict null check

      const prefixLength = prefix.arabicMatch.length;
      const isLastPrefix = i === analysis.prefixes.length - 1;

      let originalEnd: number;

      // If this is the last prefix and there's no remaining root, consume all remaining text
      if (isLastPrefix && !analysis.remainingArabic && !analysis.suffix) {
        originalEnd = arabic.length;
      } else {
        const mappedEnd =
          mapToOriginalPosition(arabic.substring(processed), prefixLength) + processed;
        // Ensure we don't exceed the original string length
        originalEnd = Math.min(mappedEnd, arabic.length);
      }

      // Use role-based color if available, otherwise fall back to type-based color
      const colorName = getComponentColorName(prefix, ComponentType.PREFIX);

      segments.push({
        text: arabic.substring(processed, originalEnd),
        colorName,
        type: 'prefix',
      });
      processed = originalEnd;
    }
  }

  // Handle infix within the remaining text
  const infixColorName = COMPONENT_TYPE_CONFIG[ComponentType.INFIX].colorName;
  if (analysis.infix && analysis.suffix) {
    // Complex case: infix + suffix
    const suffixOriginalStart = mapToOriginalPosition(arabic, analysis.suffix.arabicMatch.length, true);
    const remainingText = arabic.substring(processed, suffixOriginalStart);

    const infixEnd = addInfixToSegments(remainingText, analysis.infix.arabicMatch, infixColorName, segments);

    if (infixEnd < remainingText.length) {
      segments.push({ text: remainingText.substring(infixEnd), colorName: 'arabicText', type: 'root' });
    }

    // Add suffix segment (with diacritic split if needed)
    segments.push(
      ...splitWithDiacritic(
        arabic.substring(suffixOriginalStart),
        getComponentColorName(analysis.suffix, ComponentType.SUFFIX),
        'suffix',
        analysis,
      ),
    );
  } else if (analysis.infix) {
    // Simpler case: infix without suffix
    const remainingText = arabic.substring(processed);
    const infixEnd = addInfixToSegments(remainingText, analysis.infix.arabicMatch, infixColorName, segments);

    if (infixEnd < remainingText.length) {
      segments.push(...splitWithDiacritic(remainingText.substring(infixEnd), 'arabicText', 'root', analysis));
    }
  } else if (analysis.suffix) {
    // Original suffix-only logic
    const originalStart = mapToOriginalPosition(arabic, analysis.suffix.arabicMatch.length, true);

    // Add middle segment if there's a gap
    if (originalStart > processed) {
      segments.push({
        text: arabic.substring(processed, originalStart),
        colorName: 'arabicText',
        type: 'root',
      });
    }

    // Add suffix segment (with diacritic split if needed)
    const suffixText = arabic.substring(originalStart);
    segments.push(
      ...splitWithDiacritic(
        suffixText,
        getComponentColorName(analysis.suffix, ComponentType.SUFFIX),
        'suffix',
        analysis,
      ),
    );
  } else if (processed < arabic.length && analysis.remainingArabic) {
    // Add remaining text as root ONLY if analysis detected a root
    // (Don't add phantom roots when all text is consumed by prefixes)
    const remainingText = arabic.substring(processed);
    segments.push(...splitWithDiacritic(remainingText, 'arabicText', 'root', analysis));
  }

  // Handle diacritic-only case (no other components)
  if (analysis.diacritic && segments.length === 0) {
    segments.push(...splitWithDiacritic(arabic, 'arabicText', 'root', analysis));
  }

  // Fallback: if no segments, add whole word
  if (segments.length === 0) {
    segments.push({ text: arabic, colorName: 'arabicText', type: 'root' });
  }

  return { segments, totalText: arabic };
}

/**
 * Formats analysis for tooltip display with infix support
 */
export function formatWordAnalysis(analysis: WordAnalysis) {
  // Remove brackets from English for display (show "the" instead of "[the]")
  const englishForDisplay = analysis.original.english.replace(/^\[the\]\s*/, 'the ');

  const title = `${analysis.original.arabic} → ${englishForDisplay}`;
  const reconstructedArabic = analysis.hasComponents ? reconstructWithColors(analysis) : undefined;

  const sections: {
    type: 'original' | 'components' | 'root';
    content?: string;
    arabicPart?: string;
    englishPart?: string;
    colorName?: string;
    icon?: string;
  }[] = [{ type: 'original', content: englishForDisplay }];

  // Add all prefixes with role-based colors
  if (analysis.prefixes) {
    analysis.prefixes.forEach(prefix => {
      // Use role-based color if role is defined, otherwise fall back to type-based color
      const colorName = getComponentColorName(prefix, ComponentType.PREFIX);

      sections.push({
        type: 'components',
        arabicPart: prefix.arabicMatch,
        englishPart: prefix.englishMatches.join(' / '),
        colorName,
        icon: COMPONENT_TYPE_CONFIG[ComponentType.PREFIX].icon,
      });
    });
  }

  if (analysis.infix) {
    sections.push({
      type: 'components',
      arabicPart: analysis.infix.arabicMatch,
      englishPart: analysis.infix.englishMatches.join(' / '),
      colorName: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].icon,
    });
  }

  if (analysis.suffix) {
    // Use role-based color if role is defined, otherwise fall back to type-based color
    const colorName = getComponentColorName(analysis.suffix, ComponentType.SUFFIX);

    sections.push({
      type: 'components',
      arabicPart: analysis.suffix.arabicMatch,
      englishPart: analysis.suffix.englishMatches.join(' / '),
      colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].icon,
    });
  }

  if (analysis.diacritic) {
    // If diacritic inherits color from related component, use that color instead
    // Must use getDiacriticColorName to get role-based colors (e.g., violet for POSSESSIVE)
    const colorName = getDiacriticColorName(analysis.diacritic, analysis);

    sections.push({
      type: 'components',
      arabicPart: analysis.diacritic.arabicMatch,
      englishPart: analysis.diacritic.englishMatches.join(' / '),
      colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.DIACRITIC].icon,
    });
  }

  if (analysis.remainingArabic && analysis.remainingEnglish) {
    sections.push({
      type: 'root',
      arabicPart: analysis.remainingArabic,
      englishPart: analysis.remainingEnglish,
      colorName: 'text',
      icon: '→',
    });
  }

  return { title, reconstructedArabic, sections };
}
