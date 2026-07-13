# Ito 🃏

**Ito** is a real-time cooperative web board game where players must sync their minds to sort numbers without speaking them.

Built with **Bun**, **Elysia.js**, and **Svelte**, styled with a strict **Monochrome** aesthetic.

> **Note**: This game is heavily inspired by the mechanics of **[The Mind](https://boardgamegeek.com/boardgame/244992/the-mind)** (Wolfgang Warsch) and **[ito](https://boardgamegeek.com/boardgame/327778/ito)** (Arclight Games).

## 🎮 How to Play

1.  **The Goal**: Work together to play all cards from your hands to the center board in **Ascending Order** (1 to 100).
2.  **The Catch**: You **cannot see** other players' cards, and you **cannot talk** about your specific numbers.
3.  **The Clue**: Between levels, discuss the **Current Topic** (e.g., "Animals (Size)") to gauge each other's scale.

## 🧑‍💻 Local Development

Requires [Bun](https://bun.sh). No other setup — SQLite is created automatically and topic packs are seeded from `server/src/topics.yaml` at boot. The game runs fully anonymous; login (Authentik OIDC) is optional and only needed for pack creation and the admin dashboard.

```bash
# Terminal 1: backend on :3000
cd server && bun install && bun run dev

# Terminal 2: frontend on :5173 (proxies /api and /ws to :3000)
cd client && bun install && bun run dev
```

To test the production build locally: `cd client && bun run build`, then the Bun server also serves the built app at `http://localhost:3000`.

E2E game loop test (with the server running): `cd server && bun run test/e2e_gameloop.ts`

## 📦 Deployment (Docker)

The app is containerized using a multi-stage Dockerfile that builds the Frontend and serves it via the Backend.

```bash
# 1. Setup Environment Variables (see .env.example; OIDC block is optional)
cp .env.example .env

# 2. App only (port 3000)
docker compose up -d --build

# 3. Or with the Nginx TLS proxy (needs the SSL cert/key files)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Roles (via Authentik groups)
When OIDC is configured, roles map from Authentik groups: `ito-admin` → ADMIN, `ito-creator` → CREATOR, everyone else → USER.

## 🛠️ Tech Stack
*   **Runtime**: Bun
*   **Backend**: Elysia.js
*   **Frontend**: Svelte 5 + Vite
*   **DB**: SQLite
