# Ito — Domain Glossary

Shared vocabulary for the Ito web boardgame. Terms used across `server/src` and
`client/src`, and in ADRs under `docs/adr/`.

| Term | Meaning |
|------|---------|
| **Card** | A game piece owned by one player. Holds a hidden **value**, an optional **note**, and an `isFaceUp` flag. Rendered by `client/src/components/Card.svelte`. |
| **Value** | The secret number **1–100** printed on a card. Visible to its owner while hidden; visible to everyone once revealed. |
| **Note** | Free-text clue the owner writes on their own face-down card to hint at its value relative to the topic. Editable only by the owner while `!isFaceUp`. |
| **Topic** | The round's prompt (e.g. "how scary"), with **min range** (mapped to 1) and **max range** (mapped to 100) labels. Seeded from `server/src/topics.yaml`. |
| **Min range / Max range** | The two endpoint labels of a topic's scale. Shown under the topic as `1 = <minRange>` / `100 = <maxRange>`. |
| **Board** | The shared drop zone where players place cards in intended **ascending order**. A `svelte-dnd-action` dropzone in `client/src/components/Board.svelte`. |
| **Hand** | A player's private, not-yet-placed cards. A fixed bottom overlay (`client/src/components/Hand.svelte`), also a dnd zone. |
| **Ascending order** | The goal arrangement: card values increasing left→right (physical game: a single number line from low to high). The win condition when revealed. |
| **Reveal** | The host flips the next unrevealed card, left→right. A revealed value lower than the previously revealed one is a **descending pair** → LOSS. |
| **Locked wall** | Revealed (face-up) cards, pinned to the left/front of the board and no longer reorderable. Enforced in `handleDndConsider`/`handleDndFinalize`. |
| **Level N** | The round number. Deals N cards to each player from a shuffled 1–100 deck. Final level = `min(10, floor(100 / players))`. |
| **Private view** | A per-client board toggle (`isPrivateView`) that hides the owner's own face-down values, for over-the-shoulder play. |
