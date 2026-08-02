#!/usr/bin/env npx tsx
/**
 * Arabic Word Coloring Validation Script
 *
 * Analyzes all Arabic words in the database to detect incorrect or suspicious
 * coloring patterns in the morphological analysis system.
 *
 * Usage:
 *   npx tsx scripts/validate-arabic-coloring.ts [options]
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
  severity: 'critical' | 'high_risk' | 'potential';
  issue: string;
  details: string;
  analysis: ReturnType<typeof analyzeArabicWord>;
  exampleSentenceId?: number;
}

type IssueCategory =
  | 'single_word_violation'
  | 'structural_impossibility'
  | 'english_alignment_failure'
  | 'high_risk_component'
  | 'over_detection'
  | 'suspicious_root'
  | 'positional_conflict'
  | 'missing_english_match';

interface ValidationResult {
  totalAnalyzed: number;
  totalWords: number;
  criticalErrors: ValidationIssue[];
  highRiskPatterns: ValidationIssue[];
  potentialIssues: ValidationIssue[];
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
// Helper Functions
// ============================================================================

function log(...messages: unknown[]): void {
  if (verbose) {
    const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 8);
    console.log(`[${timestamp}]`, ...messages);
  }
}

/**
 * Check if text should have color coding applied (multi-word English)
 */
function shouldApplyColorCoding(text: string): boolean {
  return text.trim().split(/\s+/).length > 1;
}

/**
 * Count consonants in Arabic text (for root validation)
 */
function countConsonants(text: string): number {
  const consonantPattern = /[بتثجحخدذرزسشصضطظعغفقكلمنهوي]/g;
  return (text.match(consonantPattern) || []).length;
}

/**
 * Strip diacritics from Arabic text
 */
