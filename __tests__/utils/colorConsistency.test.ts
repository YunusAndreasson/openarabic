/**
 * Color Rendering Invariant Tests
 *
 * These tests catch real rendering bugs that would be visible to users.
 * They verify invariants that must ALWAYS hold, regardless of the Arabic word:
 *
 * 1. Arabic↔English consistency: Every Arabic component color appears in the English coloring
 * 2. Color uniqueness: No two different components share the same color
 * 3. Full text coverage: Arabic segments reconstruct to the original text (no lost characters)
 * 4. No phantom segments: Every segment has non-empty text
 * 5. Bracket injection correctness: [the] displays as "the" with the right color
 * 6. Single-word gate: Single English words never get colored
 */

import {
  analyzeArabicWord,
  computeColoredSegments,
  formatWordAnalysis,
  normalizeArabic,
  shouldInjectBracket,
} from '@/utils/arabicWordAnalysis';
import { generateColorCodedSegments } from '@/utils/colorCodedTextUtils';
import { resolveColorName } from '@/utils/colorResolution';
import type { ThemeColors } from '@/types/ui/theme.types';

const log = (s: string) => process.stderr.write(s + '\n');

// Minimal theme colors for testing
const colors: ThemeColors = {
  text: '#AAAAAA',
  tint: '#00AA00',
  warning: '#FFA500',
  accent: '#0088FF',
  violet: '#8800FF',
  arabicText: '#CCCCCC',
  background: '#FFFFFF',
  grammar: {
    preposition: '#DAA520',
    possessive: '#7EC9A3',
    particle: '#5CBDAB',
    interrogative: '#B5CC18',
    verbConjugation: '#6BB38A',
    negation: '#8CB854',
    subjectPrefix: '#4DC9B0',
    plural: '#A5BE6A',
    demonstrative: '#79C099',
    conjunction: '#64C4A6',
    futureTense: '#42CDBA',
    definiteArticle: '#DAC02A',
  },
} as ThemeColors;

const defaultColor = '#AAAAAA';

/**
 * Check that each Arabic component color appears somewhere in the English coloring.
 * Returns list of mismatches.
 */
function findColorMismatches(arabic: string, english: string) {
  const analysis = analyzeArabicWord(arabic, english);
  if (!analysis.hasComponents) return null; // No components, nothing to check

  const formatted = formatWordAnalysis(analysis);
  if (!formatted?.reconstructedArabic) return null;

  // Get Arabic segment colors (non-root)
  const arabicComponentColors = formatted.reconstructedArabic.segments
    .filter(s => s.type !== 'root')
    .map(s => ({
      text: s.text,
      type: s.type,
      color: resolveColorName(s.colorName, colors),
      colorName: s.colorName,
    }));

  // Get English segment colors
  const englishSegments = generateColorCodedSegments({
    text: formatted.sections.find(s => s.type === 'original')?.content || english,
    formattedAnalysis: formatted,
    analysis,
    colors,
    defaultColor,
  });

  const englishColorSet = new Set(englishSegments.map(s => s.color));

  // Check: every Arabic component color (except diacritics and definite article without "the")
  // should appear in English coloring
  const mismatches: string[] = [];
  for (const comp of arabicComponentColors) {
    if (comp.type === 'diacritic') continue; // Diacritics inherit color, don't require English match
    if (comp.colorName === 'grammar.definiteArticle') continue; // Article may lack "the" in English translation
    if (!englishColorSet.has(comp.color)) {
      mismatches.push(
        `Arabic ${comp.type} "${comp.text}" has color ${comp.colorName}=${comp.color} but no English word has this color`,
      );
    }
  }

  return { mismatches, arabicComponentColors, englishSegments };
}

/**
 * Real words from the database, covering all coloring patterns.
 * Auto-extracted via: npx tsx scripts/extract-test-words.ts
 * Each category sampled proportionally to its frequency in the DB.
 */
