# Rubsarb 🃏

**Rubsarb** is a real-time cooperative web board game where players must sync their minds to sort numbers without speaking them.

Built with **Bun**, **Elysia.js**, and **Svelte**, styled with a strict **Monochrome** aesthetic.

> **Note**: This game is heavily inspired by the mechanics of **[The Mind](https://boardgamegeek.com/boardgame/244992/the-mind)** (Wolfgang Warsch) and **[ito](https://boardgamegeek.com/boardgame/279537/ito)** (Arclight Games). It blends the intense non-verbal coordination of *The Mind* with the subjective "scale" discussions of *ito*.

---

## 🎮 How to Play

1.  **The Goal**: Work together to play all cards from your hands to the center board in **Ascending Order** (1 to 100).
2.  **The Catch**: You **cannot see** other players' cards, and you **cannot talk** about your specific numbers.
3.  **The Clue**: Between levels, discuss the **Current Topic** (e.g., "Animals (Size)") to gauge each other's scale.
    *   *Example*: "I have a Mouse" (implies a low number like 10) vs "I have an Elephant" (implies a high number like 90).

## ✨ Features

*   **Real-Time Multiplayer**: Instant interaction using WebSockets.
*   **Custom Topic Packs**: Create and share your own themes (e.g., "Spicy Foods", "Scary Movies").
*   **Monochrome UI**: A sleek, high-contrast Black & White design system.
*   **Lobby System**: Room codes, host controls, and a strict 8-player limit.
*   **Admin Dashboard**: Manage community packs and content moderation.
*   **Local Auth**: Built-in authentication for Creators and Admins using SQLite.

## 🛠️ Tech Stack

*   **Runtime**: [Bun](https://bun.sh) (Fast all-in-one JavaScript runtime)
*   **Backend**: [Elysia.js](https://elysiajs.com) (High-performance web framework)
*   **Frontend**: [Svelte 5](https://svelte.dev) + [Vite](https://vitejs.dev)
*   **Database**: SQLite (via `bun:sqlite`)
*   **Styling**: TailwindCSS
*   **Icons**: Lucide Svelte

## 🚀 Getting Started

### Prerequisites
*   [Bun](https://bun.sh) installed.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/yourusername/rubsarb.git
    cd rubsarb
    ```

2.  **Install Dependencies**:
    ```bash
    # Install root dependencies (concurrently, etc.)
    bun install

    # Install client & server dependencies
    cd client && bun install
    cd ../server && bun install
    ```

3.  **Environment Setup**:
    Create a `.env` file in `server/`:
    ```env
    # server/.env
    PORT=3000
    JWT_SECRET=your_super_secret_key
    ADMIN_PASSWORD=admin         # Initial Admin Seeding
    CREATOR_PASSWORD=creator     # Initial Creator Seeding
    ```

4.  **Database Migration**:
    Initialize the SQLite database and seed default users/packs:
    ```bash
    cd server
    bun run src/db/seed_users.ts
    ```

### Running Development

Run both Client and Server concurrently from the root:

```bash
bun start
```
*   **Frontend**: http://localhost:5173
*   **Backend**: http://localhost:3000

## 📦 Building for Production

1.  **Build Frontend**:
    ```bash
    cd client
    bun run build
    ```
    This generates static assets in `client/dist`.

2.  **Serve**:
    The backend is configured to serve the static frontend files from `client/dist`.
    ```bash
    cd server
    bun start
    ```
    Access the game at `http://localhost:3000`.

## 📄 License

This project is open source. [MIT License](LICENSE).
