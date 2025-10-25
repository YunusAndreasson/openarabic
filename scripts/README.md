# OpenArabic Scripts

This directory contains utility scripts for analyzing and maintaining the OpenArabic codebase.

## Available Scripts

### `analyze-missing-colors.ts`

Analyzes the database to find **2-word English translations** that should have grammar color-coding but don't. This helps identify gaps in our Arabic grammar rule definitions.

**Important**: The script specifically targets translations with **exactly 2 English words** (e.g., "and from", "his book", "the house"), as these are most likely to have simple grammar patterns that can be color-coded. Three or more word translations are excluded as they often represent full phrases or idiomatic expressions.

#### Usage

```bash
# Basic usage (analyzes 500 words, min frequency 5)
npx tsx scripts/analyze-missing-colors.ts

# With custom parameters
npx tsx scripts/analyze-missing-colors.ts \
  --limit=1000 \
  --min-frequency=3 \
  --output-json \
  --verbose
```

#### Options

- `--limit=<number>` - Maximum number of words to analyze (default: 500)
- `--min-frequency=<number>` - Minimum occurrence count to include (default: 5)
- `--output-json` - Save results to JSON file in `scripts/output/`
- `--verbose` - Show detailed progress logs

#### Output

The script produces two types of output:

**1. Console Output**

- Categorized list of missing rules
- Frequency analysis
- Suggested actions for each category
- Summary statistics

**2. JSON Output** (when using `--output-json`)

- Structured data for programmatic analysis
- Saved to `scripts/output/missing-colors-{timestamp}.json`
- Includes metadata, category counts, and full rule details

#### Categories

**Compound Prefix**

- Examples: فَقَالَ (and said), وعن (and from)
- Pattern: Conjunction + preposition/particle combinations
- Action: Add missing compound prefix rules

**Missing Preposition**

- Examples: إِلَّا (as nothing but)
- Pattern: Preposition exists but English variant missing
- Action: Expand english alternatives in arabicWordComponents.ts

**Multi-Component**

- Examples: Words with both prefix and suffix
- Pattern: Multiple components not detected together
- Action: Review findComponent() detection logic

**Novel Pattern**

- Examples: رَأَى (he sees), غُرِسَتْ (is planted)
- Pattern: New grammatical patterns not in system
- Action: Investigate and potentially add new rules

#### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 MISSING COLOR-CODING ANALYSIS
 Total Words Analyzed: 181
 Missing Rules Found: 29
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Compound Prefix (1 found)
────────────────────────────────────────────────
┌────────┬────────────┬───────┬──────────────┐
│ Arabic │ English    │ Freq  │ Action       │
├────────┼────────────┼───────┼──────────────┤
│ فَقَالَ  │ and said   │ 2     │ Add rule     │
└────────┴────────────┴───────┴──────────────┘

SUMMARY
────────────────────────────────────────────────
Compound Prefixes:      1
Missing Prepositions:   19
Multi-Component:        0
Novel Patterns:         9
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### Workflow

1. **Run Analysis**

   ```bash
   npx tsx scripts/analyze-missing-colors.ts --limit=500 --min-frequency=5 --output-json
   ```

2. **Review Results**
   - Check console output for quick overview
   - Open JSON file for detailed analysis

3. **Implement Fixes**
   - Add missing compound prefixes to `constants/arabicWordComponents.ts`
   - Expand english alternatives for existing rules
   - Add new grammar patterns as needed

4. **Verify**
   - Run tests: `yarn test`
   - Re-run analysis to confirm improvements

#### Technical Details

- **Database**: Queries `sentence_words` table via Supabase
- **Analysis**: Uses `analyzeArabicWord()` and `shouldApplyColorCoding()`
- **Dependencies**: Standalone Supabase client (no React Native deps)
- **Performance**: Batched processing with progress indicators

#### Files

- `analyze-missing-colors.ts` - Main analysis script
- `utils/supabase-standalone.ts` - Standalone Supabase client
- `output/` - JSON output directory (auto-created)

## Adding New Scripts

When adding new scripts to this directory:

1. Use TypeScript with `#!/usr/bin/env npx tsx` shebang
2. Create standalone utilities in `utils/` for shared code
3. Document usage in this README
4. Use `executeQuery()` helper for database queries
5. Include CLI argument parsing for flexibility

## Requirements

- Node.js 18+
- TypeScript / tsx
- Supabase access (credentials in `constants/supabase.ts`)
