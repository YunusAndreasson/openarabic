#!/usr/bin/env npx tsx
/**
 * Stage 3: enrich the 288 curated backfill candidates with the surrounding sentence
 * (Arabic + English). The candidate list comes from /tmp/backfill-curated.json (or its
 * persisted twin in scripts/output/). For each (word_form, english) pair we look up
 * one or more sentence_words rows that match, fetch the parent article_sentence, and
 * dump the joined view for human review.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { supabaseClient } from './utils/supabase-standalone';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Candidate {
  arabic: string;
  current: string;
  suggested: string;
  helper: string;
  trigger: string;
  occurrences: number;
  reasonKept: string;
}

async function main() {
  const curatedPath = path.resolve(__dirname, 'output', 'backfill-curated.json');
  const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8')) as {
    keptFlatList: Candidate[];
  };
  const cands = curated.keptFlatList;
  console.log(`loaded ${cands.length} curated candidates`);

  // Load the raw production dump so we can get sentence_words IDs cheaply.
  // We'll re-query Supabase for the joined sentence rows.
  type SwRow = { id: number; word_form: string; english: string; sentence_id: number; position: number };
  const swRows: SwRow[] = [];
  const PAGE = 1000;
  for (let page = 0; ; page++) {
    const { data, error } = await supabaseClient
      .from('sentence_words')
      .select('id, word_form, english, sentence_id, position')
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    swRows.push(...data);
    process.stdout.write(`\rsentence_words fetched: ${swRows.length}`);
    if (data.length < PAGE) break;
  }
  process.stdout.write('\n');

  // Index by (word_form, english)
  const byPair = new Map<string, SwRow[]>();
  for (const r of swRows) {
    if (!r.word_form || !r.english) continue;
    const k = `${r.word_form.trim()}\t${r.english.trim()}`;
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k)!.push(r);
  }

  // Collect all sentence_ids we need (up to 3 per candidate to keep the volume reasonable)
  const wantedSids = new Set<number>();
  const candToSwSample = new Map<string, SwRow[]>();
  for (const c of cands) {
    const k = `${c.arabic}\t${c.current}`;
    const matches = byPair.get(k) ?? [];
    const sample = matches.slice(0, 3);
    candToSwSample.set(k, sample);
    for (const s of sample) wantedSids.add(s.sentence_id);
  }
  console.log(`distinct sentence_ids needed: ${wantedSids.size}`);

  // Fetch article_sentences in batches
  const sentMap = new Map<number, { arabic: string; english: string }>();
  const sids = [...wantedSids];
  const CHUNK = 200;
  for (let i = 0; i < sids.length; i += CHUNK) {
    const chunk = sids.slice(i, i + CHUNK);
    const { data, error } = await supabaseClient
      .from('article_sentences')
      .select('id, arabic, english')
      .in('id', chunk);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) sentMap.set(r.id, { arabic: r.arabic, english: r.english });
    process.stdout.write(`\rsentences fetched: ${sentMap.size}/${wantedSids.size}`);
  }
  process.stdout.write('\n');

  // Build the enriched review file
  type Enriched = Candidate & {
    contexts: { sentenceId: number; position: number; sentenceArabic: string; sentenceEnglish: string }[];
  };
  const enriched: Enriched[] = cands.map((c) => {
    const k = `${c.arabic}\t${c.current}`;
    const sw = candToSwSample.get(k) ?? [];
    const contexts = sw.map((r) => {
      const s = sentMap.get(r.sentence_id);
      return {
        sentenceId: r.sentence_id,
        position: r.position,
        sentenceArabic: s?.arabic ?? '(missing)',
        sentenceEnglish: s?.english ?? '(missing)',
      };
    });
    return { ...c, contexts };
  });

  // Group by reason for skim-readability
  const byReason = new Map<string, Enriched[]>();
  for (const e of enriched) {
    const arr = byReason.get(e.reasonKept) ?? [];
    arr.push(e);
    byReason.set(e.reasonKept, arr);
  }

  const out = path.resolve(__dirname, 'output', 'backfill-curated-with-context.json');
  fs.writeFileSync(out, JSON.stringify({
    summary: { candidates: enriched.length, dbOccurrences: enriched.reduce((s, e) => s + e.occurrences, 0) },
    byReason: Object.fromEntries([...byReason.entries()].map(([k, v]) => [k, v.length])),
    candidates: enriched,
  }, null, 2));
  console.log(`→ ${out}`);

  // Also write a concise markdown for reading
  const md: string[] = [
    `# Backfill review — 288 candidates with surrounding-sentence context`,
    ``,
    `Each entry shows the proposed rewrite and up to 3 sentences where the (word_form, english) pair appears today.`,
    `Use the sentence column to judge whether the rewrite ("he said" vs "said") would read correctly *in context* —`,
    `e.g. if the sentence already has an explicit subject, prepending "he" might be redundant.`,
    ``,
  ];
  for (const [reason, arr] of byReason.entries()) {
    md.push(`\n## ${reason} — ${arr.length} candidates\n`);
    arr.sort((a, b) => b.occurrences - a.occurrences);
    for (const e of arr) {
      md.push(`### \`${e.arabic}\` (${e.occurrences}×)  '${e.current}' → '${e.suggested}'`);
      for (const ctx of e.contexts) {
        md.push(`- \`s${ctx.sentenceId}.${ctx.position}\` AR: ${ctx.sentenceArabic}`);
        md.push(`  EN: ${ctx.sentenceEnglish}`);
      }
      md.push('');
    }
  }
  const mdOut = path.resolve(__dirname, 'output', 'backfill-review.md');
  fs.writeFileSync(mdOut, md.join('\n'));
  console.log(`→ ${mdOut}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
