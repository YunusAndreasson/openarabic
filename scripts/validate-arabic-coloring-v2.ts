#!/usr/bin/env npx tsx
/**
 * Arabic Word Coloring Validation Script V2 - Expert Linguistic Analysis
 *
 * Distinguishes between:
 * - Actual coloring bugs (component detection errors)
 * - Database translation errors (wrong English for correct Arabic)
 * - Valid compound particles (entirely grammatical, no root)
 *
 * Usage:
 *   npx tsx scripts/validate-arabic-coloring-v2.ts [options]
 *
 * Options:
 *   --limit <number>         Number of words to analyze (default: all)
 *   --output-json            Save results to JSON file
 *   --verbose                Show detailed progress
 *   --min-frequency <number> Only analyze words appearing N+ times (default: 1)
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { analyzeArabicWord } from '../utils/arabicWordAnalysis';
import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface WordData {
  word_form: string;
  english: string;
  frequency: number;
  sentence_ids: number[];
}

interface ValidationIssue {
  arabic: string;
  english: string;
  frequency: number;
  category: IssueCategory;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  details: string;
  analysis: ReturnType<typeof analyzeArabicWord>;
  exampleSentenceId?: number;
  suggestedFix?: string;
}

type IssueCategory =
  | 'translation_error'
  | 'missing_prefix_detection'
  | 'missing_suffix_detection'
  | 'false_positive_prefix'
  | 'false_positive_suffix'
  | 'english_mismatch'
  | 'ambiguous_case';

interface ValidationResult {
  totalAnalyzed: number;
  totalWords: number;
  coloringBugs: ValidationIssue[];
  translationErrors: ValidationIssue[];
  ambiguousCases: ValidationIssue[];
  cleanWords: number;
  categoryCounts: Record<IssueCategory, number>;
}

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit'))?.split('=')[1];
const freqArg = args.find(arg => arg.startsWith('--min-frequency'))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg) : undefined;
const minFrequency = freqArg ? parseInt(freqArg) : 1;
const outputJson = args.includes('--output-json');
const verbose = args.includes('--verbose');

// ============================================================================
// Arabic Linguistic Knowledge Base
// ============================================================================

/**
 * Compound particles - words composed entirely of grammatical components
 * These are VALID and should NOT be flagged as errors
 */
const COMPOUND_PARTICLES = new Set([
  'وَإِنْ',
  'فَإِنْ',
  'وَإِنَّ',
  'فَإِنَّ', // و/ف + إن/إنّ
  'لَهُ',
  'لَهَا',
  'لَهُمْ',
  'لَنَا', // ل + pronouns
  'بِهِ',
  'بِهَا',
  'بِهِمْ',
  'بِنَا',
  'بِكَ',
  'بِكُمْ', // ب + pronouns
  'لِمَنْ',
  'لِمَا',
  'لِمَاذَا', // ل + interrogatives
  'كَمَا',
  'كَأَنَّ', // ك + particles
  'وَلَا',
  'فَلَا',
  'وَلَمْ',
  'فَلَمْ', // conjunctions + negation
  'إِنَّمَا',
  'أَنَّمَا', // إنّ/أنّ + ما
]);

/**
 * Known preposition-pronoun compounds
 * Removing diacritics for matching
 */
function stripDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

function isCompoundParticle(arabic: string): boolean {
  const stripped = stripDiacritics(arabic);
  return (
    COMPOUND_PARTICLES.has(arabic) ||
    // Pattern matching for common compounds
    /^[وف]?[بلك][ه][يمنا]?$/.test(stripped) || // preposition + pronoun
    /^[وف]إن[َّْ]?$/.test(stripped)
  ); // conjunction + إن
}

/**
 * Check if a word should have a prefix based on its starting letter
 */
