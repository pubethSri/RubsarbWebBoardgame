# Design: Gameplay Data Collection & Insights

Goal: learn how people actually answer and scale topics with numbers — per topic: (secret number, typed clue, where the group placed it, whether the run survived) — and use that as a feedback loop for content and update decisions.

Status: **design, not implemented.** Verified against the code in July 2026.

## 1. Verified facts the design rests on

- **All the interesting data already exists in memory at level end** and is discarded. `Room` holds: `this.topic` (`{text, minRange, maxRange}`), the ordered `this.board` of `Card = {id, value, playerId, isFaceUp, note?}` where `note` is the player-typed clue (synced via `UPDATE_NOTE`, `server/src/Room.ts:424`), the failing comparison on a LOSS, `this.players`, `this.level`, and `activePackId`/`activePackName`.
- **The only persistence today** is the thin `game_logs` table (`server/src/db/index.ts`): room code, per-Room `session_id`, pack display name, level, WIN/LOSS, JSON array of player *names*. Written solely by `Room.logResult()` (`Room.ts:444`), called on LOSS (`Room.ts:484`) and WIN (`Room.ts:506`).
- **Final-level wins ARE logged** — the WIN log at `Room.ts:506` runs before the `GAME_COMPLETE` branch (`Room.ts:512`). There is no logging bug; what's missing is only a way to distinguish a run-completing WIN from a mid-run WIN.
- **Topic IDs are unstable — never FK to `topics`.** `migrate.ts:50` deletes and re-inserts every official pack's topics with fresh UUIDs on *every server boot*; the admin topic editor (`PUT /api/admin/packs/:id/topics`) does the same for user packs on every edit. Pack IDs *are* stable. Therefore analytics must key topics on **`(pack_id, topic_text)`** and snapshot everything it needs.
- **Vote data is available at the right moment.** In `resolveVotes()` (`Room.ts:300`) the per-player RETRY/NEXT votes, the finished level's `roundResult`, and the finished level's `this.topic` are all still in scope (topic is only overwritten by the next `startGame`).
- **Single teardown path for abandonment:** rooms die via `removePlayer` → `onEmpty` (`Room.ts:132`), a clean hook for logging a level abandoned mid-play.

## 2. Schema

Two new tables in `initDB()` (`server/src/db/index.ts`), alongside the existing ones. Fully denormalized — rows survive pack deletion, topic edits, and boot reseeds. The legacy `game_logs` table stays untouched (HistoryView keeps working) and is deprecated in Phase 2.

```sql
CREATE TABLE IF NOT EXISTS level_results (
    id            TEXT PRIMARY KEY,                 -- uuid
    session_id    TEXT NOT NULL,                    -- Room.sessionId (stable per room lifetime)
    room_code     TEXT NOT NULL,
    level         INTEGER NOT NULL,
    attempt       INTEGER NOT NULL DEFAULT 1,       -- nth try at this level in this session
    result        TEXT NOT NULL CHECK (result IN ('WIN','LOSS','ABANDONED')),
    is_final      INTEGER NOT NULL DEFAULT 0,       -- 1 = this WIN completed the whole run
    player_count  INTEGER NOT NULL,
    pack_id       TEXT NOT NULL,                    -- stable, safe to group on
    pack_name     TEXT NOT NULL,                    -- display snapshot
    topic_text    TEXT NOT NULL,                    -- snapshot; (pack_id, topic_text) is the topic key
    min_label     TEXT,
    max_label     TEXT,
    fail_index    INTEGER,                          -- board position where order broke (NULL unless LOSS)
    votes_retry   INTEGER,                          -- filled by resolveVotes (NULL = no vote happened)
    votes_next    INTEGER,
    created_at    INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_lr_topic   ON level_results(pack_id, topic_text);
CREATE INDEX IF NOT EXISTS idx_lr_session ON level_results(session_id);

CREATE TABLE IF NOT EXISTS card_placements (
    level_result_id TEXT NOT NULL REFERENCES level_results(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL,               -- 0-based board index at level end
    value           INTEGER NOT NULL,               -- the secret number 1-100
    player_index    INTEGER,                        -- owner's index in room.players at log time; NULL if owner left
    note            TEXT,                           -- clue text, truncated to 120 chars; NULL if empty or notes disabled
    PRIMARY KEY (level_result_id, position)
);
```

Decisions and rationale:

