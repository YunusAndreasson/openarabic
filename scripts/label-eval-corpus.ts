#!/usr/bin/env npx tsx
/**
 * Step 3: LLM-label the eval corpus.
 *
 * Reads scripts/output/eval-corpus.enriched.json (600 entries with current analyzer output).
 * For each entry, asks Claude Opus 4.7 to produce expected component labels:
 * expectedPrefixes, expectedSuffix, expectedInfix, expectedHasComponents.
 * Cross-checks against the captured current analyzer output and flags disagreements.
 *
 * Resumable: appends each labeled entry to scripts/output/eval-corpus.labeled.jsonl
 * Skipping already-completed entries on re-run.
 *
 * Modes:
 *   --dry-run         Estimate token usage and cost without calling the API
 *   --limit=N         Only process the first N entries (for validation runs)
 *   --concurrency=N   Parallel API calls (default 4)
 *
 * Run with: npx tsx scripts/label-eval-corpus.ts --limit=10
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARG = (name: string) =>
  process.argv.find((a) => a.startsWith(`--${name}`))?.split('=')[1] ?? null;
const FLAG = (name: string) => process.argv.includes(`--${name}`);
const DRY_RUN = FLAG('dry-run');
const LIMIT = ARG('limit') ? parseInt(ARG('limit')!, 10) : Infinity;
const CONCURRENCY = ARG('concurrency') ? parseInt(ARG('concurrency')!, 10) : 4;

const MODEL = 'claude-opus-4-5'; // Opus 4.5 — strong linguistic reasoning
// Pricing in USD per million tokens (Opus 4.5)
const PRICE = { input: 15.0, cached: 1.5, output: 75.0 };

const SYSTEM_PROMPT = `You are an expert in Classical and Modern Standard Arabic morphology. Given an Arabic word and its English translation, you identify the morphological components that should be color-coded for educational display in a language-learning app.

Rules of the classification system:

1. Single-word translations MUST have expectedHasComponents=false. The app intentionally does not color-code words whose entire English translation is a single word — color-coding is only educational for multi-word phrases that show compositional meaning.

2. Whole-word particles (لا "no", لم "did not", كم "how much", لولا "if not for", إلا "except", etc.) — when the entire Arabic word IS a standalone particle with no root attached — have no compositional structure: expectedHasComponents=false, expectedPrefixes=[], expectedSuffix=null, expectedInfix=null.

3. Prefixes (in linguistic order) include conjunctions (و, ف), prepositions (ب, ل, ك, في, من, على, عن, إلى, مع), definite article (ال), future-tense particles (س, سوف), negation (لا, لم, لن), other particles (قد, إن, ما, أن, إذا, حتى), and verb subject prefixes (ي, ت, أ, ن).

4. Suffixes are typically possessive/object pronouns (ي, ك, ه, ها, نا, كم, هم, هن, هما) and dual/plural markers (ان, ين, ون, ات).

5. Infixes mark verb-derivation forms (Form VII ن, Form VIII ت, Form X ست) and only apply when the Arabic word actually shows that derivation.

6. expectedPrefixes is an array of Arabic strings in the order they appear at the start of the word. expectedSuffix and expectedInfix are single strings or null.

7. Diacritics alone do NOT count as components — only structural prefixes/suffixes/infixes.

8. When in doubt, prefer NOT detecting a component (precision over recall). False positives are worse than false negatives in a learning app.

Output JSON ONLY, no prose, in this exact shape:
{"expectedPrefixes":[],"expectedSuffix":null,"expectedInfix":null,"expectedHasComponents":false,"confidence":0,"reasoning":""}

confidence is 0-100. reasoning is one short sentence.`;

interface EnrichedEntry {
  arabic: string;
  english: string;
  frequency: number;
  englishWordCount: number;
  arabicLength: number;
  bucket: string;
  currentAnalysis: {
    hasComponents: boolean;
    prefixes: string[];
    suffix: string | null;
    infix: string | null;
    diacritic: string | null;
    remainingArabic: string;
  };
}

interface LabeledEntry extends EnrichedEntry {
  label: {
    expectedPrefixes: string[];
    expectedSuffix: string | null;
    expectedInfix: string | null;
    expectedHasComponents: boolean;
    confidence: number;
    reasoning: string;
  };
  agreesWithAnalyzer: boolean;
  disagreementType: string | null;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
}

function userMessageFor(e: EnrichedEntry): string {
  return `Arabic: ${e.arabic}
English: ${e.english}`;
}

function detectDisagreement(label: LabeledEntry['label'], cur: EnrichedEntry['currentAnalysis']) {
  if (label.expectedHasComponents !== cur.hasComponents) return 'hasComponents_mismatch';
  const lp = [...label.expectedPrefixes].sort().join(',');
  const cp = [...cur.prefixes].sort().join(',');
  if (lp !== cp) return 'prefixes_mismatch';
  if ((label.expectedSuffix ?? '') !== (cur.suffix ?? '')) return 'suffix_mismatch';
  if ((label.expectedInfix ?? '') !== (cur.infix ?? '')) return 'infix_mismatch';
  return null;
}

function loadAlreadyLabeled(outPath: string): Set<string> {
  if (!fs.existsSync(outPath)) return new Set();
  const set = new Set<string>();
  for (const line of fs.readFileSync(outPath, 'utf-8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line);
      set.add(`${o.arabic}|${o.english}`);
    } catch {
      /* skip */
    }
  }
  return set;
}

