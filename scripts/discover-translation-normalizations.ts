#!/usr/bin/env npx tsx
/**
 * Translation Normalization Discovery Script
 *
 * Finds words with transliterated English (e.g., "wa la") that should be
 * normalized to meaningful translations (e.g., "and not") to enable proper
 * component detection and color-coding.
 *
 * Strategy:
 * 1. Fetch multi-word English translations with NO component detection
 * 2. Filter for transliteration patterns (contains Arabic phonetics)
 * 3. Analyze Arabic structure to suggest correct translations
 * 4. Group by frequency and consistency
 * 5. Output ranked list for manual review
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { analyzeArabicWord } from '../utils/arabicWordAnalysis';
import { normalizeArabic } from '../utils/arabicAnalysis/normalization';
import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

interface TransliterationCandidate {
  arabic: string;
  normalizedArabic: string;
  english: string;
  frequency: number;
  sentence_ids: number[];
  confidence: 'high' | 'medium' | 'low';
  suggestedTranslation: string;
  components: string[];
  reasoning: string;
}

interface NormalizationRule {
  arabic: string;
  transliterations: string[];
  normalizedEnglish: string;
  description: string;
  frequency: number;
  examples: Array<{ arabic: string; english: string }>;
}

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit'))?.split('=')[1];
const limit = limitArg ? parseInt(limitArg, 10) : undefined;
const outputJson = args.includes('--output-json');
const verbose = args.includes('--verbose');
const minFreq = parseInt(
  args.find(arg => arg.startsWith('--min-frequency'))?.split('=')[1] || '3',
  10,
);

console.log('🔍 Discovering Translation Normalization Candidates...\n');
console.log('Configuration:');
console.log(`  - Minimum frequency: ${minFreq}`);
console.log(`  - Limit: ${limit || 'None'}`);
console.log(`  - Output JSON: ${outputJson ? 'Yes' : 'No'}`);
console.log(`  - Verbose: ${verbose ? 'Yes' : 'No'}\n`);

// ============================================================================
// Arabic Phonetic Patterns
// ============================================================================

/**
 * Common Arabic phonetic patterns used in transliterations
 */
const ARABIC_PHONETICS = [
  'wa',
  'la',
  'bi',
  'fa',
  'li',
  'lam',
  'lan',
  'ma',
  'min',
  'an',
  'in',
  'un',
  'al',
  'il',
  'ul',
  'ka',
  'ta',
  'na',
  'ha',
  'ya',
  'ba',
  'sa',
];

/**
 * Check if English contains Arabic phonetic patterns (likely transliteration)
 */
function hasArabicPhonetics(english: string): boolean {
  const words = english.toLowerCase().split(/\s+/);

  // Check if any word matches common Arabic phonetics
  return words.some(word => {
    // Remove common English words that happen to match phonetics
    if (['a', 'an', 'in', 'as', 'at', 'it', 'is'].includes(word)) {
      return false;
    }

    // Check if word matches or contains Arabic phonetics
    return ARABIC_PHONETICS.some(
      phonetic =>
        word === phonetic ||
        word.startsWith(phonetic) ||
        word.endsWith(phonetic) ||
        word.includes(phonetic),
    );
  });
}

/**
 * Analyze Arabic word structure to suggest components
 */
function analyzeStructure(
  arabic: string,
): { components: string[]; suggestedMeanings: string[] } {
  const normalized = normalizeArabic(arabic);
  const components: string[] = [];
  const suggestedMeanings: string[] = [];

  // Check for common prefix patterns
  const prefixMap: Record<string, string> = {
    و: 'and',
    ف: 'so',
    ب: 'with',
    ل: 'for/to',
    ال: 'the',
    لا: 'not',
    لم: 'did not',
    لن: 'will not',
    من: 'from',
    في: 'in',
    على: 'on',
    إلى: 'to',
    عن: 'about',
    ما: 'what',
    إن: 'indeed',
  };

  // Sequential prefix detection (same logic as component detection)
  let remaining = normalized;
  for (const [prefix, meaning] of Object.entries(prefixMap)) {
    if (remaining.startsWith(prefix)) {
      components.push(prefix);
      suggestedMeanings.push(meaning);
      remaining = remaining.slice(prefix.length);
    }
  }

  return { components, suggestedMeanings };
}

