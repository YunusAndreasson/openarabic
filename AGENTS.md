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
yarn validate:full   # all files: typecheck (source + tests), lint, deprecated-API check, knip
yarn test            # jest on changed files
yarn verify          # validate:full plus the whole test suite
yarn prettier:fix    # auto-format
yarn types:db        # regenerate types/database.types.ts from Supabase
```

These yarn scripts take precedence over the `@expo/agent-cli` equivalents in the
generated block below, because they are set up for this repo (for example,
`yarn dev` also boots the emulator and checks that the dev client is installed).
Use agent-cli for operations that have no yarn script here.

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
- [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md): the shipped design system and its lineage (Dieter Rams, Don Norman)
- [arabic-grammar.md](.claude/docs/arabic-grammar.md): grammar colour-coding rules
- [bottom-sheets.md](.claude/docs/bottom-sheets.md): sizing and FlashList inside a sheet
- [deployment.md](.claude/docs/deployment.md): EAS builds, GitHub Actions releases, OTA
- [testing.md](.claude/docs/testing.md): validation and test commands in detail

## Open source

The repository is public. MIT covers the code; [NOTICE.md](NOTICE.md) lists the
content, brand and third-party material it doesn't.

- Anything brought in from elsewhere (a font, image, sound, word list or copied
  code) needs a licence that lets it be redistributed here, and a line in
  NOTICE.md. A font's licence travels with it ([OFL.txt](assets/fonts/OFL.txt)).
  Nothing under the GPL.
- No key, token or service-role JWT in a commit, a doc or a fixture. They live in
  local `.env` files, EAS secrets and the Actions secrets the store workflows read.
  Push protection catches common formats, not all of them.
- Dependabot opens grouped pull requests weekly. `.github/dependabot.yml` says what
  it holds back and why (TypeScript, until typescript-eslint supports the native
  compiler; the Expo SDK, which moves with `npx expo install --fix`). A native
  module bump ships in a store build, never in an OTA update. Merging releases
  nothing: `release.yml` only runs on a "chore: bump version" commit.
- CI checks the app only. `translate/`, `social/` and `admin-dashboard/` have their
  own checks; run them before merging their dependency updates, and build
  `admin-dashboard/` before deploying it.

<!-- prettier-ignore-start -->
<!-- BEGIN EXPO AGENT CLI MANAGED BLOCK -->
<!-- Generated by `npx @expo/agent-cli agents:setup`. Everything inside the markers is overwritten on the next run. -->

## Expo project

- Project: OpenArabic
- SDK: 58.0.14
- Native: CNG (no native directories; they are generated by `npx expo prebuild`)
- Expo Go: not compatible (28 reasons; needs a development build, run `npx @expo/agent-cli status --json` for the details)
- Dev client: `expo-dev-client` is installed

## Commands

For the operations listed below, use `@expo/agent-cli` in place of the equivalent commands elsewhere in this file or in loaded skills. Package installation still uses Expo’s SDK-compatible version resolution. Use `bunx` instead of `npx` when `bun.lock` is present.

Most commands take `--json` for a machine-readable report.

- `npx @expo/agent-cli status` — where the project is right now, and what would happen next
- `npx @expo/agent-cli status --json` — the same report as one object, with the raw project probe under `probe`
- `npx @expo/agent-cli status --explain` — the deep dive: which sources changed, whether an update can ship over the air, and whether EAS already has a build for this fingerprint
- `npx @expo/agent-cli status --assert js-only` — a gate on what a change costs: exit 20 when it costs more than the class named, 22 when nothing could be measured, 0 otherwise
- `npx @expo/agent-cli dev --android` — get the app onto that platform's device: it prints the plan, then runs it. The platform flag (--ios, --android, --web) is required; add --plan to print the steps without running them
- `npx @expo/agent-cli start` — `expo start` and nothing else: a dev server no planning may touch
- `npx @expo/agent-cli install <pkg>` — install a package and report what it changes natively
- `npx @expo/agent-cli install --fix` — fix incompatible package versions using Expo's SDK-compatible version resolution
- `npx @expo/agent-cli lint` — run the project's Expo lint command
- `npx @expo/agent-cli doctor` — diagnose dependency and configuration issues with expo-doctor
- `npx @expo/agent-cli typecheck` — run the TypeScript compiler of this project as a gate: exit 20 with the diagnostics, exit 0 when there are none. A bundle that builds and an app that does not throw do not cover this.
- `npx @expo/agent-cli runtime:eval <js>` — evaluate JavaScript in the running app
- `npx @expo/agent-cli runtime:errors` — collect the runtime errors of the running app
- `npx @expo/agent-cli navigate <route>` — open a route as a deep link on a device
- `npx @expo/agent-cli runtime:tree` — what is on the screen of the running app, by testID
- `npx @expo/agent-cli runtime:tap <testID>` — tap an element; `--verify` reports what changed
- `npx @expo/agent-cli runtime:type <text> --testID <id>` — type into an input
- `npx @expo/agent-cli skills:list` — the agent skills the installed packages ship
- `npx @expo/agent-cli new <dir>` / `npx @expo/agent-cli deploy` — create a project headlessly / deploy web and native
- `npx @expo/agent-cli smoke --android` — the whole gate in one command: the dev server bundles, the app is up, and nothing threw

## Expo docs

The full Expo docs for this project’s SDK can be local Markdown files.
- `npx @expo/agent-cli docs:sync` downloads them and prints two directories: all docs, and this SDK’s API reference. Grep those directories.
- `npx @expo/agent-cli docs:search <query>` returns ranked pages with file paths and line numbers.
Links in the docs point to `https://docs.expo.dev/<path>.md`. To read one locally, open `<path>.md` in the docs directory that `docs:sync` printed.
Prefer the local docs over web fetches of docs.expo.dev.