function shouldHavePrefix(arabic: string, english: string): string | null {
  const clean = stripDiacritics(arabic);
  const engLower = english.toLowerCase();

  // Common prefixes and their English equivalents
  const prefixPatterns: Array<{ arabic: string; english: string[] }> = [
    { arabic: 'و', english: ['and ', 'and-', ' and'] },
    { arabic: 'ف', english: ['so ', 'then ', 'so-', 'then-'] },
    { arabic: 'ب', english: ['with ', 'by ', 'in ', 'at '] },
    { arabic: 'ل', english: ['for ', 'to ', 'of '] },
    { arabic: 'ك', english: [' as', 'like ', 'as '] },
  ];

  for (const pattern of prefixPatterns) {
    if (clean.startsWith(pattern.arabic)) {
      const hasEnglishMatch = pattern.english.some(
        eng => engLower.includes(eng) || engLower.startsWith(eng.trim()),
      );
      if (hasEnglishMatch) {
        return pattern.arabic;
      }
    }
  }

  return null;
}

/**
 * Check if a word should have a suffix based on its ending and English
 */
function shouldHaveSuffix(arabic: string, english: string): string | null {
  const clean = stripDiacritics(arabic);
  const engLower = english.toLowerCase();

  // Common suffixes and their English equivalents
  const suffixPatterns: Array<{ arabic: string; english: string[] }> = [
    { arabic: 'ه', english: ['his', 'him', 'its', 'it'] },
    { arabic: 'ها', english: ['her', 'its', 'it'] },
    { arabic: 'هم', english: ['their', 'them'] },
    { arabic: 'هن', english: ['their', 'them'] }, // feminine plural
    { arabic: 'ك', english: ['your', 'you'] },
    { arabic: 'كم', english: ['your', 'you'] }, // plural
    { arabic: 'ي', english: ['my', 'me'] },
    { arabic: 'نا', english: ['our', 'us', 'we'] },
  ];

  for (const pattern of suffixPatterns) {
    if (clean.endsWith(pattern.arabic)) {
      const hasEnglishMatch = pattern.english.some(
        eng => engLower.includes(eng) || engLower.endsWith(eng),
      );
      if (hasEnglishMatch) {
        return pattern.arabic;
      }
    }
  }

  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function log(...messages: unknown[]): void {
  if (verbose) {
    const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 8);
    console.log(`[${timestamp}]`, ...messages);
  }
}

function countConsonants(text: string): number {
  const consonantPattern = /[بتثجحخدذرزسشصضطظعغفقكلمنهوي]/g;
  return (text.match(consonantPattern) || []).length;
}

// ============================================================================
// Validation Logic
// ============================================================================

