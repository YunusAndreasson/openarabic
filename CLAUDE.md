# OpenArabic — mobile app

React Native (Expo) app for learning Arabic by reading: articles with word-level
grammar colour-coding, FSRS spaced repetition, audio playlists and voice review.

## Scope

This file covers the mobile app, which is the repo root. The repo also holds
separate projects with their own languages, package managers and docs:

| Directory                  | What it is                                                              |
| -------------------------- | ----------------------------------------------------------------------- |
| `admin-dashboard/`         | Website (openarabic.io) and admin panel: Next.js, pnpm, own `CLAUDE.md` |
| `translate/`               | Python pipeline that translates and analyses articles into the database |
| `social/`, `publish/`      | Social media card rendering and posting                                 |
| `brand/`, `store-listing/` | Generators for the app mark and the App Store / Play listing assets     |

Mobile work needs nothing from these directories. No import crosses the boundary
in either direction, and the app's TypeScript, ESLint, Prettier and knip configs
already exclude the website and the pipeline. So for an app task, don't read,
search or edit them, and keep them out of repo-wide greps. Go into one only when
the task is about that project, and follow its own README or `CLAUDE.md` there.

The one thing all of them share is the Supabase database. Its content is owned by
the pipeline, so treat it as read-only from the app: propose schema or data
changes instead of running them.

## Commands

Run these directly, without asking.

```bash
yarn dev             # Android dev launcher (scripts/dev-android.sh)
yarn start           # Metro with a cleared cache
yarn validate        # typecheck, lint and format check on changed files (~5s)
yarn validate:full   # all files: typecheck (source + tests), lint, knip
yarn test            # jest on changed files
yarn verify          # validate:full plus the whole test suite
yarn prettier:fix    # auto-format
yarn types:db        # regenerate types/database.types.ts from Supabase
```

## Workflow

- Make every edit first, then run `yarn validate` once at the end. Re-running
  tsc or eslint after each edit is the slow path.
- Don't run tests during development. Run them when I ask you to commit.
- Fix formatting with `yarn prettier:fix`, never by hand.
- Before a release or an OTA update, read [deployment.md](.claude/docs/deployment.md).
  OTA updates go through the `yarn ota*` scripts only.

## Stack

- Expo SDK 58, React Native 0.88, React 19.3, New Architecture, Expo Router.
  Yarn 4 via Corepack.
- React Compiler is on. Write new code without `memo`, `useMemo` or
  `useCallback`, and leave the existing ones in place: removing them changes the
  compiled output.
- State is split between Redux Toolkit, TanStack Query and React Context. See
  [state-management.md](.claude/docs/state-management.md) for which one a new
  piece of state belongs in.
- Supabase JS client, FlashList, `@gorhom/bottom-sheet`, Reanimated, Skia.

## Layout

```
app/           Expo Router routes; (tabs)/ holds explore, practice, playlist, account
components/    primitives/ → ui/ → common/, then one directory per feature
hooks/         business logic lives here, not in components
services/      Supabase queries and device services
store/         Redux slices
constants/     strings, colours, layout, routes, query factories, FSRS, analytics
__tests__/     mirrors the source tree; own tsconfig.test.json and eslint.tests.config.mjs
```

## Conventions

- Look for an existing hook, component or util before writing a new one, and
  delete the code a change makes obsolete.
- No hardcoded values. User-facing text comes from `STRINGS`
  ([strings.ts](constants/strings.ts)), colours from the semantic names in
  [colors.ts](constants/colors.ts) (no hex), spacing from `LAYOUT.SPACING`, and
  font sizes from `ThemedText`'s `type` variants or `LAYOUT.TYPOGRAPHY.SCALE`
  ([layout.ts](constants/layout.ts)). Check `constants/` for the rest: routes,
  query keys, animation timings, FSRS parameters, analytics event names.
- TypeScript is strict, with `noUncheckedIndexedAccess` and
  `verbatimModuleSyntax`: no `any`, `import type` for type-only imports, and a
  `_` prefix on unused parameters.
- [database.types.ts](types/database.types.ts) is generated. Regenerate it with
  `yarn types:db`; never edit it by hand.
- Fix the root cause of a bug, not its symptom, and change only what is broken.

## Component layering

A new shared component goes in the first bucket that fits:

1. `components/primitives/`: `ThemedText`, `ThemedView`, `ThemedButton`,
   `ThemedInput`. It has no `index.ts` on purpose, so it can sit below the other
   two without joining an import cycle.
2. `components/ui/`: interactive controls and form primitives (barrel).
3. `components/common/`: layout, state and composition primitives (barrel).

Feature directories may import any barrel. Inside `ui`, `common`, `providers` and
`primitives`, import siblings by direct path and never through a barrel. A barrel
pulls in every sibling and closes a cycle that resolves to `undefined` at
module-init time, which shows up as a blank component at runtime and not as a
build error. `no-restricted-imports` in `eslint.config.mjs` enforces this.

## Navigation

Build routes from `ROUTE_PATHS` ([routes.ts](constants/routes.ts)) and the
builders in [routeBuilders.ts](utils/routeBuilders.ts), never from string
literals. Screens inside a tab carry the `/(tabs)` prefix
(`/(tabs)/practice/dictionary`). Screens that present over any tab live at the
root and have no prefix: the article reader (`/article/[id]`), `/review`,
`/word-detail` and the practice detail sheets.

## Arabic text

Grammar colour-coding applies to multi-word phrases only. A single English word
never gets it, because the colours teach how the parts of a phrase map onto each
other and one word has nothing to map. Gate on
`text.trim().split(/\s+/).length === 1`. The full rules are in
[arabic-grammar.md](.claude/docs/arabic-grammar.md).

## Reference docs

Read the one that matches the task; they are not loaded by default.

- [patterns.md](.claude/docs/patterns.md): branded IDs, TypeScript and performance patterns
- [state-management.md](.claude/docs/state-management.md): Redux, Query or Context decision tree
- [ui-guidelines.md](.claude/docs/ui-guidelines.md): design system, buttons, screen scaffolding
- [arabic-grammar.md](.claude/docs/arabic-grammar.md): grammar colour-coding rules
- [bottom-sheets.md](.claude/docs/bottom-sheets.md): sizing and FlashList inside a sheet
- [deployment.md](.claude/docs/deployment.md): EAS builds, GitHub Actions releases, OTA
- [testing.md](.claude/docs/testing.md): validation and test commands in detail
