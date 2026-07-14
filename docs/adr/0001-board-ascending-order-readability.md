# ADR 0001 — Make the board's ascending order easy to follow

- **Status:** Accepted (2026-07-14)
- **Scope:** `client/src/` UX only. No protocol/gameplay change.
- **Related:** [glossary](../glossary.md); UX issue #2 (this) bundles issue #3 (hand overlay).

## Context

Players reported the **board**'s **ascending order** is hard to follow when there are
many **cards**. The board renders cards with `flex flex-wrap justify-center
content-start gap-4` ([Board.svelte](../../client/src/components/Board.svelte)). Two
structural causes:

1. **`justify-center` on wrapped rows** centers each row — including the last,
   partially-filled one — so the eye can't follow a stable left→right-then-down path.
   The zigzag *is* the "hard to follow" complaint. (The defect is the justification,
   not wrapping per se: left-justified wrap reads like text.)
2. **The hand overlay** (`fixed bottom-0 h-64 z-50`,
   [Hand.svelte](../../client/src/components/Hand.svelte)) covers the board's lower
   edge, worst on short-height phone-landscape, amplifying the "cramped" feeling.

A per-card order **number** was considered (the reporter's first instinct) but risks
being confused with the card's **value** (1–100) — a second number on the same card.

Physical Ito arranges cards as a single low→high number line; that is the players'
mental model. But the pain case is *many cards on a phone*, where a single scrollable
row means endless horizontal scroll and painful drag-across-scroll reordering. The
board is a live `svelte-dnd-action` dropzone, which makes axis-switching and
`overflow-x` single-row layouts risky (touch auto-scroll, axis detection), while
visual-only changes on the existing flex-wrap container are near-zero risk.

## Decision

**Fix the wrap; don't redesign into a scroll-row.**

1. **Left-justify the board** (`justify-center` → `justify-start`) so wrapped rows
   read L→R then down like text. Semantically better too: the sequence anchors at the
   left "low" end and grows toward "high". Keeps the existing dnd container untouched.
2. **Low→high axis rail** beneath the board (e.g. `Low (1) ————→ High (100)`) to
   reinforce direction. This replaces per-card order numbers — with an unambiguous
   reading path, no per-card ordinal is needed, sidestepping the value/order number
   collision.
3. **Breakpoint card sizing** (smaller on phones, scaling up on tablet/desktop via
   Tailwind breakpoints) so more cards fit per row on small screens. Fixed per
   breakpoint — no count-aware dynamic sizing (avoids reactive resize × drag-anim
   interactions).
4. **Bundle a hand collapse/expand toggle** — hand starts **expanded**, manual toggle
   (chevron), state remembered per session (sessionStorage, matching `game_session`).
   Collapsing slides the hand down to a handle and lets the board reclaim the reserved
   bottom padding.

## Consequences

- **Pros:** Small, dnd-safe, visual-only on the board container; resolves the zigzag
  directly; works across phone/tablet × portrait/landscape without per-viewport axis
  logic; avoids the number-on-number confusion; hand toggle relieves the cramped
  lower board.
- **Cons / trade-offs:** With few cards, `justify-start` left-anchors them instead of
  centering (accepted — clearer, and semantically the "low" anchor). Not the literal
  single-line number-line of the physical game; if playtests still find order unclear,
  revisit the number-line direction behind a dnd spike (rejected alternative here).
- **Rejected:** single-row horizontal scroll / axis-switching (dnd risk, phone scroll
  pain); per-card numeric ordinals (value/order confusion); count-aware shrink
  (complexity/risk).

## Verification

`cd client && bun run check` clean; targeted board check at phone portrait/landscape
and iPad portrait/landscape widths; hand the user a per-viewport manual checklist
(per the standing testing-workflow preference — no full-flow browser driving).

## Update (2026-07-14) — drop-slot indicator

Device playtest confirmed the layout works, but exposed a snag from the left-justify:
the ragged empty **tail** on the last row is an ambiguous drop area. Dropping a card
into it makes `svelte-dnd-action` insert *before* the last card (it picks the index
from the dragged card's overlap), so the card lands before the trailing card instead
of appending, and that card wraps to the next row.

**Decision:** make the landing spot unmistakable live rather than infer append-vs-insert
intent. In `Board.svelte`, render the drag placeholder (detected via
`SHADOW_ITEM_MARKER_PROPERTY_NAME`) as an explicit dashed "Drop here" slot sized like a
card. No change to the move/finalize logic — the shadow only exists during the live drag.

**Gotcha (cost two failed attempts):** svelte-dnd-action calls `decorateShadowEl` which
sets `visibility: hidden` on the shadow **wrapper** element (its own default indicator is
the empty gap the hidden shadow leaves). A custom placeholder therefore renders in the DOM
but is invisible. Fix: put `visibility: visible` (Tailwind `visible`) on the inner slot —
a descendant's `visible` overrides an ancestor's `hidden`. Verified by driving a real drag
in the running app and inspecting computed styles (slot `visibility: visible`, board
`innerText` now contains "DROP HERE").

Also note: `dropTargetStyle` must **not** set a yellow `background` — the whole app is
yellow, so it made the white board vanish into the page. Use a black `outline` instead
(keeps the board white, visible on yellow).

**Rejected:** a dedicated "append end-slot" that would make tail-drops deterministically
append — too invasive on the dnd item list for the marginal gain.