/**
 * Suggest normalized translation based on Arabic structure
 */
function suggestTranslation(arabic: string, english: string): {
  suggested: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const { components, suggestedMeanings } = analyzeStructure(arabic);

  if (components.length === 0) {
    return {
      suggested: english,
      confidence: 'low',
      reasoning: 'No recognizable Arabic components found',
    };
  }

  // Build suggested translation from components
  const suggested = suggestedMeanings.join(' ');

  // Determine confidence based on how well it matches the transliteration
  const englishWords = english.toLowerCase().split(/\s+/);
  const matchingComponents = suggestedMeanings.filter(meaning =>
    englishWords.some(word => word.includes(meaning.toLowerCase())),
  );

  let confidence: 'high' | 'medium' | 'low';
  if (matchingComponents.length === suggestedMeanings.length) {
    confidence = 'high';
  } else if (matchingComponents.length > 0) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  const reasoning = `Detected ${components.length} components: ${components.join(' + ')} → ${suggestedMeanings.join(' + ')}`;

  return { suggested, confidence, reasoning };
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchTransliterationCandidates(): Promise<TransliterationCandidate[]> {
  console.log('📊 Fetching words from database...');

  const PAGE_SIZE = 1000;
  const allRows: Array<{
    word_form: string;
    english: string;
    sentence_id: number;
  }> = [];

  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabaseClient
      .from('sentence_words')
      .select('word_form, english, sentence_id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching data:', error);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allRows.push(...data);
    page++;

    if (verbose) {
      console.log(`  Fetched ${allRows.length} rows...`);
    }

    // Apply limit if specified
    if (limit && allRows.length >= limit) {
      hasMore = false;
      break;
    }
  }

  const totalFetched = limit && allRows.length > limit ? limit : allRows.length;
  console.log(`✅ Fetched ${totalFetched} total rows`);

  // Filter and analyze
  console.log('🔬 Analyzing for transliteration patterns...');

  const candidateMap = new Map<
    string,
    {
      arabic: string;
      english: string;
      sentence_ids: number[];
      frequency: number;
    }
  >();

  for (const row of allRows.slice(0, limit)) {
    const wordCount = row.english.trim().split(/\s+/).length;

    // Skip single-word translations (by design no coloring)
    if (wordCount === 1) continue;

    // Check if English contains Arabic phonetics (likely transliteration)
    if (!hasArabicPhonetics(row.english)) continue;

    // Analyze to check if components detected
    const analysis = analyzeArabicWord(row.word_form, row.english);

    // Skip if already has component detection (already working)
    if (analysis.hasComponents) continue;

    // Check if Arabic has recognizable structure
    const { components } = analyzeStructure(row.word_form);
    if (components.length === 0) continue;

    // This is a candidate! Multi-word transliteration with no detection
    const key = `${row.word_form}|${row.english}`;
    const existing = candidateMap.get(key);

    if (existing) {
      existing.frequency++;
      existing.sentence_ids.push(row.sentence_id);
    } else {
      candidateMap.set(key, {
        arabic: row.word_form,
        english: row.english,
        sentence_ids: [row.sentence_id],
        frequency: 1,
      });
    }
  }

  // Convert to array with analysis
  const candidates: TransliterationCandidate[] = Array.from(candidateMap.values())
    .map(word => {
      const { components } = analyzeStructure(word.arabic);
      const { suggested, confidence, reasoning } = suggestTranslation(word.arabic, word.english);

      return {
        arabic: word.arabic,
        normalizedArabic: normalizeArabic(word.arabic),
        english: word.english,
        frequency: word.frequency,
        sentence_ids: word.sentence_ids,
        confidence,
        suggestedTranslation: suggested,
        components,
        reasoning,
      };
    })
    .filter(c => c.frequency >= minFreq)
    .sort((a, b) => {
      // Sort by confidence first, then frequency
      const confidenceOrder = { high: 3, medium: 2, low: 1 };
      if (confidenceOrder[a.confidence] !== confidenceOrder[b.confidence]) {
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      }
      return b.frequency - a.frequency;
    });

  console.log(`✅ Found ${candidates.length} transliteration candidates\n`);

  return candidates;
}

