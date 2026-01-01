# Rubsarb 🃏

**Rubsarb** is a real-time cooperative web board game where players must sync their minds to sort numbers without speaking them.

Built with **Bun**, **Elysia.js**, and **Svelte**, styled with a strict **Monochrome** aesthetic.

> **Note**: This game is heavily inspired by the mechanics of **[The Mind](https://boardgamegeek.com/boardgame/244992/the-mind)** (Wolfgang Warsch) and **[ito](https://boardgamegeek.com/boardgame/327778/ito)** (Arclight Games). It blends the intense non-verbal coordination of *The Mind* with the subjective "scale" discussions of *ito*.

---

## 🎮 How to Play

1.  **The Goal**: Work together to play all cards from your hands to the center board in **Ascending Order** (1 to 100).
2.  **The Catch**: You **cannot see** other players' cards, and you **cannot talk** about your specific numbers.
3.  **The Clue**: Between levels, discuss the **Current Topic** (e.g., "Animals (Size)") to gauge each other's scale.
    *   *Example*: "I have a Mouse" (implies a low number like 10) vs "I have an Elephant" (implies a high number like 90).

## ✨ Features

*   **Real-Time Multiplayer**: Instant interaction using WebSockets.
*   **Custom Topic Packs**: Create and share your own themes (e.g., "Spicy Foods", "Scary Movies"). [Not available for normal user yet.]
*   **Lobby System**: Room codes and Custom packs code.

## 🛠️ Tech Stack

*   **Runtime**: [Bun](https://bun.sh) (Fast all-in-one JavaScript runtime)
*   **Backend**: [Elysia.js](https://elysiajs.com) (High-performance web framework)
*   **Frontend**: [Svelte 5](https://svelte.dev) + [Vite](https://vitejs.dev)
*   **Database**: SQLite (via `bun:sqlite`)
*   **Styling**: TailwindCSS
*   **Icons**: Lucide Svelte

## 📄 License

This project is open source. [MIT License](LICENSE).