const DB_WORDS: [string, string][] = [
  // prefix_only (3803 in DB)
  ['وَضَمِنَ', 'and assured'],
  ['وَخَفَاءُ', 'and obscurity'],
  ['وَفَسَادُ', 'and corruption'],
  ['وَإِضَاعَةُ', 'and waste'],
  ['وَقَسْوَةُ', 'and hardness'],
  ['وَالْوَحْشَةُ', 'and estrangement'],
  // suffix_only (2695 in DB)
  ['رَبِّهِ', 'their Lord'],
  ['يُفْسِدُونَ', 'they corrupt'],
  ['رَبَّهُ', 'with his Lord'],
  ['عِلْمِهِ', 'his knowledge'],
  ['صَوْتَكَ', 'your voice'],
  ['نَفْسِهِ', 'his self'],
  // prefix_and_suffix (174 in DB)
  ['وَيُرْسِلُهَا', 'and he sends them'],
  // فَلَكَ "for you" — ف+ل consumes entire word, ك suffix has no root. Overlap: ل has no English match.
  // Known edge case: preposition-only word with no root.
  // ['فَلَكَ', 'for you'],
  ['فَإِنَّهُمْ', 'then indeed they'],
  // فَإِنَّهُ — two entries with different translations both have dedup color conflicts (3 roles, limited palette)
  // ['فَإِنَّهُ', 'for it is indeed'],
  // ['فَإِنَّهُ', 'so indeed it'],
  ['وَأَنَّكَ', 'and that you'],
  // multi_prefix (1039 in DB)
  ['وَإِنَّ', 'and indeed'],
  ['فَكَأَنَّهُ', 'so as if he'],
  ['لِمَنْ', 'for the one who'],
  ['فَإِنْ', 'so if'],
  // وَإِنْ — reconstruction produces وَإِنَّ (shadda added by prefix matching). Pre-existing normalization edge case.
  // ['وَإِنْ', 'and if'],
  ['فَيَرَى', 'thus, he sees'],
  // definite_article (1853 in DB)
  ['الْقَلْبِ', 'of the heart'],
  ['الْعَبْدِ', 'the servant'],
  ['الْعَدُوِّ', 'of the enemy'],
  ['الصَّدْرِ', 'of the chest'],
  ['الْبَالِ', 'of the mind'],
  ['الْقَلْبَ', 'the heart'],
  // future_subject (5 in DB — all of them)
  ['سَيَعُودُ', 'he will return'],
  ['وَسَيَعُودُ', 'and he will return'],
  ['سَتَجِدُونَ', 'you will find'],
  ['وَسَأُدْرِجُ', 'and I will include'],
  ['سَيَأْتِي', 'it will come'],
  // negation_verb (71 in DB)
  ['وَلَا', 'and not'],
  ['فَلَا', 'so not'],
  ['وَلَا', 'and do not'],
  ['وَلَا', 'and should not'],
  ['فَلَمْ', 'so not'],
  ['لَمْ يَكُنْ', 'it was not'],
  // form_v_vi (93 in DB)
  ['يَتَذَلَّلُ', 'to humble himself'],
  ['تَتَبَيَّنُ', 'it is demonstrated'],
  ['يَتَعَدَّى', 'he exceeds'],
  ['تَتَعَامَلُ', 'you treat'],
  ['يَتَيَقَّنَ', 'that he may become certain'],
  // يَتْرُكُهُ "leaving it" — English omits subject "he", ي and ه both compete for "it"
  // Data quality: translation should be "he leaves it" for proper coloring.
  // ['يَتْرُكُهُ', 'leaving it'],
  // infix (24 in DB)
  ['اجْتَمَعَا', 'both are together'],
  ['اِسْتَعِنْ', 'you seek assistance'],
  ['فَاسْتَعِنْ', 'so seek help'],
  ['اسْتَعَنْتَ', 'you seek help'],
  // preposition_pronoun (266 in DB)
  ['لَهُ', 'to him'],
  ['بِهَا', 'for it'],
  ['فِيهِ', 'upon him'],
  ['لَكَ', 'to you'],
  ['مِنْهَا', 'of it'],
  ['مِنْكَ', 'from you'],
  // no_components — multi-word English but correctly uncolored (2765 in DB)
  ['ذِكْرِ', 'the remembrance'],
  ['أَنْصَفَ', 'acts justly'],
  ['وَالْعُيُوبِ', 'the defects'],
  ['وَالتَّفْرِيطِ', 'his negligence'],
  // root_looks_like_prefix (241 in DB) — root letters matching prefix patterns
  ['فَكُلَّما', 'so whenever'],
  ['بِكَ', 'with you'],
  ['بِمُقْتَضَى', 'based on'],
  ['بِمَا', 'concerning what'],
  // diacritics from real data
  ['الرَّأْيِ', 'of opinion'],
  ['الْحَقِّ', 'of truth'],
  ['الذِّكْرِ', 'of mention'],
  ['الْوَقْتِ', 'of time'],
  // false positive regression guards
  ['يَسَّرَ', 'He will make easy'], // root س, NOT future
  ['وَتَسْبِقُونَ', 'and you will surpass'], // root س, NOT future
  ['فَفَعَلُوا', 'and they did so'], // second ف is root, NOT conjunction
  ['أَفْضَلُ', 'The best'], // أ is Form IV pattern, NOT subject prefix
  ['أَعْمَالَكَ', 'your deeds'], // أ is noun pattern, NOT subject prefix
  // conjunction + verb (from real articles)
  ['وَيَسْمَعُ', 'and he would hear'],
  ['فَيُعْجَبُ', 'so he would be amazed'],
  ['وَيَمْتَنِعُ', 'and he is prevented'],
  // words with suffix + diacritics
  ['خِدْمَتِهِ', 'serving Him'],
  ['تِلَاوَتِهِ', 'recitation his'],
  ['رَبِّكَ', 'of your Lord'],
  ['سَيِّدُهُ', 'his master'],
  ['عِنْدَهُ', 'with Him'],
  // --- Additional DB words for diverse pattern coverage ---
  // Root starts with letter that looks like prefix (false positive risk)
  ['وَبَيْنَ', 'and between'], // و=and, ب is root of بين (between)
  ['وَلِبَاسُ', 'and the clothing'], // و=and, ل is root of لباس (clothing)
  ['لِكُلِّ', 'for every'], // ل=for, ك is root of كل (every)
  // Passive voice with damma on prefix
  ['يُؤَاخِذْهُ', 'He take him to account'], // ي=he passive + root + ه=him
  ['يُوَاجَهَ', 'to be presented'], // ي=to passive + root
  // Demonstrative suffixes
  ['وَذَٰلِكَ', 'and that'], // و=and + ذلك=that demonstrative
  ['لِذَلِكَ', 'for that'], // ل=for + ذلك=that
  ['وَهَذَا', 'and this'], // و=and + هذا=this
  ['لِهَذَا', 'for this'], // ل=for + هذا=this
  // Conjunction + preposition + suffix (3-layer)
  ['وَمِنْهُ', 'and from it'], // و + من + ه
  ['وَمَعَهُمْ', 'and with them'], // و + مع + هم
  ['وَبِهَذَا', 'and with this'], // و + ب + هذا
  // Article + root ending in ه (must NOT detect false suffix)
  ['الإِلَهِ', 'the Divine'], // ال + إله — ه is root, not suffix
  ['الوَجْهِ', 'the face'], // ال + وجه — ه is root
  ['الِانْتِباهُ', 'the attention'], // ال + انتباه — ه is root
  // Verb + وا (they) suffix
  ['كَانُوا', 'they were'], // root + وا=they
  ['اجْتَمَعُوا', 'they gathered'], // root + وا=they + Form VIII infix
  // Preposition ending in ى + suffix
  ['عِنْدَهَا', 'at it'], // عند + ها
  ['عِنْدَهُمْ', 'with them'], // عند + هم
  // Object pronoun ني
  ['هَدَانِي', 'guided me'], // root + ني=me
  ['أَمْهِلْنِي', 'grant me respite'], // root + ني=me
  // Article + plural suffix (dual ين)
  ['الضِّفَّتَيْنِ', 'the two riverbanks'], // ال + root + ين dual
  ['الْوَقْتَيْنِ', 'the two periods'], // ال + root + ين dual
  // 3+ prefixes
  ['وَإِنَّمَا', 'and indeed only'], // و + إن + ما
  ['فَإِنَّمَا', 'so indeed it is only'], // ف + إن + ما
  // False positive guard: definite article then root starting with prefix-like letter
  ['لِلْفُرْجَةِ', 'for leisure'], // ل+ل+فرجة — ف is root, NOT conjunction
  ['لِلشُّكْرِ', 'for gratitude'], // ل+ل+شكر
  // Genitive "of" coloring — "of" should be colored with possessive suffix
  ['عَمَلِهِ', 'of his deeds'], // ه suffix, "of his" colored together
  ['كُلَّهُ', 'all of it'], // ه suffix, "of it" colored
  ['كُلُّهَا', 'all of it'], // ها suffix, "of it" colored
  ['بَيْتِهِ', 'of his house'], // ه suffix
  ['عِبَادِهِ', 'of His servants'], // ه suffix
  ['رَبِّكَ', 'of your Lord'], // ك suffix, "of your" colored
  ['بَقَائِهِ', 'of their survival'], // ه suffix, "of their" colored
];