// ============================================================================
// Rule Generation
// ============================================================================

function generateRules(candidates: TransliterationCandidate[]): NormalizationRule[] {
  console.log('📝 Generating normalization rules...\n');

  // Group by normalized Arabic
  const ruleMap = new Map<string, TransliterationCandidate[]>();

  for (const candidate of candidates) {
    const existing = ruleMap.get(candidate.normalizedArabic);
    if (existing) {
      existing.push(candidate);
    } else {
      ruleMap.set(candidate.normalizedArabic, [candidate]);
    }
  }

  // Generate rules
  const rules: NormalizationRule[] = [];

  for (const [normalizedArabic, group] of ruleMap.entries()) {
    // Get all unique English transliterations for this Arabic word
    const transliterations = [
      ...new Set(group.map(c => c.english.toLowerCase().trim())),
    ].sort();

    // Use the most common suggested translation
    const suggestedTranslation =
      group.sort((a, b) => b.frequency - a.frequency)[0]?.suggestedTranslation || '';

    // Calculate total frequency
    const totalFrequency = group.reduce((sum, c) => sum + c.frequency, 0);

    // Get description from components
    const description = group[0]?.reasoning || '';

    rules.push({
      arabic: normalizedArabic,
      transliterations,
      normalizedEnglish: suggestedTranslation,
      description,
      frequency: totalFrequency,
      examples: group.slice(0, 3).map(c => ({ arabic: c.arabic, english: c.english })),
    });
  }

  return rules.sort((a, b) => b.frequency - a.frequency);
}

// ============================================================================
// Output
// ============================================================================

function printResults(candidates: TransliterationCandidate[], rules: NormalizationRule[]) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TOP TRANSLATION NORMALIZATION CANDIDATES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total candidates: ${candidates.length}`);
  console.log(`Unique Arabic words: ${rules.length}\n`);

  console.log('Top 20 Candidates:\n');

  const top20 = candidates.slice(0, 20);
  for (let i = 0; i < top20.length; i++) {
    const c = top20[i];
    console.log(`${i + 1}. ${c.arabic} → "${c.english}" (${c.frequency}x)`);
    console.log(`   Suggested: "${c.suggestedTranslation}"`);
    console.log(`   Confidence: ${c.confidence.toUpperCase()}`);
    console.log(`   ${c.reasoning}\n`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SUGGESTED NORMALIZATION RULES');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Add these to constants/translationNormalizations.ts:\n');

  const top10Rules = rules.slice(0, 10);
  for (const rule of top10Rules) {
    console.log(`{`);
    console.log(`  arabic: '${rule.arabic}',`);
    console.log(`  transliterations: [${rule.transliterations.map(t => `'${t}'`).join(', ')}],`);
    console.log(`  normalizedEnglish: '${rule.normalizedEnglish}',`);
    console.log(`  description: '${rule.description}',`);
    console.log(`},\n`);
  }

  if (outputJson) {
    const outputPath = path.join(__dirname, 'translation-normalizations.json');
    fs.writeFileSync(
      outputPath,
      JSON.stringify(
        {
          candidates,
          rules,
          metadata: {
            totalCandidates: candidates.length,
            uniqueArabicWords: rules.length,
            minFrequency: minFreq,
            generatedAt: new Date().toISOString(),
          },
        },
        null,
        2,
      ),
    );
    console.log(`\n✅ Full results written to: ${outputPath}`);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  try {
    const candidates = await fetchTransliterationCandidates();
    const rules = generateRules(candidates);

    printResults(candidates, rules);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