- **Topic key = `(pack_id, topic_text)`**, labels snapshotted. Churn-proof (see verified facts). Editing a topic's wording changes its analytic identity — which is semantically correct: it *is* a different prompt. Optional future hardening (deterministic topic ids in `migrate.ts`) is deliberately not a dependency.
- **Run linking**: `(session_id, level, attempt)` distinguishes retries. `attempt` is a small in-memory counter on `Room`: reset to 1 on level advance and fresh `startGame`, incremented when a RETRY vote resolves.
- **Anonymity by construction**: `player_index` (0..7) only; names never enter analytics tables. The index is only meaningful within one level row — sufficient for "one player misplaced" analysis, and that's the point.
- **Displacement is derived, not stored**: correct position = `RANK() OVER (PARTITION BY level_result_id ORDER BY value)` (bun:sqlite supports window functions). Capture code stays dumb.
- **Unplaced hand cards on a LOSS are skipped in v1** — they have no placement, which is the core signal. Revisit only if clue-corpus volume matters.
- **Vote counts live on `level_results`** (one UPDATE), not a separate table. A `topic_ratings` table only appears if explicit ratings ship (Phase 3).

## 3. Capture points

All in `server/src/Room.ts`:

1. **Replace `logResult()` (`Room.ts:444`) with `logLevelResult(result, failIndex?)`**: writes one `level_results` row + N `card_placements` rows in a single `db.transaction`; stores the new row id in `private lastLevelResultId`; keeps dual-writing the legacy `game_logs` row until HistoryView migrates. `is_final = result === 'WIN' && this.level >= finalLevel`.
2. **LOSS branch (`Room.ts:484`)**: `logLevelResult('LOSS', failedBoardIndex)`.
3. **WIN path (`Room.ts:506`)**: `logLevelResult('WIN')` — already runs for the final level, no structural change.
4. **`resolveVotes()` (`Room.ts:300`)**: after counting, `UPDATE level_results SET votes_retry = ?, votes_next = ? WHERE id = lastLevelResultId`, then clear it. Manage `attempt` here (NEXT → 1, RETRY → ++).
5. **Abandonment (~6 lines)**: in `removePlayer`, just before `this.onEmpty?.()` (`Room.ts:132`): if `gameState === 'PLAYING'`, log `'ABANDONED'` with whatever partial board exists. Gives a per-topic rage-quit signal for free; excluded from calibration queries by `WHERE result != 'ABANDONED'`.
6. **`startGame()`**: reset `lastLevelResultId = null`. Topic snapshot fields already land in `this.topic`.

## 4. Privacy stance

Deliberate but proportionate to a self-hosted hobby game:

- **Names never enter analytics tables** — positional index only. (Legacy `game_logs.players_snapshot` still carries names; when HistoryView migrates in Phase 2, stop writing `game_logs` and the last name-bearing surface goes away.)
- **Notes are stored by default** — they are the entire point of the clue-corpus insight — but truncated to 120 chars at capture, and gated by one env flag: **`ANALYTICS_NOTES=off`** stores NULL instead. Document in the README: "clue texts are stored for game-balance analysis; set `ANALYTICS_NOTES=off` to disable."
- Side fix worth taking regardless: `UPDATE_NOTE` currently has **no server-side length limit** — add one.
- Access is admin-only via the existing `/api/admin` guard; the single SQLite file makes retention/deletion a one-liner.
- Never store: tokens, ws ids, IPs, anything from `users`.
- Not worth it here: consent banners, note scrubbing, per-player deletion APIs.

## 5. Insight queries → admin "Insights" page

Plain SQLite, served as read-only endpoints under the existing `/api/admin` guard (e.g. `GET /api/admin/insights/topics`, `/calibration`, `/values`, `/clues`, `/packs`). Client: one new section in `AdminDashboard.svelte` (sibling of `HistoryView`); plain tables + CSS bars, no chart library.

**Q1 — Per-topic calibration (where do people misjudge):**

```sql
WITH ranked AS (
  SELECT lr.pack_id, lr.topic_text, cp.value, cp.position,
         RANK() OVER (PARTITION BY cp.level_result_id ORDER BY cp.value) - 1 AS correct_pos
  FROM card_placements cp
  JOIN level_results lr ON lr.id = cp.level_result_id
  WHERE lr.result IN ('WIN','LOSS')
)
SELECT pack_id, topic_text,
       ROUND(AVG(ABS(position - correct_pos)), 2) AS avg_abs_displacement,
       COUNT(*) AS placements
FROM ranked
GROUP BY pack_id, topic_text
HAVING placements >= 20
ORDER BY avg_abs_displacement DESC;
```

*UI:* "Most confusing topics" table; topic drill-down shows value (x) vs `position − correct_pos` (y) — the misjudgment fingerprint of that topic's scale.

**Q2 — Topic difficulty ranking:**