function stripDiacritics(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * Get remaining root after removing components
 */
function getRemainingRoot(arabic: string, analysis: ReturnType<typeof analyzeArabicWord>): string {
  let remaining = stripDiacritics(arabic);

  // Remove prefixes
  for (const prefix of analysis.prefixes) {
    const prefixClean = stripDiacritics(prefix.arabicMatch);
    if (remaining.startsWith(prefixClean)) {
      remaining = remaining.slice(prefixClean.length);
    }
  }

  // Remove suffix
  if (analysis.suffix) {
    const suffixClean = stripDiacritics(analysis.suffix.arabicMatch);
    if (remaining.endsWith(suffixClean)) {
      remaining = remaining.slice(0, -suffixClean.length);
    }
  }

  // Remove infix (simplified - infixes are complex)
  if (analysis.infix) {
    const infixClean = stripDiacritics(analysis.infix.arabicMatch);
    remaining = remaining.replace(infixClean, '');
  }

  return remaining;
}

/**
 * Check if word has high-risk components prone to false positives
 */
function hasHighRiskComponents(analysis: ReturnType<typeof analyzeArabicWord>): boolean {
  const highRiskPatterns = ['م', 'ه', 'ها', 'ي', 'ك'];

  for (const prefix of analysis.prefixes) {
    if (highRiskPatterns.includes(prefix.arabicMatch)) {
      return true;
    }
  }

  if (analysis.suffix && highRiskPatterns.includes(analysis.suffix.arabicMatch)) {
    return true;
  }

  return false;
}

/**
 * Validate English word matches exist in translation
 */
function validateEnglishMatches(
  english: string,
  analysis: ReturnType<typeof analyzeArabicWord>,
): string[] {
  const englishWords = new Set(
    english
      .toLowerCase()
      .replace(/[.,!?;:'"]/g, '')
      .split(/\s+/),
  );

  const unmatchedComponents: string[] = [];

  // Check prefixes
  for (const prefix of analysis.prefixes) {
    for (const match of prefix.englishMatches) {
      const matchLower = match.toLowerCase();
      if (!englishWords.has(matchLower) && !english.toLowerCase().includes(matchLower)) {
        unmatchedComponents.push(`prefix "${prefix.arabicMatch}" → "${match}"`);
      }
    }
  }

  // Check suffix
  if (analysis.suffix) {
    for (const match of analysis.suffix.englishMatches) {
      const matchLower = match.toLowerCase();
      if (!englishWords.has(matchLower) && !english.toLowerCase().includes(matchLower)) {
        unmatchedComponents.push(`suffix "${analysis.suffix.arabicMatch}" → "${match}"`);
      }
    }
  }

  return unmatchedComponents;
}

/**
 * Detect if components overlap in impossible ways
 */
function hasComponentOverlap(
  arabic: string,
  analysis: ReturnType<typeof analyzeArabicWord>,
): boolean {
  const cleanArabic = stripDiacritics(arabic);
  let prefixLength = 0;
  let suffixLength = 0;

  // Calculate total prefix length
  for (const prefix of analysis.prefixes) {
    prefixLength += stripDiacritics(prefix.arabicMatch).length;
  }

  // Calculate suffix length
  if (analysis.suffix) {
    suffixLength = stripDiacritics(analysis.suffix.arabicMatch).length;
  }

  // If prefix + suffix >= word length, they must overlap
  return prefixLength + suffixLength >= cleanArabic.length;
}

// ============================================================================
// Validation Rules
// ============================================================================

function validateWord(word: WordData): ValidationIssue | null {
  const analysis = analyzeArabicWord(word.word_form, word.english);

  // Skip words with no components detected
  if (!analysis.hasComponents) {
    return null;
  }

  // CRITICAL: Single-word color coding violation
  if (!shouldApplyColorCoding(word.english)) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'single_word_violation',
      severity: 'critical',
      issue: 'Single English word should not have color coding',
      details: `Components detected: ${analysis.prefixes.length} prefix(es), ${analysis.suffix ? '1 suffix' : 'no suffix'}, ${analysis.infix ? '1 infix' : 'no infix'}`,
      analysis,
      exampleSentenceId: word.sentence_ids[0],
    };
  }

  // CRITICAL: Structural impossibility (prefix + suffix overlap)
  if (hasComponentOverlap(word.word_form, analysis)) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'structural_impossibility',
      severity: 'critical',
      issue: 'Prefix and suffix overlap - impossible morphology',
      details: `Prefix+suffix length exceeds word length`,
      analysis,
      exampleSentenceId: word.sentence_ids[0],
    };
  }

  // CRITICAL: English alignment failure
  const unmatchedComponents = validateEnglishMatches(word.english, analysis);
  if (unmatchedComponents.length > 0) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'english_alignment_failure',
      severity: 'critical',
      issue: 'Component English matches not found in translation',
      details: `Unmatched: ${unmatchedComponents.join(', ')}`,
      analysis,
      exampleSentenceId: word.sentence_ids[0],
    };
  }

  // HIGH RISK: Words with high false-positive components
  if (hasHighRiskComponents(analysis)) {
    const remainingRoot = getRemainingRoot(word.word_form, analysis);
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'high_risk_component',
      severity: 'high_risk',
      issue: 'Contains high false-positive risk components (م، ه، ها، ي، ك)',
      details: `Remaining root: "${remainingRoot}" (${remainingRoot.length} letters, ${countConsonants(remainingRoot)} consonants)`,
      analysis,
      exampleSentenceId: word.sentence_ids[0],
    };
  }

  // POTENTIAL: Over-detection (too many components)
  if (analysis.prefixes.length > 3 || (analysis.suffix && analysis.prefixes.length > 2)) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'over_detection',
      severity: 'potential',
      issue: 'Too many components detected',
      details: `${analysis.prefixes.length} prefixes, ${analysis.suffix ? '1 suffix' : 'no suffix'}`,
      analysis,
      exampleSentenceId: word.sentence_ids[0],
    };
  }

  // POTENTIAL: Suspicious root (too short after component removal)
  const remainingRoot = getRemainingRoot(word.word_form, analysis);
  const consonantCount = countConsonants(remainingRoot);

  if (remainingRoot.length < 2 || consonantCount < 2) {
    return {
      arabic: word.word_form,
      english: word.english,
      frequency: word.frequency,
      category: 'suspicious_root',
      severity: 'potential',
      issue: 'Remaining root suspiciously short',
      details: `Root: "${remainingRoot}" (${remainingRoot.length} letters, ${consonantCount} consonants)`,
      analysis,
      exampleSentenceId: word.sentence_ids[0],
    };
  }

  // POTENTIAL: Positional conflicts (prefix detected at end, suffix at start)
  const arabicClean = stripDiacritics(word.word_form);
  const wordLength = arabicClean.length;

  for (const prefix of analysis.prefixes) {
    const prefixPos = arabicClean.indexOf(stripDiacritics(prefix.arabicMatch));
    // If prefix appears in last 30% of word, that's suspicious
    if (prefixPos > wordLength * 0.7) {
      return {
        arabic: word.word_form,
        english: word.english,
        frequency: word.frequency,
        category: 'positional_conflict',
        severity: 'potential',
        issue: 'Prefix detected near end of word',
        details: `"${prefix.arabicMatch}" at position ${prefixPos}/${wordLength}`,
        analysis,
        exampleSentenceId: word.sentence_ids[0],
      };
    }
  }

  if (analysis.suffix) {
    const suffixPos = arabicClean.indexOf(stripDiacritics(analysis.suffix.arabicMatch));
    // If suffix appears in first 30% of word, that's suspicious
    if (suffixPos < wordLength * 0.3) {
      return {
        arabic: word.word_form,
        english: word.english,
        frequency: word.frequency,
        category: 'positional_conflict',
        severity: 'potential',
        issue: 'Suffix detected near start of word',
        details: `"${analysis.suffix.arabicMatch}" at position ${suffixPos}/${wordLength}`,
        analysis,
        exampleSentenceId: word.sentence_ids[0],
      };
    }
  }

  return null;
}

