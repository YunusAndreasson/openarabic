import { ICON_TO_COMPONENT_TYPE } from '@/constants/arabicWordComponents';
import { CONTRACTION_EXPANSIONS, EXPANSION_TO_CONTRACTION } from '@/constants/contractions';
import { BRACKET_TYPE } from '@/constants/positionalScoring';
import type { ThemeColors } from '@/types/ui/theme.types';
import type { formatWordAnalysis, WordAnalysis } from '@/utils/arabicWordAnalysis';
import { resolveColorName, shouldApplyColorCoding } from '@/utils/colorResolution';

// Helper type for formatted analysis result
type FormattedAnalysis = ReturnType<typeof formatWordAnalysis>;

/**
 * Pre-compiled regex for word boundary detection
 * Matches any Unicode letter (including accented characters like é, ñ, ü)
 * Uses Unicode property escapes to support international text (café, André, naïve, etc.)
 * Note: Arabic text is handled separately in dedicated analysis functions
 */
const LETTER_REGEX = /\p{L}/u;

/**
 * Check if a character is a non-letter (word boundary)
 */
const isNonLetter = (ch: string): boolean => !LETTER_REGEX.test(ch);

export interface ColoredTextSegment {
  text: string;
  color: string;
  key: string;
}

export interface ColorCodedTextOptions {
  /** The text to color-code */
  text: string;
  /** Formatted analysis from Arabic word analysis */
  formattedAnalysis: FormattedAnalysis | null;
  /** Raw analysis for bracket injection check */
  analysis: WordAnalysis | null;
  /** Theme colors object */
  colors: ThemeColors;
  /** Default color for non-matched text */
  defaultColor: string;
}

/**
 * Generate color-coded text segments for rendering
 * Shared logic between WordTooltip and WordDetailsBottomSheet
 *
 * @param options - Color coding options
 * @returns Array of text segments with colors
 */