async function callLabeler(client: Anthropic, e: EnrichedEntry): Promise<LabeledEntry> {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userMessageFor(e) }],
  });

  const textBlock = resp.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text block in response');
  const text = textBlock.text.trim();

  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < 0) throw new Error(`Bad JSON in response: ${text.slice(0, 200)}`);
  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

  const label = {
    expectedPrefixes: Array.isArray(parsed.expectedPrefixes) ? parsed.expectedPrefixes : [],
    expectedSuffix: parsed.expectedSuffix ?? null,
    expectedInfix: parsed.expectedInfix ?? null,
    expectedHasComponents: Boolean(parsed.expectedHasComponents),
    confidence: Number(parsed.confidence ?? 0),
    reasoning: String(parsed.reasoning ?? ''),
  };

  const usage = resp.usage as {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  const cachedTokens = usage.cache_read_input_tokens ?? 0;
  const inputTokens = usage.input_tokens ?? 0; // uncached
  const outputTokens = usage.output_tokens ?? 0;

  const disagreement = detectDisagreement(label, e.currentAnalysis);

  return {
    ...e,
    label,
    agreesWithAnalyzer: disagreement === null,
    disagreementType: disagreement,
    inputTokens,
    cachedTokens,
    outputTokens,
  };
}

function estimateCost(entries: EnrichedEntry[]) {
  const sysApprox = Math.ceil(SYSTEM_PROMPT.length / 4);
  const userApprox = entries.reduce(
    (s, e) => s + Math.ceil(userMessageFor(e).length / 4) + 10,
    0,
  );
  const outApprox = entries.length * 100;
  // First call pays full system tokens (write to cache), rest pay cached rate
  const firstSysCost = (sysApprox * PRICE.input) / 1_000_000;
  const restSysCost = (sysApprox * (entries.length - 1) * PRICE.cached) / 1_000_000;
  const userCost = (userApprox * PRICE.input) / 1_000_000;
  const outCost = (outApprox * PRICE.output) / 1_000_000;
  return {
    estimatedSystemTokens: sysApprox,
    estimatedUserTokensTotal: userApprox,
    estimatedOutputTokensTotal: outApprox,
    estimatedCostUSD: firstSysCost + restSysCost + userCost + outCost,
  };
}

async function processWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, i: number) => Promise<R>,
  concurrency: number,
  onResult: (r: R, i: number) => void,
) {
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try {
        const r = await fn(items[i]!, i);
        onResult(r, i);
      } catch (err) {
        console.error(`  [${i}] error:`, err instanceof Error ? err.message : err);
      }
    }
  });
  await Promise.all(workers);
}

async function main() {
  const enrichedPath = path.join(__dirname, 'output/eval-corpus.enriched.json');
  if (!fs.existsSync(enrichedPath)) {
    console.error(`Missing ${enrichedPath}. Run step 1 + 2 first.`);
    process.exit(1);
  }
  const enriched = JSON.parse(fs.readFileSync(enrichedPath, 'utf-8')) as { entries: EnrichedEntry[] };
  let entries = enriched.entries;
  if (Number.isFinite(LIMIT)) entries = entries.slice(0, LIMIT);

  const outPath = path.join(__dirname, 'output/eval-corpus.labeled.jsonl');
  const done = loadAlreadyLabeled(outPath);
  const todo = entries.filter((e) => !done.has(`${e.arabic}|${e.english}`));

  console.log(`Total entries: ${entries.length}`);
  console.log(`Already labeled: ${done.size}`);
  console.log(`To process: ${todo.length}`);

  const est = estimateCost(todo);
  console.log(`Cost estimate: $${est.estimatedCostUSD.toFixed(2)} (system ~${est.estimatedSystemTokens} tok, user ~${est.estimatedUserTokensTotal} tok, output ~${est.estimatedOutputTokensTotal} tok)`);

  if (DRY_RUN) {
    console.log('Dry run — exiting before API calls.');
    return;
  }

  if (!process.env['ANTHROPIC_API_KEY']) {
    console.error('ANTHROPIC_API_KEY not set. Aborting.');
    process.exit(1);
  }

  const client = new Anthropic();
  const out = fs.createWriteStream(outPath, { flags: 'a' });

  let processed = 0;
  let disagreements = 0;
  let totalCost = 0;
  const start = Date.now();
  await processWithConcurrency(
    todo,
    (e) => callLabeler(client, e),
    CONCURRENCY,
    (labeled) => {
      out.write(JSON.stringify(labeled) + '\n');
      processed++;
      if (!labeled.agreesWithAnalyzer) disagreements++;
      const cost =
        (labeled.inputTokens * PRICE.input) / 1_000_000 +
        (labeled.cachedTokens * PRICE.cached) / 1_000_000 +
        (labeled.outputTokens * PRICE.output) / 1_000_000;
      totalCost += cost;
      if (processed % 10 === 0 || processed === todo.length) {
        const elapsed = (Date.now() - start) / 1000;
        const rate = processed / elapsed;
        const eta = (todo.length - processed) / Math.max(rate, 0.01);
        console.log(
          `[${processed}/${todo.length}] disagreements=${disagreements} cost=$${totalCost.toFixed(3)} rate=${rate.toFixed(1)}/s eta=${eta.toFixed(0)}s`,
        );
      }
    },
  );
  out.end();

  console.log(`\nDone. ${processed} new labels written to ${outPath}.`);
  console.log(`Disagreements: ${disagreements} / ${processed} (${((disagreements / Math.max(processed, 1)) * 100).toFixed(1)}%)`);
  console.log(`Actual cost: $${totalCost.toFixed(3)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
