# Design: Thai Localization (Topics + UI)

Two independent pieces, sequenced content-first: **(1) original Thai-society topic packs** (pure content, zero code, immediately playable) and **(2) a Thai UI toggle** (mechanical, touches ~18 components once).

Status: **design, not implemented.**

## 0. Fonts: already done

`client/src/app.css` loads **Kanit (weights 400–900)** alongside Space Mono and Inter, and Kanit sits in both font stacks (`--font-mono: "Space Mono", "Kanit", monospace`; `--font-sans: "Inter", "Kanit", sans-serif`). Space Mono and Inter have no Thai coverage, so Thai text already falls through to Kanit and renders correctly today — topic text, player names, everything.

Aesthetic consequence to accept: Thai headings render in Kanit, not the mono display face. Kanit's heavy weights actually suit the neo-brutalist look; no action needed unless a dedicated Thai display font is wanted later (e.g. pairing a louder Thai face for headings).

## 1. Thai topic packs — original content, not translations

**Principle: topics written *for* Thai society, not translated from the English packs.** A translated "Spicy Food" is fine but wastes the opportunity; the good stuff is topics that only work because everyone at the table shares the same cultural reference points.

### Mechanism (zero new code)

Add pack(s) to `server/src/topics.yaml` following the existing format — `migrate.ts` reseeds official packs on every boot, so content lands automatically:

```yaml
  - id: "thai_pack"
    name: "ไทยแลนด์โอนลี่"
    description: "หัวข้อฉบับคนไทย เข้าใจตรงกันไม่ต้องแปล"
    topics:
      - text: "ความจำเป็นของของในเซเว่น"
        min_label: "ซื้อทำไม"
        max_label: "ขาดไม่ได้"
```

Notes:
- Give the pack a **Thai name** so it self-identifies in the Lobby pack picker — no language-tagging feature needed for v1. (A `lang` column on `packs` for filtering is a possible later addition, only worthwhile once there are many packs.)
- Keep `min_label`/`max_label` short — the in-game topic box renders them as `1 = {min}` / `100 = {max}`, and the user-pack schema caps labels at 15 chars; staying within that keeps official and user packs consistent.
- Topic language is independent of UI language: the host picks the pack, so Thai groups can play Thai topics on the English UI today, before the toggle ships.

### Seed content ideas (~starter set for one pack)

| Topic (text) | 1 = min_label | 100 = max_label |
|---|---|---|
| ความจำเป็นของของในเซเว่น | ซื้อทำไม | ขาดไม่ได้ |
| ความน่ากลัวของผีไทย | น่ารัก | ขวัญหนี |
| ความเผ็ดของอาหารตามสั่ง | เด็กกินได้ | พริกล้วน |
| ความรถติดของถนนในกรุงเทพ | โล่งปรี๊ด | จอดนิ่ง |
| ความน่าไปเที่ยวของจังหวัดไทย | ผ่านเฉยๆ | ต้องไปให้ได้ |
| ความยากของวิชาสมัยเรียน | หลับก็ผ่าน | เรียนซ้ำ |
| ความอร่อยของเมนูร้านข้าวแกง | ข้ามเลย | ตักสองรอบ |
| ความสายมูของพฤติกรรม | ไม่เชื่อเลย | มูเต็มขั้น |
| ความเกรงใจในสถานการณ์นี้ | หน้าด้าน | เกรงใจสุดๆ |
| ความแมสของเพลงงานวัด | ใครก็ไม่รู้ | ทั้งงานร้องได้ |

### Expanded ideas (batch 2)

