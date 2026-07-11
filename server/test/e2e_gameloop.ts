/**
 * End-to-end game loop test using two scripted WebSocket clients.
 * Run with the server up:  bun run test/e2e_gameloop.ts
 *
 * Covers: create/join, start, card placement (MOVE_CARD), sequential
 * reveal, WIN + NEXT vote, LOSS + RETRY vote, level progression,
 * and GAME_COMPLETE at the final level.
 */

const URL = process.env.WS_URL || "ws://localhost:3000/ws";
const FINAL_LEVEL = 10; // matches Room MAX_LEVEL for 2 players

type Card = { id: string; value: number; playerId: string };

class TestClient {
    ws!: WebSocket;
    name: string;
    playerId = "";
    roomCode = "";
    hand: Card[] = [];
    board: Card[] = [];
    level = 1;
    lastRoundResult: "WIN" | "LOSS" | null = null;
    gameComplete = false;
    private waiters: Array<{ pred: (msg: any) => boolean; resolve: (msg: any) => void }> = [];

    constructor(name: string) {
        this.name = name;
    }

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(URL);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (e) => reject(e);
            this.ws.onmessage = (ev) => this.onMessage(JSON.parse(ev.data as string));
        });
    }

    private onMessage(msg: any) {
        switch (msg.type) {
            case "JOINED_ROOM":
                this.playerId = msg.payload.playerId;
                this.roomCode = msg.payload.code;
                break;
            case "GAME_STARTED":
                this.hand = msg.payload.hand;
                this.board = msg.payload.board;
                break;
            case "ROOM_UPDATED":
                this.board = msg.payload.board || [];
                this.level = msg.payload.level;
                break;
            case "ROUND_ENDED":
                this.lastRoundResult = msg.payload.result;
                break;
            case "GAME_COMPLETE":
                this.gameComplete = true;
                break;
        }
        // Wake up matching waiters
        this.waiters = this.waiters.filter(w => {
            if (w.pred(msg)) { w.resolve(msg); return false; }
            return true;
        });
    }

    send(type: string, payload: any = null) {
        this.ws.send(JSON.stringify({ type, payload }));
    }

    waitFor(pred: (msg: any) => boolean, label: string, timeoutMs = 5000): Promise<any> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`[${this.name}] Timeout waiting for: ${label}`)), timeoutMs);
            this.waiters.push({ pred, resolve: (msg) => { clearTimeout(timer); resolve(msg); } });
        });
    }
}

function assert(cond: boolean, msg: string) {
    if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
    console.log(`  ✔ ${msg}`);
}

/** Place all cards from both hands onto the board in the given order. */
async function placeCards(clients: TestClient[], order: Card[]) {
    for (let i = 0; i < order.length; i++) {
        const card = order[i]!;
        const owner = clients.find(c => c.playerId === card.playerId)!;
        owner.send("MOVE_CARD", { cardId: card.id, targetIndex: i });
        await owner.waitFor(
            m => m.type === "ROOM_UPDATED" && m.payload.board.length === i + 1,
            `board has ${i + 1} cards`
        );
    }
}

/** Host reveals until the round resolves; returns 'WIN' | 'LOSS' | 'COMPLETE'. */
async function revealAll(host: TestClient, cardCount: number): Promise<string> {
    for (let i = 0; i < cardCount; i++) {
        const done = host.waitFor(
            m => m.type === "ROUND_ENDED" || m.type === "GAME_COMPLETE",
            "round resolution", 1000
        ).catch(() => null);
        host.send("REVEAL_NEXT");
        const result = await done;
        if (result) {
            return result.type === "GAME_COMPLETE" ? "COMPLETE" : result.payload.result;
        }
    }
    throw new Error("Revealed all cards but round did not resolve");
}

async function main() {
    console.log("🎮 E2E Game Loop Test\n");

    // --- Setup: create & join ---
    const alice = new TestClient("ALICE");
    const bob = new TestClient("BOB");
    await alice.connect();
    await bob.connect();

    alice.send("CREATE_ROOM", { playerName: "ALICE" });
    await alice.waitFor(m => m.type === "JOINED_ROOM", "ALICE joined");
    bob.send("JOIN_ROOM", { roomCode: alice.roomCode, playerName: "BOB" });
    await bob.waitFor(m => m.type === "JOINED_ROOM", "BOB joined");
    assert(alice.roomCode === bob.roomCode, `both in room ${alice.roomCode}`);

    // --- Level 1: deliberate LOSS, then RETRY vote ---
    let started = Promise.all([
        alice.waitFor(m => m.type === "GAME_STARTED", "game started (A)"),
        bob.waitFor(m => m.type === "GAME_STARTED", "game started (B)"),
    ]);
    alice.send("START_GAME");
    await started;
    assert(alice.hand.length === 1 && bob.hand.length === 1, "level 1 deals 1 card each");

    let all = [...alice.hand, ...bob.hand].sort((a, b) => b.value - a.value); // DESCENDING = guaranteed loss
    if (all[0]!.value === all[1]!.value) throw new Error("Duplicate card values?!");
    await placeCards([alice, bob], all);
    let result = await revealAll(alice, all.length);
    assert(result === "LOSS", "descending order loses the round");

    // Both vote RETRY -> same level restarts
    started = Promise.all([
        alice.waitFor(m => m.type === "GAME_STARTED", "retry started (A)"),
        bob.waitFor(m => m.type === "GAME_STARTED", "retry started (B)"),
    ]);
    alice.send("VOTE", { vote: "RETRY" });
    bob.send("VOTE", { vote: "RETRY" });
    await started;
    assert(alice.level === 1, "RETRY keeps level at 1");

    // --- Levels 1..FINAL_LEVEL: win every level, vote NEXT ---
    for (let lvl = 1; lvl <= FINAL_LEVEL; lvl++) {
        assert(alice.hand.length === lvl && bob.hand.length === lvl, `level ${lvl} deals ${lvl} cards each`);

        const ordered = [...alice.hand, ...bob.hand].sort((a, b) => a.value - b.value);
        await placeCards([alice, bob], ordered);
        const res = await revealAll(alice, ordered.length);

        if (lvl < FINAL_LEVEL) {
            assert(res === "WIN", `level ${lvl} won`);
            const next = Promise.all([
                alice.waitFor(m => m.type === "GAME_STARTED", `level ${lvl + 1} started (A)`),
                bob.waitFor(m => m.type === "GAME_STARTED", `level ${lvl + 1} started (B)`),
            ]);
            alice.send("VOTE", { vote: "NEXT" });
            bob.send("VOTE", { vote: "NEXT" });
            await next;
            assert(alice.level === lvl + 1, `NEXT advances to level ${lvl + 1}`);
        } else {
            assert(res === "COMPLETE", `winning final level ${FINAL_LEVEL} triggers GAME_COMPLETE`);
            assert(alice.gameComplete && bob.gameComplete, "both clients received GAME_COMPLETE");
        }
    }

    alice.ws.close();
    bob.ws.close();
    console.log("\n🏆 ALL TESTS PASSED");
    process.exit(0);
}

main().catch(e => {
    console.error("\n❌ TEST FAILED:", e.message);
    process.exit(1);
});
