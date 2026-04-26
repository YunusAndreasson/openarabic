#!/usr/bin/env npx tsx
/**
 * Step 1 of building the evaluation corpus for the Arabic word-component classifier.
 *
 * Pulls sentence_words from Supabase, dedupes, applies basic shape filtering,
 * and writes raw (analyzer-free) JSON. Step 2 (`_autoresearch_enrich.test.ts`)
 * runs the analyzer under Jest and produces the bucketed/sampled corpus —
 * splitting analyzer work out keeps this script free of the React Native
 * import chain that breaks standalone tsx execution.
 *
 * Output: scripts/output/eval-corpus.raw.json
 *
 * Run with: npx tsx scripts/build-eval-corpus.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface RawRow {
  word_form: string;
  english: string;
  sentence_id: number;
}

interface DedupedWord {
  arabic: string;
  english: string;
  frequency: number;
  englishWordCount: number;
  arabicLength: number;
}

async function fetchAllSentenceWords(): Promise<RawRow[]> {
  console.log('Fetching all sentence_words…');
  const PAGE = 1000;
  const all: RawRow[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabaseClient
      .from('sentence_words')
      .select('word_form, english, sentence_id')
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) throw new Error(`Supabase: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...(data as RawRow[]));
    page++;
    if (page % 5 === 0) console.log(`  …${all.length} rows`);
  }
  console.log(`Fetched ${all.length} rows total.`);
  return all;
}

const ARABIC_RE = /[؀-ۿ]/;
const ARABIC_PRESENTATION_RE = /[ﭐ-﷿ﹰ-﻿]/;

function isUsableRow(r: RawRow): boolean {
  if (!r.word_form || !r.english) return false;
  const a = r.word_form.trim();
  const e = r.english.trim();
  if (a.length < 2) return false;
  if (e.length < 2) return false;
  if (!ARABIC_RE.test(a)) return false;
  // Skip Arabic presentation forms (abbreviations like ﵀ ﵁, ligatures)
  if (ARABIC_PRESENTATION_RE.test(a)) return false;
  if (!/[a-zA-Z]/.test(e)) return false;
  return true;
}

function dedupe(rows: RawRow[]): DedupedWord[] {
  const map = new Map<string, DedupedWord>();
  for (const r of rows) {
    if (!isUsableRow(r)) continue;
    const a = r.word_form.trim();
    const e = r.english.trim();
    const key = `${a}|${e.toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.frequency++;
    } else {
      map.set(key, {
        arabic: a,
        english: e,
        frequency: 1,
        englishWordCount: e.split(/\s+/).filter(Boolean).length,
        arabicLength: a.length,
      });
    }
  }
  return Array.from(map.values());
}

async function main() {
  const rows = await fetchAllSentenceWords();
  console.log('Deduping + filtering…');
  const deduped = dedupe(rows);
  console.log(`  ${deduped.length} unique (arabic, english) pairs.`);

  const dist = {
    singleWord: deduped.filter((d) => d.englishWordCount === 1).length,
    twoWord: deduped.filter((d) => d.englishWordCount === 2).length,
    threeWord: deduped.filter((d) => d.englishWordCount === 3).length,
    fourPlus: deduped.filter((d) => d.englishWordCount >= 4).length,
    freq1: deduped.filter((d) => d.frequency === 1).length,
    freqHigh: deduped.filter((d) => d.frequency >= 5).length,
  };
  console.log(`Distribution:`, dist);

  const outDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'eval-corpus.raw.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceRowCount: rows.length,
        uniqueCount: deduped.length,
        distribution: dist,
        words: deduped,
      },
      null,
      2,
    ),
  );
  console.log(`\nWrote ${deduped.length} unique words → ${outPath}`);
  console.log(`Next: run \`yarn jest __tests__/utils/_autoresearch_enrich.test.ts\``);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
