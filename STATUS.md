# Project Status — Ito

_Last updated: 2026-07-11_

## TL;DR

The project is **revived and runnable/testable locally**. A full game loop (create → join → play → reveal → win/loss → vote → next level → game complete) has been verified end-to-end, both through the browser UI and a scripted two-client test. The blocker that prevented the server from booting (mandatory Authentik OIDC) is fixed — OIDC is now optional and the game runs fully anonymous.

Next phase: creative gameplay improvements (not started).

---

## How to run it

Requires [Bun](https://bun.sh) only (Node not needed). SQLite and topic packs are created automatically on first boot.

```bash
# Terminal 1 — backend on :3000
cd server && bun install && bun run dev

# Terminal 2 — frontend on :5173 (proxies /api and /ws to :3000)
cd client && bun install && bun run dev
```

Production-style single-origin build (Bun serves the built client at :3000):

```bash
cd client && bun run build     # then start the server; open http://localhost:3000
```

E2E game-loop test (server must be running):

```bash
cd server && bun run test/e2e_gameloop.ts
```

---

## Architecture (current)

- **Server**: Bun + Elysia. Single process. `index.ts` holds one `/ws` WebSocket endpoint (all gameplay messages) plus REST routes for packs/admin/auth. Game rooms live **in memory** (`RoomManager` → `Room`); a server restart drops live games (acceptable for a party game).
- **Client**: Svelte 5 (runes) + Vite + Tailwind. No router — views switch on store state. Thin renderer; sends intents over WS, re-renders on broadcast `RoomState`.
- **Persistence**: SQLite (`bun:sqlite`) for topic packs, users, and game-result logs only. Topic packs seed from `server/src/topics.yaml` at boot.
- **Auth**: Authentik OIDC, **optional**. Without env vars the app is anonymous. Login is only needed for pack creation and the admin dashboard. Roles map from Authentik groups (`ito-admin` → ADMIN, `ito-creator` → CREATOR).

## Gameplay loop (verified working)

Landing → create/join room (4-letter code, max **8** players) → lobby (pick pack, pick color, host can kick) → host starts → level _N_ deals _N_ cards each from a shuffled 1–100 deck with a random topic → players drag face-down cards onto a shared board → host reveals left-to-right → descending pair = LOSS, all-ascending = WIN → vote RETRY (same level) / NEXT (level +1), host breaks ties → winning the final level (`min(10, floor(100 / players))`) ends the run with a **GAME_COMPLETE** "You Win" screen.

Also working: reconnect via session token (120s grace), host migration, per-player colors, custom pack creation, admin dashboard.

---

## What changed during revival (2026-07-11)

**Unblocked boot**
- `AuthentikService.fromEnv()` returns null when OIDC env vars are absent (previously threw at module load and crashed the server).
- Removed hardcoded `ito.it.kmitl.ac.th`; redirect URIs derive from `PUBLIC_URL`, app slug from `OIDC_APP_SLUG`.
- Client fetches `/api/auth/config` and only renders login UI when OIDC is enabled. Silent-auth removed.

**Gameplay decisions applied**
- Legacy `PLAYER_READY` ready-up flow removed; round advancement is voting-only (LOSS screen votes RETRY through the same path).
- Player cap set to **8** everywhere (was inconsistent 10/8).
- Added `GAME_COMPLETE` end-of-run state + "You Win" screen.

**Cleanup**
- Untracked accidentally-committed `server/game.sqlite`; gitignored `*.sqlite*`.
- Deleted dead code: `UPDATE_BOARD` handler (called a non-existent method), unused admin/creator middleware, `seed_users.ts`, debug/migration one-off scripts, `Counter.svelte`, duplicate `client/package-lock.json`.
- Removed unused deps: `openid-client`, `@elysiajs/static`, `@elysiajs/cors`.
- Collapsed the 4×-duplicated OIDC callback into shared helpers; dispatch-style WS handler; shared token-extraction helper.
- Split Docker Compose: `docker-compose.yml` (app only, local) + `docker-compose.prod.yml` (nginx TLS overlay for KMITL).

**Windows dev fixes**
- Vite proxy targets `127.0.0.1:3000` (not `localhost` — IPv6/IPv4 mismatch with Bun broke the WS proxy).
- `game_session` moved to `sessionStorage` (per-tab) so multiplayer can be tested in one browser.

---

## Known limitations / notes

- Live games are in-memory only; a server restart ends them.
- Card DnD sync trusts the client's move intent (fine for a co-op game; no anti-cheat).
- OIDC is untested since revival — the KMITL Authentik IdP is only reachable from inside KMITL. Code is intact and ready to re-point when hosted there.
- `.github/workflows/deploy.yml`, `nginx.conf`, and the SSL cert mounts are artifacts of the (shut-down) KMITL self-hosted deployment; kept for reference.
- `db_data/` is a manual copy of the old production DB (untracked); not required to run.

## Deferred refactors (optional, non-blocking)

- WS message types + `RoomState` are hand-duplicated between `server/src/types.ts` and `client/src/lib/types.ts` — candidate for a shared package/workspace before heavy gameplay changes.
- Consolidate the ad-hoc migrations (inline `PRAGMA` checks + YAML seeder) into one ordered migration path if the schema grows.

## Next steps

Creative gameplay work — not yet started. Clean baseline is in place to build on.