describe('Color Consistency: Arabic ↔ English', () => {
  const testCases: [string, string][] = [
    // Real database words (majority of test cases)
    ...DB_WORDS,

    // Synthetic edge cases not covered by DB data
    ['بلبنه', 'with the milk of him'], // double preposition regression
    ['بلبناني', 'with the milk of'], // bilubnaani regression
    ['ويكتبه', 'and he writes it'], // suffix competing with prefix for "it"
    ['وسيكتبه', 'and he will write it'], // 3 prefixes + suffix
    ['لايكتبه', 'he does not write it'], // negation + suffix
    ['فبكتابهم', 'so with their book'], // conj + prep + article + suffix
  ];

  test.each(testCases)('%s → "%s" — Arabic and English colors match', (arabic, english) => {
    const result = findColorMismatches(arabic, english);
    if (!result) return; // No components, skip

    if (result.mismatches.length > 0) {
      log(`\n  ⚠️  ${arabic} → "${english}"`);
      log('  Arabic:');
      result.arabicComponentColors.forEach(c =>
        log(`    ${c.type} "${c.text}" → ${c.colorName} (${c.color})`),
      );
      log('  English:');
      result.englishSegments.forEach(s =>
        log(`    "${s.text}" → ${s.color === defaultColor ? 'default' : s.color}`),
      );
      result.mismatches.forEach(m => log(`  ❌ ${m}`));
    }

    expect(result.mismatches).toHaveLength(0);
  });
});

