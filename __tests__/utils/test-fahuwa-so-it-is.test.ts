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
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Our rule normalizes this to "so he"
      expect(normalizeTranslation('فهو', 'fahuwa')).toBe('so he');
    });

    it('should test فهو with "so he" (2 words)', () => {
      const analysis = analyzeArabicWord('فهو', 'so he');

      console.log('\n📊 فهو + "so he":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      // Check what happened
      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      console.log('  ف (so) detected:', hasFa);
      console.log('  Reason if not colored: Pure particle combination (conjunction + pronoun)');
    });

    it('should test فهو with "so it" (2 words, different pronoun)', () => {
      const analysis = analyzeArabicWord('فهو', 'so it');

      console.log('\n📊 فهو + "so it":');
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
      );

      console.log('  ف (so) detected:', hasFa);
    });

    it('should test فهو with "so it is" (3 words - THE PROBLEM)', () => {
      const analysis = analyzeArabicWord('فهو', 'so it is');

      console.log('\n📊 فهو + "so it is":');
      console.log('  Normalization check:', normalizeTranslation('فهو', 'so it is'));
      console.log('  hasComponents:', analysis.hasComponents);
      console.log(
        '  prefixes:',
        analysis.prefixes.map(p => `${p.arabicMatch} (${p.englishMatches.join('/')})`).join(', '),
      );

      const hasFa = analysis.prefixes.some(
        p => p.arabicMatch === 'ف' && p.englishMatches.includes('so'),
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

    it('should understand that pure particle combinations ARE NOW colored', () => {
      const analysis = analyzeArabicWord('فهو', 'so it is');

      console.log('\n💡 CURRENT BEHAVIOR (UPDATED):');
      console.log('  فهو = ف (conjunction) + هو (pronoun)');
      console.log('  This is a PURE PARTICLE COMBINATION');
      console.log('  (No root word, just grammatical particles)');
      console.log('');
      console.log('  According to isPureParticleCombination():');
      console.log('  - This filter is now DISABLED (always returns false)');
      console.log('  - Pure particle combinations ARE colored');
      console.log('  - If there are 2 parts, we show them with colors');
      console.log('');
      console.log('  Educational rationale for NEW behavior:');
      console.log('  - فهو shows composition: ف + هو');
      console.log('  - Composition itself is educational');
      console.log('  - Shows how Arabic words are built from parts');
      console.log('  - Examples: وهو "and he", فهو "so it", ولا "and not"');

      // This is the NEW expected behavior (hasComponents should be TRUE)
      expect(analysis.hasComponents).toBe(true);
    });
  });

  describe('Solution: Pure particle filter has been disabled', () => {
    it('should verify that compositions are now colored', () => {
      console.log('\n✅ SOLUTION IMPLEMENTED:');
      console.log('');
      console.log('The isPureParticleCombination filter has been DISABLED');
      console.log('');
      console.log('New behavior:');
      console.log('  فهو "so it is" → COLORED (shows ف + هو composition)');
      console.log('  وهو "and he" → COLORED (shows و + هو composition)');
      console.log('  ولا "and not" → COLORED (shows و + لا composition)');
      console.log('');
      console.log('Core principle:');
      console.log('  If there are 2 Arabic parts, show them with colors');
      console.log('  The composition itself is educational');
      console.log('');
      console.log('Rationale:');
      console.log('  - Shows how Arabic builds words from components');
      console.log('  - Even "particle + particle" is a valuable pattern');
      console.log('  - Consistent with educational goal of showing composition');

      // Verify the fix works for various examples
      const examples = [
        { arabic: 'فهو', english: 'so it is' },
        { arabic: 'وهو', english: 'and he' },
        { arabic: 'ولا', english: 'and not' },
      ];

      examples.forEach(({ arabic, english }) => {
        const analysis = analyzeArabicWord(arabic, english);
        expect(analysis.hasComponents).toBe(true);
      });
    });
  });
});
