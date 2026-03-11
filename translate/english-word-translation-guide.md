# English Word Translation Guide for Color-Coded Arabic Learning

## How the Coloring System Works

When a user taps an Arabic word, the app color-codes its grammatical components — prefixes, suffixes, infixes, and diacritics — each in a distinct color. The matching English words are highlighted in the same colors, creating a visual bridge between Arabic morphology and English meaning.

**The single-word rule**: If the English translation is only **one word**, the app skips coloring entirely. There is nothing to decompose, so the word renders as plain text. This means:

- `يَكْتُبُ` → "writes" = **no coloring** (1 word)
- `يَكْتُبُ` → "he writes" = **colored** (ي = "he" in green, كتب = "writes" in default)

**Current stats** (27,663 words total):
- 61% multi-word (coloring works)
- 39% single-word (coloring blocked)

The goal: restructure single-word translations into multi-word translations that expose the grammatical components, without making translations unnatural or misleading.

---

## The Golden Rule

> **Every Arabic grammatical particle visible in the word should have a corresponding English word in the translation.**

If the Arabic has و (and) + ال (the) + كتاب (book) = والكتاب, the English MUST be "and the book" — not "book", not "the book", not "and book".

---

## Component Reference Table

### Prefixes (beginning of word)

| Arabic | English keywords | Color | Example |
|--------|-----------------|-------|---------|
| **وَ** | and, also, while, by | Conjunction (blue-sage) | وَكَتَبَ → "and he wrote" |
| **فَ** | so, then, thus, therefore, for | Conjunction (blue-sage) | فَقَالَ → "so he said" |
| **بِ** | with, by, in, through | Preposition (amber-green) | بِاللَّهِ → "by Allah" |
| **لِ** | to, for, in order to | Preposition (amber-green) | لِلَّهِ → "for Allah" |
| **كَ** | like, as, such as | Preposition (amber-green) | كَالنَّارِ → "like the fire" |
| **ال** | the | Definite article (golden) | الكِتَابُ → "[the] book" * |
| **يَ** | he, it | Subject (cyan-green) | يَكْتُبُ → "he writes" |
| **تَ** | you, she, it | Subject (cyan-green) | تَكْتُبُ → "you write" |
| **أَ** | I | Subject (cyan-green) | أَكْتُبُ → "I write" |
| **نَ** | we | Subject (cyan-green) | نَكْتُبُ → "we write" |
| **سَ** | will, shall | Future (cool cyan) | سَيَكْتُبُ → "he will write" |
| **لَا** | not, don't | Negation (olive) | لَا يَكْتُبُ → "he does not write" |
| **لَمْ** | did not | Negation (olive) | لَمْ يَكْتُبْ → "he did not write" |
| **لَنْ** | will not | Negation (olive) | لَنْ يَكْتُبَ → "he will not write" |
| **قَدْ** | already, indeed | Particle (teal) | قَدْ كَتَبَ → "he already wrote" |
| **إِنَّ** | indeed, verily | Particle (teal) | إِنَّهُ → "indeed he" |
| **مَا** | what, that which | Interrogative (lime) | مَا كَتَبَ → "what he wrote" |
| **مَنْ** | who, whoever | Interrogative (lime) | مَنْ كَتَبَ → "whoever wrote" |
| **فِي** | in, at, within | Preposition (amber-green) | فِيهِ → "in it" |
| **مِنْ** | from, of | Preposition (amber-green) | مِنْهُ → "from him" |
| **عَنْ** | about, from | Preposition (amber-green) | عَنْهُ → "about him" |
| **عَلَى** | on, upon | Preposition (amber-green) | عَلَيْهِ → "upon him" |
| **إِلَى** | to, towards | Preposition (amber-green) | إِلَيْهِ → "to him" |

*\* The app auto-injects `[the]` for definite articles, so you don't need to add "the" manually if the English root word is correct.*

### Suffixes (end of word)

