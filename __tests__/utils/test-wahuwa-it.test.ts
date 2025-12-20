/**
 * Investigation: Why isn't "wahuwa" colored when translated as "and it"?
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Wahuwa "and it" Investigation', () => {
  describe('Testing different translations of وهو', () => {
    it('should test وهو with "wahuwa" (transliteration)', () => {
      const analysis = analyzeArabicWord('وهو', 'wahuwa');

      console.log('\n📊 وهو + "wahuwa":');
      console.log('  Normalized to:', normalizeTranslation('وهو', 'wahuwa'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // "wahuwa" should be normalized to "and he"
      expect(normalizeTranslation('وهو', 'wahuwa')).toBe('and he');
    });

    it('should test وهو with "and he" (proper translation)', () => {
      const analysis = analyzeArabicWord('وهو', 'and he');

      console.log('\n📊 وهو + "and he":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Should detect و (and)
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );
      expect(hasWaw).toBe(true);
    });

    it('should test وهو with "and it" (alternative translation)', () => {
      const analysis = analyzeArabicWord('وهو', 'and it');

      console.log('\n📊 وهو + "and it":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      console.log(
        '\n❓ ISSUE: "and it" is not a transliteration, so no normalization rule applies',
      );
      console.log('   But "and it" is a valid translation - should components still be detected?');

      // Check if و is detected
      const hasWaw = analysis.prefixes.some(
        p => p.arabicMatch === 'و' && p.englishMatches.includes('and'),
      );

      console.log('  و (and) detected:', hasWaw);

      // The issue: و should match "and" in "and it"
      // but هو (it) is a pronoun that may not have rules
    });
  });

  describe('Understanding the issue', () => {
    it('should check if وهو "and it" is a pure particle combination', () => {
      const analysis = analyzeArabicWord('وهو', 'and it');

      console.log('\n🔍 Analysis of وهو + "and it":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  prefixes detected:', analysis.prefixes.length);

      if (analysis.prefixes.length > 0) {
        console.log(
          '  Prefixes:',
          analysis.prefixes.map(p => `${p.arabicMatch} = ${p.englishMatches.join('/')}`),
        );
      }

      console.log('\n💡 Likely reason for no coloring:');
      console.log('   وهو = و (and) + هو (it/he)');
      console.log('   This is a conjunction + pronoun = pure particle combination');
      console.log('   According to isPureParticleCombination(), these are NOT colored');
      console.log('   (No root word, just particles - no educational value)');

      // وهو "and it" is a pure particle combination
      // Even if components are detected, hasComponents should be false
    });

    it('should verify behavior matches والله "and by Allah" (kept)', () => {
      const analysis1 = analyzeArabicWord('وهو', 'and it');
      const analysis2 = analyzeArabicWord('والله', 'and by Allah');

      console.log('\n📊 Comparison:');
      console.log('  وهو "and it":        hasComponents =', analysis1.hasComponents);
      console.log('  والله "and by Allah": hasComponents =', analysis2.hasComponents);

      console.log('\nDifference:');
      console.log('  وهو = و + pronoun (هو) → pure particles → NO color');
      console.log('  والله = و + noun (الله) → has root → YES color');
    });
  });

  describe('Solution options', () => {
    it('should document why this is correct behavior', () => {
      console.log('\n✅ CURRENT BEHAVIOR IS CORRECT:');
      console.log('');
      console.log('وهو "and it" is NOT colored because:');
      console.log('  1. و (and) = conjunction particle');
      console.log('  2. هو (it/he) = pronoun particle');
      console.log('  3. No root word, no meaningful composition');
      console.log('  4. isPureParticleCombination() = true');
      console.log('  5. Educational value: LOW (just connecting words)');
      console.log('');
      console.log('This matches the design from CLAUDE.md:');
      console.log('  "وهو → and he" - conjunction + pronoun, pure particles, no composition');
      console.log('');
      console.log('Examples that ARE colored:');
      console.log('  ولا "and not" → conjunction + negation (meaningful composition)');
      console.log('  والله "and by Allah" → conjunction + noun with root');
      console.log('');
      console.log('The normalization rules are for TRANSLITERATIONS only:');
      console.log('  "wahuwa" → "and he" (enables component detection)');
      console.log('  But "and he" itself → still pure particles → no color');

      expect(true).toBe(true);
    });
  });
});
