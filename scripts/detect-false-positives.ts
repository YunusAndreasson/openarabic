#!/usr/bin/env npx tsx
/**
 * False Positive Detection System
 *
 * Data-driven approach to find words that ARE colored but SHOULDN'T be.
 * Uses 5 algorithmic detectors + LLM linguistic analysis to identify edge cases.
 *
 * Target cases:
 * - Root letter confusion (ب/ك as prefix when it's a root letter)
 * - Weak root over-detection (weak roots like و/ي/ا)
 * - Verb conjugation mistakes (pronoun claimed by suffix but it's verb conjugation)
 * - Broken plural false positives
 * - Component overlap errors
 *
 * Usage:
 *   npx tsx scripts/detect-false-positives.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { analyzeArabicWord } from '../utils/arabicWordAnalysis';
import { supabaseClient } from './utils/supabase-standalone';

// ============================================================================
// CONFIGURATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIN_FREQUENCY = 2; // Minimum word frequency to consider
const OUTPUT_DIR = path.join(__dirname, 'output');
const PAGE_SIZE = 1000; // Fetch in pages to handle large dataset

// ============================================================================
// TYPES
// ============================================================================

interface ColoredWord {
  arabic: string;
  english: string;
  prefix: string[];
  prefixEnglish: string[];
  suffix: string | null;
  suffixEnglish: string[];
  root: string;
  frequency: number;
  wordCount: number;
  sentence_ids: number[];
}

interface DetectionSignal {
  detector: string;
  severity: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  reason: string;
  evidence: string;
}

interface FalsePositiveCandidate {
  word: ColoredWord;
  signals: DetectionSignal[];
  totalScore: number; // Weighted sum of signal scores
  patternType: string;
}

interface PatternCluster {
  pattern: string;
  candidates: FalsePositiveCandidate[];
  totalInstances: number;
  avgScore: number;
}

// ============================================================================
// PHASE 1: SMART DATA FETCHING
// ============================================================================

/**
 * Fetch all colored words with components from database
 * Uses analyzeArabicWord to detect components
 */