```sql
SELECT pack_id, topic_text,
       COUNT(*) AS plays,
       ROUND(AVG(result = 'LOSS'), 2) AS loss_rate,
       SUM(result = 'ABANDONED') AS abandons,
       ROUND(AVG(CASE WHEN result='LOSS' THEN fail_index END), 1) AS avg_break_pos
FROM level_results
GROUP BY pack_id, topic_text
HAVING plays >= 5
ORDER BY loss_rate DESC;
```

*UI:* sortable table with loss-rate bar. Low `avg_break_pos` = groups fail immediately (scale is unintuitive); high = topic is fine, the numbers were just tight.

**Q3 — Which numbers are hardest (break-causing values):**

```sql
SELECT ((cp.value - 1) / 10) * 10 + 1 AS bucket_start,
       COUNT(*) AS breaks
FROM level_results lr
JOIN card_placements cp
  ON cp.level_result_id = lr.id AND cp.position = lr.fail_index
WHERE lr.result = 'LOSS'
GROUP BY bucket_start
ORDER BY breaks DESC;
```

*UI:* histogram over 1–10 … 91–100. Companion: Q1's `ranked` CTE grouped by value bucket gives average displacement per number range.

**Q4 — Clue corpus per (topic, number bucket):**

```sql
SELECT cp.value, cp.note, lr.result, lr.created_at
FROM card_placements cp
JOIN level_results lr ON lr.id = cp.level_result_id
WHERE lr.pack_id = $pack AND lr.topic_text = $topic
  AND cp.note IS NOT NULL
  AND cp.value BETWEEN $lo AND $hi
ORDER BY lr.created_at DESC LIMIT 100;
```

*UI:* on topic drill-down, a 10-bucket strip; clicking a bucket lists real clues players wrote for those numbers — the single best tool for judging whether a topic's scale labels work.

**Q5 — Pack popularity:**

```sql
SELECT pack_id, pack_name,
       COUNT(DISTINCT session_id) AS sessions,
       COUNT(*) AS levels_played,
       ROUND(AVG(player_count), 1) AS avg_group_size,
       MAX(created_at) AS last_played
FROM level_results
GROUP BY pack_id
ORDER BY levels_played DESC;
```

*UI:* pack leaderboard at the top of the Insights page. This is also the seed of the future "community/popular topics" feature.

**Q6 — Post-loss skip rate (implicit "unfun topic" signal):**

```sql
SELECT pack_id, topic_text,
       SUM(result = 'LOSS') AS losses,
       ROUND(SUM(CASE WHEN result='LOSS' THEN votes_next ELSE 0 END) * 1.0 /
             NULLIF(SUM(CASE WHEN result='LOSS' THEN votes_next + votes_retry ELSE 0 END), 0), 2)
         AS post_loss_skip_share
FROM level_results
GROUP BY pack_id, topic_text
HAVING losses >= 3
ORDER BY post_loss_skip_share DESC;
```

*UI:* "Topics groups don't want to retry" — high skip share after a loss marks *unfun* (vs merely hard) topics.

## 6. Feedback loop

- **Implicit first (free, ships with Phase 1):** the RETRY/NEXT vote counts (Q6). Honest caveat: the vote is formally about level progression, not the topic — a retry draws a *new* random topic — so treat it as a weak "was that worth repeating" signal, strongest post-LOSS. `GAME_COMPLETE` produces no vote; acceptable, final wins are unambiguous positive signal.
- **Explicit rating: deferred to Phase 3, slot pre-designed.** A thumbs up/down on the Result screen: one WS message `{ type: 'TOPIC_FEEDBACK', payload: { rating: 'UP' | 'DOWN' } }`, accepted only in `ROUND_END`/`GAME_COMPLETE`, writing `(level_result_id, player_index, rating)` into a small `topic_ratings` table keyed by `lastLevelResultId`. Add it only if Phase 2 data shows Q6 is too noisy — every extra tap on a party game's result screen costs energy.

## 7. Rollout

| Phase | Scope | Size |
|---|---|---|
| **1 — Capture** | `initDB()` tables; `logLevelResult` + 4 call-site edits; `attempt`/`lastLevelResultId` fields; `ANALYTICS_NOTES` flag; note length cap | ~150–200 LOC, server-only, ~half a day. **Ship first and alone** — data accrues while the rest is built. |
| **2 — Insights** | 5 read-only `/api/admin/insights/*` endpoints (Q1–Q6); Insights section in `AdminDashboard.svelte` with topic drill-down; migrate `HistoryView` to `level_results`, stop dual-writing `game_logs` | ~250–350 LOC, 1–2 days. Gate on a couple of weeks of Phase 1 data. |
| **3 — Explicit feedback** (optional) | Thumbs on Result screen + `topic_ratings` + one extra column in Q2/Q6 views | ~100 LOC. Only if implicit signal proves insufficient. |
