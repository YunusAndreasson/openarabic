#!/usr/bin/env npx tsx
/**
 * Database Analysis Script: Find Missing Grammar Color-Coding Rules
 *
 * This script queries the database for multi-word English translations and
 * identifies cases where our grammar color-coding rules should apply but don't.
 *
 * Usage:
 *   npx tsx scripts/analyze-missing-colors.ts [options]
 *
 * Options:
 *   --limit <number>         Number of words to analyze (default: 500)
 *   --min-frequency <number> Minimum occurrence count (default: 5)
 *   --output-json            Save results to JSON file
 *   --verbose                Show detailed progress
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
}

interface MissingRule {
  arabic: string;
  english: string;
  frequency: number;
  category: 'compound_prefix' | 'missing_preposition' | 'novel_pattern' | 'multi_component';
  reason: string;
  suggestedAction: string;
}

interface AnalysisResult {
  totalAnalyzed: number;
  missingRules: MissingRule[];
  categoryCounts: Record<string, number>;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_LIMIT = 500;
const DEFAULT_MIN_FREQUENCY = 5;

// Parse CLI arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit'))?.split('=')[1];
const freqArg = args.find(arg => arg.startsWith('--min-frequency'))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg) : DEFAULT_LIMIT;
const minFrequency = freqArg ? parseInt(freqArg) : DEFAULT_MIN_FREQUENCY;
const outputJson = args.includes('--output-json');
const verbose = args.includes('--verbose');

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Log with timestamp (only if verbose)
 */
function log(...messages: unknown[]): void {
  if (verbose) {
    const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 8);
    console.log(`[${timestamp}]`, ...messages);
  }
}

/**
 * Check if a word should be excluded from analysis
 */
function shouldExcludeWord(arabic: string, english: string): boolean {
  // Exclude proper nouns (capitalized)
  if (english[0] && english[0] === english[0].toUpperCase() && english.length > 1) {
    return true;
  }

  // Exclude divine names (already handled)
  const lowerEnglish = english.toLowerCase();
  if (
    lowerEnglish.includes('allah') ||
    lowerEnglish.includes('god') ||
    lowerEnglish.includes('lord') ||
    arabic.includes('الله')
  ) {
    return true;
  }

  return false;
}

/**
 * Categorize a missing rule based on the word structure
 */
function categorizeGap(arabic: string, english: string): MissingRule['category'] | null {
  // Check if it looks like a compound prefix (و/ف + preposition)
  const startsWithConjunction = arabic.startsWith('و') || arabic.startsWith('ف');
  const englishStartsWithAnd = english.toLowerCase().startsWith('and ');
  const englishStartsWithSo =
    english.toLowerCase().startsWith('so ') || english.toLowerCase().startsWith('then ');

  if (startsWithConjunction && (englishStartsWithAnd || englishStartsWithSo)) {
    return 'compound_prefix';
  }

  // Check if it's a known preposition that should match
  const commonPrepositions = ['ب', 'ل', 'ك', 'في', 'من', 'على', 'عن', 'إلى'];
  const hasPreposition = commonPrepositions.some(prep => arabic.includes(prep));

  if (hasPreposition) {
    return 'missing_preposition';
  }

  // Check if it's a multi-component word (has both prefix and suffix patterns)
  const hasPossibleSuffix =
    arabic.endsWith('ه') ||
    arabic.endsWith('ها') ||
    arabic.endsWith('هم') ||
    arabic.endsWith('ك') ||
    arabic.endsWith('ي') ||
    arabic.endsWith('نا');
  const hasPossiblePrefix =
    arabic.startsWith('ال') ||
    arabic.startsWith('و') ||
    arabic.startsWith('ف') ||
    arabic.startsWith('ب') ||
    arabic.startsWith('ل');

  if (hasPossiblePrefix && hasPossibleSuffix) {
    return 'multi_component';
  }

  // Novel pattern - doesn't match our existing categories
  return 'novel_pattern';
}

/**
 * Get suggested action for a missing rule
 */
function getSuggestedAction(
  category: MissingRule['category'],
  arabic: string,
  english: string,
): string {
  switch (category) {
    case 'compound_prefix':
      return `Add compound prefix rule: ^${arabic} → ${english}`;
    case 'missing_preposition':
      return `Expand english alternatives for existing preposition pattern`;
    case 'multi_component':
      return `Review multi-component detection logic for prefix+suffix combinations`;
    case 'novel_pattern':
      return `Investigate new grammatical pattern: ${arabic} → ${english}`;
  }
}

/**
 * Get reason why the rule wasn't detected
 */
function getReason(category: MissingRule['category'], _arabic: string, _english: string): string {
  switch (category) {
    case 'compound_prefix':
      return 'Compound prefix not in ARABIC_PREFIXES or English pattern mismatch';
    case 'missing_preposition':
      return 'Preposition exists but English translation variant not in rules';
    case 'multi_component':
      return 'Multiple components present but not detected together';
    case 'novel_pattern':
      return 'Grammatical pattern not covered by current rules';
  }
}

// ============================================================================
// Main Analysis Logic
// ============================================================================

/**
 * Query database for multi-word translations
 */
