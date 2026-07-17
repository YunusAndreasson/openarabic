---
name: openarabic-word-picker
description: >
  Curate the "word of the day" queue for OpenArabic's social posts. Use when the
  user asks to "build the word queue", "pick words for social", "top up the
  posting queue", "add word-of-the-day words", "refill the social queue", or
  anything about choosing/validating Arabic words for the daily X/Instagram
  posts. Pulls the most-used words from the OpenArabic DB, validates in a second
  pass that each word + translation is suitable for a learner, writes a Latin
  transliteration, and appends vetted entries to social/queue.json. Read-only DB.
  Not for the RN app, the arabic classifier, or generating/posting the images
  themselves (that is social/run-post.sh on Hetzner).
---

# OpenArabic word-of-the-day picker

Curate a queue of vetted Arabic words for the daily social posts (X + Instagram
feed + story). The scheduler on Hetzner (`social/run-post.sh`) pops one word per
run and renders/posts the card — it does **zero** curation, so the quality bar
lives entirely here. You run this whenever the queue is low.

## Critical files (all under `/home/yunus/Work/open-arabic/social/`)

- `scripts/fetch-candidates.mjs` — ranks `roots` by real in-article usage (counts
  `sentence_words.root_id`), excludes already-queued/posted ids, prints JSON.
  **Read-only** — only SELECTs. Never write to the DB.
- `scripts/queue-add.mjs` — appends a vetted JSON array to `queue.json` (dedupes
  by `root_id`, stamps `added_at`).
- `queue.json` — the FIFO the scheduler consumes. `posted-log.json` — the ledger.
- `lib/card.mjs` — the renderer, for optionally previewing a card you're unsure about.

## Procedure

### 1. Check the queue, then pull candidates

```bash
cd /home/yunus/Work/open-arabic/social
node -e "console.log('queue length:', require('./queue.json').length)"
node scripts/fetch-candidates.mjs --limit 180 --min 3 > /tmp/oa-candidates.json
```

Over-fetch (180): the very top of the usage ranking is **dominated by function
words**, so you need a big pool to end up with ~20–40 good content words. Use
`--refresh` if the usage cache is stale (>7 days) or the DB changed. Aim to leave
the queue with **at least ~30 words** after this run.

### 2. Pass 1 — select, transliterate, polish

Read `/tmp/oa-candidates.json`. For each candidate decide keep/reject, and for
keepers draft a transliteration + a clean gloss.

**REJECT (these make weak standalone flashcards):**

- **Function words** — prepositions (فِي, مِنْ, عَلَى, إِلَى, عَنْ, بِ, لِ), particles
  (لَا, مَا, أَنْ, إِنَّ, قَدْ, لَمْ, هَلْ), conjunctions (وَ, ثُمَّ, أَوْ, بَلْ),
  demonstratives/relatives (الَّذِي, هَذَا), bare pronouns (هُوَ, هِيَ, هُمْ, أَنْتَ).
  A learner can't build a mental image from "from" or "that".
- **Inflected / case duplicates** — the `roots` table holds surface forms, so the
  same word recurs in different cases or conjugations (e.g. اللَّهُ / اللَّهِ / اللَّهَ,
  or a verb in several persons). Keep **one** clean citation form per lemma and
  drop the rest. Prefer the pausal/nominative or the dictionary citation form.
- **Proper nouns / names** of specific people or places (keep well-known religious
  terms like اللَّه once).
- **Unclear or grammatical-label glosses** — a one-word English that's ambiguous
  out of context, or a gloss that's really a grammar note.

**KEEP:** concrete nouns, meaningful verbs (in a clean citation form), adjectives,
and well-known terms — words a beginner can picture and use.

**Transliteration** — derive it from the _vocalized_ letters (the harakat tell you
the vowels). Learner-friendly ALA-LC-ish scheme:

| Arabic          | Latin                  |     | Arabic | Latin |
| --------------- | ---------------------- | --- | ------ | ----- |
| ا / ـَا         | ā                      |     | ث      | th    |
| ـِي / ي (long)  | ī                      |     | ذ      | dh    |
| ـُو / و (long)  | ū                      |     | ش      | sh    |
| ـَ fatḥa        | a                      |     | خ      | kh    |
| ـِ kasra        | i                      |     | غ      | gh    |
| ـُ ḍamma        | u                      |     | ح      | ḥ     |
| ة (tā' marbūṭa) | a (‑ah pausal)         |     | ص      | ṣ     |
| ّ shadda        | double the consonant   |     | ض      | ḍ     |
| ع               | ʿ                      |     | ط      | ṭ     |
| ء / أ / ئ hamza | ʾ (drop at word start) |     | ظ      | ẓ     |

- Apply the **sun-letter** assimilation for the article: الشَّمْس → _ash-shams_, but
  الْقَمَر → _al-qamar_. Skip a leading article entirely if the citation form reads
  better without it.
- Keep it readable: `kitāb`, `raḥma`, `ṣalāh`, `ʿilm`, `istighfār`. Macrons and
  ṣ/ḍ/ṭ/ẓ/ḥ/ʿ render correctly on the card (Inter). Prefer these over ASCII.

**Gloss** — a short, clean, lowercase English concept (1–3 words). Fix
case-inflection artifacts (e.g. a genitive "of God" → "God"). Don't invent a new
meaning; just tidy the DB gloss for a card.

### 3. Pass 2 — independent validation (the important pass)

Re-review your Pass-1 keepers **with fresh eyes**, as if checking someone else's
work. For every entry confirm:

1. **Transliteration is correct** — re-read the harakat letter by letter; the
   translit must match exactly (right long vowels, shadda doubling, emphatics).
2. **Gloss is accurate** for _this_ vocalized form and unambiguous on its own.
3. **Not a function word or duplicate** that slipped through Pass 1.
4. **The set is varied** — a healthy mix of nouns / verbs / adjectives, not 30
   near-synonyms. Drop the weakest of any overlapping pair.

Cut anything you're not confident about. It's better to queue 25 excellent words
than 45 shaky ones. If unsure how a word will look, preview it:

```bash
node -e "import('./lib/card.mjs').then(m=>require('fs').writeFileSync('/tmp/w.png',m.renderCardPng({arabic:'رَحْمَة',translit:'raḥma',english:'mercy'})))"
```

then open `/tmp/w.png`.

### 4. Append to the queue

Write the survivors to a temp JSON array (carry `root_id`, `arabic` = the
vocalized `letters`, `translit`, `english` = polished gloss, `slug`, `usageCount`),
then:

```bash
node scripts/queue-add.mjs /tmp/oa-vetted.json
```

It dedupes by `root_id` and stamps `added_at`. **Do not edit `queue.json` by hand.**

### 5. Report

Tell the user: how many candidates were pulled, how many passed vs rejected (with
a one-line reason breakdown — e.g. "38 function words, 12 case-duplicates,
6 unclear"), the new queue length, and roughly how many days of posts that covers
(2 posts/day). Commit `queue.json` if the user wants it live on Hetzner:
`git add social/queue.json && git commit -m "chore(social): top up word queue"`.

## Hard rules

- **Read-only DB.** Only run the provided fetch script; never UPDATE/INSERT into
  `roots` or `sentence_words`. Polished glosses/translits live only in `queue.json`.
- Never post or render to a live account from this skill — curation only.
- One lemma per entry; no case/conjugation duplicates across the queue.