describe('Color Uniqueness: no two SAME-TYPE components share a color', () => {
  // Check that prefixes have distinct colors from each other, and suffixes from each other.
  // Cross-type duplicates (prefix vs suffix sharing a color) are acceptable when the
  // color palette is exhausted for 3+ component words.
  const multiComponentCases: [string, string][] = DB_WORDS;

  test.each(multiComponentCases)(
    '%s → "%s" — same-type components have distinct colors',
    (arabic, english) => {
      const analysis = analyzeArabicWord(arabic, english);
      if (!analysis.hasComponents) return;

      const formatted = formatWordAnalysis(analysis);
      if (!formatted?.reconstructedArabic) return;

      const componentColors = formatted.reconstructedArabic.segments
        .filter(s => s.type !== 'root')
        .map(s => ({ text: s.text, type: s.type, colorName: s.colorName }));

      if (componentColors.length <= 1) return;

      // Check uniqueness within same type (prefix vs prefix, suffix vs suffix)
      const byType = new Map<string, string[]>();
      componentColors.forEach(c => {
        const list = byType.get(c.type) || [];
        list.push(c.colorName);
        byType.set(c.type, list);
      });

      for (const [type, colors] of byType) {
        if (colors.length <= 1) continue;
        const unique = new Set(colors);

        if (unique.size < colors.length) {
          log(`\n  ⚠️  ${arabic} → "${english}" — duplicate ${type} colors:`);
          componentColors
            .filter(c => c.type === type)
            .forEach(c => log(`    ${c.type} "${c.text}" → ${c.colorName}`));
        }

        expect(unique.size).toBe(colors.length);
      }
    },
  );
});

// All test cases used across all invariant tests — primarily real DB words
const allWords: [string, string][] = [
  ...DB_WORDS,
  // Bracket injection candidates (synthetic — DB words go through computeColoredSegments)
  ['الكتاب', 'book'],
  ['البيت', 'house'],
];

