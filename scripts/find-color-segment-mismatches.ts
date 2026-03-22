/**
 * Find Arabic words where the color segment analysis has issues:
 * 1. Joined segments don't match original word
 * 2. Arabic colored segment count != English component count
 * 3. Empty or whitespace-only segments
 * 4. Component arabicMatch doesn't appear in original word
 */

import { createClient } from '@supabase/supabase-js';

import { Colors } from '../constants/colors';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../constants/supabase';
import type { Database } from '../types/database.types';
import { analyzeArabicWord } from '../utils/arabicWordAnalysis';
import { formatWordAnalysis } from '../utils/arabicAnalysis/colorSegments';
import { normalizeArabic } from '../utils/arabicAnalysis/normalization';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
const colors = Colors.dark;

interface Issue {
  wordForm: string;
  english: string;
  issueType: string;
  details: string;
}

function shouldInjectBracket(normalizedArabic: string, english: string): boolean {
  // Mirror the logic from computeColoredSegments
  const alPrefix = normalizedArabic.startsWith('ال') || normalizedArabic.startsWith('وال') ||
    normalizedArabic.startsWith('بال') || normalizedArabic.startsWith('فال') ||
    normalizedArabic.startsWith('كال') || normalizedArabic.startsWith('لل');
  const alreadyHasThe = /^\[?the\]?\s/i.test(english) || /^the$/i.test(english);
  return alPrefix && !alreadyHasThe;
}

async function findMismatches() {
  console.log('Fetching words from database...\n');

  const { data, error } = await supabase
    .from('sentence_words')
    .select('word_form, english')
    .order('word_form');

  if (error) {
    console.error(`Query error: ${error.message}`);
    process.exit(1);
  }

  if (!data?.length) {
    console.log('No words found.');
    process.exit(0);
  }

  // Deduplicate
  const seen = new Set<string>();
  const uniqueWords: Array<{ word_form: string; english: string }> = [];
  for (const row of data) {
    const key = `${row.word_form}|${row.english}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueWords.push(row);
    }
  }

  console.log(`${uniqueWords.length} unique word pairs.\n`);

  const issues: Issue[] = [];
  let coloredCount = 0;

  for (const { word_form, english } of uniqueWords) {
    // Run through the same pipeline as the app
    const normalizedArabic = normalizeArabic(word_form);
    const processedEnglish = shouldInjectBracket(normalizedArabic, english)
      ? `[the] ${english}`
      : english;

    const analysis = analyzeArabicWord(word_form, processedEnglish);
    if (!analysis?.hasComponents) continue;

    coloredCount++;
    const formatted = formatWordAnalysis(analysis);
    if (!formatted?.reconstructedArabic) continue;

    const segments = formatted.reconstructedArabic.segments;
    const joined = segments.map(s => s.text).join('');

    // CHECK 1: Reconstruction mismatch
    if (joined !== word_form) {
      issues.push({
        wordForm: word_form,
        english,
        issueType: 'RECONSTRUCTION_MISMATCH',
        details: `joined="${joined}" vs original="${word_form}"`,
      });
    }

    // CHECK 2: Empty segments
    if (segments.some(s => s.text.length === 0)) {
      issues.push({
        wordForm: word_form,
        english,
        issueType: 'EMPTY_SEGMENT',
        details: `segments: ${JSON.stringify(segments.map(s => ({ text: s.text, type: s.type })))}`,
      });
    }

    // CHECK 3: Count colored Arabic segments vs English component sections
    const coloredArabicSegments = segments.filter(s => s.type !== 'root');
    const componentSections = formatted.sections.filter(s => s.type === 'components');

    if (coloredArabicSegments.length !== componentSections.length) {
      issues.push({
        wordForm: word_form,
        english,
        issueType: 'SEGMENT_COUNT_MISMATCH',
        details: [
          `arabicColoredSegments=${coloredArabicSegments.length} vs englishComponents=${componentSections.length}`,
          `arabicSegments: ${JSON.stringify(coloredArabicSegments.map(s => ({ text: s.text, type: s.type, color: s.colorName })))}`,
          `englishSections: ${JSON.stringify(componentSections.map(s => ({ arabic: s.arabicPart, english: s.englishPart, color: s.colorName })))}`,
        ].join('\n    '),
      });
    }

    // CHECK 4: Component arabicMatch not found in original word (with diacritics)
    for (const prefix of analysis.prefixes || []) {
      if (!normalizedArabic.includes(normalizeArabic(prefix.arabicMatch))) {
        issues.push({
          wordForm: word_form,
          english,
          issueType: 'PREFIX_NOT_IN_WORD',
          details: `prefix "${prefix.arabicMatch}" not found in normalized "${normalizedArabic}"`,
        });
      }
    }
    if (analysis.suffix) {
      if (!normalizedArabic.includes(normalizeArabic(analysis.suffix.arabicMatch))) {
        issues.push({
          wordForm: word_form,
          english,
          issueType: 'SUFFIX_NOT_IN_WORD',
          details: `suffix "${analysis.suffix.arabicMatch}" not found in normalized "${normalizedArabic}"`,
        });
      }
    }

    // CHECK 5: Colored segment colors don't match between Arabic segments and English sections
    // (same components should have same colorName)
    for (let i = 0; i < Math.min(coloredArabicSegments.length, componentSections.length); i++) {
      const seg = coloredArabicSegments[i];
      const sec = componentSections[i];
      if (seg && sec && seg.colorName !== sec.colorName) {
        issues.push({
          wordForm: word_form,
          english,
          issueType: 'COLOR_NAME_MISMATCH',
          details: `segment[${i}] color="${seg.colorName}" vs section[${i}] color="${sec.colorName}" (type: ${seg.type})`,
        });
      }
    }

    // CHECK 6: Diacritic segment exists in Arabic but no diacritic section in English (or vice versa)
    const hasDiacriticSegment = segments.some(s => s.type === 'diacritic');
    const hasDiacriticAnalysis = !!analysis.diacritic;
    if (hasDiacriticSegment !== hasDiacriticAnalysis) {
      issues.push({
        wordForm: word_form,
        english,
        issueType: 'DIACRITIC_MISMATCH',
        details: `diacriticSegment=${hasDiacriticSegment} vs diacriticAnalysis=${hasDiacriticAnalysis}`,
      });
    }
  }

  console.log(`Words with color coding: ${coloredCount}`);
  console.log(`Issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    // Group by issue type
    const byType = new Map<string, Issue[]>();
    for (const issue of issues) {
      const list = byType.get(issue.issueType) || [];
      list.push(issue);
      byType.set(issue.issueType, list);
    }

    for (const [type, typeIssues] of byType) {
      console.log(`=== ${type} (${typeIssues.length}) ===\n`);
      for (const issue of typeIssues) {
        console.log(`  "${issue.wordForm}" (${issue.english})`);
        console.log(`    ${issue.details}`);
        console.log();
      }
    }

    // Write fixture for tests
    const fs = await import('fs');
    const dir = '__tests__/fixtures';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(`${dir}/colorSegmentIssues.json`, JSON.stringify(issues, null, 2));
    console.log(`Wrote ${issues.length} issues to ${dir}/colorSegmentIssues.json`);
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

findMismatches();
