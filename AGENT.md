# Repository Guide

This repo contains a React Native (Expo) app built with TypeScript. Core business logic lives in `hooks/` and components live in `components/`. Constants can be found in `constants/`, and common types in `types/`.

## Development Rules
- Follow the code patterns described in `.cursor/rules/`:
  - `code-guidelines.mdc` – always investigate problems before coding, keep logic in hooks, reuse functionality and remove obsolete code.
  - `design.mdc` – apply mobile UX principles (Tesler, Hicks, Fitts, Miller) and keep design consistent using values from `constants/Colors.ts` and `constants/layout.ts`.
  - `copy.mdc` – keep UI text short, friendly and consistent.
  - `cleanup.mdc`, `refactor.mdc`, `bug-fix.mdc`, `perform.mdc` – consult these when cleaning, refactoring or optimising code.
  - `code-review.mdc` – checklist for reviewing pull requests.

## Testing
- Tests use Jest with React Native Testing Library. See `docs/testing-guide.md` for full details and examples.
- Test files live in `__tests__/` and may freely use mocks from `__mocks__/`.
- Run tests with `yarn test`. Watch mode is available via `yarn test:watch`.
- Test files are excluded from linting so any structure is allowed.

## Validation
- Run `yarn validate` before committing. It checks TypeScript and lint rules.
- Optionally run `yarn knip:ci` to check for unused files.

## Useful Docs
- `docs/testing-guide.md` – in‑depth testing instructions.
- `docs/versioning.md` – explains the Islamic calendar versioning scheme and release commands.

Use this file as a quick reference when working on tasks in this repository.