## Devices

Run `npx @expo/agent-cli dev` before `navigate`, `runtime:reload` or `runtime:stop`, or they refuse with `NO_BOUND_DEVICE` and name the command. Never boot, shut down or delete a simulator named `agent-cli …` yourself, and never kill an emulator instance started with `-read-only`; it may be bound to another worktree.

## Expo skills

For Expo or EAS work, start with the `expo-overview` skill when it is available in your agent’s skill list. It routes your goal to the relevant Expo or EAS skill. Then read any matching package skills listed below for guidance specific to the installed packages.

<!-- BEGIN EXPO PACKAGE SKILLS -->
## Package skills

Before using or modifying a package listed below, read its relevant skill for package-specific guidance. Each link for a row opens the same skill.

| Package | Skill | Read |
| --- | --- | --- |
| &#64;swmansion/argent | argent-ios-device-interact | [.agents/skills/argent-ios-device-interact/SKILL.md](.agents/skills/argent-ios-device-interact/SKILL.md), [.claude/skills/argent-ios-device-interact/SKILL.md](.claude/skills/argent-ios-device-interact/SKILL.md) |
| &#64;swmansion/argent | argent-ios-device-setup | [.agents/skills/argent-ios-device-setup/SKILL.md](.agents/skills/argent-ios-device-setup/SKILL.md), [.claude/skills/argent-ios-device-setup/SKILL.md](.claude/skills/argent-ios-device-setup/SKILL.md) |
| dotenv | dotenv | [.agents/skills/dotenv/SKILL.md](.agents/skills/dotenv/SKILL.md), [.claude/skills/dotenv/SKILL.md](.claude/skills/dotenv/SKILL.md) |
| dotenv | dotenvx | [.agents/skills/dotenvx/SKILL.md](.agents/skills/dotenvx/SKILL.md), [.claude/skills/dotenvx/SKILL.md](.claude/skills/dotenvx/SKILL.md) |

Run `npx @expo/agent-cli skills:sync` after changing dependencies to refresh this index. Run `npx @expo/agent-cli skills:list` to see available package skills.
<!-- END EXPO PACKAGE SKILLS -->

Commands end with a `Suggested next:` section — suggested follow-up commands, not required steps. Run one only when it serves your current goal.
<!-- END EXPO AGENT CLI MANAGED BLOCK -->
<!-- prettier-ignore-end -->
