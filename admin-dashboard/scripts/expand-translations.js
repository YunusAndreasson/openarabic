#!/usr/bin/env node
/**
 * expand-translations.js — Expand single-word English translations to multi-word
 *
 * The Arabic word coloring system requires multi-word English translations to
 * map Arabic morphological components (prefixes/suffixes) to their English
 * equivalents. This script finds single-word translations that can be safely
 * expanded and applies them to the database.
 *
 * Three expansion strategies:
 *   1. AFFIX DETECTION  — Morphological analysis (prefixes, suffixes, compounds)
 *   2. SIBLING ANALYSIS — Same Arabic form with mixed single/multi-word translations
 *   3. DETERMINISTIC    — Known compound particles with consistent translations
 *
 * Usage:
 *   node scripts/expand-translations.js                    # Dry-run (report only)
 *   node scripts/expand-translations.js --apply            # Apply deterministic expansions
 *   node scripts/expand-translations.js --prepare-llm      # Prepare LLM batch for review
 *   node scripts/expand-translations.js --apply-llm FILE   # Apply reviewed LLM decisions
 *   node scripts/expand-translations.js --rollback FILE    # Rollback from backup file
 *
 * Environment:
 *   Run from admin-dashboard/ with:
 *   NODE_PATH=$(pwd)/node_modules/.pnpm/@supabase+supabase-js@2.98.0/node_modules:$(pwd)/node_modules/.pnpm \
 *     node scripts/expand-translations.js [options]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const SUPABASE_URL = 'https://kkmnzbeugdoajtzfjkxg.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OUTPUT_DIR = path.join(__dirname, '..', '.data', 'expansion');

// ---------------------------------------------------------------------------
// Arabic text utilities
// ---------------------------------------------------------------------------
function stripDiacritics(text) {
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

function normalizeArabic(text) {
  let n = stripDiacritics(text);
  n = n.replace(/[إآٱ]/g, 'ا');
  n = n.replace(/ى/g, 'ي');
  n = n.replace(/ة/g, 'ه');
  return n;
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------
async function fetchAll(table, select) {
  const all = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + 999);
    if (error) throw new Error(`Fetch ${table}: ${error.message}`);
    if (!data?.length) break;
    all.push(...data);
    offset += 1000;
    if (data.length < 1000) break;
  }
  return all;
}

async function fetchByIds(table, select, ids) {
  const results = [];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { data, error } = await supabase.from(table).select(select).in('id', batch);
    if (error) throw new Error(`Fetch by IDs: ${error.message}`);
    results.push(...data);
  }
  return results;
}

async function getCoverage() {
  let total = 0, single = 0, multi = 0;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('sentence_words')
      .select('english')
      .not('english', 'is', null)
      .range(offset, offset + 999);
    if (error) throw new Error(`Coverage: ${error.message}`);
    if (!data?.length) break;
    for (const w of data) {
      total++;
      if (w.english && w.english.trim().split(/\s+/).length > 1) multi++;
      else single++;
    }
    offset += 1000;
    if (data.length < 1000) break;
  }
  return { total, single, multi, pct: ((multi / total) * 100).toFixed(1) };
}

// ---------------------------------------------------------------------------
// Sibling analysis — find Arabic words with mixed single/multi-word translations
// ---------------------------------------------------------------------------
async function findSiblingCandidates(words) {
  // Group by normalized Arabic form
  const groups = {};
  for (const w of words) {
    if (!w.english?.trim()) continue;
    const norm = normalizeArabic(w.word_form || '');
    if (!groups[norm]) groups[norm] = { arabic: w.word_form, norm, singles: [], multis: [] };
    const wordCount = w.english.trim().split(/\s+/).length;
    if (wordCount === 1) {
      groups[norm].singles.push(w);
    } else {
      groups[norm].multis.push(w);
    }
  }

  // Filter: must have BOTH single and multi-word translations
  const candidates = Object.values(groups).filter(
    (g) => g.singles.length > 0 && g.multis.length > 0,
  );

  // Sort by number of single-word instances (most impact first)
  candidates.sort((a, b) => b.singles.length - a.singles.length);

  return candidates;
}

// ---------------------------------------------------------------------------
// Compound detection — real Arabic compounds vs false positives
// ---------------------------------------------------------------------------

// TRUE COMPOUNDS: Arabic words with genuine prefix + base structure
const REAL_COMPOUNDS = {
  ولا: { prefix: 'و', base: 'لا', desc: 'and + not' },
  كما: { prefix: 'ك', base: 'ما', desc: 'like/as + what = just as' },
  فان: { prefix: 'ف', base: 'إن', desc: 'so + if/indeed' },
  فقد: { prefix: 'ف', base: 'قد', desc: 'so + indeed/already' },
  فاذا: { prefix: 'ف', base: 'إذا', desc: 'so + when' },
  فلما: { prefix: 'ف', base: 'لما', desc: 'so + when' },
  فمن: { prefix: 'ف', base: 'من', desc: 'so + whoever' },
  فما: { prefix: 'ف', base: 'ما', desc: 'so + what' },
  وان: { prefix: 'و', base: 'إن', desc: 'and + indeed/if' },
  وقد: { prefix: 'و', base: 'قد', desc: 'and + indeed' },
  وهو: { prefix: 'و', base: 'هو', desc: 'and + he' },
  وما: { prefix: 'و', base: 'ما', desc: 'and + what/not' },
  ولكن: { prefix: 'و', base: 'لكن', desc: 'and + but = but rather' },
  لما: { prefix: 'ل', base: 'ما', desc: 'to/for + what' },
  انما: { prefix: 'إن', base: 'ما', desc: 'indeed + what = only' },
  بما: { prefix: 'ب', base: 'ما', desc: 'with/by + what' },
  بها: { prefix: 'ب', base: 'ها', desc: 'with/by + it/them' },
  بهما: { prefix: 'ب', base: 'هما', desc: 'with/by + them two' },
  لها: { prefix: 'ل', base: 'ها', desc: 'for + it/her' },
  كلها: { prefix: 'كل', base: 'ها', desc: 'all + of it/them' },
  بعده: { prefix: 'بعد', base: 'ه', desc: 'after + it/him' },
  فيه: { prefix: 'في', base: 'ه', desc: 'in + it/him' },
  وقال: { prefix: 'و', base: 'قال', desc: 'and + said' },
  وهل: { prefix: 'و', base: 'هل', desc: 'and + have/did' },
  فاما: { prefix: 'ف', base: 'إما', desc: 'so + either' },
};

// FALSE COMPOUNDS: first letter happens to match a prefix but is a root letter
const FALSE_COMPOUND_NORMS = new Set([
  'كان', 'كانت', 'كلام', 'كلمه', 'كمال',   // ك is root
  'بعض', 'باب', 'باطل',                       // ب is root
  'ليس', 'لحظه', 'لسان',                      // ل is root
  'واحده', 'واحدا', 'وقت',                    // و is root
  'سبحان', 'سوء', 'سائر', 'سببا', 'سبع', 'سلم', // س is root
  'فضيله', 'فهم', 'فعلت',                     // ف is root
]);

// Sibling norms where LLM review determined expansion is unnatural/incorrect
// لَمَّا (lamma) = standalone temporal particle, NOT ل+ما compound
// ولا "or" in "no X or Y" patterns = idiomatic English, expansion breaks flow
const REVIEWED_SKIP_NORMS = {
  لما: 'لَمَّا is a standalone temporal particle (lamma), not ل+ما',
};

// DETERMINISTIC RULES: clear expansions by current English value
const DETERMINISTIC_RULES = {
  ولا: { not: 'and not', nor: 'and not', No: 'and no', Nor: 'And not' },
  كما: { like: 'just as', as: 'just as', As: 'Just as' },
  ولكن: { but: 'but rather', But: 'But rather' },
  فاذا: { when: 'so when', When: 'So when' },
  فلما: { when: 'so when', When: 'So when' },
  بعده: { after: 'after it' },
  كلها: { all: 'all of it' },
  وهل: { Have: 'And have' },
  فاما: { either: 'so either' },
  بهما: { them: 'with them both' },
  وقال: { said: 'and said' },
  فيه: { in: 'in it' },
  بها: { them: 'with them', there: 'with it' },
  بما: { what: 'with what' },
  فمن: { whoever: 'so whoever', Whoever: 'So whoever' },
  فما: { What: 'So what' },
  انما: { only: 'indeed only', indeed: 'indeed only' },
};

// ---------------------------------------------------------------------------
// Quick-win patterns — verb/preposition patterns caught by suffix/prefix
// ---------------------------------------------------------------------------

/**
 * Detect Arabic words ending in ون/وا (plural verb patterns)
 * and بال/لل compounds where English is a single word.
 */
