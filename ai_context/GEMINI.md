# GEMINI.md - Project Context & Documentation

## 1. Project Overview
**Project Name:** Rubsarb (รับทราบ)
**Concept:** A cooperative web-based card game blending mechanics from *The Mind* and *Ito*.
**Core Loop:** Players receive hidden numbers (1-100) and must collaborate to place them in ascending order on a shared board based on a subjective "Topic" (e.g., "Spicy Food").
**Target Platform:** Web (Desktop & Mobile).

## 2. Technical Architecture
* **Runtime:** Bun
* **Backend Framework:** Elysia.js
* **Communication:** WebSockets (Native `.ws()`) for real-time state.
* **Database:** SQLite (Native `bun:sqlite`) - *Used for storing custom Topic Packs only.*
* **Frontend:** Svelte 5 + Vite
* **UI Library:** shadcn-svelte + Tailwind CSS
* **Drag & Drop:** `svelte-dnd-action` (Tentative)

## 3. Game Design Specifications

### Players
* 2-5 Players recommended.
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
* **✅ Success Criteria:**
    1.  User A can create a room and get a Room Code.
    2.  User B can join using that Room Code.
    3.  Both User A and User B see "Players: [User A, User B]" on their screens.
    4.  If User A disconnects, User B's list updates to remove them.

### Iteration 2: The Grey Box (Core Mechanics)
* **Objective:** Functional "Sort and Reveal" loop with minimal UI.
* **Features:**
    * Deal random numbers to connected players.
    * **Drag-and-Drop implementation:** Move items from Hand to Shared Board.
    * Real-time board synchronization (Player A moves card -> Player B sees it move).
    * Basic "Reveal" logic (Server validation of order).
* **✅ Success Criteria:**
    1.  3 Players can join a room and receive different hidden numbers.
    2.  Any player can drag a card to a board slot, and it appears on all screens (Face Down).
    3.  Host can click "Reveal".
    4.  System correctly logs/alerts "Success" (Ascending) or "Fail" (Not Ascending).

### Iteration 3: The Context (Topics & Notes)
* **Objective:** Add the "Social" layer and Game Loop.
* **Features:**
    * Topic display system.
    * Input field for Card Notes/Labels when placing a card.
    * Win/Loss state handling (The "Round End" auto-reveal sequence).
    * "Next Round" transition logic (Clear board, Deal new cards).
* **✅ Success Criteria:**
    1.  A random Topic appears at the start of the round.
    2.  Player can add the text "Jalapeño" to their card, and others see that text on the Face Down card.
    3.  If the group fails, the game pauses, reveals all cards, and allows discussion without crashing.
    4.  "Next Round" button successfully resets the board and increments the level.

### Iteration 4: Polish & Persistence
* **Objective:** Production-ready UI and Data saving.
* **Features:**
    * SQLite integration for storing Topic Packs.
    * "Create Custom Pack" UI.
    * Visual Polish: shadcn-svelte components, animations, sound effects.
* **✅ Success Criteria:**
    1.  User can create a custom Topic Pack and get a persistent Share Code.
    2.  Another user can load that Share Code into a new game.
    3.  UI uses Shadcn components (Dialogs, Cards) instead of default HTML elements.
    4.  Animations play when cards are revealed or swapped.