| Arabic | English keywords | Color | Example |
|--------|-----------------|-------|---------|
| **ـهُ** | his, him, it | Possessive (cool sage) | كِتَابُهُ → "his book" |
| **ـهَا** | her, its, it | Possessive (cool sage) | كِتَابُهَا → "her book" |
| **ـهُمْ** | their, them | Possessive (cool sage) | كِتَابُهُمْ → "their book" |
| **ـكَ** | your, you | Possessive (cool sage) | كِتَابُكَ → "your book" |
| **ـكُمْ** | your (plural) | Possessive (cool sage) | كِتَابُكُمْ → "your book" |
| **ـنَا** | our, us | Possessive (cool sage) | كِتَابُنَا → "our book" |
| **ـنِي** | me, my | Possessive (cool sage) | عَلَّمَنِي → "he taught me" |
| **ـتُ** | I (past tense) | Verb conjugation (core sage) | كَتَبْتُ → "I wrote" |
| **ـوا** | they (past tense) | Verb conjugation (core sage) | كَتَبُوا → "they wrote" |
| **ـتُمْ** | you all (past) | Verb conjugation (core sage) | كَتَبْتُمْ → "you all wrote" |
| **ـوْنَ** | they, those who | Plural (yellow-sage) | يَكْتُبُونَ → "they write" |
| **ـِينَ** | two, both | Plural (yellow-sage) | كِتَابَيْنِ → "two books" |

---

## Translation Patterns by Word Type

### 1. Verbs — Always Include the Subject

Arabic verbs encode the subject in the prefix/suffix. **Always include it in English.**

| Pattern | Arabic | Bad | Good |
|---------|--------|------|------|
| 3rd masc. sing. | يَكْتُبُ | "writes" | "he writes" |
| 3rd fem. sing. | تَكْتُبُ | "writes" | "she writes" |
| 2nd person | تَكْتُبُ | "write" | "you write" |
| 1st person | أَكْتُبُ | "write" | "I write" |
| 1st plural | نَكْتُبُ | "write" | "we write" |
| Past + they | كَتَبُوا | "wrote" | "they wrote" |
| Past + I | كَتَبْتُ | "wrote" | "I wrote" |
| With object | كَتَبَهُ | "wrote" | "he wrote it" |
| With و | وَكَتَبَ | "wrote" | "and he wrote" |
| Future | سَيَكْتُبُ | "writes" | "he will write" |
| Negated | لَمْ يَكْتُبْ | "didn't write" | "he did not write" |

### 2. Nouns — Include Articles, Possessives, and Prepositions

| Pattern | Arabic | Bad | Good |
|---------|--------|------|------|
| Definite | الْكِتَابُ | "book" | "the book" * |
| Possessive | كِتَابُهُ | "book" | "his book" |
| With وَ | وَكِتَابٌ | "book" | "and a book" |
| With بِ | بِالْكِتَابِ | "book" | "with the book" |
| With لِ | لِلْكِتَابِ | "book" | "for the book" |
| With مِن | مِنَ الْكِتَابِ | "book" | "from the book" |
| With فِي | فِي الْكِتَابِ | "book" | "in the book" |
| Combined | وَبِكِتَابِهِ | "book" | "and with his book" |

*\* The app auto-handles `ال` → `[the]` via bracket injection. But writing "the book" explicitly is also fine.*

### 3. Prepositions and Particles — Include Pronoun Objects

Prepositions often fuse with pronoun suffixes. Always include both parts:

| Arabic | Bad | Good |
|--------|------|------|
| فِيهِ | "in" | "in it" |
| مِنْهُ | "from" | "from him" |
| عَنْهُ | "about" | "about him" |
| عَلَيْهِ | "on" | "upon him" |
| إِلَيْهِ | "to" | "to him" |
| لَهُ | "to" | "for him" |
| بِهِ | "with" | "with it" |
| مَعَهُ | "with" | "with him" |
| عِنْدَهُ | "at" | "at his place" |
| لَهُمْ | "to" | "for them" |
| فِيهَا | "in" | "in it" |
| مِنْهَا | "from" | "from it" |
| بَيْنَهُمْ | "between" | "between them" |