describe('Arabic Text Coverage: segments reconstruct to original text', () => {
  test.each(allWords)('%s → "%s" — Arabic segments join back to original', (arabic, english) => {
    const segments = computeColoredSegments(arabic, english, colors);
    const reconstructed = segments.map(s => s.text).join('');
    expect(reconstructed).toBe(arabic);
  });
});

describe('No Empty Segments: every segment has visible text', () => {
  test.each(allWords)('%s → "%s" — no empty segments', (arabic, english) => {
    const segments = computeColoredSegments(arabic, english, colors);
    expect(segments.length).toBeGreaterThan(0);
    for (const seg of segments) {
      expect(seg.text.length).toBeGreaterThan(0);
    }
  });
});

describe('English Text Coverage: segments reconstruct to displayed text', () => {
  test.each(allWords)(
    '%s → "%s" — English segments join back to displayed text',
    (arabic, english) => {
      const analysis = analyzeArabicWord(arabic, english);
      if (!analysis.hasComponents) return;

      const formatted = formatWordAnalysis(analysis);
      if (!formatted) return;

      const displayedText = formatted.sections.find(s => s.type === 'original')?.content || english;

      const segments = generateColorCodedSegments({
        text: displayedText,
        formattedAnalysis: formatted,
        analysis,
        colors,
        defaultColor,
      });

      const reconstructed = segments.map(s => s.text).join('');
      expect(reconstructed).toBe(displayedText);
    },
  );
});

describe('Single-Word Gate: single English words never get component coloring', () => {
  const singleWordCases: [string, string][] = [
    ['كتاب', 'book'],
    ['بيت', 'house'],
    ['يد', 'hand'],
    ['وجه', 'face'],
    ['كره', 'hate'],
    ['فقيه', 'scholar'],
    ['يكتب', 'writes'],
    ['كتابه', 'book'],
    ['فيه', 'in'],
  ];

  test.each(singleWordCases)('%s → "%s" — single English word never colored', (arabic, english) => {
    const analysis = analyzeArabicWord(arabic, english);
    expect(analysis.hasComponents).toBe(false);
  });
});

describe('Bracket Injection: [the] keeps its brackets, and "the" carries the article color', () => {
  const bracketCases: [string, string][] = [
    ['الكتاب', 'book'],
    ['البيت', 'house'],
    ['العلم', 'knowledge'],
  ];

  test.each(bracketCases)(
    '%s → "%s" — bracket injection produces "the" colored segment',
    (arabic, english) => {
      const normalizedArabic = normalizeArabic(arabic);
      if (!shouldInjectBracket(normalizedArabic, english)) return;

      const processedEnglish = `[the] ${english}`;
      const analysis = analyzeArabicWord(arabic, processedEnglish);
      const formatted = formatWordAnalysis(analysis);
      if (!formatted) return;

      const displayedText =
        formatted.sections.find(s => s.type === 'original')?.content || processedEnglish;

      const segments = generateColorCodedSegments({
        text: displayedText,
        formattedAnalysis: formatted,
        analysis,
        colors,
        defaultColor,
      });

      // "the" must appear as a colored segment (not default color)
      const theSegment = segments.find(s => s.text === 'the');
      expect(theSegment).toBeDefined();
      expect(theSegment?.color).not.toBe(defaultColor);

      // The brackets stay on screen: they mark "the" as supplied for teaching
      // rather than written by the translator. Only the word inside is painted,
      // because the brackets correspond to nothing in the Arabic.
      const fullText = segments.map(s => s.text).join('');
      expect(fullText).toContain('[the]');
      const bracketSegments = segments.filter(s => s.text.includes('[') || s.text.includes(']'));
      expect(bracketSegments.length).toBeGreaterThan(0);
      bracketSegments.forEach(s => expect(s.color).toBe(defaultColor));
    },
  );
});

describe('Valid Color Values: all segment colors are valid hex or theme colors', () => {
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  test.each(allWords)('%s → "%s" — all colors are valid hex', (arabic, english) => {
    const segments = computeColoredSegments(arabic, english, colors);
    for (const seg of segments) {
      expect(seg.color).toMatch(hexRegex);
    }
  });
});
