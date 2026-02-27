# OpenArabic - Claude Code Development Guide

React Native Arabic language learning app with spaced repetition, audio features, and intelligent article filtering.

## Codebase Scope

This CLAUDE.md applies to the **React Native mobile app only**.

**Ignore these directories** (separate projects with their own tooling):

- `admin-dashboard/` - Next.js admin panel
- `translate/` - Python translation pipeline
- `publish/` - Python social media scripts

## Core Principles

### Investigation-First Development

- **ALWAYS** search for existing implementations before creating new code
- Check for related components, hooks, or utilities
- Review relevant tests to understand expected behavior
- Look for established patterns in the same domain

### Simplicity & Reliability

- Strive to reduce complexity while maintaining reliability
- Focus on understanding root causes, not implementing workarounds
- Reuse existing functionality before creating new functions
- Place business logic in hooks, not components
- Remove obsolete code when introducing new features

### Command Execution Workflow

**CRITICAL: NEVER run validation during development** - Make all changes first, then validate once at the very end.

**Correct pattern:**

```
✅ Make edit 1 → Make edit 2 → Make edit 3 → (user confirms done) → yarn validate once
```

**Commands** (run directly without asking):

- `yarn validate` - Fast validation (changed files only, ~5-6s)
- `yarn validate:full` - Full validation (all files)
- `yarn prettier:fix` - Auto-format (always use this, never manually fix formatting)
- `yarn test` - Run tests on changed files

## Essential Files & Constants

### Critical Constants Files

- **[database.types.ts](types/database.types.ts)** - Supabase table types
- **[colors.ts](constants/colors.ts)** - Theme system, semantic colors
- **[layout.ts](constants/layout.ts)** - Typography, spacing, shadows
- **[strings.ts](constants/strings.ts)** - All user-facing text
- **[fsrs.ts](constants/fsrs.ts)** - Spaced repetition constants
- **[routes.ts](constants/routes.ts)** - Route path constants
- **[animation.ts](constants/animation.ts)** - Timing configurations
- **[arabicWordComponents.ts](constants/arabicWordComponents.ts)** - Arabic language rules
- **[queries.ts](constants/queries.ts)** - TanStack Query factories and cache config
- **[analytics.ts](constants/analytics.ts)** - Mixpanel event names
- **[tabs.ts](constants/tabs.ts)** - Tab navigation configuration

### Required Usage

- **Typography**: Use `TYPOGRAPHY_HIERARCHY` and `LAYOUT.TYPOGRAPHY.SCALE`
- **Spacing**: Use `LAYOUT.SPACING` (TINY=4px, SMALL=8px, MEDIUM=12px, LARGE=16px)
- **Colors**: Use semantic names from Colors.ts (no hardcoded hex)
- **Strings**: Use `STRINGS.*` for all user-facing text
- **Routes**: Use `ROUTE_PATHS` with `/(tabs)` prefix

## Technical Stack

- **React Native**: 0.81.5 with React 19.1.0
- **Expo SDK**: 54 with New Architecture enabled
- **Navigation**: Expo Router v6
- **State**: Redux Toolkit + TanStack Query + React Context
- **UI**: @shopify/flash-list, @gorhom/bottom-sheet, react-native-reanimated
- **Backend**: Supabase JS client

## TypeScript Requirements

- `strict: true` - All strict type checking enabled
- `noImplicitAny: true` - No implicit any types
- Never use `any` in production code
- Use `import type` for type-only imports
- Prefix unused params with `_`

## Directory Structure

```
app/
├── (tabs)/              # Main tab navigation
│   ├── explore/         # Article discovery + reading
│   ├── playlist/        # Audio playlists
│   └── practice/        # Vocabulary practice + review
├── auth/                # Authentication
└── article/             # Article detail screens

hooks/                   # Custom React hooks
components/              # Reusable UI components
├── providers/           # Context providers
├── ui/                  # Shared UI components
├── audio/               # Audio components
├── article/             # Article components
└── ...
constants/               # App constants
services/                # Supabase API
store/                   # Redux slices
types/                   # TypeScript types
utils/                   # Helper functions
```

## Bug Fixing

- **CRITICAL**: Always fix the root cause, never implement workarounds
- Understand the problem completely before fixing
- Trace execution flow to identify exact failure point
- Fix only what's broken - don't refactor unrelated code

## Arabic Text (CRITICAL)

Single English words should **NEVER** have grammar color-coding applied. Color-coding is only educational for multi-word phrases. Always check: `text.trim().split(/\s+/).length === 1`

## Navigation

- **CRITICAL**: Always use `/(tabs)` prefix: `/(tabs)/explore/article/[id]` not `/article/[id]`
- Use `ROUTE_PATHS` constants from routes.ts

## Success Criteria

- ✅ Zero TypeScript/ESLint errors
- ✅ All tests pass
- ✅ Constants used (no hardcoded values)
- ✅ Type safety maintained (no `any`)
- ✅ Arabic text follows single-word rules
- ✅ Navigation uses `/(tabs)` prefix

## Detailed Documentation

For comprehensive patterns and guidelines, see `.claude/docs/`:

- **[patterns.md](.claude/docs/patterns.md)** - TypeScript patterns, branded IDs, performance
- **[state-management.md](.claude/docs/state-management.md)** - Redux/Query/Context decision tree
- **[ui-guidelines.md](.claude/docs/ui-guidelines.md)** - Design system, colors, spacing
- **[arabic-grammar.md](.claude/docs/arabic-grammar.md)** - Grammar color coding rules
- **[bottom-sheets.md](.claude/docs/bottom-sheets.md)** - @gorhom/bottom-sheet patterns
- **[deployment.md](.claude/docs/deployment.md)** - EAS/GitHub Actions commands
- **[testing.md](.claude/docs/testing.md)** - Validation workflow

---

_Only run tests before I instruct you to commit to speed up development._