export const generateColorCodedSegments = ({
  text,
  formattedAnalysis,
  analysis,
  colors,
  defaultColor,
}: ColorCodedTextOptions): ColoredTextSegment[] => {
  // No formattedAnalysis available
  if (!formattedAnalysis?.sections?.length) {
    return [{ text, color: defaultColor, key: 'no-analysis' }];
  }

  // Get the displayed text (may include bracket injection)
  const displayedText =
    formattedAnalysis.sections.find((s: { type: string }) => s.type === 'original')?.content ||
    text;

  // Single-word check: Don't try to color parts of single-word text
  // This prevents incorrectly matching patterns inside words (e.g., "by" in "nearby")
  if (!shouldApplyColorCoding(displayedText)) {
    return [{ text: displayedText, color: defaultColor, key: 'single-word' }];
  }

  // No analysis available or no components found
  // analyzeArabicWord() now handles single-word check, so we just trust hasComponents
  // Note: Some tests pass analysis=null with manual formattedAnalysis, so check both
  const hasComponentSections = formattedAnalysis.sections.some(
    (s: { type: string }) => s.type === 'components',
  );
  if ((!analysis?.hasComponents && analysis !== null) || !hasComponentSections) {
    return [{ text: displayedText, color: defaultColor, key: 'no-components' }];
  }

  const componentSections = formattedAnalysis.sections.filter(
    (s: { type: string }) => s.type === 'components',
  );

  // No components found
  if (!componentSections.length) {
    return [{ text: displayedText, color: defaultColor, key: 'no-components' }];
  }

  const matchPositions: {
    start: number;
    end: number;
    color: string;
    componentType?: string;
    isBracketInjection?: boolean;
    /** Section processing order — earlier sections (prefixes) win ties over later ones (suffixes) */
    sectionIndex: number;
  }[] = [];



  // Add bracket color coding for [the] injection
  // Display as "the" without brackets in the colored segment
  if (analysis?.hasBracketInjection) {
    const bracketMatch = displayedText.match(/^\[the\]/);
    if (bracketMatch) {
      matchPositions.push({
        start: 0,
        end: 5, // "[the]" length (5 characters including brackets)
        color: colors.tint, // Use tint color for definite article
        componentType: BRACKET_TYPE, // Special type for bracket injection
        isBracketInjection: true, // Flag to remove brackets when displaying
        sectionIndex: -1, // Bracket injection has highest priority
      });
    }
  }

  // Process each component section (order matters: prefixes first, then suffix/infix/diacritic)
  for (let sectionIdx = 0; sectionIdx < componentSections.length; sectionIdx++) {
    const section = componentSections[sectionIdx];
    if (!section?.englishPart) continue;

    const searchText = displayedText.toLowerCase();
    const colorValue = section.colorName
      ? resolveColorName(section.colorName, colors)
      : colors.text;

    // Detect component type from icon (→ = prefix, ← = suffix, ↔ = infix, ◌ = diacritic)
    // Uses ICON_TO_COMPONENT_TYPE from arabicWordComponents.ts (single source of truth)
    const componentType = section.icon ? ICON_TO_COMPONENT_TYPE[section.icon] : undefined;

    // Split slash-separated alternatives like "his / its / it"
    // Also split compound patterns like "of him" into individual words for matching
    // BUT keep compound intact if it's a contraction expansion (e.g., "do not" → "don't")
    const baseCandidates = section.englishPart
      .toLowerCase()
      .split('/')
      .flatMap(s => {
        const trimmed = s.trim();
        if (!trimmed) return [];
        if (trimmed.includes(' ')) {
          const isContractionExpansion = CONTRACTION_EXPANSIONS.has(trimmed);
          if (isContractionExpansion) {
            return [trimmed];
          }
          return trimmed.split(/\s+/);
        }
        return [trimmed];
      })
      .filter(Boolean);

    // Expand candidates to include contracted forms
    // e.g., "do not" should also match "don't"
    //
    // CONTRACTION HANDLING: This bidirectional mapping ensures correct matching regardless of
    // whether displayedText has contracted ("don't") or expanded ("do not") form.
    // arabicWordAnalysis.ts expands contractions ONLY for word counting, not for component detection,
    // so components reference the actual text structure (e.g., englishPart="do not" for وَلَا).
    const candidates: string[] = [];
    for (const candidate of baseCandidates) {
      candidates.push(candidate);
      // Check if this candidate has a contracted form
      // O(1) lookup using pre-computed reverse Map
      const contractedForm = EXPANSION_TO_CONTRACTION.get(candidate);
      if (contractedForm) {
        candidates.push(contractedForm);
      }
    }

    // Track duplicates (start:end) to avoid overlapping duplicates
    // Collect ALL candidate match positions for this section.
    // Overlap resolution (section ordering) + per-section limiting (below) handle conflicts.
    const seen = new Set<string>();
    for (const candidate of candidates) {
      let fromIndex = 0;
      while (fromIndex <= searchText.length) {
        const idx = searchText.indexOf(candidate, fromIndex);
        if (idx === -1) break;

        const prevChar = idx > 0 ? (searchText[idx - 1] ?? ' ') : ' ';
        const nextIdx = idx + candidate.length;
        const nextChar = nextIdx < searchText.length ? (searchText[nextIdx] ?? ' ') : ' ';
        const isValidMatch =
          (idx === 0 || isNonLetter(prevChar)) &&
          (nextIdx === searchText.length || isNonLetter(nextChar));

        if (isValidMatch) {
          const key = `${idx}:${idx + candidate.length}`;
          if (!seen.has(key)) {
            seen.add(key);
            matchPositions.push({
              start: idx,
              end: idx + candidate.length,
              color: colorValue,
              componentType,
              sectionIndex: sectionIdx,
            });
          }
          // Move past this match to find further non-overlapping matches
          fromIndex = idx + candidate.length;
        } else {
          fromIndex = idx + 1;
        }
      }
    }
  }

  // Greedy section-ordered assignment:
  // Process sections in order (prefixes first, then suffix). Each section claims
  // ONE non-conflicting position. Earlier sections get priority, matching
  // the left-to-right correspondence between Arabic and English.
  const claimedRanges: { start: number; end: number }[] = [];
  const finalMatches: typeof matchPositions = [];

  const isOverlapping = (start: number, end: number) =>
    claimedRanges.some(r => start < r.end && end > r.start);

  // Group match positions by section, preserving text position order within each group
  const bySectionIndex = new Map<number, typeof matchPositions>();
  for (const m of matchPositions) {
    const list = bySectionIndex.get(m.sectionIndex) ?? [];
    list.push(m);
    bySectionIndex.set(m.sectionIndex, list);
  }

  // Process sections in order (sorted by sectionIndex)
  const sectionIndices = [...bySectionIndex.keys()].sort((a, b) => a - b);

  // Pre-compute which sections claim each English word so we can distribute repeated
  // occurrences across claiming sections instead of letting the first claim them all.
  // Example: يَشُقُّهَا "it splits it open" — prefix ي and suffix ها both claim "it".
  // English has two "it"s; without this, the prefix's section would greedily take both
  // and paint them in the prefix color, leaving the suffix's color asymmetric (Arabic
  // span colored, English span uncolored).
  const wordClaimingSections = new Map<string, Set<number>>();
  for (const m of matchPositions) {
    const word = displayedText.substring(m.start, m.end).toLowerCase();
    const set = wordClaimingSections.get(word) ?? new Set<number>();
    set.add(m.sectionIndex);
    wordClaimingSections.set(word, set);
  }

  for (const si of sectionIndices) {
    const candidates = bySectionIndex.get(si) ?? [];
    candidates.sort((a, b) => a.start - b.start);

    // Find the first non-overlapping candidate, then also accept all other matches
    // of the SAME word (e.g., "from" in "from from" → both colored). But STOP claiming
    // additional occurrences of a word once a later section also claims that word —
    // those occurrences belong to the later section.
    let matchedWord: string | undefined;
    for (const candidate of candidates) {
      if (!isOverlapping(candidate.start, candidate.end)) {
        const word = displayedText.substring(candidate.start, candidate.end).toLowerCase();
        const claimingSections = wordClaimingSections.get(word);
        const isSharedWithLaterSection =
          claimingSections != null && [...claimingSections].some(s => s > si);

        if (!matchedWord) {
          matchedWord = word;
          finalMatches.push(candidate);
          claimedRanges.push({ start: candidate.start, end: candidate.end });
          // If this word is also claimed by a later section, leave its repeat
          // occurrences (if any) for that later section.
          if (isSharedWithLaterSection) break;
          continue;
        }
        // Repeat-of-same-word: only claim if no later section also claims it.
        if (word === matchedWord && !isSharedWithLaterSection) {
          finalMatches.push(candidate);
          claimedRanges.push({ start: candidate.start, end: candidate.end });
        }
      }
    }
  }

  const sortedMatches = finalMatches.sort((a, b) => a.start - b.start);

  // Build final segments
  const parts: ColoredTextSegment[] = [];
  let currentIndex = 0;

  for (const match of sortedMatches) {
    if (match.start > currentIndex) {
      parts.push({
        text: displayedText.substring(currentIndex, match.start),
        color: defaultColor,
        key: `text-${currentIndex}`,
      });
    }

    // Get the matched text
    let matchedText = displayedText.substring(match.start, match.end);

    // Remove brackets from bracket injection matches (display "the" instead of "[the]")
    if (match.isBracketInjection && matchedText.startsWith('[') && matchedText.endsWith(']')) {
      matchedText = matchedText.slice(1, -1); // Remove [ and ]
    }

    parts.push({
      text: matchedText,
      color: match.color,
      key: `match-${match.start}`,
    });
    currentIndex = match.end;
  }

  if (currentIndex < displayedText.length) {
    parts.push({
      text: displayedText.substring(currentIndex),
      color: defaultColor,
      key: 'remaining',
    });
  }

  return parts;
};