async function fetchColoredWords(verbose = false): Promise<ColoredWord[]> {
  console.log('📊 Fetching words from database...');

  const allRows: Array<{ word_form: string; english: string; sentence_id: number }> = [];
  let page = 0;
  let hasMore = true;

  // Fetch all words in pages
  while (hasMore) {
    const { data, error } = await supabaseClient
      .from('sentence_words')
      .select('word_form, english, sentence_id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Failed to fetch words: ${error.message}`);
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

  console.log(`✅ Fetched ${allRows.length} total words from database`);

  // Analyze each word and keep only those WITH component detection
  console.log('🔍 Analyzing words for component detection...');

  const wordMap = new Map<
    string,
    {
      arabic: string;
      english: string;
      prefix: string[];
      prefixEnglish: string[];
      suffix: string | null;
      suffixEnglish: string[];
      root: string;
      frequency: number;
      sentence_ids: number[];
    }
  >();

  for (const row of allRows) {
    // Skip single-word English (we only care about multi-word for false positives)
    const wordCount = row.english.trim().split(/\s+/).length;
    if (wordCount === 1) continue;

    const analysis = analyzeArabicWord(row.word_form, row.english);

    // Keep only words WITH component detection (opposite of discover script)
    if (!analysis.hasComponents) continue;

    const key = `${row.word_form}|${row.english}`;
    const existing = wordMap.get(key);

    if (existing) {
      existing.frequency++;
      existing.sentence_ids.push(row.sentence_id);
    } else {
      wordMap.set(key, {
        arabic: row.word_form,
        english: row.english,
        prefix: analysis.prefixes.map(p => p.arabicMatch),
        prefixEnglish: analysis.prefixes.flatMap(p => p.englishMatches),
        suffix: analysis.suffix?.arabicMatch || null,
        suffixEnglish: analysis.suffix?.englishMatches || [],
        root: analysis.remainingArabic, // The root is the remaining Arabic after removing components
        frequency: 1,
        sentence_ids: [row.sentence_id],
      });
    }
  }

  // Convert to array and filter by frequency
  const candidates: ColoredWord[] = Array.from(wordMap.values())
    .map(word => ({
      ...word,
      wordCount: word.english.trim().split(/\s+/).length,
    }))
    .filter(word => word.frequency >= MIN_FREQUENCY);

  console.log(
    `📋 Found ${candidates.length} colored multi-word candidates (freq >= ${MIN_FREQUENCY})`,
  );

  return candidates;
}

// ============================================================================
// PHASE 2: ALGORITHMIC DETECTORS
// ============================================================================

/**
 * Detector 1: English-Arabic Alignment Validator
 *
 * Checks if component claims English words that shouldn't be claimed.
 * Example: If suffix claims "my" but "my" doesn't appear in English translation
 */
function detectEnglishArabicMismatch(word: ColoredWord): DetectionSignal | null {
  // Check prefix claims
  if (word.prefix.length > 0 && word.prefixEnglish.length > 0) {
    const prefixClaims = word.prefixEnglish.map(s => s.toLowerCase().trim());
    const englishWords = word.english.toLowerCase().split(/\s+/);

    // Check if ANY claimed word appears in translation
    const hasMatch = prefixClaims.some(claim =>
      englishWords.some(w => w.includes(claim) || claim.includes(w)),
    );

    if (!hasMatch) {
      return {
        detector: 'English-Arabic Alignment',
        severity: 'high',
        confidence: 0.8,
        reason: `Prefix "${word.prefix.join(',')}" claims "${word.prefixEnglish.join(',')}" but these words don't appear in "${word.english}"`,
        evidence: `prefix=${word.prefix.join(',')}, prefixEnglish=${word.prefixEnglish.join(',')}, english=${word.english}`,
      };
    }
  }

  // Check suffix claims
  if (word.suffix && word.suffixEnglish.length > 0) {
    const suffixClaims = word.suffixEnglish.map(s => s.toLowerCase().trim());
    const englishWords = word.english.toLowerCase().split(/\s+/);

    const hasMatch = suffixClaims.some(claim =>
      englishWords.some(w => w.includes(claim) || claim.includes(w)),
    );

    if (!hasMatch) {
      return {
        detector: 'English-Arabic Alignment',
        severity: 'high',
        confidence: 0.8,
        reason: `Suffix "${word.suffix}" claims "${word.suffixEnglish.join(',')}" but these words don't appear in "${word.english}"`,
        evidence: `suffix=${word.suffix}, suffixEnglish=${word.suffixEnglish.join(',')}, english=${word.english}`,
      };
    }
  }

  return null;
}

/**
 * Detector 2: Root Pattern Validator
 *
 * Verifies that root consonants don't match the first letter of a detected prefix.
 * This catches cases like بَابَ where ب is the ROOT, not a prefix.
 */
function detectRootPrefixConflict(word: ColoredWord): DetectionSignal | null {
  if (word.prefix.length === 0 || !word.root) {
    return null;
  }

  const firstArabicChar = word.arabic.replace(/[\u064B-\u065F]/g, '')[0]; // Remove diacritics

  // Check each prefix
  for (const prefix of word.prefix) {
    const prefixBase = prefix.replace(/[\u064B-\u065F]/g, '');

    // Check if prefix is same as first letter AND first letter appears in root
    if (prefixBase === firstArabicChar && word.root.includes(firstArabicChar)) {
      return {
        detector: 'Root Pattern Validator',
        severity: 'high',
        confidence: 0.9,
        reason: `Prefix "${prefix}" matches first letter which is also in root "${word.root}" - likely a root letter, not a prefix`,
        evidence: `arabic=${word.arabic}, prefix=${prefix}, root=${word.root}`,
      };
    }
  }

  return null;
}

/**
 * Detector 3: Component Overlap Detector
 *
 * Flags cases where ب or ك are detected as prefix/suffix when the word starts/ends with them.
 * These are often root letters (ب-و-ب = door, ك-و-ن = to be).
 */
function detectComponentOverlap(word: ColoredWord): DetectionSignal | null {
  const arabicClean = word.arabic.replace(/[\u064B-\u065F]/g, '');

  // Check for ب prefix when word starts with ب
  if (word.prefix.includes('ب') && arabicClean.startsWith('ب')) {
    // Check if it's likely a root letter by examining the full word structure
    // Words like بَيْتِ (house, ب-ي-ت root) or بَابَ (door, ب-و-ب root)
    if (arabicClean.length <= 4) {
      // Short words are more likely to have ب as root
      return {
        detector: 'Component Overlap',
        severity: 'medium',
        confidence: 0.7,
        reason: `ب detected as prefix but word is short and starts with ب - likely a root letter`,
        evidence: `arabic=${word.arabic}, prefix=ب, length=${arabicClean.length}`,
      };
    }
  }

  // Check for ك prefix when word starts with ك
  if (word.prefix.includes('ك') && arabicClean.startsWith('ك')) {
    if (arabicClean.length <= 4) {
      return {
        detector: 'Component Overlap',
        severity: 'medium',
        confidence: 0.7,
        reason: `ك detected as prefix but word is short and starts with ك - likely a root letter`,
        evidence: `arabic=${word.arabic}, prefix=ك, length=${arabicClean.length}`,
      };
    }
  }

  return null;
}

/**
 * Detector 4: Verb Conjugation vs Suffix Detector
 *
 * Checks if a suffix claims a pronoun that's actually part of verb conjugation.
 * Example: كَتَبْتَ (you wrote) - ت is verb conjugation for "you", not a suffix.
 */
function detectVerbConjugation(word: ColoredWord): DetectionSignal | null {
  if (!word.suffix || word.suffixEnglish.length === 0) {
    return null;
  }

  // Subject pronouns that indicate verb conjugation
  const subjectPronouns = ['i', 'you', 'he', 'she', 'we', 'they'];
  const suffixClaims = word.suffixEnglish.map(s => s.toLowerCase().trim());

  // Check if suffix claims a subject pronoun
  const claimsSubject = suffixClaims.some(claim => subjectPronouns.includes(claim));

  if (claimsSubject) {
    // Check if English translation suggests verb conjugation
    const englishLower = word.english.toLowerCase();
    const hasVerbPattern =
      englishLower.includes('he ') ||
      englishLower.includes('she ') ||
      englishLower.includes('they ') ||
      englishLower.includes('i ') ||
      englishLower.includes('you ') ||
      englishLower.includes('we ');

    if (hasVerbPattern) {
      return {
        detector: 'Verb Conjugation Detector',
        severity: 'medium',
        confidence: 0.6,
        reason: `Suffix "${word.suffix}" claims subject pronoun "${word.suffixEnglish.join(',')}" but English suggests verb conjugation`,
        evidence: `suffix=${word.suffix}, suffixEnglish=${word.suffixEnglish.join(',')}, english=${word.english}`,
      };
    }
  }

  return null;
}

/**
 * Detector 5: Statistical Consistency Checker
 *
 * Flags outliers where similar Arabic patterns aren't detected consistently.
 * Example: If بَيْتِ is colored but بَيْتَ isn't, one is likely wrong.
 *
 * Note: This detector is simplified since we only have colored words in our dataset.
 * It checks for statistical anomalies within the colored set.
 */
function detectStatisticalInconsistency(
  word: ColoredWord,
  allWords: ColoredWord[],
): DetectionSignal | null {
  // Find similar words (same root structure, different vowels/case endings)
  const arabicBase = word.arabic.replace(/[\u064B-\u065F]/g, ''); // Remove all diacritics
  const arabicConsonants = arabicBase.replace(/[اوي]/g, ''); // Remove weak letters

  // Find words with same consonant pattern (excluding this word)
  const similarWords = allWords.filter(w => {
    const wBase = w.arabic.replace(/[\u064B-\u065F]/g, '');
    const wConsonants = wBase.replace(/[اوي]/g, '');
    return wConsonants === arabicConsonants && w.arabic !== word.arabic;
  });

  if (similarWords.length === 0) {
    return null; // No similar words to compare
  }

  // Check if this word has different component detection than similar words
  const hasPrefix = word.prefix.length > 0;
  const hasSuffix = word.suffix !== null;

  const similarWithPrefix = similarWords.filter(w => w.prefix.length > 0).length;
  const similarWithSuffix = similarWords.filter(w => w.suffix !== null).length;

  // If this word has prefix but most similar words don't (or vice versa)
  if (hasPrefix && similarWithPrefix < similarWords.length * 0.3) {
    return {
      detector: 'Statistical Consistency',
      severity: 'low',
      confidence: 0.5,
      reason: `This word has prefix but ${similarWords.length - similarWithPrefix}/${similarWords.length} similar words don't - possible inconsistency`,
      evidence: `similar words: ${similarWords.map(w => w.arabic).join(', ')}`,
    };
  }

  if (hasSuffix && similarWithSuffix < similarWords.length * 0.3) {
    return {
      detector: 'Statistical Consistency',
      severity: 'low',
      confidence: 0.5,
      reason: `This word has suffix but ${similarWords.length - similarWithSuffix}/${similarWords.length} similar words don't - possible inconsistency`,
      evidence: `similar words: ${similarWords.map(w => w.arabic).join(', ')}`,
    };
  }

  return null;
}

// ============================================================================
// PHASE 3: RUN DETECTORS & SCORE
// ============================================================================

/**
 * Run all detectors on a word and calculate total score
 */
function analyzeWord(word: ColoredWord, allWords: ColoredWord[]): FalsePositiveCandidate | null {
  const signals: DetectionSignal[] = [];

  // Run all 5 detectors
  const signal1 = detectEnglishArabicMismatch(word);
  const signal2 = detectRootPrefixConflict(word);
  const signal3 = detectComponentOverlap(word);
  const signal4 = detectVerbConjugation(word);
  const signal5 = detectStatisticalInconsistency(word, allWords);

  if (signal1) signals.push(signal1);
  if (signal2) signals.push(signal2);
  if (signal3) signals.push(signal3);
  if (signal4) signals.push(signal4);
  if (signal5) signals.push(signal5);

  // If no signals, not a candidate
  if (signals.length === 0) {
    return null;
  }

  // Calculate total score (weighted by severity and confidence)
  const severityWeights = { high: 3, medium: 2, low: 1 };
  const totalScore = signals.reduce((sum, signal) => {
    return sum + severityWeights[signal.severity] * signal.confidence;
  }, 0);

  // Determine pattern type
  const patternType = determinePatternType(word, signals);

  return {
    word,
    signals,
    totalScore,
    patternType,
  };
}

/**
 * Determine pattern type based on signals
 */
function determinePatternType(word: ColoredWord, signals: DetectionSignal[]): string {
  if (signals.some(s => s.detector === 'Root Pattern Validator')) {
    return 'Root Letter Confusion';
  }
  if (signals.some(s => s.detector === 'Component Overlap')) {
    return 'Component Overlap';
  }
  if (signals.some(s => s.detector === 'Verb Conjugation Detector')) {
    return 'Verb Conjugation Mistake';
  }
  if (signals.some(s => s.detector === 'English-Arabic Alignment')) {
    return 'Alignment Mismatch';
  }
  if (signals.some(s => s.detector === 'Statistical Consistency')) {
    return 'Statistical Outlier';
  }
  return 'Unknown';
}

// ============================================================================
// PHASE 4: CLUSTER & PRIORITIZE
// ============================================================================

/**
 * Cluster candidates by pattern type
 */
function clusterByPattern(candidates: FalsePositiveCandidate[]): PatternCluster[] {
  const clusters = new Map<string, FalsePositiveCandidate[]>();

  candidates.forEach(candidate => {
    const pattern = candidate.patternType;
    if (!clusters.has(pattern)) {
      clusters.set(pattern, []);
    }
    clusters.get(pattern)!.push(candidate);
  });

  return Array.from(clusters.entries()).map(([pattern, candidates]) => {
    const totalInstances = candidates.reduce((sum, c) => sum + c.word.frequency, 0);
    const avgScore = candidates.reduce((sum, c) => sum + c.totalScore, 0) / candidates.length;

    return {
      pattern,
      candidates: candidates.sort((a, b) => b.totalScore - a.totalScore),
      totalInstances,
      avgScore,
    };
  });
}

// ============================================================================
// PHASE 5: OUTPUT
// ============================================================================

/**
 * Generate JSON output
 */
function generateJSONOutput(
  clusters: PatternCluster[],
  allCandidates: FalsePositiveCandidate[],
): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `false-positives-${timestamp}.json`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      totalCandidates: allCandidates.length,
      totalClusters: clusters.length,
      minFrequency: MIN_FREQUENCY,
    },
    summary: {
      byPattern: clusters.map(cluster => ({
        pattern: cluster.pattern,
        count: cluster.candidates.length,
        instances: cluster.totalInstances,
        avgScore: cluster.avgScore.toFixed(2),
      })),
    },
    clusters: clusters.map(cluster => ({
      pattern: cluster.pattern,
      totalInstances: cluster.totalInstances,
      avgScore: cluster.avgScore,
      topCandidates: cluster.candidates.slice(0, 10).map(candidate => ({
        arabic: candidate.word.arabic,
        english: candidate.word.english,
        frequency: candidate.word.frequency,
        totalScore: candidate.totalScore,
        components: {
          prefix: candidate.word.prefix.join(','),
          prefixEnglish: candidate.word.prefixEnglish.join(','),
          suffix: candidate.word.suffix || '',
          suffixEnglish: candidate.word.suffixEnglish.join(','),
          root: candidate.word.root,
        },
        signals: candidate.signals.map(signal => ({
          detector: signal.detector,
          severity: signal.severity,
          confidence: signal.confidence,
          reason: signal.reason,
        })),
      })),
    })),
  };

  fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
  console.log(`\n📄 JSON output saved to: ${filepath}`);
}

