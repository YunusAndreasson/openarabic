import { analyzeArabicWord, formatWordAnalysis } from '@/utils/arabicWordAnalysis';
import { ARABIC_PREFIXES } from '@/constants/arabicWordComponents';

describe('Arabic Compound Prefix Detection', () => {
  it('should have وعن compound prefix in ARABIC_PREFIXES', () => {
    const wenPrefix = ARABIC_PREFIXES.find(p => p.arabic === '^وعن');
    expect(wenPrefix).toBeDefined();
    expect(wenPrefix?.english).toContain('and from');
  });

  it('should detect وعن as a single compound prefix, not separate components', () => {
    const analysis = analyzeArabicWord('وعن', 'and from');

    console.log('Analysis for وعن (and from):');
    console.log('Has components:', analysis.hasComponents);
    console.log('Prefix:', analysis.prefix);
    console.log('Remaining:', analysis.remainingArabic);

    expect(analysis.hasComponents).toBe(true);
    expect(analysis.prefix).toBeDefined();

    // Should match the full compound prefix, not just و
    expect(analysis.prefix?.arabicMatch).toBe('وعن');
    expect(analysis.prefix?.englishMatches).toContain('and from');

    // Remaining should be empty since entire word is prefix
    expect(analysis.remainingArabic).toBe('');
  });

  it('should color-code both parts of compound prefix in English', () => {
    const analysis = analyzeArabicWord('وعن', 'and from');
    const formatted = formatWordAnalysis(analysis);

    console.log('Formatted sections:', JSON.stringify(formatted.sections, null, 2));

    // Should have component section for the compound prefix
    const componentSection = formatted.sections.find(s => s.type === 'components');
    expect(componentSection).toBeDefined();
    expect(componentSection?.englishPart).toContain('from');
  });

  it('should color-code Arabic text for compound prefix', () => {
    const analysis = analyzeArabicWord('وعن', 'and from');
    const formatted = formatWordAnalysis(analysis);

    console.log('Reconstructed Arabic:', JSON.stringify(formatted.reconstructedArabic, null, 2));

    // Should have reconstructed Arabic with colored segments
    expect(formatted.reconstructedArabic).toBeDefined();
    expect(formatted.reconstructedArabic?.segments).toBeDefined();

    // The entire word should be one colored prefix segment
    const segments = formatted.reconstructedArabic?.segments || [];
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]?.type).toBe('prefix');
    expect(segments[0]?.colorName).toBe('tint');
  });
});
