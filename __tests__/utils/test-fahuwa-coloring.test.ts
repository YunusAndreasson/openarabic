/**
 * Investigation: Why isn't "huwa" colored in "fahuwa"?
 */

import { analyzeArabicWord, computeColoredSegments } from '@/utils/arabicWordAnalysis';

describe('Fahuwa Coloring Investigation', () => {
  it('should show what components are detected in فهو "fahuwa"', () => {
    const analysis = analyzeArabicWord('فهو', 'fahuwa');

    console.log('\n📊 فهو + "fahuwa" DETAILED ANALYSIS:');
    console.log('  Original Arabic:', analysis.original.arabic);
    console.log('  Original English:', analysis.original.english);
    console.log('  hasComponents:', analysis.hasComponents);
    console.log('');

    console.log('  Prefixes detected:', analysis.prefixes.length);
    analysis.prefixes.forEach((p, i) => {
      console.log(`    ${i + 1}. ${p.arabicMatch} → "${p.englishMatches.join('/')}" (${p.role})`);
    });
    console.log('');

    console.log(
      '  Suffix:',
      analysis.suffix
        ? `${analysis.suffix.arabicMatch} → "${analysis.suffix.englishMatches.join('/')}"`
        : 'none',
    );
    console.log(
      '  Infix:',
      analysis.infix
        ? `${analysis.infix.arabicMatch} → "${analysis.infix.englishMatches.join('/')}"`
        : 'none',
    );
    console.log(
      '  Diacritic:',
      analysis.diacritic
        ? `${analysis.diacritic.arabicMatch} → "${analysis.diacritic.englishMatches.join('/')}"`
        : 'none',
    );
    console.log('');

    console.log('  Remaining Arabic:', `"${analysis.remainingArabic}"`);
    console.log('  Remaining English:', `"${analysis.remainingEnglish}"`);
    console.log('');

    console.log('  🔍 ISSUE:');
    console.log('  - ف is detected as a PREFIX → WILL BE COLORED');
    console.log('  - هو is in REMAINING text → NOT COLORED');
    console.log('  - Only detected components get colored, not remaining text');
  });

  it('should show colored segments for فهو "fahuwa"', () => {
    const colors = {
      text: '#000000',
      background: '#FFFFFF',
      grammar: {
        conjunction: '#00FF00',
        negation: '#FF0000',
        preposition: '#0000FF',
        article: '#FFFF00',
        pronoun: '#FF00FF',
        possession: '#00FFFF',
        verb: '#FFA500',
        particle: '#800080',
        demonstrative: '#008000',
        relative: '#000080',
        vocative: '#808000',
        conditional: '#008080',
      },
    };

    const segments = computeColoredSegments('فهو', 'fahuwa', colors);

    console.log('\n🎨 COLORED SEGMENTS:');
    segments.forEach((seg, i) => {
      console.log(`  ${i + 1}. "${seg.arabic}" = "${seg.english}"`);
      console.log(`     Color: ${seg.color}`);
      console.log(`     Type: ${seg.type || 'remaining'}`);
    });

    console.log('\n  Expected:');
    console.log('  1. "ف" = "so" (green - conjunction)');
    console.log('  2. "هو" = "he" (remaining - NO COLOR)');
  });

  it('should explain why هو is not a component', () => {
    console.log('\n💡 WHY هو IS NOT COLORED:');
    console.log('');
    console.log('  هو (he/it) is a STANDALONE PRONOUN');
    console.log("  - It's in STANDALONE_PRONOUNS list");
    console.log("  - It's NOT in arabicWordComponents.ts as a suffix/prefix");
    console.log('  - It\'s treated as "remaining root text"');
    console.log('  - Only COMPONENTS are colored, not remaining text');
    console.log('');
    console.log('  Current behavior:');
    console.log('  فهو = ف (component) + هو (remaining)');
    console.log('        ↓              ↓');
    console.log('      COLORED      NOT COLORED');
    console.log('');
    console.log('  To color BOTH parts, we would need to:');
    console.log('  1. Add pronouns as SUFFIX components, OR');
    console.log("  2. Color remaining text when it's a known pronoun");
  });

  it('should show the same issue with وهو "and he"', () => {
    const analysis = analyzeArabicWord('وهو', 'and he');

    console.log('\n📊 وهو + "and he":');
    console.log('  Prefixes:', analysis.prefixes.map(p => p.arabicMatch).join(', '));
    console.log('  Remaining:', `"${analysis.remainingArabic}"`);
    console.log('');
    console.log('  Same issue:');
    console.log('  - و is colored (component)');
    console.log('  - هو is NOT colored (remaining)');
  });
});