| Topic (text) | 1 = min_label | 100 = max_label |
|---|---|---|
| ความไทยของพฤติกรรมนี้ | ฝรั่งจ๋า | ไทยแท้ร้อยเปอร์ |
| ความน่าเชื่อของข่าวในกลุ่มไลน์ | มั่วชัดๆ | แชร์ต่อด่วน |
| ความแม่นของหมอดู | มั่วชัวร์ | ตรงจนขนลุก |
| ความอร่อยของของกินหน้าโรงเรียน | เดินผ่าน | ต่อแถวยาว |
| ความกดดันของคำถามวันรวมญาติ | คุยเล่นๆ | อยากหายตัว |
| ความจำได้ของโฆษณาไทยในตำนาน | นึกไม่ออก | ท่องได้ทุกคำ |
| ความดราม่าของละครหลังข่าว | เนือยมาก | ตบกันสนั่น |
| ความน่าหงุดหงิดของคนบนรถไฟฟ้า | เฉยๆ | อยากลงป้ายหน้า |
| ความคุ้มของบุฟเฟ่ต์สไตล์นี้ | ขาดทุนยับ | กำไรเห็นๆ |
| ความหลอนของซอยตอนตีสอง | เดินชิลล์ | วิ่งเท่านั้น |
| ความยาวนานของพิธีการไทย | แป๊บเดียวจบ | ครึ่งวันไม่จบ |
| ความอันตรายของสิ่งที่แม่ห้าม | ห้ามทำไม | โดนตีแน่ |
| ความน่าซื้อของของฝากประจำจังหวัด | วางจนฝุ่นจับ | แย่งกันหยิบ |
| ความขลังของวิธีแก้เคล็ด | ทำไปงั้น | เห็นผลจริง |
| ความหวานของเมนูคาเฟ่ | หวานเป็นศูนย์ | เบาหวานถามหา |

**Format note (editorial decision):** the "ความ…" phrasing is the *ideation* format — it makes it easy to picture the scale and derive min/max labels, so new topic ideas should keep using it. It reads repetitively in-game, though, so the final pack gets a wording-twist revision pass (owner: maintainer) before shipping. Treat everything above as seeds — and once the [data-insights](data-insights.md) system exists, the clue-corpus and calibration views will show empirically which of these scales work.

## 2. Thai UI toggle — lightweight dictionary, no library

### Current state

There is **no i18n mechanism at all**: no library, no `$t`, all user-facing strings hardcoded English inline across ~18 components (`Landing`, `Lobby`, `Game`, `Result`, `CreatePack`, `ManagePacks`, `AdminDashboard`, `HistoryView`, `PlayerList`, `Board`, `Card`, `Hand`, `Button`, `ConfirmModal`, `HostGuideModal`, `HowToPlayModal`, `LoginModal`, `WhatsNewModal`). `index.html` hardcodes `lang="en"`.

### Approach

For exactly two locales, an i18n library (svelte-i18n etc.) is overkill. One new module, `client/src/lib/i18n.ts` (or `i18n.svelte.ts` using runes, matching the codebase style):

- A string table: `const strings = { en: { create_room: "CREATE ROOM", ... }, th: { create_room: "สร้างห้อง", ... } }` — flat keys, grouped by component with comments.
- A `locale` state (Svelte 5 rune or store, consistent with `gameState.ts`), persisted to `localStorage` (locale is a device preference, unlike `game_session` which is deliberately per-tab in `sessionStorage`).
- A `t(key)` lookup with English fallback for missing Thai keys — so the toggle can ship before translation is 100% complete.
- Reactively set `document.documentElement.lang` when locale changes.
- A small EN/ไทย toggle on the Landing page (fits the existing fixed-position chrome buttons).

Then one mechanical pass per component swapping literals for `t()` calls.

### Scope cut for v1

**Leave the admin/creator views English-only** (`CreatePack`, `ManagePacks`, `AdminDashboard`, `HistoryView`) — they're role-gated tools for the maintainer, not players. That roughly halves the string count and concentrates effort on the player path: Landing → Lobby → Game → Result + the modals.

Things to watch during the pass:
- **Uppercase styling**: the UI leans on `uppercase`/all-caps mono text; Thai has no case, so those strings just render as-is — fine, but check layout where all-caps English strings are short and Thai equivalents run long (buttons, badges).
- **Dynamic/templated strings** (e.g. counters like `(voted/total)`, "Level N Complete"): use small functions or parameterized entries in the table rather than string concatenation, since Thai word order differs.
- **`WhatsNewModal` / patch notes**: version-specific content; reasonable to keep English-only or translate only the latest entry.
- **Game content vs chrome**: topic text comes from packs and is *not* part of UI translation — already handled by section 1.

### Effort

- Packs: content-writing time only; yaml edit + boot.
- UI toggle: the `i18n.ts` module is small (~50 LOC + string table); the component pass is mechanical, roughly a day for the player-path scope including writing the Thai copy.

## 3. Sequencing

1. **Ship a Thai pack first** — zero code, playable immediately, and immediately tests demand ("do Thai groups actually pick it?" — answerable via the insights system's pack-popularity query once that ships).
2. **UI toggle second**, player-path scope.
3. Later, if warranted: `lang` tag on packs + filtering, admin-view translation, a dedicated Thai display font.
