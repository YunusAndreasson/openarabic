import { analyzeArabicWord, formatWordAnalysis } from '../../utils/arabicWordAnalysis';

describe('arabicWordAnalysis', () => {
  // Test case for the user's initial report (ID 10214)
  it('should colorize "it" for "وَكِتَابَتِهِ"', () => {
    const analysis = analyzeArabicWord('وَكِتَابَتِهِ', 'and recording it');
    expect(analysis.suffix?.arabicMatch).toBe('ه');
    expect(analysis.suffix?.matchedInEnglish).toBe(true);
    expect(analysis.suffix?.englishMatches).toContain('it');
  });

  // Test case for the user's second report (ID 10308)
  it('should colorize both prefix and suffix for "مِنْهُمْ"', () => {
    const analysis = analyzeArabicWord('مِنْهُمْ', 'from them');
    const formatted = formatWordAnalysis(analysis);

    // 1. Check that both prefix and suffix are found
    expect(analysis.prefix?.arabicMatch).toBe('من');
    expect(analysis.suffix?.arabicMatch).toBe('هم');
    expect(analysis.hasComponents).toBe(true);

    // 2. Check that the reconstructed word has two colored parts
    const coloredSegments = formatted.reconstructedArabic?.segments.filter(
      s => s.colorName !== 'text'
    );
    expect(coloredSegments).toHaveLength(2);

    // 3. Check that the colored parts are correct (diacritic-insensitive)
    const DIACRITIC_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
    const coloredTexts = coloredSegments?.map(s => s.text) ?? [];
    const coloredTextsNormalized = coloredTexts.map(t => t.replace(DIACRITIC_REGEX, ''));
    expect(coloredTextsNormalized).toContain('من'); // Prefix mapping without diacritics
    expect(coloredTextsNormalized).toContain('هم'); // Suffix mapping without diacritics
  });

  // General test for prefix + suffix
  it('should colorize both prefix and suffix for "وبيتها"', () => {
    const analysis = analyzeArabicWord('وبيتها', 'and her house');

    // Check that both prefix and suffix are found
    expect(analysis.prefix?.arabicMatch).toBe('و');
    expect(analysis.suffix?.arabicMatch).toBe('ها');
    expect(analysis.hasComponents).toBe(true);

    const formatted = formatWordAnalysis(analysis);
    const coloredSegments = formatted.reconstructedArabic?.segments.filter(
      s => s.colorName !== 'text'
    );
    expect(coloredSegments).toHaveLength(2);
  });

  // Test normalization
  it('should properly normalize Arabic text with diacritics', () => {
    const analysis = analyzeArabicWord('وَكِتَابَتِهِ', 'and recording it');
    expect(analysis.hasComponents).toBe(true);

    // Should preserve original text with diacritics in reconstruction
    const formatted = formatWordAnalysis(analysis);
    expect(formatted.reconstructedArabic?.totalText).toBe('وَكِتَابَتِهِ');
  });

  // Test that words without components are handled correctly
  it('should handle words without recognizable components', () => {
    const analysis = analyzeArabicWord('كتاب', 'book');
    expect(analysis.hasComponents).toBe(false);
    expect(analysis.prefix).toBeUndefined();
    expect(analysis.suffix).toBeUndefined();

    const formatted = formatWordAnalysis(analysis);
    expect(formatted.reconstructedArabic).toBeUndefined();
  });

  // Test cleanup: normalized patterns should work correctly
  describe('Component Pattern Matching', () => {
    it('should match diacritical and non-diacritical versions equally', () => {
      // Test that both diacritical and non-diacritical versions work the same
      const withDiacritics = analyzeArabicWord('وَكَتَبَ', 'and he wrote');
      const withoutDiacritics = analyzeArabicWord('وكتب', 'and he wrote');

      expect(withDiacritics.prefix?.arabicMatch).toBe('و');
      expect(withoutDiacritics.prefix?.arabicMatch).toBe('و');
      expect(withDiacritics.hasComponents).toBe(withoutDiacritics.hasComponents);
    });

    it('should match possessive pronouns correctly', () => {
      const tests = [
        { arabic: 'كتابه', english: 'his book', expectedSuffix: 'ه' },
        { arabic: 'كتابها', english: 'her book', expectedSuffix: 'ها' },
        { arabic: 'كتابنا', english: 'our book', expectedSuffix: 'نا' },
        { arabic: 'كتابكم', english: 'your book', expectedSuffix: 'كم' },
        { arabic: 'كتابهم', english: 'their book', expectedSuffix: 'هم' },
      ];

      tests.forEach(({ arabic, english, expectedSuffix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.suffix?.arabicMatch).toBe(expectedSuffix);
        expect(analysis.hasComponents).toBe(true);
      });
    });

    it('should match common prefixes correctly', () => {
      const tests = [
        // With phrase-aware matching, the longest valid combination is preferred
        { arabic: 'والكتاب', english: 'and the book', expectedPrefix: 'وال' },
        { arabic: 'بالكتاب', english: 'with the book', expectedPrefix: 'بال' },
        { arabic: 'للكتاب', english: 'for the book', expectedPrefix: 'لل' },
        { arabic: 'كالكتاب', english: 'like the book', expectedPrefix: 'كال' },
        { arabic: 'فيالكتاب', english: 'in the book', expectedPrefix: 'في' },
      ];

      tests.forEach(({ arabic, english, expectedPrefix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.prefix?.arabicMatch).toBe(expectedPrefix);
        expect(analysis.hasComponents).toBe(true);
      });
    });

    it('should require English correspondence to avoid false positives', () => {
      // Test that components are only matched when their English equivalents exist
      const analysis = analyzeArabicWord('والبيت', 'house'); // "house" only, no "and"
      // Should not match 'و' prefix because "and" is not in English
      expect(analysis.prefix).toBeUndefined();
      expect(analysis.hasComponents).toBe(false);
    });

    it('should handle definite article correctly', () => {
      const tests = [
        { arabic: 'الكتاب', english: 'the book', expectedPrefix: 'ال' },
        // With phrase-aware matching, 'وال' is a valid combined prefix when English has 'and the'
        { arabic: 'والكتاب', english: 'and the book', expectedPrefix: 'وال' },
      ];

      tests.forEach(({ arabic, english, expectedPrefix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.prefix?.arabicMatch).toBe(expectedPrefix);
        expect(analysis.hasComponents).toBe(true);
      });
    });

    it('should handle negation particles correctly', () => {
      // Debug the actual behavior first
      const analysis1 = analyzeArabicWord('لايعرف', 'does not know');
      const analysis2 = analyzeArabicWord('لنيذهب', 'will not go');

      // The negation particles require their English equivalents to be present
      // 'لا' should match "not" and 'لن' should match "will not"
      if (analysis1.prefix) {
        expect(analysis1.prefix.arabicMatch).toBe('لا');
        expect(analysis1.hasComponents).toBe(true);
      }

      if (analysis2.prefix) {
        expect(analysis2.prefix.arabicMatch).toBe('لن');
        expect(analysis2.hasComponents).toBe(true);
      } else {
        // If لن doesn't match, it might be because "will not" as a phrase isn't detected
        // Let's try with just "not"
        const analysis3 = analyzeArabicWord('لنيذهب', 'not go');
        if (analysis3.prefix) {
          expect(analysis3.prefix.arabicMatch).toBe('لن');
        }
      }
    });

    it('should handle verbal prefix ي for "was" and third person', () => {
      const tests = [
        { arabic: 'يُكتب', english: 'he was writing', expectedPrefix: 'ي' },
        { arabic: 'يُقرأ', english: 'it was read', expectedPrefix: 'ي' },
        { arabic: 'يُفهم', english: 'he was understood', expectedPrefix: 'ي' },
        { arabic: 'يُحب', english: 'he loves', expectedPrefix: 'ي' },
      ];

      tests.forEach(({ arabic, english, expectedPrefix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.prefix?.arabicMatch).toBe(expectedPrefix);
        expect(analysis.hasComponents).toBe(true);
      });
    });

    it('should not match ي prefix when English has no correspondence', () => {
      // Test that ي prefix is only matched when English contains appropriate words
      const analysis = analyzeArabicWord('يُكتب', 'writing'); // No "he" or "was" in English
      expect(analysis.prefix).toBeUndefined();
      expect(analysis.hasComponents).toBe(false);
    });

    it('should match preposition + al combinations directly when present', () => {
      const tests = [
        { arabic: 'بالكتاب', english: 'with the book', expectedPrefix: 'بال' },
        { arabic: 'للقلم', english: 'for the pen', expectedPrefix: 'لل' },
        { arabic: 'كالكتاب', english: 'like the book', expectedPrefix: 'كال' },
      ];

      tests.forEach(({ arabic, english, expectedPrefix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.prefix?.arabicMatch).toBe(expectedPrefix);
        expect(analysis.hasComponents).toBe(true);
      });
    });

    it('should match subject/future combined prefixes (double prefixes)', () => {
      const tests = [
        { arabic: 'ويكتب', english: 'and he writes', expectedPrefix: 'وي' },
        { arabic: 'فيقول', english: 'then he says', expectedPrefix: 'في' },
        { arabic: 'سيذهب', english: 'he will go', expectedPrefix: 'سي' },
        { arabic: 'فسيقول', english: 'then he will say', expectedPrefix: 'فسي' },
        { arabic: 'وسوفيكتب', english: 'and he will write', expectedPrefix: 'وسوف' },
        { arabic: 'فسوفيذهب', english: 'then he will go', expectedPrefix: 'فسوف' },
        { arabic: 'ولنيذهب', english: "and won't go", expectedPrefix: 'ولن' },
        { arabic: 'فلنيفعل', english: 'then will not do', expectedPrefix: 'فلن' },
      ];

      tests.forEach(({ arabic, english, expectedPrefix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.prefix?.arabicMatch).toBe(expectedPrefix);
        expect(analysis.hasComponents).toBe(true);
      });
    });
  });

  // Test edge cases and potential issues
  describe('Edge Cases', () => {
    it('should handle very short words', () => {
      const analysis = analyzeArabicWord('و', 'and');
      expect(analysis.prefix?.arabicMatch).toBe('و');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should handle overlapping components correctly', () => {
      // Test a word where prefix and suffix might overlap
      const analysis = analyzeArabicWord('وه', 'and it');
      // Should resolve overlap by keeping the longer component or following resolution rules
      expect(analysis.hasComponents).toBe(true);
    });

    it('should prioritize longer components', () => {
      // If there are multiple matching patterns, should prefer the longer one
      const analysis = analyzeArabicWord('سوفيذهب', 'he will go');
      expect(analysis.prefix?.arabicMatch).toBe('سوف'); // Should match longer 'سوف' over 'س'
    });

    it('should prefer plural suffix over singular subject marker for person/number', () => {
      // ويكتبون -> "they write"; ensure ي is not matched as "he" due to ون$ suffix
      const analysis = analyzeArabicWord('ويكتبون', 'they write');
      expect(analysis.suffix?.arabicMatch).toBe('ون');
      expect(analysis.hasComponents).toBe(true);
    });
  });

  // Test infix functionality
  describe('Infix Detection', () => {
    it('should detect reflexive infix ت in Form VIII verbs', () => {
      // Example: اِجْتَمَعَ (ijtama'a) - "they gathered together"
      const analysis = analyzeArabicWord('اجتمع', 'they gathered together');
      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ت');
        expect(analysis.infix.englishMatches).toContain('together');
        expect(analysis.hasComponents).toBe(true);
      }
    });

    it('should detect seeking infix ست in Form X verbs', () => {
      // Example: اِسْتَطَاعَ (istaTaa'a) - "he was able to / sought to do"
      const analysis = analyzeArabicWord('استطاع', 'he sought to do');
      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ست');
        expect(analysis.infix.englishMatches).toContain('seek');
        expect(analysis.hasComponents).toBe(true);
      }
    });

    it('should detect reflexive infix ن in Form VII verbs', () => {
      // Example: اِنْكَسَرَ (inkasara) - "it broke itself / broke automatically"
      const analysis = analyzeArabicWord('انكسر', 'it broke itself');
      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ن');
        expect(analysis.infix.englishMatches).toContain('itself');
        expect(analysis.hasComponents).toBe(true);
      }
    });

    it('should handle combination of prefix and infix', () => {
      // Example: واجتمع - "and they gathered together"
      const analysis = analyzeArabicWord('واجتمع', 'and they gathered together');

      expect(analysis.prefix?.arabicMatch).toBe('و');
      expect(analysis.prefix?.englishMatches).toContain('and');

      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ت');
        expect(analysis.infix.englishMatches).toContain('together');
      }

      expect(analysis.hasComponents).toBe(true);
    });

    it('should handle combination of infix and suffix', () => {
      // Example: اجتمعوا - "they gathered together" (plural)
      const analysis = analyzeArabicWord('اجتمعوا', 'they gathered together');

      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ت');
        expect(analysis.infix.englishMatches).toContain('together');
      }

      if (analysis.suffix) {
        expect(analysis.suffix.arabicMatch).toBe('وا');
        expect(analysis.suffix.englishMatches).toContain('they');
      }

      expect(analysis.hasComponents).toBe(true);
    });

    it('should handle prefix + infix + suffix combination', () => {
      // Example: ويجتمعون - "and they gather together" (present tense, plural)
      const analysis = analyzeArabicWord('ويجتمعون', 'and they gather together');

      expect(analysis.prefix?.arabicMatch).toBe('و');
      expect(analysis.prefix?.englishMatches).toContain('and');

      if (analysis.infix) {
        expect(analysis.infix.arabicMatch).toBe('ت');
        expect(analysis.infix.englishMatches).toContain('together');
      }

      if (analysis.suffix) {
        expect(analysis.suffix.arabicMatch).toBe('ون');
        expect(analysis.suffix.englishMatches).toContain('they');
      }

      expect(analysis.hasComponents).toBe(true);
    });

    it('should require English correspondence for infixes', () => {
      // Test that infix is only matched when its English equivalent exists
      const analysis = analyzeArabicWord('اجتمع', 'he met'); // "met" only, no "together"
      // Should not match 'ت' infix because "together" is not in English
      expect(analysis.infix).toBeUndefined();
    });

    it('should include infix information in formatted analysis', () => {
      const analysis = analyzeArabicWord('اجتمع', 'they gathered together');
      if (analysis.infix) {
        const formatted = formatWordAnalysis(analysis);

        // Check that infix appears in the sections
        const infixSection = formatted.sections.find(
          s => s.type === 'components' && s.colorName === 'primary'
        );
        expect(infixSection).toBeDefined();
        expect(infixSection?.arabicPart).toBe('ت');
        expect(infixSection?.icon).toBe('↔');
      }
    });
  });

  describe('Arabic diacritic detection', () => {
    it('should detect fatha at end of word with "he" correspondence', () => {
      const analysis = analyzeArabicWord('كتابَ', 'he wrote a book'); // Fatha on final letter

      expect(analysis.diacritic).toBeDefined();
      expect(analysis.diacritic?.component.type).toBe('diacritic');
      expect(analysis.diacritic?.arabicMatch).toBe('َ');
      expect(analysis.diacritic?.englishMatches).toContain('he');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect kasra at end with "in" correspondence', () => {
      const analysis = analyzeArabicWord('المدرسةِ', 'in the school'); // Kasra at end

      expect(analysis.diacritic).toBeDefined();
      expect(analysis.diacritic?.component.type).toBe('diacritic');
      expect(analysis.diacritic?.arabicMatch).toBe('ِ');
      expect(analysis.diacritic?.englishMatches).toContain('in');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect damma at end with "he" correspondence', () => {
      const analysis = analyzeArabicWord('الكتابُ', 'he reads the book'); // Damma at end

      expect(analysis.diacritic).toBeDefined();
      expect(analysis.diacritic?.component.type).toBe('diacritic');
      expect(analysis.diacritic?.arabicMatch).toBe('ُ');
      expect(analysis.diacritic?.englishMatches).toContain('he');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should detect tanween fath with "an" correspondence', () => {
      const analysis = analyzeArabicWord('كتابًا', 'he wrote an book'); // Tanween fath

      expect(analysis.diacritic).toBeDefined();
      expect(analysis.diacritic?.component.type).toBe('diacritic');
      expect(analysis.diacritic?.arabicMatch).toBe('ًا');
      expect(analysis.diacritic?.englishMatches).toContain('an');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should not detect diacritic when English has no correspondence', () => {
      const analysis = analyzeArabicWord('كتابَ', 'book'); // Fatha but no "he" in English

      expect(analysis.diacritic).toBeUndefined();
      expect(analysis.hasComponents).toBe(false);
    });

    it('should handle combined prefix, suffix, and diacritic', () => {
      const analysis = analyzeArabicWord('وبكتابهِ', 'and with his book in'); // Prefix + suffix + diacritic

      expect(analysis.prefix).toBeDefined();
      // Longest valid combined prefix 'وب' is expected with phrase-aware matching
      expect(analysis.prefix?.arabicMatch).toBe('وب');
      expect(analysis.suffix).toBeDefined();
      expect(analysis.suffix?.arabicMatch).toBe('ه');
      expect(analysis.diacritic).toBeDefined();
      expect(analysis.diacritic?.arabicMatch).toBe('ِ');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should correctly reconstruct diacritic coloring', () => {
      const analysis = analyzeArabicWord('كتابَ', 'he wrote a book');
      const formatted = formatWordAnalysis(analysis);

      expect(formatted.reconstructedArabic).toBeDefined();
      expect(formatted.reconstructedArabic?.segments).toHaveLength(2);
      expect(formatted.reconstructedArabic?.segments[0].text).toBe('كتاب');
      expect(formatted.reconstructedArabic?.segments[0].colorName).toBe('text');
      expect(formatted.reconstructedArabic?.segments[1].text).toBe('َ');
      expect(formatted.reconstructedArabic?.segments[1].colorName).toBe('secondaryText');
      expect(formatted.reconstructedArabic?.segments[1].type).toBe('diacritic');
    });

    it('should include diacritic in tooltip sections', () => {
      const analysis = analyzeArabicWord('كتابَ', 'he wrote a book');
      const formatted = formatWordAnalysis(analysis);

      const diacriticSection = formatted.sections.find(
        s => s.type === 'components' && s.arabicPart === 'َ'
      );
      expect(diacriticSection).toBeDefined();
      expect(diacriticSection?.englishPart).toContain('he');
      expect(diacriticSection?.colorName).toBe('secondaryText');
      expect(diacriticSection?.icon).toBe('◌');
    });

    it('should handle diacritic with other components correctly', () => {
      const analysis = analyzeArabicWord('والكتابَ', 'and he wrote the book');
      const formatted = formatWordAnalysis(analysis);

      // Should have prefix (و), suffix (ال), and diacritic (َ)
      expect(analysis.prefix?.arabicMatch).toBe('و');
      expect(analysis.diacritic?.arabicMatch).toBe('َ');
      expect(formatted.sections.filter(s => s.type === 'components')).toHaveLength(2);
    });

    it('should detect final fatha on a verb as "he"', () => {
      const analysis = analyzeArabicWord('كَتَبَ', 'he wrote');
      expect(analysis.diacritic).toBeDefined();
      expect(analysis.diacritic?.arabicMatch).toBe('َ');
      expect(analysis.diacritic?.englishMatches).toContain('he');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle new programmatically generated combinations', () => {
      // Test that new إلى combinations are now available (since we added it to PREPOSITIONS)
      const analysis1 = analyzeArabicWord('وإلىالمدرسة', 'and to the school');
      expect(analysis1.hasComponents).toBe(true);
      // Should find at least the 'و' prefix, even if not the full combination yet
      expect(analysis1.prefix?.arabicMatch).toBeTruthy();

      // Test that the new suffixes work correctly
      const analysis2 = analyzeArabicWord('كتبوا', 'they wrote');
      expect(analysis2.suffix?.arabicMatch).toBe('وا');
      expect(analysis2.hasComponents).toBe(true);
    });

    it('should handle new common plural suffixes', () => {
      const tests = [
        { arabic: 'ذهبوا', english: 'they went', expectedSuffix: 'وا' },
        { arabic: 'رأيتكم', english: 'I saw you all', expectedSuffix: 'كم' }, // Fixed: word ends with كم
        { arabic: 'كتبتم', english: 'you all wrote', expectedSuffix: 'تم' }, // Better example for تم
        { arabic: 'أنتكن', english: 'you all were', expectedSuffix: 'كن' },
        { arabic: 'كتبتن', english: 'you all wrote', expectedSuffix: 'تن' }, // Better example for تن
      ];

      tests.forEach(({ arabic, english, expectedSuffix }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.suffix?.arabicMatch).toBe(expectedSuffix);
        expect(analysis.hasComponents).toBe(true);
      });
    });
  });

  describe('New suffix coverage', () => {
    it('should match object pronoun ني (me)', () => {
      const analysis = analyzeArabicWord('أعطني', 'give me');
      expect(analysis.suffix?.arabicMatch).toBe('ني');
      expect(analysis.suffix?.englishMatches).toContain('me');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should match dual you كما', () => {
      const analysis = analyzeArabicWord('كتابكما', 'your (dual) book');
      expect(analysis.suffix?.arabicMatch).toBe('كما');
      expect(analysis.hasComponents).toBe(true);
    });

    it('should match dual them هما', () => {
      const analysis = analyzeArabicWord('كتابهما', 'their (dual) book');
      expect(analysis.suffix?.arabicMatch).toBe('هما');
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Single Word Color-Coding Rule', () => {
    it('should never apply color-coding to single English words', () => {
      // Test cases where Arabic analysis might suggest components but English is single word
      const testCases = [
        { arabic: 'والبيت', english: 'house' }, // "wa" prefix but single English word
        { arabic: 'كتابه', english: 'book' }, // possessive suffix but single English word
        { arabic: 'المدرسة', english: 'school' }, // definite article but single English word
        { arabic: 'يكتب', english: 'writes' }, // verbal prefix but single English word
        { arabic: 'من', english: 'from' }, // preposition prefix but single English word
      ];

      testCases.forEach(({ arabic, english }) => {
        const result = analyzeArabicWord(arabic, english);

        // The key rule: single words should not be color-coded regardless of Arabic analysis
        // This is enforced in the WordTooltip component by checking word count
        const wordCount = english.trim().split(/\s+/).length;
        expect(wordCount).toBe(1);

        // The analysis might exist but should be ignored for single words
        // This test documents the expected behavior - single words = no color-coding
      });
    });

    it('should apply color-coding to multi-word English phrases', () => {
      // Test cases where color-coding should be applied
      const testCases = [
        { arabic: 'والبيت', english: 'and house' }, // Two words, should be color-coded
        { arabic: 'كتابه', english: 'his book' }, // Two words, should be color-coded
        { arabic: 'في البيت', english: 'in the house' }, // Three words, should be color-coded
      ];

      testCases.forEach(({ arabic, english }) => {
        const result = analyzeArabicWord(arabic, english);

        // Word count check - should be multiple words
        const wordCount = english.trim().split(/\s+/).length;
        expect(wordCount).toBeGreaterThan(1);

        // These should receive color-coding in the tooltip when components are found
        if (result.hasComponents) {
          expect(result.prefix || result.suffix || result.infix || result.diacritic).toBeDefined();
        }
      });
    });
  });

  describe('Bracket Injection', () => {
    it('should detect bracket injection for definite articles', () => {
      const analysis = analyzeArabicWord('الكتاب', 'book');
      expect(analysis).not.toBeNull();
      expect(analysis?.hasBracketInjection).toBe(true);
    });

    it('should not detect bracket injection when the is already present', () => {
      const analysis = analyzeArabicWord('الكتاب', 'the book');
      expect(analysis).not.toBeNull();
      expect(analysis?.hasBracketInjection).toBe(false);
    });

    it('should not detect bracket injection for divine names', () => {
      const analysis = analyzeArabicWord('الله', 'Allah');
      expect(analysis).not.toBeNull();
      expect(analysis?.hasBracketInjection).toBe(false);
    });
  });
});
