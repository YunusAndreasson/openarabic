/**
 * Test for إنما (innama) compound particle bug
 *
 * Bug: "إِنَّمَا" (indeed only) was being treated as a single prefix,
 * causing the entire word to be colored with one color instead of
 * showing two distinct components: إن (inna) + ما (ma)
 */

import { analyzeArabicWord } from '@/utils/arabicWordAnalysis';

describe('إنما compound particle analysis', () => {
  it('should detect إن and ما as separate prefixes, not one monolithic prefix', () => {
    const arabic = 'إِنَّمَا';
    const english = 'indeed only';

    const analysis = analyzeArabicWord(arabic, english);

    // Should detect TWO prefixes, not one
    expect(analysis.prefixes).toHaveLength(2);

    // First prefix: إن (inna)
    expect(analysis.prefixes[0]?.arabicMatch).toBe('إن');
    expect(analysis.prefixes[0]?.englishMatches).toContain('indeed');

    // Second prefix: ما (ma)
    expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
    expect(analysis.prefixes[1]?.englishMatches).toContain('only');
  });

  it('should apply different grammatical role colors to each component', () => {
    const arabic = 'إِنَّمَا';
    const english = 'indeed only';

    const analysis = analyzeArabicWord(arabic, english);

    // إن should be PARTICLE role
    expect(analysis.prefixes[0]?.role).toBe('particle');

    // ما should be INTERROGATIVE role (it's a relative/restrictive particle)
    expect(analysis.prefixes[1]?.role).toBe('interrogative');

    // Different roles mean different colors in the UI
    expect(analysis.prefixes[0]?.role).not.toBe(analysis.prefixes[1]?.role);
  });

  it('should handle إنما in context of a larger word', () => {
    // Example: إنما + verb
    const arabic = 'إِنَّمَا يَخْشَى'; // "indeed only fear"
    const english = 'indeed only fear';

    const analysis = analyzeArabicWord(arabic, english);

    // Should still detect إن and ما as separate prefixes
    expect(analysis.prefixes.length).toBeGreaterThanOrEqual(2);
    expect(analysis.prefixes[0]?.arabicMatch).toBe('إن');
    expect(analysis.prefixes[1]?.arabicMatch).toBe('ما');
  });
});