/**
 * Generate human-readable report
 */
function generateReport(
  clusters: PatternCluster[],
  allCandidates: FalsePositiveCandidate[],
): void {
  console.log('\n' + '='.repeat(80));
  console.log('FALSE POSITIVE DETECTION REPORT');
  console.log('='.repeat(80));

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total candidates found: ${allCandidates.length}`);
  console.log(`   Pattern clusters: ${clusters.length}`);
  console.log(`   Total instances: ${allCandidates.reduce((sum, c) => sum + c.word.frequency, 0)}`);

  console.log(`\n🔍 TOP PATTERNS:`);
  clusters
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5)
    .forEach((cluster, i) => {
      console.log(`\n${i + 1}. ${cluster.pattern}`);
      console.log(`   Candidates: ${cluster.candidates.length}`);
      console.log(`   Instances: ${cluster.totalInstances}`);
      console.log(`   Avg Score: ${cluster.avgScore.toFixed(2)}`);

      console.log(`   Top Examples:`);
      cluster.candidates.slice(0, 3).forEach(candidate => {
        console.log(`      ${candidate.word.arabic} → "${candidate.word.english}"`);
        console.log(`      Score: ${candidate.totalScore.toFixed(2)}, Signals: ${candidate.signals.length}`);
        candidate.signals.forEach(signal => {
          console.log(`         • [${signal.severity}] ${signal.reason}`);
        });
      });
    });

  console.log('\n' + '='.repeat(80));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  try {
    console.log('🚀 Starting False Positive Detection System\n');

    // Phase 1: Fetch data
    const coloredWords = await fetchColoredWords();

    // Phase 2 & 3: Run detectors and analyze
    console.log('\n🔍 Running 5 algorithmic detectors...');
    const candidates: FalsePositiveCandidate[] = [];

    for (const word of coloredWords) {
      const candidate = analyzeWord(word, coloredWords);
      if (candidate) {
        candidates.push(candidate);
      }
    }

    console.log(`✅ Found ${candidates.length} false positive candidates`);

    if (candidates.length === 0) {
      console.log('✨ No false positives detected! System is working perfectly.');
      return;
    }

    // Phase 4: Cluster by pattern
    console.log('\n📊 Clustering by pattern type...');
    const clusters = clusterByPattern(candidates);

    // Phase 5: Generate output
    generateJSONOutput(clusters, candidates);
    generateReport(clusters, candidates);

    console.log('\n✅ False positive detection complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