async function queryMultiWordTranslations(): Promise<WordData[]> {
  log('Querying database for multi-word translations...');

  const { data, error } = await supabaseClient
    .from('sentence_words')
    .select('word_form, english')
    .like('english', '% %') // Contains space (2+ words)
    .limit(limit);

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from query');
  }

  const rows = data as Array<{ word_form: string; english: string }>;

  // Count frequencies
  const frequencyMap = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.word_form}|${row.english}`;
    frequencyMap.set(key, (frequencyMap.get(key) || 0) + 1);
  }

  // Convert to WordData array
  const wordData: WordData[] = [];
  for (const [key, frequency] of frequencyMap.entries()) {
    if (frequency >= minFrequency) {
      const [word_form, english] = key.split('|');
      if (word_form && english) {
        wordData.push({ word_form, english, frequency });
      }
    }
  }

  // Sort by frequency descending
  wordData.sort((a, b) => b.frequency - a.frequency);

  log(`Found ${wordData.length} unique multi-word translations (frequency >= ${minFrequency})`);

  return wordData;
}

/**
 * Analyze words and identify missing rules
 */
function analyzeWords(words: WordData[]): AnalysisResult {
  log('Analyzing words for missing color-coding rules...');

  const missingRules: MissingRule[] = [];
  const categoryCounts: Record<string, number> = {
    compound_prefix: 0,
    missing_preposition: 0,
    novel_pattern: 0,
    multi_component: 0,
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (!word) continue;

    if (verbose && i % 50 === 0) {
      log(`Progress: ${i}/${words.length} (${Math.round((i / words.length) * 100)}%)`);
    }

    // Skip excluded words
    if (shouldExcludeWord(word.word_form, word.english)) {
      continue;
    }

    // CRITICAL: Only analyze words with EXACTLY 2 English words
    const wordCount = word.english.trim().split(/\s+/).length;
    if (wordCount !== 2) {
      continue; // Skip single words and 3+ word phrases
    }

    // Analyze the word
    const analysis = analyzeArabicWord(word.word_form, word.english);

    // If no components found, this is a missing rule
    if (!analysis.hasComponents) {
      const category = categorizeGap(word.word_form, word.english);

      if (category) {
        categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

        missingRules.push({
          arabic: word.word_form,
          english: word.english,
          frequency: word.frequency,
          category,
          reason: getReason(category, word.word_form, word.english),
          suggestedAction: getSuggestedAction(category, word.word_form, word.english),
        });
      }
    }
  }

  log(`Analysis complete. Found ${missingRules.length} missing rules.`);

  return {
    totalAnalyzed: words.length,
    missingRules,
    categoryCounts,
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

/**
 * Format output as console table
 */
function formatConsoleOutput(result: AnalysisResult): void {
  console.log('\n' + '━'.repeat(80));
  console.log(' MISSING COLOR-CODING ANALYSIS');
  console.log(` Total Words Analyzed: ${result.totalAnalyzed}`);
  console.log(` Missing Rules Found: ${result.missingRules.length}`);
  console.log('━'.repeat(80) + '\n');

  // Group by category
  const categories: MissingRule['category'][] = [
    'compound_prefix',
    'missing_preposition',
    'multi_component',
    'novel_pattern',
  ];

  for (const category of categories) {
    const rules = result.missingRules.filter(r => r.category === category);

    if (rules.length === 0) continue;

    const categoryTitle = category
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    console.log(`\n${categoryTitle} (${rules.length} found)`);
    console.log('─'.repeat(80));

    // Sort by frequency
    rules.sort((a, b) => b.frequency - a.frequency);

    // Show top 10
    const top = rules.slice(0, 10);
    console.table(
      top.map(r => ({
        Arabic: r.arabic,
        English: r.english,
        Frequency: r.frequency,
        Action: r.suggestedAction.slice(0, 60) + (r.suggestedAction.length > 60 ? '...' : ''),
      })),
    );

    if (rules.length > 10) {
      console.log(`... and ${rules.length - 10} more\n`);
    }
  }

  console.log('\n' + '━'.repeat(80));
  console.log('SUMMARY');
  console.log('━'.repeat(80));
  console.log(`Compound Prefixes:      ${result.categoryCounts['compound_prefix'] ?? 0}`);
  console.log(`Missing Prepositions:   ${result.categoryCounts['missing_preposition'] ?? 0}`);
  console.log(`Multi-Component:        ${result.categoryCounts['multi_component'] ?? 0}`);
  console.log(`Novel Patterns:         ${result.categoryCounts['novel_pattern'] ?? 0}`);
  console.log('━'.repeat(80) + '\n');
}

/**
 * Save results to JSON file
 */
function saveJsonOutput(result: AnalysisResult): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `missing-colors-${timestamp}.json`;
  const filepath = path.join(__dirname, 'output', filename);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      config: {
        limit,
        minFrequency,
      },
      totals: {
        analyzed: result.totalAnalyzed,
        missingRules: result.missingRules.length,
      },
    },
    categoryCounts: result.categoryCounts,
    missingRules: result.missingRules,
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✅ JSON output saved to: ${filepath}\n`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log('🔍 Analyzing database for missing color-coding rules...\n');
  console.log(`Configuration:`);
  console.log(`  - Limit: ${limit} words`);
  console.log(`  - Min Frequency: ${minFrequency} occurrences`);
  console.log(`  - Target: Exactly 2-word translations only`);
  console.log(`  - Output JSON: ${outputJson ? 'Yes' : 'No'}`);
  console.log(`  - Verbose: ${verbose ? 'Yes' : 'No'}\n`);

  try {
    // Step 1: Query database
    const words = await queryMultiWordTranslations();

    // Step 2: Analyze words
    const result = analyzeWords(words);

    // Step 3: Output results
    formatConsoleOutput(result);

    if (outputJson) {
      saveJsonOutput(result);
    }

    console.log('✅ Analysis complete!\n');
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run the script
main();