// ============================================================================
// Database Query
// ============================================================================

async function queryAllWords(): Promise<WordData[]> {
  log('Querying database for all sentence words...');

  let query = supabaseClient.from('sentence_words').select('id, word_form, english, sentence_id');

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from query');
  }

  const rows = data as Array<{
    id: number;
    word_form: string;
    english: string;
    sentence_id: number;
  }>;

  log(`Retrieved ${rows.length} words from database`);

  // Group by word_form + english to get frequencies
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

  // Convert to WordData array
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
  log('Analyzing words for coloring issues...');

  const criticalErrors: ValidationIssue[] = [];
  const highRiskPatterns: ValidationIssue[] = [];
  const potentialIssues: ValidationIssue[] = [];

  const categoryCounts: Record<IssueCategory, number> = {
    single_word_violation: 0,
    structural_impossibility: 0,
    english_alignment_failure: 0,
    high_risk_component: 0,
    over_detection: 0,
    suspicious_root: 0,
    positional_conflict: 0,
    missing_english_match: 0,
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

      switch (issue.severity) {
        case 'critical':
          criticalErrors.push(issue);
          break;
        case 'high_risk':
          highRiskPatterns.push(issue);
          break;
        case 'potential':
          potentialIssues.push(issue);
          break;
      }
    }
  }

  const totalIssues = criticalErrors.length + highRiskPatterns.length + potentialIssues.length;
  const cleanWords = words.length - totalIssues;

  log(`Analysis complete. Found ${totalIssues} issues in ${words.length} words`);

  return {
    totalAnalyzed: words.length,
    totalWords: words.length,
    criticalErrors,
    highRiskPatterns,
    potentialIssues,
    cleanWords,
    categoryCounts,
  };
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatConsoleOutput(result: ValidationResult): void {
  console.log('\n' + '━'.repeat(100));
  console.log(' ARABIC WORD COLORING VALIDATION REPORT');
  console.log('━'.repeat(100));
  console.log(`Total Words Analyzed:    ${result.totalAnalyzed}`);
  console.log(
    `Clean Words:             ${result.cleanWords} (${Math.round((result.cleanWords / result.totalAnalyzed) * 100)}%)`,
  );
  console.log(`Critical Errors:         ${result.criticalErrors.length}`);
  console.log(`High-Risk Patterns:      ${result.highRiskPatterns.length}`);
  console.log(`Potential Issues:        ${result.potentialIssues.length}`);
  console.log('━'.repeat(100) + '\n');

  // Critical Errors
  if (result.criticalErrors.length > 0) {
    console.log('\n🔴 CRITICAL ERRORS\n');
    console.log('─'.repeat(100));

    const grouped = groupByCategory(result.criticalErrors);

    for (const [category, issues] of Object.entries(grouped)) {
      if (issues.length === 0) continue;

      console.log(`\n${formatCategoryName(category)} (${issues.length} found)`);
      console.log('─'.repeat(100));

      const sorted = issues.sort((a, b) => b.frequency - a.frequency).slice(0, 15);

      for (const issue of sorted) {
        console.log(`\n  ${issue.arabic} → ${issue.english}`);
        console.log(`  Frequency: ${issue.frequency} | Issue: ${issue.issue}`);
        console.log(`  Details: ${issue.details}`);
        if (issue.exampleSentenceId) {
          console.log(`  Example: sentence_id=${issue.exampleSentenceId}`);
        }
      }

      if (issues.length > 15) {
        console.log(`\n  ... and ${issues.length - 15} more`);
      }
    }
  }

  // High-Risk Patterns
  if (result.highRiskPatterns.length > 0) {
    console.log('\n\n🟡 HIGH-RISK PATTERNS (Manual Review Recommended)\n');
    console.log('─'.repeat(100));

    const sorted = result.highRiskPatterns.sort((a, b) => b.frequency - a.frequency).slice(0, 20);

    for (const issue of sorted) {
      console.log(`\n  ${issue.arabic} → ${issue.english}`);
      console.log(`  Frequency: ${issue.frequency} | ${issue.issue}`);
      console.log(`  ${issue.details}`);
    }

    if (result.highRiskPatterns.length > 20) {
      console.log(`\n  ... and ${result.highRiskPatterns.length - 20} more`);
    }
  }

  // Potential Issues Summary
  if (result.potentialIssues.length > 0) {
    console.log('\n\n⚠️  POTENTIAL ISSUES (Low Priority)\n');
    console.log('─'.repeat(100));

    const grouped = groupByCategory(result.potentialIssues);

    for (const [category, issues] of Object.entries(grouped)) {
      if (issues.length === 0) continue;

      console.log(`\n${formatCategoryName(category)}: ${issues.length} found`);

      const top5 = issues.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
      for (const issue of top5) {
        console.log(`  • ${issue.arabic} → ${issue.english} (freq: ${issue.frequency})`);
      }
    }
  }

  // Summary Statistics
  console.log('\n\n' + '━'.repeat(100));
  console.log('CATEGORY BREAKDOWN');
  console.log('━'.repeat(100));

  const categories: IssueCategory[] = [
    'single_word_violation',
    'structural_impossibility',
    'english_alignment_failure',
    'high_risk_component',
    'over_detection',
    'suspicious_root',
    'positional_conflict',
    'missing_english_match',
  ];

  for (const category of categories) {
    const count = result.categoryCounts[category] ?? 0;
    if (count > 0) {
      console.log(`${formatCategoryName(category).padEnd(40)} ${count}`);
    }
  }

  console.log('━'.repeat(100) + '\n');
}

