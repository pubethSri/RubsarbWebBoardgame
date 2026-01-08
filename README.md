# Ito 🃏

**Ito** is a real-time cooperative web board game where players must sync their minds to sort numbers without speaking them.

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

### 2. Quick Start (Production)
The default `docker-compose.yml` includes an **Nginx** reverse proxy listening on Port 80.

```bash
# 1. Clone the repo
git clone https://github.com/your-username/ito.git
cd ito

# 2. Setup Environment Variables
cp .env.example .env
# [IMPORTANT] Edit .env with your real JWT_SECRET and passwords!
nano .env

# 3. Build and Run
docker-compose up -d --build
```
Access the game at: `http://<_YOUR_SERVER_IP_>` (Standard Port 80)

### 3. Database Seeding (First Run Only)
Users are not created automatically. Run this command once to generate the default Admin/Creator accounts:
```bash
docker-compose exec app bun src/db/seed_users.ts
```
**Default Credentials** (if you didn't change passwords in .env):
- `admin` / `admin`
- `creator` / `creator`

## 🛠️ Tech Stack
*   **Runtime**: Bun
*   **Backend**: Elysia.js
*   **Frontend**: Svelte 5 + Vite
*   **DB**: SQLite
