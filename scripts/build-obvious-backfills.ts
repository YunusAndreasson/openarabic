#!/usr/bin/env npx tsx
/**
 * Stage 4: from the 288 curated + context-enriched candidates, keep only those where
 * the sentence environment unambiguously matches the helper. Generates:
 *   - scripts/output/backfill-obvious.json — final rewrite plan
 *   - scripts/output/backfill-obvious.sql — UPDATE statements (review before running)
 *
 * Conservative heuristic: a candidate is "obvious" when EVERY context sentence's
 * English translation contains an explicit subject that matches the chosen helper.
 *
 * Doesn't touch the database. Run the SQL by hand after review.
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
  contexts: {
    sentenceId: number;
    position: number;
    sentenceArabic: string;
    sentenceEnglish: string;
  }[];
}

// Subject phrases that, when followed by the verb gloss, prove the sentence really
// uses the helper's referent as the verb's subject. We require *adjacency* (subject
// followed within ~3 tokens by the verb) — catches "Allah created", "he created",
// "the Lord has created", but rejects "knowledge ... created" or "exhaustion reached me".
const HE_SUBJECTS = [
  'allah',
  'god',
  'the lord',
  'lord',
  'muhammad',
  'the prophet',
  'the messenger',
  'he',
  'he,',
  'he.',
  'he;',
  'whoever',
  'whomever',
  'the one who',
  'anyone who',
  'one who',
  'the man who',
  'the servant who',
  'the wise person',
  'the rational person',
  'a servant',
  'a man',
  'the man',
  'a believer',
  'the believer',
  'umar',
  'abu bakr',
  'ali',
  'ibn',
  'iblis',
  'satan',
  'shaytan',
  "sa'd",
  'umayya',
  // narration markers: "he said: ..." pattern
];
const SHE_SUBJECTS = ['she', 'her', 'a woman', 'the woman'];
const THEY_SUBJECTS = ['they', 'them', 'their', 'those who', 'people'];

function buildSubjectVerbPatterns(subjects: string[], verb: string): RegExp[] {
  // Pattern: subject (\s+aux?){0,2}\s+verb
  const escVerb = verb.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns: RegExp[] = [];
  for (const s of subjects) {
    const escSub = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // subject followed (optionally by 1-2 aux/adverb words) by the verb
    patterns.push(new RegExp(`\\b${escSub}\\b(?:\\s+\\w+){0,2}\\s+${escVerb}\\b`, 'i'));
  }
  return patterns;
}

function sentenceMatchesHelper(sentenceEn: string, helper: string, verb: string): boolean {
  const list =
    helper === 'he'
      ? HE_SUBJECTS
      : helper === 'she'
        ? SHE_SUBJECTS
        : helper === 'they'
          ? THEY_SUBJECTS
          : null;
  if (!list) return false;
  const patterns = buildSubjectVerbPatterns(list, verb);
  return patterns.some(p => p.test(sentenceEn));
}

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

async function main() {
  const reviewPath = path.resolve(__dirname, 'output', 'backfill-curated-with-context.json');
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8')) as { candidates: Candidate[] };

  const obvious: (Candidate & { reasonObvious: string })[] = [];
  const skipped: (Candidate & { skipReason: string })[] = [];

  for (const c of review.candidates) {
    if (c.contexts.length === 0) {
      skipped.push({ ...c, skipReason: 'no-context' });
      continue;
    }
    if (c.helper === 'it') {
      // "It" candidates need plural-vs-singular decision per sentence — skip from obvious set.
      skipped.push({ ...c, skipReason: 'it-needs-per-sentence-judgment' });
      continue;
    }
    // ALL contexts must show "{subject} {verb}" adjacency for the helper.
    let allOk = true;
    let reason = '';
    for (const ctx of c.contexts) {
      if (!sentenceMatchesHelper(ctx.sentenceEnglish, c.helper, c.current)) {
        allOk = false;
        reason = `no-adjacent-${c.helper}-subject-for-"${c.current}"-in-s${ctx.sentenceId}`;
        break;
      }
    }
    if (allOk) {
      obvious.push({ ...c, reasonObvious: 'all-contexts-have-matching-subject' });
    } else {
      skipped.push({ ...c, skipReason: reason });
    }
  }

  // Group skip reasons for transparency
  const skipCounts = new Map<string, number>();
  for (const s of skipped) {
    const key = s.skipReason.split('-in-s')[0] ?? s.skipReason;
    skipCounts.set(key, (skipCounts.get(key) ?? 0) + 1);
  }

  // Output JSON plan
  const planPath = path.resolve(__dirname, 'output', 'backfill-obvious.json');
  fs.writeFileSync(
    planPath,
    JSON.stringify(
      {
        summary: {
          obvious: obvious.length,
          obviousDbOccurrences: obvious.reduce((s, c) => s + c.occurrences, 0),
          skipped: skipped.length,
          skipReasonCounts: Object.fromEntries(skipCounts),
        },
        obvious,
        skipped,
      },
      null,
      2,
    ),
  );
  console.log(
    `obvious: ${obvious.length} (covering ${obvious.reduce((s, c) => s + c.occurrences, 0)} DB rows)`,
  );
  console.log(`skipped: ${skipped.length}`);
  console.log(`reasons:`, Object.fromEntries(skipCounts));
  console.log(`→ ${planPath}`);

  // Output SQL migration (one UPDATE per (word_form, english) pair)
  const sql: string[] = [
    `-- Backfill obvious word-translation rewrites in sentence_words.`,
    `-- Generated by scripts/build-obvious-backfills.ts on ${new Date().toISOString()}`,
    `-- Each row is rewritten only when its (word_form, english) currently matches both fields.`,
    `-- Review every line before running. Wrap in a transaction in production.`,
    `BEGIN;`,
  ];
  for (const c of obvious) {
    sql.push(
      `UPDATE sentence_words SET english = '${escSql(c.suggested)}' ` +
        `WHERE word_form = '${escSql(c.arabic)}' AND english = '${escSql(c.current)}'; ` +
        `-- ${c.occurrences} row(s), ${c.reasonKept}`,
    );
  }
  sql.push(`COMMIT;`);
  const sqlPath = path.resolve(__dirname, 'output', 'backfill-obvious.sql');
  fs.writeFileSync(sqlPath, sql.join('\n'));
  console.log(`→ ${sqlPath}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
