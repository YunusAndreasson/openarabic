/**
 * Investigation: Why isn't "fahuwa" colored when translated as "so it is"?
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';
import { normalizeTranslation } from '@/utils/arabicAnalysis/translationNormalization';

describe('Fahuwa "so it is" Investigation', () => {
  describe('Different translations of فهو', () => {
    it('should test فهو with "fahuwa" (transliteration)', () => {
      const analysis = analyzeArabicWord('فهو', 'fahuwa');

      console.log('\n📊 فهو + "fahuwa":');
      console.log('  Normalized to:', normalizeTranslation('فهو', 'fahuwa'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      // Our rule normalizes this to "so he"
      expect(normalizeTranslation('فهو', 'fahuwa')).toBe('so he');
    });

    it('should test فهو with "so he" (2 words)', () => {
      const analysis = analyzeArabicWord('فهو', 'so he');

      console.log('\n📊 فهو + "so he":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      // Check what happened
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so')
      );

      console.log('  ف (so) detected:', hasFa);
      console.log('  Reason if not colored: Pure particle combination (conjunction + pronoun)');
    });

    it('should test فهو with "so it" (2 words, different pronoun)', () => {
      const analysis = analyzeArabicWord('فهو', 'so it');

      console.log('\n📊 فهو + "so it":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so')
      );

      console.log('  ف (so) detected:', hasFa);
    });

    it('should test فهو with "so it is" (3 words - THE PROBLEM)', () => {
      const analysis = analyzeArabicWord('فهو', 'so it is');

      console.log('\n📊 فهو + "so it is":');
      console.log('  Normalization check:', normalizeTranslation('فهو', 'so it is'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log('  prefixes:', analysis.prefixes.map(p =>
        `${p.arabicMatch} (${p.englishMatches.join('/')})`
      ).join(', '));

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so')
      );

      console.log('  ف (so) detected:', hasFa);

      console.log('\n❓ ISSUE:');
      console.log('  "so it is" is NOT a transliteration');
      console.log('  So no normalization rule applies');
      console.log('  But "so it is" is a proper translation');
      console.log('  The analysis should still work...');
      console.log('');
      console.log('  فهو = ف (so) + هو (it/he)');
      console.log('  "so it is" = "so" + "it" + "is"');
      console.log('  ف should match "so" ✓');
      console.log('  هو should match "it" ✓');
      console.log('  "is" is extra context that doesn\'t affect Arabic components');
    });
  });

  describe('Understanding the root cause', () => {
    it('should check if ف matches "so" in "so it is"', () => {
      const analysis = analyzeArabicWord('فهو', 'so it is');

      console.log('\n🔍 Deep dive into component detection:');
      console.log('  Total prefixes detected:', analysis.prefixes.length);

      if (analysis.prefixes.length > 0) {
        analysis.prefixes.forEach((p, i) => {
          console.log(`  Prefix ${i + 1}: ${p.arabicMatch} → ${p.englishMatches.join('/')}`);
          console.log(`           Role: ${p.role}`);
        });
      } else {
        console.log('  ❌ NO prefixes detected!');
        console.log('  This means component detection failed completely');
      }

      console.log('\n  Original:', analysis.original);
      console.log('  Remaining Arabic:', analysis.remainingArabic);
      console.log('  Remaining English:', analysis.remainingEnglish);
    });

    it('should understand why pure particle combinations are not colored', () => {
      const analysis = analyzeArabicWord('فهو', 'so it is');

      console.log('\n💡 REASON:');
      console.log('  فهو = ف (conjunction) + هو (pronoun)');
      console.log('  This is a PURE PARTICLE COMBINATION');
      console.log('  (No root word, just grammatical particles)');
      console.log('');
      console.log('  According to isPureParticleCombination():');
      console.log('  - Checks if we have 1 prefix + standalone pronoun');
      console.log('  - Checks if prefix is a conjunction/particle');
      console.log('  - If yes: hasComponents = false (no coloring)');
      console.log('');
      console.log('  Educational rationale:');
      console.log('  - فهو has no root word to learn');
      console.log('  - It\'s just ف + هو (so + he/it)');
      console.log('  - No compositional educational value');
      console.log('  - Same as English "and he" - just connecting words');

      // This is the expected behavior
      expect(analysis.hasComponents).toBe(false);
    });
  });

  describe('Solution: Add normalization for "so it is" variant?', () => {
    it('should consider if we need to normalize "so it is"', () => {
      console.log('\n🤔 SHOULD WE ADD NORMALIZATION FOR "so it is"?');
      console.log('');
      console.log('Option 1: Add normalization rule');
      console.log('  فهو: "so it is" → "so he"');
      console.log('  Pro: Enables component detection');
      console.log('  Con: Changes meaning (loses "is")');
      console.log('  Con: Still filtered by isPureParticleCombination');
      console.log('');
      console.log('Option 2: Keep current behavior');
      console.log('  فهو "so it is" → not colored');
      console.log('  Pro: Correct educational filtering (no root word)');
      console.log('  Pro: Consistent with design (pure particles not colored)');
      console.log('  Con: User might expect it to be colored');
      console.log('');
      console.log('❓ QUESTION FOR USER:');
      console.log('  Do you want فهو "so it is" to be colored?');
      console.log('  Or is the current behavior (not colored) acceptable?');
      console.log('');
      console.log('  Note: Even if we detect components, it will be filtered');
      console.log('  because فهو = conjunction + pronoun = pure particles');

      expect(true).toBe(true);
    });
  });
});
