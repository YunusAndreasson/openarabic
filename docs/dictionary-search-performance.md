# Dictionary search performance — 2026-09-20

Dictionary search previously normalized every candidate's Arabic and English text and sorted the matches on every keystroke. Recent-first sorting also parsed two timestamps per comparator invocation.

The hook now:

- Prepares sorted words when vocabulary, sort field, or direction changes. Each sort key (including parsed dates) is calculated once per word.
- Prepares separate normalized meaning/Arabic strings when search begins, reusing them until vocabulary changes. The index is released when search clears; opening the dictionary without searching does not normalize the corpus.
- Filters the prepared list during typing, preserving exact order, unmeasured-last grouping, root-ID tie breaking, and independent-field substring matching.
- Continues evaluating time-sensitive scope predicates during filtering. Vocabulary cache replacement rebuilds the search index, even when root IDs stay the same.

The tradeoff is sorting the full vocabulary when ordering changes, even for a narrow scope, and storing two normalized strings per word during active search. There is no persistent or global index.

## Measurement

A temporary Jest/renderHook harness ran both the original hook and changed hook on the same synthetic 2,000-word dataset with shuffled creation dates, Arabic diacritics, and Latin transliteration marks. Recent-first sorting was selected; each sample typed/erased 24 English and Arabic queries. Six samples per implementation used Node's real `perf_hooks` clock, not Jest's mocked clock.

| 24 search updates |         Before |    After |
| ----------------- | -------------: | -------: |
| Median elapsed    |       1,934 ms |    33 ms |
| Range             | 1,916–1,963 ms | 32–40 ms |

This is a local algorithm/hook comparison including React test-renderer overhead, not Hermes, device frame rate, or production input-latency evidence. The temporary benchmark and original implementation were moved to `/tmp/dictionaryPerf.bench.test.tsx` and `/tmp/dictionaryBaseline.ts`; sample arrays are `/tmp/dictionary-before-timings.json` and `/tmp/dictionary-after-timings.json`.

Regression tests cover exact search ordering in both directions, input immutability, ties, unmeasured-last grouping, query clearing, cache replacement, Arabic/Latin normalization, and preventing matches across field boundaries. Existing scope/band tests also pass.