function validateWord(word: WordData): ValidationIssue | null {
  // ========================================================================
  // CRITICAL: Skip single-word English translations
  // ========================================================================
  // Per design rule: "if there is only a single english word, we should never
  // color since there is no educational benefit"
  // Single-word translations should NOT be flagged as bugs - they are
  // intentionally not colored regardless of Arabic component structure.
  const englishWordCount = word.english.trim().split(/\s+/).length;
  if (englishWordCount === 1) {
    return null; // Single word - skip validation (expected behavior)
  }

  const analysis = analyzeArabicWord(word.word_form, word.english);

  // Skip words with no components
  if (!analysis.hasComponents) {
    // Check if it SHOULD have components but doesn't
    const expectedPrefix = shouldHavePrefix(word.word_form, word.english);
    const expectedSuffix = shouldHaveSuffix(word.word_form, word.english);

    if (expectedPrefix || expectedSuffix) {
      return {
        arabic: word.word_form,
        english: word.english,
        frequency: word.frequency,
        category: expectedPrefix ? 'missing_prefix_detection' : 'missing_suffix_detection',
        severity: 'critical',
        issue: `Expected component not detected`,
        details: `Should detect ${expectedPrefix || expectedSuffix} but analysis found no components`,
        analysis,
        exampleSentenceId: word.sentence_ids[0],
        suggestedFix: `Add detection rule or verify component pattern`,
      };
    }

    return null;
  }

  // ========================================================================
  // Check for translation errors
  // ========================================================================

  const translationIssues: string[] = [];

  // Check prefix English matches
  for (const prefix of analysis.prefixes) {
    const prefixEnglish = prefix.englishMatches.join('/');
    const found = prefix.englishMatches.some(eng =>
      word.english.toLowerCase().includes(eng.toLowerCase()),
    );

    if (!found && !isCompoundParticle(word.word_form)) {
      translationIssues.push(
        `Prefix ${prefix.arabicMatch} expects "${prefixEnglish}" but not found in English`,
      );
    }
  }

  // Check suffix English matches
  if (analysis.suffix) {
    const suffixEnglish = analysis.suffix.englishMatches.join('/');
    const found = analysis.suffix.englishMatches.some(eng =>
      word.english.toLowerCase().includes(eng.toLowerCase()),
    );

    if (!found && !isCompoundParticle(word.word_form)) {
      translationIssues.push(
        `Suffix ${analysis.suffix.arabicMatch} expects "${suffixEnglish}" but not found in English`,
      );
    }
  }

  if (translationIssues.length > 0) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'translation_error',
      severity: 'warning',
      issue: 'English translation mismatch',
      details: translationIssues.join('; '),
      analysis,
      exampleSentenceId: word.sentence_ids[0],
      suggestedFix: 'Verify English translation in database',
    };
  }

  // ========================================================================
  // Check for potential false positives
  // ========================================================================

  // Very short remaining root after component removal
  const cleanRemaining = stripDiacritics(analysis.remainingArabic);

  if (
    analysis.hasComponents &&
    cleanRemaining.length === 1 &&
    !isCompoundParticle(word.word_form)
  ) {
    const consonantCount = countConsonants(cleanRemaining);

    if (consonantCount < 2) {
      return {
        arabic: word.word_form,
        english: word.english,
        frequency: word.frequency,
        category: 'ambiguous_case',
        severity: 'info',
        issue: 'Very short remaining root - possible over-detection',
        details: `Root "${cleanRemaining}" has only ${consonantCount} consonant(s)`,
        analysis,
        exampleSentenceId: word.sentence_ids[0],
        suggestedFix: 'Manual review: verify this is not a compound particle or false detection',
      };
    }
  }

  // ========================================================================
  // Check English mismatch (detected component but wrong English)
  // ========================================================================

  // Example: ب detected as "with" but English says "to"
  const englishMismatches: string[] = [];

  for (const prefix of analysis.prefixes) {
    if (prefix.arabicMatch === 'ب') {
      const hasCorrectEnglish = ['with', 'by', 'in', 'at'].some(exp =>
        word.english.toLowerCase().includes(exp),
      );
      if (!hasCorrectEnglish && !isCompoundParticle(word.word_form)) {
        englishMismatches.push(
          `ب detected as "${prefix.englishMatches.join('/')}" but English may use different preposition`,
        );
      }
    }
  }

  if (englishMismatches.length > 0) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'english_mismatch',
      severity: 'info',
      issue: 'English translation uses interpretive wording',
      details: englishMismatches.join('; '),
      analysis,
      exampleSentenceId: word.sentence_ids[0],
      suggestedFix: 'Review if English is interpretive translation (may be acceptable)',
    };
  }

  return null;
}

// ============================================================================
// Database Query
// ============================================================================

