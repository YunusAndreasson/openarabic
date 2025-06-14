import { analyzeArabicWord, formatWordAnalysis, hasAnalyzableComponents } from '../../utils/arabicWordAnalysis';

describe('analyzeArabicWord', () => {
  it('detects prefix and common word components', () => {
    const analysis = analyzeArabicWord('والبيت', 'and the house');
    expect(analysis.hasComponents).toBe(true);
    expect(analysis.components).toHaveLength(2);
    expect(analysis.components[0].arabicMatch === 'و' || analysis.components[0].arabicMatch === 'البيت').toBe(true);
    expect(analysis.remainingArabic).toBe('');
    expect(analysis.remainingEnglish).toBe('');
  });

  it('handles words without components', () => {
    const analysis = analyzeArabicWord('كتاب', 'book');
    expect(analysis.hasComponents).toBe(false);
    expect(analysis.components).toHaveLength(0);
    expect(analysis.remainingArabic).toBe('كتاب');
    expect(analysis.remainingEnglish).toBe('book');
  });

  it('handles mixed-language input', () => {
    const analysis = analyzeArabicWord('الbook', 'the book');
    expect(analysis.hasComponents).toBe(true);
    expect(analysis.components[0].arabicMatch).toBe('ال');
    expect(analysis.remainingArabic).toBe('book');
    expect(analysis.remainingEnglish).toBe('book');
  });
});

describe('formatWordAnalysis', () => {
  it('formats analysis with components', () => {
    const analysis = analyzeArabicWord('والبيت', 'and the house');
    const result = formatWordAnalysis(analysis);
    expect(result.title).toBe('والبيت');
    expect(result.sections[0]).toEqual({ type: 'original', content: 'and the house' });
    expect(result.sections.length).toBe(3);
    expect(result.reconstructedArabic).toBeDefined();
    expect(result.reconstructedArabic?.segments.length).toBeGreaterThan(1);
  });

  it('formats analysis without components', () => {
    const analysis = analyzeArabicWord('كتاب', 'book');
    const result = formatWordAnalysis(analysis);
    expect(result.title).toBe('كتاب');
    expect(result.sections).toEqual([{ type: 'original', content: 'book' }]);
    expect(result.reconstructedArabic).toBeUndefined();
  });
});

describe('hasAnalyzableComponents', () => {
  it('detects analyzable prefixes and suffixes', () => {
    expect(hasAnalyzableComponents('التلميذة')).toBe(true);
  });

  it('returns false when no patterns found', () => {
    expect(hasAnalyzableComponents('كتاب')).toBe(false);
    expect(hasAnalyzableComponents('house')).toBe(false);
  });

  it('detects mixed-language words starting with prefixes', () => {
    expect(hasAnalyzableComponents('الbook')).toBe(true);
  });
});
