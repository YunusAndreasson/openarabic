# OpenArabic — UI/UX Audit Summary

Rolling index of per-route audit findings. See the full program plan at
`~/.claude/plans/come-up-with-a-async-fox.md`.

## How findings are graded

- **P0** — broken or visually incoherent (must fix before release)
- **P1** — drift from the design language (fix in next polish PR for the cluster)
- **P2** — opportunity to push the bar (queue for the dedicated polish workstream)
- **P3** — nice-to-have

## Per-route axes (apply to every route)

1. **Visual** — token compliance, hierarchy, density, alignment
2. **Interaction** — tap targets, hit slop, gesture affordance, haptic timing
3. **Motion** — entrance/exit, press feedback, scroll-linked, reduced-motion behavior
4. **Theme parity** — light / dark / sepia screenshot triptych
5. **RTL of Arabic content** — content-block direction (not full-app flip)
6. **Edge states** — empty, loading, error, offline, partial-data

## Routes (8 priority, ordered by usage)

| # | Route | File | Audit doc | Status |
|---|-------|------|-----------|--------|
| 1 | Explore feed | `app/(tabs)/explore/index.tsx` | [explore.md](explore.md) | ☐ pending |
| 2 | Article detail | `app/article/[id].tsx` | [article-detail.md](article-detail.md) | ☐ pending |
| 3 | Practice dashboard | `app/(tabs)/practice/index.tsx` | [practice.md](practice.md) | ☐ pending |
| 4 | Review session | `app/review.tsx` | [review.md](review.md) | ☐ pending |
| 5 | Playlist | `app/(tabs)/playlist/index.tsx` | [playlist.md](playlist.md) | ☐ pending |
| 6 | Auth sign-in | `app/auth/sign-in.tsx` | [auth-sign-in.md](auth-sign-in.md) | ☐ pending |
| 7 | Account settings | `app/(tabs)/explore/account/*` | [account.md](account.md) | ☐ pending |
| 8 | MiniPlayer expand → full player | `app/player.tsx` (W4, not yet built) | [player.md](player.md) | ☐ pending |

## Cross-cutting findings

Findings that span multiple routes go here, not in per-route files. Add as discovered.

| Theme | Severity | Routes affected | Notes |
|-------|----------|-----------------|-------|
| _none yet_ | – | – | – |
