# Rubsarb 🃏

**Rubsarb** is a real-time cooperative web board game where players must sync their minds to sort numbers without speaking them.

Built with **Bun**, **Elysia.js**, and **Svelte**, styled with a strict **Monochrome** aesthetic.

> **Note**: This game is heavily inspired by the mechanics of **[The Mind](https://boardgamegeek.com/boardgame/244992/the-mind)** (Wolfgang Warsch) and **[ito](https://boardgamegeek.com/boardgame/327778/ito)** (Arclight Games).

## 🎮 How to Play

1.  **The Goal**: Work together to play all cards from your hands to the center board in **Ascending Order** (1 to 100).
2.  **The Catch**: You **cannot see** other players' cards, and you **cannot talk** about your specific numbers.
3.  **The Clue**: Between levels, discuss the **Current Topic** (e.g., "Animals (Size)") to gauge each other's scale.

## 📦 Deployment (Docker)

The app is containerized using a multi-stage Dockerfile that builds the Frontend and serves it via the Backend (Zero dependencies).

### 1. Prerequisites
- Docker Engine & Docker Compose installed.

### 2. Quick Start
```bash
# 1. Clone the repo
git clone https://github.com/your-username/rubsarb.git
cd rubsarb

# 2. Build and run
docker-compose up -d --build
```
Access the game at: `http://localhost:3000`

### 3. Database & Users
The app uses **SQLite** persisted in `db_data/`.
On the first run, you need to seed the initial users:
```bash
# Run the seed script inside the running container
docker-compose exec app bun src/db/seed_users.ts
```
**Default Credentials:**
- `admin` / `admin`
- `creator` / `creator`

### 4. Running Behind Nginx (Recommended)
For production (VM/VPS), run Nginx in front to handle Port 80/443.

**Example Nginx Config:**
```nginx
server {
    listen 80;
    server_name play.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 🛠️ Tech Stack
*   **Runtime**: Bun
*   **Backend**: Elysia.js
*   **Frontend**: Svelte 5 + Vite
*   **DB**: SQLite
