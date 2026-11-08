# Contributing

Bug reports and pull requests are welcome. For anything bigger than a fix,
open an issue first, so we can agree on the shape before you write the code.

## Build and check

You need Node 22.13+, 24.3+ or 26+, and Yarn 4 through Corepack. The
[README](README.md#development) has the setup; [AGENTS.md](AGENTS.md) has the
conventions, and they apply to people too.

Before a pull request:

- `yarn verify` passes: TypeScript for the app and the tests, ESLint with no
  warnings, the deprecated-API check, knip and the Jest suite. Jest mocks
  Supabase, so no keys are needed.
- A change to what the app shows has been tried on an iOS or Android device or
  emulator. Say which in the pull request.
- Text a user reads goes in `constants/strings.ts`, and colours, spacing and
  type sizes come from `constants/colors.ts` and `constants/layout.ts`.
- `types/database.types.ts` is generated; don't edit it by hand.
- A change in `admin-dashboard/`, `translate/` or `social/` follows that
  directory's own README or CLAUDE.md.
- One change per pull request, with a commit message in the repository's
  style: `fix(auth): …`, `feat: …`, `refactor(ui): …`, `docs: …`.

## What OpenArabic won't do

Some behaviour is deliberate and changes to it need a strong case:

- The app doesn't write content. Texts, translations and audio come from the
  pipeline in `translate/`, so a schema or data change is a proposal, not a
  migration the app runs.
- Grammar colour goes on multi-word English phrases only, never on a single
  word, because the colours show how the parts of a phrase map onto each
  other.
- Speak to answer listens for the English meaning. It doesn't grade Arabic
  pronunciation, and the recording never leaves the phone.
- No ads and no subscription.
- New code doesn't add `memo`, `useMemo` or `useCallback`; the React Compiler
  does that.

## Security issues

Not in issues or pull requests: see [SECURITY.md](SECURITY.md).

## Conduct and license

Everyone here follows the [Code of Conduct](CODE_OF_CONDUCT.md). By
contributing, you agree your code is released under the
[MIT license](LICENSE). Texts, translations and images are not;
[NOTICE.md](NOTICE.md) lists them.