### 4. Demonstratives and Relative Pronouns

| Arabic | Bad | Good |
|--------|------|------|
| وَهُوَ | "he" | "and he" |
| وَهِيَ | "she" | "and she" |
| فَهُوَ | "he" | "so he" |
| وَهَذَا | "this" | "and this" |
| فَإِنَّهُ | "indeed" | "for indeed he" |
| وَالَّذِي | "who" | "and the one who" |
| وَمَنْ | "who" | "and whoever" |
| فَمَا | "what" | "so what" |

---

## Priority Order for Maximum Impact

Fix these categories first — they are the most common single-word translations that block coloring:

1. **Verbs without subjects** (~1,100+ words) — Add "he/she/you/I/we/they" to every verb. This is the single biggest improvement.
2. **Nouns with possessive suffixes** (~500 words) — Add "his/her/their/your/our" to nouns ending in pronoun suffixes.
3. **Conjunction-prefixed words** (~460 words) — Add "and/so/then" to words starting with و or ف.
4. **Preposition+pronoun fusions** (~300 words) — Expand فيه/منه/عليه/etc. from single prepositions to "preposition + pronoun" pairs.

---

## System Capabilities & Limitations

Understanding what the coloring system can and cannot detect prevents wasted effort on translations that won't color regardless.

### What Works Well

- **Subject prefixes (ي/ت/أ/ن)** — Correctly detected when root has 2+ consonants after stripping. This includes common short-root verbs: يَجِدُ (he finds), يَصِلُ (he arrives), يَقَعُ (it falls), يَضَعُ (he puts), يَرَى (he sees), يُحِبُّ (he loves).
- **Possessive/object suffixes** — Reliably detected on roots of 2+ characters (ربه, فمه, يده all work).
- **Conjunction prefixes (و/ف)** — Always detected when English has "and"/"so"/"then".
- **Preposition prefixes (ب/ل/ك/في/من/عن/على/إلى)** — Reliably detected. Both إليه and اليه (hamza-less) correctly match the إلى prefix.
- **Future tense (س)** — Detected, but note: in سيعلم → "he will know", only "will" gets prefix coloring. The ي is absorbed into the root (not shown as a separate prefix). Still write "he will know" — the "he" provides context even without its own color.
- **Bracket injection for ال** — The app auto-injects `[the]` when Arabic has ال but English doesn't say "the". This works at the display level even when `analyzeArabicWord()` returns no components.

### What Does NOT Work (Don't Bother Expanding)

- **Form V/VI verbs (يتفاعل pattern)** — Words like يَتَوَلَّدُ (it arises), يَتَعَاوَنُ (he cooperates), يَتَبَادَلُ (he exchanges). The system cannot safely split يت because ت could be part of the verb form, not a subject prefix. These words will NOT color even with multi-word translations.
- **Hamza-less أ (first person)** — If the database stores اكتب instead of أكتب (missing hamza above), the first-person prefix is NOT detected. The system preserves the distinction between أ (prefix) and ا (prosthetic alef in Form VII-X verbs). **Fix the Arabic spelling** to أكتب if possible, rather than trying to work around it in the English.
- **Standalone لا/لن/لم** — Pure particles with no root content. لا → "do not" will NOT color. But لايعلم → "he does not know" WILL color (has a root).
- **Form VII-X initial alef** — اسْتَطَاعَ (he was able), انْكَسَرَ (it broke), اجْتَمَعَ (they gathered). The initial ا is prosthetic, not a prefix. Don't add "I" to these thinking it's a first-person marker.

### Root Letter Traps

The system has strong false-positive prevention, but reviewers should still be aware:

