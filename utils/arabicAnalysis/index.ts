/**
 * Arabic Word Analysis - Internal Modules
 *
 * This barrel export provides access to all internal analysis modules.
 * External consumers should use @/utils/arabicWordAnalysis instead.
 */

// Types
export type { AnalyzedComponent, WordAnalysis } from './types';

// Cache
export { ANALYSIS_CACHE, cacheWithFifoEviction, clearAnalysisCache } from './cache';

// Normalization
export { expandContractions, normalizeArabic, normalizeEnglish } from './normalization';

// Validation (only export what's used by other modules)
export { isHighRiskSuffix } from './validation';

// Edge Cases
export { isSingleStandaloneComponent } from './edgeCases';

// English Matching

// Component Detection
export {
  analyzeDiacriticMatches,
  areGrammaticallyRelated,
  findComponent,
  findDiacritic,
  findInfix,
  resolveOverlap,
  shouldInjectBracket,
} from './componentDetection';

// Prefix Detection
export { calculateRemainingEnglish, detectPrefixes } from './prefixDetection';

// Color Segments
export { formatWordAnalysis } from './colorSegments';
