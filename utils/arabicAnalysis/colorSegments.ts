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
 * Get a deduplicated color name — if this color was already used by another component,
 * fall back to the type-based color to ensure visual distinction.
 *
 * Problem: Two prepositions (ب + ل) both get grammar.preposition (same amber color),
 * making it impossible to see which Arabic part maps to which English word.
 * Solution: The second one falls back to the type color (e.g., PREFIX → tint/sage).
 */
function deduplicateColor(
  colorName: string,
  usedColors: Set<string>,
  fallbackType: ComponentType,
): string {
  if (!usedColors.has(colorName)) {
    usedColors.add(colorName);
    return colorName;
  }
  // Conflict — use type-based fallback for visual distinction
  const fallback = COMPONENT_TYPE_CONFIG[fallbackType].colorName;
  usedColors.add(fallback);
  return fallback;
}

/**
 * Get the appropriate color name for a diacritic based on color inheritance.
 * When the diacritic inherits from another component, it must use the SAME deduped color
 * that was assigned to that component (not the raw role color).
 *
 * @param usedColors - The dedup set from the parent rendering context, to ensure
 *   the diacritic gets the same color the inherited component was actually rendered with.
 */
export function getDiacriticColorName(
  diacritic: AnalyzedComponent | undefined,
  analysis?: WordAnalysis,
  usedColors?: Set<string>,
): string {
  if (!diacritic) return 'text';

  // If diacritic inherits color from a related component, use that component's DEDUPED color
  if (diacritic.inheritColorFrom === ComponentType.SUFFIX && analysis?.suffix) {
    const baseColor = getComponentColorName(analysis.suffix, ComponentType.SUFFIX);
    return usedColors ? deduplicateColor(baseColor, usedColors, ComponentType.SUFFIX) : baseColor;
  }

  if (diacritic.inheritColorFrom === ComponentType.PREFIX && analysis?.prefixes) {
    // Use LAST prefix for grammatical correctness (e.g., preposition → genitive kasra)
    const prefix = analysis.prefixes[analysis.prefixes.length - 1];
    const baseColor = getComponentColorName(prefix, ComponentType.PREFIX);
    // The last prefix's color may have been deduped — look it up in usedColors
    // If it's already used, it means this prefix was rendered with this color → reuse it
    // (deduplicateColor returns the same color if already in the set)
    return usedColors ? deduplicateColor(baseColor, usedColors, ComponentType.PREFIX) : baseColor;
  }

  if (diacritic.inheritColorFrom) {
    return COMPONENT_TYPE_CONFIG[diacritic.inheritColorFrom].colorName;
  }

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
  usedColors?: Set<string>,
): Segment[] {
  if (analysis.diacritic && text.endsWith(analysis.diacritic.arabicMatch)) {
    const mainText = text.substring(0, text.length - analysis.diacritic.arabicMatch.length);
    const segments: Segment[] = [];
    if (mainText) {
      segments.push({ text: mainText, colorName: mainColorName, type: mainType });
    }
    segments.push({
      text: analysis.diacritic.arabicMatch,
      colorName: getDiacriticColorName(analysis.diacritic, analysis, usedColors),
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

  // Track used colors to deduplicate (e.g., two prepositions both getting amber)
  const usedColors = new Set<string>();

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

      const baseColor = getComponentColorName(prefix, ComponentType.PREFIX);
      const colorName = deduplicateColor(baseColor, usedColors, ComponentType.PREFIX);

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
        usedColors,
      ),
    );
  } else if (analysis.infix) {
    // Simpler case: infix without suffix
    const remainingText = arabic.substring(processed);
    const infixEnd = addInfixToSegments(remainingText, analysis.infix.arabicMatch, infixColorName, segments);

    if (infixEnd < remainingText.length) {
      segments.push(...splitWithDiacritic(remainingText.substring(infixEnd), 'arabicText', 'root', analysis, usedColors));
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
        usedColors,
      ),
    );
  } else if (processed < arabic.length && analysis.remainingArabic) {
    // Add remaining text as root ONLY if analysis detected a root
    // (Don't add phantom roots when all text is consumed by prefixes)
    const remainingText = arabic.substring(processed);
    segments.push(...splitWithDiacritic(remainingText, 'arabicText', 'root', analysis, usedColors));
  }

  // Handle diacritic-only case (no other components)
  if (analysis.diacritic && segments.length === 0) {
    segments.push(...splitWithDiacritic(arabic, 'arabicText', 'root', analysis, usedColors));
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

  // Track used colors to deduplicate (e.g., two prepositions both getting amber)
  const usedColors = new Set<string>();

  // Add all prefixes with role-based colors
  if (analysis.prefixes) {
    analysis.prefixes.forEach(prefix => {
      const baseColor = getComponentColorName(prefix, ComponentType.PREFIX);
      const colorName = deduplicateColor(baseColor, usedColors, ComponentType.PREFIX);

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
    const baseColor = COMPONENT_TYPE_CONFIG[ComponentType.INFIX].colorName;
    const colorName = deduplicateColor(baseColor, usedColors, ComponentType.INFIX);

    sections.push({
      type: 'components',
      arabicPart: analysis.infix.arabicMatch,
      englishPart: analysis.infix.englishMatches.join(' / '),
      colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.INFIX].icon,
    });
  }

  if (analysis.suffix) {
    const baseColor = getComponentColorName(analysis.suffix, ComponentType.SUFFIX);
    const colorName = deduplicateColor(baseColor, usedColors, ComponentType.SUFFIX);

    sections.push({
      type: 'components',
      arabicPart: analysis.suffix.arabicMatch,
      englishPart: analysis.suffix.englishMatches.join(' / '),
      colorName,
      icon: COMPONENT_TYPE_CONFIG[ComponentType.SUFFIX].icon,
    });
  }

  if (analysis.diacritic) {
    // Diacritics use inheritance logic — deduplicate the result
    const baseColor = getDiacriticColorName(analysis.diacritic, analysis, usedColors);
    const colorName = deduplicateColor(baseColor, usedColors, ComponentType.DIACRITIC);

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