| Arabic | Root | Trap | Correct |
|--------|------|------|---------|
| وَعَدَ | و-ع-د | و looks like conjunction | "he promised" (not "and promised") |
| فَرِحَ | ف-ر-ح | ف looks like conjunction | "he rejoiced" (not "so rejoiced") |
| لَعِبَ | ل-ع-ب | ل looks like preposition | "he played" (not "for played") |
| بَيْت | ب-ي-ت | ب looks like preposition | "house" (not "with it") |
| نَصَرَ | ن-ص-ر | ن looks like subject prefix | "he helped" (not "we helped") |

The system catches these by checking English keywords — "he promised" has no "and", so و won't color. But if you write "and he promised" for وَعَدَ, that's a semantic error (adding "and" where و is a root letter).

---

## Rules for AI-Assisted Review

When using AI to review and expand word translations, apply these rules:

1. **Never change the semantic meaning** — only add grammatical particles that are morphologically present in the Arabic.
2. **Use the simplest English word** — "he" not "one", "his" not "thereof", "not" not "neither" (unless Arabic is لا...ولا).
3. **Keep translations short** — 2-4 English words is ideal. Avoid going beyond 5 words.
4. **Match the exact pronoun** — ـهُ = "his/him/it", ـهَا = "her/its", ـهُمْ = "their/them", ـكَ = "your/you", ـنَا = "our/us".
5. **Context matters for ي/ت prefixes** — ي can be "he" or "it" (for feminine subjects). ت can be "you" or "she". Use sentence context to pick the right one.
6. **Don't add words that aren't in the Arabic** — If the Arabic is just كتاب (no prefix or suffix), keep it as "book". Don't add "a" or "the" unless ال is present (the app handles ال automatically).
7. **Standalone لا is fine as "not"** — When لا appears as its own word (not prefixed), "not" is acceptable even though it's one word, because the coloring applies to the combined expression.
8. **Watch for root letter confusion** — Letters like و, ف, ب, ل, ن can be root letters, not prefixes. Example: وَعَدَ (he promised) — the و is a root letter, not a conjunction. فَرِحَ (he rejoiced) — the ف is a root letter. نَصَرَ (he helped) — the ن is a root letter, not "we".
9. **Watch for Form V/VI verbs** — If the Arabic starts with يت (يَتَفَاعَلُ pattern), the ي is NOT a separable subject prefix. Don't expand these expecting coloring.
10. **Preserve hamza on أ** — If the Arabic has أ (alef with hamza above) as a first-person prefix, make sure the database stores it WITH the hamza. Hamza-less ا will not be detected as a prefix.
11. **Use "Allah" not "God"** — Consistent Islamic terminology.
12. **Contractions are OK** — "don't" counts as 2 words internally (the app expands contractions for matching).

---

## Examples: Before and After

```
# Verb without subject
يَرَى → "sees"         ❌ (1 word, no coloring)
يَرَى → "he sees"      ✅ (ي = "he" in green, رأى = "sees" in default)

# Noun with possessive
كِتَابِهِ → "book"     ❌ (1 word, no coloring)
كِتَابِهِ → "his book"  ✅ (كتاب = "book" in default, ه = "his" in sage)

# Conjunction + verb
وَقَالَ → "said"        ❌ (1 word, no coloring)
وَقَالَ → "and he said" ✅ (و = "and" in blue, ق = "said" in default)

# Preposition + pronoun
فِيهِ → "in"           ❌ (1 word, no coloring)
فِيهِ → "in it"        ✅ (في = "in" in amber, ه = "it" in sage)

# Combined prefixes
فَبِكِتَابِهِمْ → "book"          ❌ (1 word, no coloring)
فَبِكِتَابِهِمْ → "so with their book" ✅ (ف = "so", ب = "with", كتاب = "book", هم = "their")

# Future tense
سَيَعْلَمُ → "knows"             ❌ (1 word, no coloring)
سَيَعْلَمُ → "he will know"      ✅ (س = "will" in cyan, ي = "he" in green, علم = "know")

# Negation
لَمْ يَقُلْ → already 2 words, but check each:
لَمْ → "did not"               ✅ (لم = "did not" in olive)
يَقُلْ → "say"                 ❌ → should be "he say" ✅
```

