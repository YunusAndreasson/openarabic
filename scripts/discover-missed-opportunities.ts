#!/usr/bin/env npx tsx
/**
 * Missed Opportunity Discovery Script
 *
 * Finds multi-word English translations that have NO component detection,
 * indicating we might be missing Arabic patterns/components in our database.
 *
 * Strategy:
 * 1. Smart Fetch: Multi-word translations with hasComponents=false
 * 2. Pattern Mining: Group by Arabic patterns (prefix/suffix candidates)
 * 3. LLM Analysis: Batch analysis to discover NEW components
 * 4. Impact Scoring: Prioritize by frequency × pattern consistency
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

interface WordCandidate {
  arabic: string;
  english: string;
  frequency: number;
  sentence_ids: number[];
  firstChar: string;
  lastChar: string;
  length: number;
  wordCount: number;
}

interface PatternCluster {
  pattern: string;
  type: 'prefix' | 'suffix' | 'both';
  examples: WordCandidate[];
  totalFrequency: number;
  consistencyScore: number; // 0-1, how consistent is this pattern?
}

interface OpportunityDiscovery {
  pattern: string;
  type: 'prefix' | 'suffix' | 'preposition' | 'compound';
  arabicComponent: string;
  englishPatterns: string[];
  examples: Array<{ arabic: string; english: string; freq: number }>;
  totalFrequency: number;
  impactScore: number;
  confidence: number; // 0-100, LLM confidence this is a real component
  reasoning: string; // LLM linguistic analysis
  suggestedFix: string; // Code to add to arabicWordComponents.ts
}

// ============================================================================
// Configuration
// ============================================================================

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith('--limit'))?.split('=')[1];
const outputJson = args.includes('--output-json');
const verbose = args.includes('--verbose');
const minFreq = 2; // Focus on patterns appearing 2+ times

console.log('🔍 Discovering Missed Opportunities...\n');
console.log('Configuration:');
console.log(`  - Minimum frequency: ${minFreq}`);
console.log(`  - Output JSON: ${outputJson ? 'Yes' : 'No'}`);
console.log(`  - Verbose: ${verbose ? 'Yes' : 'No'}\n`);

// ============================================================================
// Smart Data Fetching
// ============================================================================

async function fetchUncoloredMultiWord(): Promise<WordCandidate[]> {
  console.log('📊 Fetching uncolored multi-word translations...');

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
  }

  console.log(`✅ Fetched ${allRows.length} total rows`);

  // Filter and group
  console.log('🔬 Analyzing for missed opportunities...');

  const wordMap = new Map<
    string,
    { arabic: string; english: string; sentence_ids: number[]; frequency: number }
  >();

  for (const row of allRows) {
    const wordCount = row.english.trim().split(/\s+/).length;

    // Skip single-word translations (never colored by design)
    if (wordCount === 1) continue;

    // Analyze to check if components detected
    const analysis = analyzeArabicWord(row.word_form, row.english);

    // Skip if already has component detection
    if (analysis.hasComponents) continue;

    // This is an opportunity! Multi-word with no detection
    const key = `${row.word_form}|${row.english}`;
    const existing = wordMap.get(key);

    if (existing) {
      existing.frequency++;
      existing.sentence_ids.push(row.sentence_id);
    } else {
      wordMap.set(key, {
        arabic: row.word_form,
        english: row.english,
        sentence_ids: [row.sentence_id],
        frequency: 1,
      });
    }
  }

  // Convert to array and add metadata
  const candidates: WordCandidate[] = Array.from(wordMap.values())
    .map((word) => ({
      arabic: word.arabic,
      english: word.english,
      frequency: word.frequency,
      sentence_ids: word.sentence_ids,
      firstChar: word.arabic.replace(/[َُِّْ]/g, '')[0] || '',
      lastChar: word.arabic.replace(/[َُِّْ]/g, '').slice(-1),
      length: word.arabic.replace(/[َُِّْ]/g, '').length,
      wordCount: word.english.trim().split(/\s+/).length,
    }))
    .filter((c) => c.frequency >= minFreq) // Focus on patterns appearing 2+ times
    .sort((a, b) => b.frequency - a.frequency);

  console.log(`✅ Found ${candidates.length} uncolored multi-word patterns\n`);

  return candidates;
}

// ============================================================================
// Pattern Mining & Clustering
// ============================================================================

function clusterByPatterns(candidates: WordCandidate[]): PatternCluster[] {
  console.log('🔍 Mining patterns...');

  const prefixClusters = new Map<string, WordCandidate[]>();
  const suffixClusters = new Map<string, WordCandidate[]>();

  // Common Arabic prefixes to look for
  const prefixPatterns = ['ب', 'و', 'ف', 'ل', 'ال', 'ك', 'في', 'من', 'على', 'عن', 'إلى', 'عند'];

  // Common Arabic suffixes to look for
  const suffixPatterns = ['ه', 'ها', 'ك', 'ي', 'نا', 'كم', 'هم', 'هن', 'ني', 'كما', 'هما'];

  for (const candidate of candidates) {
    const normalized = candidate.arabic.replace(/[َُِّْ]/g, '');

    // Check for prefix patterns
    for (const prefix of prefixPatterns) {
      if (normalized.startsWith(prefix)) {
        if (!prefixClusters.has(prefix)) {
          prefixClusters.set(prefix, []);
        }
        prefixClusters.get(prefix)!.push(candidate);
      }
    }

    // Check for suffix patterns
    for (const suffix of suffixPatterns) {
      if (normalized.endsWith(suffix)) {
        if (!suffixClusters.has(suffix)) {
          suffixClusters.set(suffix, []);
        }
        suffixClusters.get(suffix)!.push(candidate);
      }
    }
  }

  // Convert to clusters and calculate metrics
  const clusters: PatternCluster[] = [];

  // Add prefix clusters
  for (const [pattern, examples] of prefixClusters.entries()) {
    if (examples.length >= 2) {
      // Need at least 2 examples
      const totalFrequency = examples.reduce((sum, ex) => sum + ex.frequency, 0);
      const consistencyScore = examples.length / candidates.length;

      clusters.push({
        pattern,
        type: 'prefix',
        examples: examples.slice(0, 10), // Top 10 examples
        totalFrequency,
        consistencyScore,
      });
    }
  }

  // Add suffix clusters
  for (const [pattern, examples] of suffixClusters.entries()) {
    if (examples.length >= 2) {
      const totalFrequency = examples.reduce((sum, ex) => sum + ex.frequency, 0);
      const consistencyScore = examples.length / candidates.length;

      clusters.push({
        pattern,
        type: 'suffix',
        examples: examples.slice(0, 10),
        totalFrequency,
        consistencyScore,
      });
    }
  }

  // Sort by impact (frequency × consistency)
  clusters.sort((a, b) => {
    const scoreA = a.totalFrequency * a.consistencyScore;
    const scoreB = b.totalFrequency * b.consistencyScore;
    return scoreB - scoreA;
  });

  console.log(`✅ Found ${clusters.length} pattern clusters\n`);

  return clusters;
}

// ============================================================================
// LLM Analysis Preparation
// ============================================================================

function prepareLLMBatches(clusters: PatternCluster[]): void {
  console.log('📝 Preparing for LLM analysis...\n');

  console.log('=' .repeat(80));
  console.log('PATTERN CLUSTERS FOR LLM ANALYSIS');
  console.log('='.repeat(80));
  console.log();

  let batchNumber = 1;
  const BATCH_SIZE = 10;

  for (let i = 0; i < clusters.length; i += BATCH_SIZE) {
    const batch = clusters.slice(i, i + BATCH_SIZE);

    console.log(`\n📦 BATCH ${batchNumber} (${batch.length} patterns)\n`);

    for (const cluster of batch) {
      console.log(`Pattern: ${cluster.pattern} (${cluster.type})`);
      console.log(`  Frequency: ${cluster.totalFrequency} instances`);
      console.log(`  Examples: ${cluster.examples.length} words`);
      console.log(`  Top examples:`);

      cluster.examples.slice(0, 5).forEach((ex) => {
        console.log(`    - ${ex.arabic} → "${ex.english}" (freq: ${ex.frequency})`);
      });

      console.log();
    }

    batchNumber++;
  }

  console.log('='.repeat(80));
  console.log('\n💡 Next Step: LLM Analysis');
  console.log('For each cluster, analyze:');
  console.log('  1. Is this a valid Arabic component (prefix/suffix/preposition)?');
  console.log('  2. What English patterns does it map to?');
  console.log('  3. Why is it currently not detected?');
  console.log('  4. What code should be added to arabicWordComponents.ts?');
  console.log('  5. Confidence score (0-100): How sure are you?');
  console.log();
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  try {
    // Phase 1: Smart fetch
    const candidates = await fetchUncoloredMultiWord();

    if (candidates.length === 0) {
      console.log('✅ No missed opportunities found! System is complete.');
      return;
    }

    // Phase 2: Pattern mining
    const clusters = clusterByPatterns(candidates);

    // Phase 3: Prepare for LLM analysis
    prepareLLMBatches(clusters);

    // Output summary
    console.log('📊 DISCOVERY SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total uncolored multi-word instances: ${candidates.reduce((sum, c) => sum + c.frequency, 0)}`);
    console.log(`Unique uncolored multi-word patterns: ${candidates.length}`);
    console.log(`Pattern clusters found: ${clusters.length}`);
    console.log(`Top opportunity: ${clusters[0]?.pattern} (${clusters[0]?.totalFrequency} instances)`);
    console.log();

    // Save to JSON if requested
    if (outputJson) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `missed-opportunities-${timestamp}.json`;
      const outputPath = path.join(__dirname, 'output', filename);

      const output = {
        meta: {
          generatedAt: new Date().toISOString(),
          totalCandidates: candidates.length,
          totalClusters: clusters.length,
          minFrequency: minFreq,
        },
        summary: {
          totalInstances: candidates.reduce((sum, c) => sum + c.frequency, 0),
          uniquePatterns: candidates.length,
          topOpportunity: clusters[0]?.pattern,
        },
        clusters: clusters.map((c) => ({
          pattern: c.pattern,
          type: c.type,
          totalFrequency: c.totalFrequency,
          exampleCount: c.examples.length,
          consistencyScore: c.consistencyScore,
          topExamples: c.examples.slice(0, 10).map((ex) => ({
            arabic: ex.arabic,
            english: ex.english,
            frequency: ex.frequency,
          })),
        })),
        allCandidates: candidates.slice(0, 100), // Top 100 for review
      };

      fs.mkdirSync(path.join(__dirname, 'output'), { recursive: true });
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

      console.log(`✅ Saved detailed analysis to: ${outputPath}\n`);
    }

    console.log('✅ Discovery complete!\n');
  } catch (error) {
    console.error('❌ Error during discovery:', error);
    process.exit(1);
  }
}

main();
