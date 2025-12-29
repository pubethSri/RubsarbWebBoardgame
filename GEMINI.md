# GEMINI.md - Project Context & Documentation

## 1. Project Overview
**Project Name:** Rubsarb
**Concept:** A cooperative web-based card game blending mechanics from *The Mind* and *Ito*.
**Core Loop:** Players receive hidden numbers (1-100) and must collaborate to place them in ascending order on a shared board based on a subjective "Topic" (e.g., "Spicy Food").
**Target Platform:** Web (Desktop & Mobile).

## 2. Technical Architecture
* **Runtime:** Bun
* **Backend Framework:** Elysia.js
* **Communication:** WebSockets (`@elysiajs/websocket`) for real-time state.
* **Database:** SQLite (Native `bun:sqlite`) - *Used for storing custom Topic Packs only.*
* **Frontend:** Svelte + Vite
* **UI Library:** shadcn-svelte + Tailwind CSS
* **Drag & Drop:** `svelte-dnd-action` (Tentative)

## 3. Game Design Specifications

### Players
* 3-5 Players recommended.
* No time limit.

### Phase 1: Setup
1.  **Host** creates a room and selects a Topic Pack.
2.  **Players** join via a 4-digit code.
3.  **Server** deals hidden cards (1-100) to players.
4.  **Topic** is displayed (e.g., "Usefulness in a Zombie Apocalypse").

### Phase 2: Sorting (The Main Gameplay)
1.  **The Board:** A series of empty slots (Slot 1 to Slot N).
2.  **Placement:** Players drag cards from **Hand** to **Board Slots**.
    * Cards on board are **Face Down**.
    * Players can attach a text **Label/Note** (e.g., "Shotgun") to their card.
3.  **Reordering:** Players can rearrange Face Down cards on the board based on discussion.

### Phase 3: Reveal
1.  **Control:** Host clicks "Reveal Next".
2.  **Logic:**
    * **Pass:** If `Current Card > Previous Card` -> Continue.
    * **Fail:** If `Current Card < Previous Card` -> **Round Over Immediately.**

### Phase 4: Round End
1.  **On Fail:** System auto-reveals ALL remaining cards. Failed cards are highlighted. Game enters "Discussion Mode."
2.  **On Success:** Win animation. Game enters "Discussion Mode."
3.  **Next Step:** Host clicks "Next Round" -> Board clears, Level increases/repeats, new cards dealt.

---

## 4. Development Roadmap (Iterative Plan)

### Iteration 1: The Skeleton (Connectivity)
* **Objective:** Establish WebSocket connection and Room management.
* **Features:**
    * Elysia WS Server setup.
    * Room creation/joining logic (Room Codes).
    * Lobby UI (List connected players).
    * *No game logic.*

### Iteration 2: The Grey Box (Core Mechanics)
* **Objective:** Functional "Sort and Reveal" loop with minimal UI.
* **Features:**
    * Deal random numbers.
    * **Drag-and-Drop implementation:** Move items from Hand to Shared Board.
    * Real-time board synchronization (Player A moves card -> Player B sees it move).
    * Basic "Reveal" logic (Server validation of order).

### Iteration 3: The Context (Topics & Notes)
* **Objective:** Add the "Social" layer.
* **Features:**
    * Topic display system.
    * Input field for Card Notes/Labels.
    * Win/Loss state handling (The "Round End" auto-reveal sequence).
    * "Next Round" transition logic.

### Iteration 4: Polish & Persistence
* **Objective:** Production-ready UI and Data saving.
* **Features:**
    * SQLite integration for storing Topic Packs.
    * "Create Custom Pack" UI.
    * Visual Polish: shadcn-svelte components, animations, sound effects.