async function queryAllWords(): Promise<WordData[]> {
  log('Querying database for all sentence words...');

  const PAGE_SIZE = 1000;
  const allRows: Array<{
    id: number;
    word_form: string;
    english: string;
    sentence_id: number;
  }> = [];

  if (limit) {
    // User specified a limit - fetch that many rows
    const { data, error } = await supabaseClient
      .from('sentence_words')
      .select('id, word_form, english, sentence_id')
      .limit(limit);

    if (error) {
      throw new Error(`Supabase query error: ${error.message}`);
    }

    if (data) {
      allRows.push(...data);
    }
  } else {
    // No limit - paginate through ALL rows (Supabase has 1000 row page limit)
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseClient
        .from('sentence_words')
        .select('id, word_form, english, sentence_id')
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      if (data && data.length > 0) {
        allRows.push(...data);
        log(`Fetched page ${page + 1}: ${data.length} rows (total so far: ${allRows.length})`);

        if (data.length < PAGE_SIZE) {
          hasMore = false; // Last page
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }
  }

  const rows = allRows;

  log(`Retrieved ${rows.length} total words from database`);

  // Group by word_form + english
  const frequencyMap = new Map<string, { frequency: number; sentence_ids: number[] }>();

  for (const row of rows) {
    const key = `${row.word_form}|${row.english}`;
    const existing = frequencyMap.get(key);

    if (existing) {
      existing.frequency++;
      existing.sentence_ids.push(row.sentence_id);
    } else {
      frequencyMap.set(key, { frequency: 1, sentence_ids: [row.sentence_id] });
    }
  }

  const wordData: WordData[] = [];
  for (const [key, value] of frequencyMap.entries()) {
    const [word_form, english] = key.split('|');
    if (word_form && english && value.frequency >= minFrequency) {
      wordData.push({
        word_form,
        english,
        frequency: value.frequency,
        sentence_ids: value.sentence_ids,
      });
    }
  }

  log(`Consolidated to ${wordData.length} unique words (frequency >= ${minFrequency})`);

  return wordData;
}

// ============================================================================
// Analysis
// ============================================================================

function analyzeAllWords(words: WordData[]): ValidationResult {
  log('Analyzing words with expert linguistic rules...');

  const coloringBugs: ValidationIssue[] = [];
  const translationErrors: ValidationIssue[] = [];
  const ambiguousCases: ValidationIssue[] = [];

  const categoryCounts: Record<IssueCategory, number> = {
    translation_error: 0,
    missing_prefix_detection: 0,
    missing_suffix_detection: 0,
    false_positive_prefix: 0,
    false_positive_suffix: 0,
    english_mismatch: 0,
    ambiguous_case: 0,
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    if (verbose && i % 100 === 0) {
      log(`Progress: ${i}/${words.length} (${Math.round((i / words.length) * 100)}%)`);
    }

    const issue = validateWord(word);

    if (issue) {
      categoryCounts[issue.category]++;

      if (issue.category === 'translation_error') {
        translationErrors.push(issue);
      } else if (issue.category === 'ambiguous_case' || issue.category === 'english_mismatch') {
        ambiguousCases.push(issue);
      } else {
        // Actual coloring bugs
        coloringBugs.push(issue);
      }
    }
  }

  const totalIssues = coloringBugs.length + translationErrors.length + ambiguousCases.length;
  const cleanWords = words.length - totalIssues;

  log(`Analysis complete. Found ${totalIssues} issues in ${words.length} words`);

  return {
    totalAnalyzed: words.length,
    totalWords: words.length,
    coloringBugs,
    translationErrors,
    ambiguousCases,
    cleanWords,
    categoryCounts,
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatConsoleOutput(result: ValidationResult): void {
  console.log('\n' + '━'.repeat(100));
  console.log(' ARABIC WORD COLORING VALIDATION REPORT V2 - EXPERT ANALYSIS');
  console.log('━'.repeat(100));
  console.log(`Total Words Analyzed:    ${result.totalAnalyzed}`);
  console.log(
    `Clean Words:             ${result.cleanWords} (${Math.round((result.cleanWords / result.totalAnalyzed) * 100)}%)`,
  );
  console.log(`Coloring Bugs:           ${result.coloringBugs.length} 🐛`);
  console.log(`Translation Errors:      ${result.translationErrors.length} ⚠️`);
  console.log(`Ambiguous Cases:         ${result.ambiguousCases.length} ℹ️`);
  console.log('━'.repeat(100) + '\n');

  // Coloring Bugs
  if (result.coloringBugs.length > 0) {
    console.log('\n🐛 COLORING BUGS (Actual Component Detection Errors)\n');
    console.log('─'.repeat(100));

    const sorted = result.coloringBugs.sort((a, b) => b.frequency - a.frequency).slice(0, 20);

    for (const issue of sorted) {
      console.log(`\n  ${issue.arabic} → "${issue.english}" (freq: ${issue.frequency})`);
      console.log(`  ❌ ${issue.issue}`);
      console.log(`  Details: ${issue.details}`);
      console.log(`  Fix: ${issue.suggestedFix}`);
      if (issue.exampleSentenceId) {
        console.log(`  Example: sentence_id=${issue.exampleSentenceId}`);
      }
    }

    if (result.coloringBugs.length > 20) {
      console.log(`\n  ... and ${result.coloringBugs.length - 20} more`);
    }
  }

  // Translation Errors
  if (result.translationErrors.length > 0) {
    console.log('\n\n⚠️  DATABASE TRANSLATION ERRORS (Coloring is Correct)\n');
    console.log('─'.repeat(100));

    const sorted = result.translationErrors.sort((a, b) => b.frequency - a.frequency).slice(0, 15);

    for (const issue of sorted) {
      console.log(`\n  ${issue.arabic} → "${issue.english}" (freq: ${issue.frequency})`);
      console.log(`  ⚠️  ${issue.details}`);
      console.log(`  Fix: ${issue.suggestedFix}`);
    }

    if (result.translationErrors.length > 15) {
      console.log(`\n  ... and ${result.translationErrors.length - 15} more`);
    }
  }

  // Ambiguous Cases
  if (result.ambiguousCases.length > 0) {
    console.log('\n\nℹ️  AMBIGUOUS CASES (Manual Review Recommended)\n');
    console.log('─'.repeat(100));

    const sorted = result.ambiguousCases.sort((a, b) => b.frequency - a.frequency).slice(0, 10);

    for (const issue of sorted) {
      console.log(`\n  ${issue.arabic} → "${issue.english}" (freq: ${issue.frequency})`);
      console.log(`  ℹ️  ${issue.issue}`);
      console.log(`  ${issue.details}`);
    }

    if (result.ambiguousCases.length > 10) {
      console.log(`\n  ... and ${result.ambiguousCases.length - 10} more`);
    }
  }

  // Summary
  console.log('\n\n' + '━'.repeat(100));
  console.log('CATEGORY BREAKDOWN');
  console.log('━'.repeat(100));

  const categories: IssueCategory[] = [
    'missing_prefix_detection',
    'missing_suffix_detection',
    'false_positive_prefix',
    'false_positive_suffix',
    'translation_error',
    'english_mismatch',
    'ambiguous_case',
  ];

  for (const category of categories) {
    const count = result.categoryCounts[category] ?? 0;
    if (count > 0) {
      const label = category
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      console.log(`${label.padEnd(40)} ${count}`);
    }
  }

  console.log('━'.repeat(100) + '\n');
}

function saveJsonOutput(result: ValidationResult): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `arabic-coloring-validation-v2-${timestamp}.json`;

  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      version: '2.0',
      config: {
        limit: limit ?? 'all',
        minFrequency,
      },
      summary: {
        totalAnalyzed: result.totalAnalyzed,
        cleanWords: result.cleanWords,
        coloringBugs: result.coloringBugs.length,
        translationErrors: result.translationErrors.length,
        ambiguousCases: result.ambiguousCases.length,
      },
    },
    categoryCounts: result.categoryCounts,
    coloringBugs: result.coloringBugs.map(formatIssueForJson),
    translationErrors: result.translationErrors.map(formatIssueForJson),
    ambiguousCases: result.ambiguousCases.map(formatIssueForJson),
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ JSON output saved to: ${filepath}\n`);
}

function formatIssueForJson(issue: ValidationIssue) {
  return {
    arabic: issue.arabic,
    english: issue.english,
    frequency: issue.frequency,
    category: issue.category,
    severity: issue.severity,
    issue: issue.issue,
    details: issue.details,
    suggestedFix: issue.suggestedFix,
    exampleSentenceId: issue.exampleSentenceId,
    analysis: {
      hasComponents: issue.analysis.hasComponents,
      prefixCount: issue.analysis.prefixes.length,
      suffixCount: issue.analysis.suffix ? 1 : 0,
      infixCount: issue.analysis.infix ? 1 : 0,
      prefixes: issue.analysis.prefixes.map(p => ({
        arabic: p.arabicMatch,
        english: p.englishMatches,
      })),
      suffix: issue.analysis.suffix
        ? {
            arabic: issue.analysis.suffix.arabicMatch,
            english: issue.analysis.suffix.englishMatches,
          }
        : null,
    },
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🔍 Arabic Word Coloring Expert Validation V2...\n');
  console.log('Configuration:');
  console.log(`  - Limit: ${limit ?? 'all words'}`);
  console.log(`  - Min Frequency: ${minFrequency}`);
  console.log(`  - Output JSON: ${outputJson ? 'Yes' : 'No'}`);
  console.log(`  - Verbose: ${verbose ? 'Yes' : 'No'}\n`);

  try {
    const words = await queryAllWords();
    const result = analyzeAllWords(words);
    formatConsoleOutput(result);

    if (outputJson) {
      saveJsonOutput(result);
    }

    console.log('✅ Validation complete!\n');
  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

main();
