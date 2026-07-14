# Project Directions

Sanity-checked candidate directions for ito, assessed against the actual codebase (July 2026). Each verdict is grounded in code findings, not vibes. Two directions have full design docs in this folder:

- **[Data collection & insights](data-insights.md)** — the main one
- **[Thai localization](thai-localization.md)** — Thai UI toggle + original Thai topic packs

## Agreed sequencing

1. **Data/insights system first** — the capture layer must be live *before* any player-attraction work, so that when new players arrive, every game feeds the dataset from day one.
2. **Then make the web more attractive/fun** (visual refresh, landing gimmicks, share features) to bring players in.
3. **Thai topic packs are exempt from this ordering** — they're pure content, zero code, and serve the internal friend group right now, not player acquisition. Fine to do anytime.

## The dependency picture

```
Data/insights system  ──enables──▶  Community/popular topics
        │                                    ▲
        ├──informs──▶ topic/content updates ─┘
        └──pairs with (later)──▶ Account personalization, per-user stats

Thai packs ──independent──▶ Thai UI toggle        (content cluster)

New game mode                                      (standalone, biggest)

Token cleanup ──prerequisite──▶ Visual retheme     (visual cluster)
Landing gimmicks / icon customization / IG share   (independent smalls)
```

## Verdicts

### Data collection & insights — cheap win, high value ★ main direction

Everything worth collecting already exists in server memory at the moment a level ends — and is thrown away. The topic (text + min/max labels), every card's secret value, the final board order, the exact card that broke the run, **and the clue text players type on cards** (`Card.note`, synced server-side via `UPDATE_NOTE`). The existing hook is `Room.logResult()` (`server/src/Room.ts:444`), which today writes only a thin `game_logs` row. The work is widening what gets written, not building capture plumbing. See [data-insights.md](data-insights.md).

### Thai topic packs — cheap win (pure content)

New official packs in `server/src/topics.yaml`, seeded by the existing `migrate.ts` flow. Zero new code. The Kanit font is already loaded with Thai glyph coverage, so Thai topic text renders correctly today. Goal is **original topics for Thai society**, not translations. See [thai-localization.md](thai-localization.md).

### Thai UI toggle — moderate, mechanical

There is no i18n today: ~18 components with hardcoded English strings. For just EN/TH, no library is needed — a small dictionary store does it — but every component gets touched once. Fonts are already fine. See [thai-localization.md](thai-localization.md).

### New game mode (bluffing / trick-choices / scores) — biggest item, needs its own concept doc first

`Room` is a single state machine and the WS protocol types are hand-duplicated in `server/src/types.ts` and `client/src/lib/types.ts`; a second mode touches everything on both sides. There is also a product-identity question before any code talk: scoring and bluffing make the game competitive, and ito's identity is pure co-op. Write a one-page rules concept and playtest it on paper before designing the implementation.

### Visual refresh / retheme — caution: not a one-file change

There *is* a central `@theme` in `client/src/app.css`, but a large share of the styling is hardcoded inline in components — `border-black`, literal hex shadows (`shadow-[4px_4px_0px_0px_#000000]`), `bg-white` — in essentially every file. A palette swap in `@theme` would not reskin the app. A real retheme needs a **token-consolidation pass first** (move hardcoded colors/shadows into theme tokens), after which theme experiments become cheap. Separately: the neo-brutalist look is a strong identity; pastel is a re-identity, not an adjustment — decide that deliberately.

### Icon / avatar customization — small-medium, contained

Identity today = name + one of 9 colors (`PLAYER_COLORS` in `client/src/lib/types.ts`) rendered as a monogram square. Adding icons touches: the `Player` type (both server and client copies), the Lobby color/icon picker (`Lobby.svelte`), and the three avatar render spots (`Lobby`, `PlayerList`, `Result`).

### Temporary topic / host edits title in-game — small, high value

No free-text topic exists today: the host picks a *pack*, the server picks the topic. One new WS message (e.g. `SET_CUSTOM_TOPIC`, host-only) plus a small host UI enables one-off topics. Side benefit: the custom topics people type are demand signal for what packs to build — feeds the insights direction.

### Community / popular topics — defer until insights exist

Pack + share-code infrastructure already exists (`POST /api/packs`, share codes, `POST /api/rooms/:id/pack`). What's missing is the definition of "popular" — that requires usage data that isn't collected yet. Sequencing: ship data collection first; a community surfacing layer becomes a query on top of it.

### Share result as IG story — self-contained medium

`Result.svelte` already has everything a share card needs (topic, fully revealed board with values + notes, players, win/loss) but nothing exportable. Standard path: render a 1080×1920 card client-side (offscreen canvas or SVG→PNG), then Web Share API on mobile with download fallback. No server involvement.

### Landing gimmicks — cheap, low risk

The Landing is already playful (marquee title bar, dot grid, the cursor/color-cycling demo animation). Good canvas for more; nothing structural in the way.

### Auto-deploy on merge to main (internal/infra) — revive, don't build

The wanted workflow **already exists**: `.github/workflows/deploy.yml` triggers on push to `main` (merged PRs included), ran on a self-hosted runner on the old KMITL server, and did `git pull` + `docker compose down` + `docker compose up -d --build`. Reviving it needs:

- **A prod host** — the open decision. Old box is gone; any VPS/home server works.
- **Runner choice**: (a) install a self-hosted GitHub runner on the new box and reuse the workflow nearly as-is (simplest; caveat — if the repo is public, self-hosted runners deserve care: keep triggers to push-on-main only, never `pull_request`), or (b) GitHub-hosted runner that SSHes into the server with a deploy key in repo secrets (no runner daemon to maintain; server must accept SSH from the internet).
- **Small hardening**: drop the `docker compose down` step — `up -d --build` alone recreates the container after building, shrinking the downtime window.
- **Accepted consequence to keep in mind**: live game state is in-memory by design, so *every deploy kills all running games*. At hobby scale that's fine, but deploy consciously (the `/api/admin/stats` endpoint shows live rooms — worth a glance, or later a workflow step that warns if rooms are active).

### Account personalization (Authentik testbed) — back pocket

Auth infra and the `users` table exist and are fully optional. Per-user saved customization or stats would pair naturally with the insights work (Phase "later"). Not worth leading with: nobody needs to log in to play today, so the feature would have no audience until the game itself grows.