// Roots where و+ن are root letters, not the plural suffix ون
// e.g. كون (k-w-n): يَكُونُ looks like يـ...ون plural but is singular
const HOLLOW_VERB_ROOTS = new Set([
  'كون', 'كين', // كان/يكون (to be)
  'صون',        // صان/يصون (to preserve)
  'خون',        // خان/يخون (to betray)
  'لون',        // لان/يلون (to color)
  'هون',        // هان/يهون (to be easy)
  'دون',        // دان/يدون (to record)
  'زون',        // to provision
]);

// Words with بال/لل that are standalone, not بِ+ال or لِ+ال compounds
const FALSE_BIAL = new Set(['بالعيان', 'بالعكس']);
const FALSE_WAW_ALEF = new Set(['كفوا']); // كُفُوًا is a noun

function detectQuickWinPattern(wordForm, english) {
  const stripped = stripDiacritics(wordForm);
  const norm = normalizeArabic(wordForm);

  // Imperfect plural masculine: يـ...ون / تـ...ون
  if (stripped.endsWith('ونَ') || stripped.endsWith('ون')) {
    if (stripped.startsWith('يَ') || stripped.startsWith('ي') ||
        stripped.startsWith('تَ') || stripped.startsWith('ت')) {
      // Filter hollow verbs where ون is root letters (كون → يكون)
      // Extract the consonantal root: strip prefix, keep core
      const core = norm.slice(1); // e.g. كون from يكون
      if (HOLLOW_VERB_ROOTS.has(core)) return null;
      // Also check with trailing ه stripped (e.g. يكونه)
      if (core.length >= 3 && HOLLOW_VERB_ROOTS.has(core.slice(0, 3))) return null;
      // Filter Form V/VI: يتفعّون pattern — the ون is root, ت is form marker
      // e.g. يَتَصَوَّنُ (yataṣawwanu) is singular Form V, not plural
      if (core.startsWith('ت') && core.length >= 4) return null;
      return { type: 'imperfect_plural_masc', detected: 'imperfect_plural_masc' };
    }
  }

  // Past plural: ...وا suffix
  if ((stripped.endsWith('وا') || stripped.endsWith('وْا')) && stripped.length >= 4) {
    if (FALSE_WAW_ALEF.has(norm)) return null;
    return { type: 'waw_alef_suffix', detected: 'waw_alef_suffix' };
  }

  // بال compound (bi + al)
  if (norm.startsWith('بال') && norm.length >= 5) {
    if (FALSE_BIAL.has(norm)) return null;
    return { type: 'bi_al_compound', detected: 'bi_al_compound' };
  }

  // لل compound (li + al)
  if (norm.startsWith('لل') && norm.length >= 4) {
    return { type: 'li_al_compound', detected: 'li_al_compound' };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const doApply = args.includes('--apply');
  const prepareLlm = args.includes('--prepare-llm');
  const applyLlmIdx = args.indexOf('--apply-llm');
  const rollbackIdx = args.indexOf('--rollback');

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Handle rollback
  if (rollbackIdx !== -1) {
    const backupFile = args[rollbackIdx + 1];
    if (!backupFile) { console.error('Usage: --rollback <backup-file>'); process.exit(1); }
    await rollback(backupFile);
    return;
  }

  // Handle apply-llm
  if (applyLlmIdx !== -1) {
    const llmFile = args[applyLlmIdx + 1];
    if (!llmFile) { console.error('Usage: --apply-llm <decisions-file.json>'); process.exit(1); }
    await applyLlmDecisions(llmFile);
    return;
  }

  // --- Main analysis pipeline ---
  console.log('Fetching all words...');
  const words = await fetchAll('sentence_words', 'id, word_form, english, sentence_id, position');
  console.log(`Total words: ${words.length}`);

  const coverage = await getCoverage();
  console.log(`Current coverage: ${coverage.multi}/${coverage.total} multi-word (${coverage.pct}%)`);
  console.log(`Single-word: ${coverage.single}\n`);

  // ---- Phase 1: Sibling analysis ----
  console.log('=== PHASE 1: Sibling Analysis ===');
  const siblingGroups = await findSiblingCandidates(words);
  console.log(`Found ${siblingGroups.length} Arabic forms with mixed single/multi-word translations`);

  // Filter to real compound groups
  const realGroups = [];
  const falseGroups = [];
  let reviewedSkips = 0;
  for (const group of siblingGroups) {
    if (FALSE_COMPOUND_NORMS.has(group.norm)) {
      falseGroups.push(group);
    } else if (REVIEWED_SKIP_NORMS[group.norm]) {
      reviewedSkips++;
    } else if (REAL_COMPOUNDS[group.norm]) {
      realGroups.push(group);
    }
    // else: not a known compound pattern, skip
  }
  console.log(`Real compound groups: ${realGroups.length}`);
  console.log(`False compound groups (skipped): ${falseGroups.length}`);
  if (reviewedSkips > 0) console.log(`Previously reviewed & skipped: ${reviewedSkips}`);

  // ---- Phase 2: Deterministic expansions ----
  console.log('\n=== PHASE 2: Deterministic Expansions ===');
  const deterministic = [];
  const needsLlm = [];

  // Fetch sentence context for real group words
  const realGroupIds = realGroups.flatMap((g) => g.singles.map((w) => w.id));
  const sentenceIds = [...new Set(realGroups.flatMap((g) => g.singles.map((w) => w.sentence_id)))];
  const sentences = {};
  if (sentenceIds.length > 0) {
    const sentData = await fetchByIds('article_sentences', 'id, english', sentenceIds);
    for (const s of sentData) sentences[s.id] = s.english;
  }

  for (const group of realGroups) {
    const rules = DETERMINISTIC_RULES[group.norm];
    for (const word of group.singles) {
      const eng = word.english?.trim();
      if (!eng || eng.split(/\s+/).length > 1) continue; // already multi-word

      if (rules && rules[eng]) {
        deterministic.push({
          id: word.id,
          arabic: word.word_form,
          norm: group.norm,
          from: eng,
          to: rules[eng],
          method: 'deterministic_sibling',
        });
      } else {
        needsLlm.push({
          id: word.id,
          arabic: word.word_form,
          norm: group.norm,
          english: eng,
          sentence: sentences[word.sentence_id] || '',
          templates: group.multis.slice(0, 3).map((m) => m.english),
        });
      }
    }
  }

  // ---- Phase 3: Quick-win patterns (verb plurals, بال compounds) ----
  console.log('\n=== PHASE 3: Quick-Win Patterns ===');
  const quickWins = [];
  for (const word of words) {
    const eng = word.english?.trim();
    if (!eng || eng.split(/\s+/).length > 1) continue;

    // Skip if already handled by sibling analysis
    if (deterministic.some((d) => d.id === word.id)) continue;
    if (needsLlm.some((n) => n.id === word.id)) continue;

    const pattern = detectQuickWinPattern(word.word_form || '', eng);
    if (pattern) {
      quickWins.push({
        id: word.id,
        arabic: word.word_form,
        english: eng,
        sentence_id: word.sentence_id,
        detected: pattern.detected,
      });
    }
  }

  // Quick-wins always need LLM validation (context-dependent)
  console.log(`Quick-win candidates: ${quickWins.length}`);
  const qwByType = {};
  for (const qw of quickWins) {
    qwByType[qw.detected] = (qwByType[qw.detected] || 0) + 1;
  }
  for (const [type, count] of Object.entries(qwByType)) {
    console.log(`  ${type}: ${count}`);
  }

  // ---- Summary ----
  console.log('\n=== SUMMARY ===');
  console.log(`Deterministic (safe to apply): ${deterministic.length}`);
  console.log(`Needs LLM (sibling context):   ${needsLlm.length}`);
  console.log(`Needs LLM (quick-win):         ${quickWins.length}`);

  // Show deterministic breakdown
  const detByNorm = {};
  for (const d of deterministic) {
    if (!detByNorm[d.norm]) detByNorm[d.norm] = [];
    detByNorm[d.norm].push(d);
  }
  console.log('\nDeterministic breakdown:');
  for (const [norm, items] of Object.entries(detByNorm)) {
    const mappings = {};
    for (const item of items) {
      const key = `"${item.from}" → "${item.to}"`;
      mappings[key] = (mappings[key] || 0) + 1;
    }
    console.log(`  ${norm}: ${items.length} items`);
    for (const [k, v] of Object.entries(mappings)) {
      console.log(`    ${k}: ${v}x`);
    }
  }

  // ---- Apply or save ----
  if (doApply && deterministic.length > 0) {
    console.log(`\n=== APPLYING ${deterministic.length} DETERMINISTIC EXPANSIONS ===`);
    await applyExpansions(deterministic);
  } else if (deterministic.length > 0) {
    const detFile = path.join(OUTPUT_DIR, 'deterministic-expansions.json');
    fs.writeFileSync(detFile, JSON.stringify(deterministic, null, 2));
    console.log(`\nSaved deterministic expansions to: ${detFile}`);
    console.log('Run with --apply to apply them.');
  }

  if (prepareLlm && (needsLlm.length > 0 || quickWins.length > 0)) {
    console.log('\n=== PREPARING LLM BATCH ===');

    // Fetch sentence context for quick-wins
    const qwSentIds = [...new Set(quickWins.map((q) => q.sentence_id))];
    if (qwSentIds.length > 0) {
      const qwSentData = await fetchByIds('article_sentences', 'id, english', qwSentIds);
      for (const s of qwSentData) sentences[s.id] = s.english;
    }

    const llmBatch = [
      ...needsLlm.map((item) =>
        JSON.stringify({
          id: item.id,
          arabic: item.arabic,
          english: item.english,
          sentence: item.sentence,
          type: 'sibling',
          templates: item.templates,
        }),
      ),
      ...quickWins.map((item) =>
        JSON.stringify({
          id: item.id,
          arabic: item.arabic,
          english: item.english,
          sentence: sentences[item.sentence_id] || '',
          type: item.detected,
        }),
      ),
    ];

    const llmFile = path.join(OUTPUT_DIR, 'llm-batch.jsonl');
    fs.writeFileSync(llmFile, llmBatch.join('\n'));
    console.log(`Saved ${llmBatch.length} LLM candidates to: ${llmFile}`);
    console.log('Review with Claude/LLM, then apply with --apply-llm <decisions.json>');
  }
}

// ---------------------------------------------------------------------------
// Apply expansions to database
// ---------------------------------------------------------------------------
async function applyExpansions(expansions) {
  // Backup
  const ids = expansions.map((e) => e.id);
  const backups = await fetchByIds('sentence_words', 'id, word_form, english', ids);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFile = path.join(OUTPUT_DIR, `backup-${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backups, null, 2));
  console.log(`Backup saved: ${backupFile} (${backups.length} words)`);

  // Apply
  let success = 0,
    fail = 0;
  for (const e of expansions) {
    const { error } = await supabase
      .from('sentence_words')
      .update({ english: e.to })
      .eq('id', e.id);
    if (error) {
      console.error(`FAIL id=${e.id}: ${error.message}`);
      fail++;
    } else {
      success++;
    }
  }

  console.log(`Applied: ${success} success, ${fail} failed`);

  // Verify samples
  const sampleIds = [ids[0], ids[Math.floor(ids.length / 2)], ids[ids.length - 1]].filter(Boolean);
  const samples = await fetchByIds('sentence_words', 'id, word_form, english', sampleIds);
  console.log('\nVerification:');
  for (const s of samples) {
    const exp = expansions.find((e) => e.id === s.id);
    console.log(`  ${s.id}: ${s.word_form} "${exp.from}" → "${s.english}" ✓`);
  }

  // Coverage
  const cov = await getCoverage();
  console.log(`\nCoverage: ${cov.multi}/${cov.total} multi-word (${cov.pct}%)`);
  console.log(`Rollback with: --rollback ${backupFile}`);
}

// ---------------------------------------------------------------------------
// Apply LLM decisions
// ---------------------------------------------------------------------------
async function applyLlmDecisions(decisionsFile) {
  const decisions = JSON.parse(fs.readFileSync(decisionsFile, 'utf8'));
  const expansions = decisions
    .filter((d) => d.action === 'EXPAND')
    .map((d) => ({ id: d.id, from: d.from, to: d.to, method: 'llm_validated' }));

  console.log(
    `Loaded ${decisions.length} decisions: ${expansions.length} EXPAND, ${decisions.length - expansions.length} SKIP`,
  );

  if (expansions.length === 0) {
    console.log('Nothing to apply.');
    return;
  }

  await applyExpansions(expansions);
}

// ---------------------------------------------------------------------------
// Rollback from backup
// ---------------------------------------------------------------------------
async function rollback(backupFile) {
  const backups = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  console.log(`Rolling back ${backups.length} words from ${backupFile}...`);

  let success = 0,
    fail = 0;
  for (const b of backups) {
    const { error } = await supabase
      .from('sentence_words')
      .update({ english: b.english })
      .eq('id', b.id);
    if (error) {
      console.error(`FAIL id=${b.id}: ${error.message}`);
      fail++;
    } else {
      success++;
    }
  }

  console.log(`Rollback: ${success} restored, ${fail} failed`);
  const cov = await getCoverage();
  console.log(`Coverage: ${cov.multi}/${cov.total} multi-word (${cov.pct}%)`);
}

// ---------------------------------------------------------------------------
main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