---

## What NOT to Change

- **Names**: إبراهيم → "Ibrahim" (leave as-is)
- **Islamic terms**: اللَّهِ → "Allah" or "of Allah" (don't translate to "God")
- **Single-morpheme words**: هُوَ → "he", هِيَ → "she" (already 1 word, cannot be expanded meaningfully)
- **Standalone particles**: إِنَّ → "indeed", قَدْ → "already" (these are typically separate words in the text, not prefixed)
- **Root words without affixes**: كِتَابٌ → "book" (no prefix or suffix, leave as 1 word — the app auto-handles ال via bracket injection if present)
- **Form V/VI verbs (يتفاعل)**: يَتَوَلَّدُ → "it arises", يَتَعَلَّمُ → "he learns" — expanding these won't activate coloring because the system can't split يت
- **Form VII-X initial alef words**: اسْتَطَاعَ, انْكَسَرَ, اجْتَمَعَ — the ا is NOT a first-person prefix, don't add "I"

---

## Patterns That Maximize Coloring (Verified)

These patterns were tested against the actual coloring engine and confirmed to work:

### High-Value Short Verbs (2-char roots, newly supported)

Many common verbs have short visible roots after prefix stripping. These now correctly color:

| Arabic | English | Why it works |
|--------|---------|-------------|
| يَجِدُ | "he finds" | جد = 2 consonants after ي |
| يَصِلُ | "he arrives" | صل = 2 consonants after ي |
| يَقَعُ | "it falls" | قع = 2 consonants after ت |
| يَضَعُ | "he puts" | ضع = 2 consonants after ي |
| يَرَى | "he sees" | رى = 2 consonants (ى is alef maqsura, not weak ي) |
| يُحِبُّ | "he loves" | حب = 2 consonants after ي |

**Priority**: These are common verbs that were previously blocked. Expanding them from single-word ("finds", "sees") to multi-word ("he finds", "he sees") now activates coloring.

### English Word Choice Matters for Detection

The system matches English keywords to Arabic patterns. Using the right English word is critical:

| Pattern | Works | Doesn't work | Why |
|---------|-------|-------------|-----|
| ي prefix | "he writes" | "one writes" | "one" is not a keyword for ي |
| ت prefix | "she writes" / "you write" | "it is written" | "written" doesn't trigger ت |
| ه suffix | "his book" | "the book of him" | "of him" is not a keyword for ه |
| و prefix | "and he said" | "he also said" | "also" only works if conjunction, not always |
| س prefix | "he will know" | "he shall know" | "shall" IS a keyword — both work |

### Contraction Tips

Contractions count as multi-word (the system expands them internally):

- "don't know" = 2 words → coloring works
- "it's good" = 2 words → coloring works
- "he'll write" = 2 words → coloring works

This means contractions are fine — no need to expand "don't" to "do not".

### Preposition Pairs to Always Expand

These are the highest-ROI single-word translations to fix because they're extremely common in Quranic text and always produce clean 2-component coloring:

| Single word (blocked) | Expanded (colors) | Frequency |
|----------------------|-------------------|-----------|
| "in" (فيه) | "in it" / "in him" | Very high |
| "from" (منه) | "from him" / "from it" | Very high |
| "upon" (عليه) | "upon him" / "upon it" | Very high |
| "to" (إليه/له) | "to him" / "for him" | High |
| "with" (به) | "with it" / "with him" | High |
| "about" (عنه) | "about him" / "about it" | Medium |

---

## Output Format for Batch Review

When reviewing words, output corrections as a JSON array:

```json
[
  {
    "word_id": 16048,
    "word_form": "يَكْتُبُ",
    "old_english": "writes",
    "new_english": "he writes",
    "reason": "add subject prefix ي = he"
  }
]
```
