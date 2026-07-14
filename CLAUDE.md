# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Ito** is a real-time cooperative web board game (players sort 1–100 cards without speaking their values), inspired by *The Mind* and *ito*. It doubles as the author's personal testbed for Authentik OIDC integration. Originally deployed self-hosted at KMITL; that deployment is shut down, and the project was revived to run standalone with OIDC optional. See `STATUS.md` for the detailed history of the revival and `docs/glossary.md` for domain vocabulary (Card, Board, Hand, Reveal, Locked wall, Level, etc.) shared between server and client code.

## Commands

No root-level package.json — `server/` and `client/` are independent Bun projects, run in separate terminals.

```bash
# Backend — :3000
cd server && bun install && bun run dev

# Frontend — :5173 (proxies /api and /ws to 127.0.0.1:3000)
cd client && bun install && bun run dev
```

- Client typecheck: `cd client && bun run check` (svelte-check + tsc, no separate lint script)
- Production-style single-origin build: `cd client && bun run build`, then the Bun server also serves the built app at `http://localhost:3000`
- E2E game loop test (server must already be running): `cd server && bun run test/e2e_gameloop.ts` — a scripted two-client run through create → join → play → reveal → win/loss → vote → next level. There is no other test suite.
- Docker: `docker compose up -d --build` (app only), or add `-f docker-compose.prod.yml` for the Nginx TLS overlay (needs the SSL cert/key files, KMITL-specific, kept for reference only)

## Architecture

**Server** (`server/src/`, Bun + Elysia, single process, `index.ts` entry point):
- One `/ws` WebSocket endpoint handles *all* gameplay messages via a `switch` on `WsMessage.type`; REST routes under `/api/*` handle packs, admin, and auth.
- Live game state lives **in memory only** — `RoomManager` holds a `Map<code, Room>`. A server restart drops all live games; this is accepted, not a bug.
- `Room` is the core state machine: players, board, hands (per-player, kept server-side so opponents' card values are never sent to other clients), deck, voting, and all game-logic methods (`startGame`, `moveCard`, `revealNext`, `handleVote`/`resolveVotes`, etc.). `getState()` produces the public `RoomState` broadcast to everyone; per-player hands are sent only to their own socket.
- Session model: each WS connection (`ws.id`) maps to `{roomId, playerId}` in a module-level `activeSessions` Map in `index.ts`. Reconnect uses a per-player `token` (not tied to `ws.id`) with a 120s grace period (`Room.handleDisconnect` timer) before the player is actually removed.
- Persistence (SQLite via `bun:sqlite`, `server/src/db/`) is only for topic packs, users, and game-result logs — never live game state. Schema is created ad hoc in `initDB()` (`CREATE TABLE IF NOT EXISTS` + a couple of inline `PRAGMA table_info` migration checks), not a versioned migration chain. Topic packs seed from `server/src/topics.yaml` at boot via `TopicManager`.
- Auth (`auth.ts`, `services/authentik.ts`) is Authentik OIDC and **fully optional**: `AuthentikService.fromEnv()` returns `null` when OIDC env vars are absent, and the server runs anonymously. Login is only required for pack creation (`CREATOR`/`ADMIN` roles) and the admin dashboard. Roles map from Authentik groups: `ito-admin` → ADMIN, `ito-creator` → CREATOR, everyone else → USER. The client calls `/api/auth/config` to know whether to show login UI at all.

**Client** (`client/src/`, Svelte 5 runes + Vite + Tailwind v4, no router):
- View switching is driven entirely by store state in `App.svelte`: no room code → `Landing`; room code + `LOBBY` state → `Lobby`; otherwise → `Game`. `lib/stores/gameState.ts` holds the reactive `RoomState` mirror, `lib/stores/socket.ts` owns the WebSocket connection and dispatches incoming messages into the stores, `lib/stores/auth.ts` handles the OIDC session check.
- The client is a thin renderer: it sends intents over the socket (`MOVE_CARD`, `REVEAL_NEXT`, `VOTE`, ...) and re-renders whenever a `ROOM_UPDATED` broadcast arrives; it does not compute game outcomes locally.
- Board/Hand drag-and-drop use `svelte-dnd-action`; revealed ("locked wall") cards are pinned and excluded from reorder logic in `Board.svelte`'s `handleDndConsider`/`handleDndFinalize`.
- `game_session` is stored in `sessionStorage` (per-tab), which is what makes testing multiplayer in one browser (multiple tabs) possible.

**Shared types are hand-duplicated**, not imported from a common package: `server/src/types.ts` and `client/src/lib/types.ts` independently define `WsMessage`/`WsResponse`/`RoomState`/`Card`/etc. Keep both in sync when changing the WS protocol — there is no compiler check across the boundary.

**Deployment**: multi-stage `Dockerfile` builds the client (`client/dist`) then bundles it into the Bun server image, which serves both the static SPA and the API/WS from one process (`CLIENT_DIST = "../client/dist"` relative path). `docker-compose.prod.yml`, `nginx.conf`, and `.github/workflows/deploy.yml` are artifacts of the old KMITL self-hosted deployment (TLS termination in front of the app) — kept for reference, not required for local/anonymous use.

## Local environment notes (not for commit)

`STAR_IT_*` (nginx TLS cert/key), `.env`, `db_data/`, and `db/` are copies from the old production server, present locally for reference/testing only. They are gitignored — never add or amend commits that touch them.