function groupByCategory(issues: ValidationIssue[]): Record<string, ValidationIssue[]> {
  const grouped: Record<string, ValidationIssue[]> = {};

  for (const issue of issues) {
    if (!grouped[issue.category]) {
      grouped[issue.category] = [];
    }
    grouped[issue.category]!.push(issue);
  }

  return grouped;
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function saveJsonOutput(result: ValidationResult): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `arabic-coloring-validation-${timestamp}.json`;

  // Ensure output directory exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      config: {
        limit: limit ?? 'all',
        minFrequency,
      },
      summary: {
        totalAnalyzed: result.totalAnalyzed,
        cleanWords: result.cleanWords,
        criticalErrors: result.criticalErrors.length,
        highRiskPatterns: result.highRiskPatterns.length,
        potentialIssues: result.potentialIssues.length,
      },
    },
    categoryCounts: result.categoryCounts,
    criticalErrors: result.criticalErrors.map(formatIssueForJson),
    highRiskPatterns: result.highRiskPatterns.map(formatIssueForJson),
    potentialIssues: result.potentialIssues.map(formatIssueForJson),
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
    exampleSentenceId: issue.exampleSentenceId,
    analysis: {
      hasComponents: issue.analysis.hasComponents,
      prefixCount: issue.analysis.prefixes.length,
      suffixCount: issue.analysis.suffix ? 1 : 0,
      infixCount: issue.analysis.infix ? 1 : 0,
      prefixes: issue.analysis.prefixes.map(p => ({
        arabic: p.arabicMatch,
        english: p.englishMatches,
        role: p.role,
      })),
      suffix: issue.analysis.suffix
        ? {
            arabic: issue.analysis.suffix.arabicMatch,
            english: issue.analysis.suffix.englishMatches,
            role: issue.analysis.suffix.role,
          }
        : null,
      infix: issue.analysis.infix
        ? {
            arabic: issue.analysis.infix.arabicMatch,
            english: issue.analysis.infix.englishMatches,
            role: issue.analysis.infix.role,
          }
        : null,
    },
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log('🔍 Validating Arabic word coloring in database...\n');
  console.log('Configuration:');
  console.log(`  - Limit: ${limit ?? 'all words'}`);
  console.log(`  - Min Frequency: ${minFrequency}`);
  console.log(`  - Output JSON: ${outputJson ? 'Yes' : 'No'}`);
  console.log(`  - Verbose: ${verbose ? 'Yes' : 'No'}\n`);

  try {
    // Step 1: Query database
    const words = await queryAllWords();

    // Step 2: Analyze words
    const result = analyzeAllWords(words);

    // Step 3: Output results
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

// Run the script
main();
