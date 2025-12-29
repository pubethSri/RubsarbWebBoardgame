import type { Player, RoomState, GameStatus, Card, WsResponse } from './types';

export class Room {
    public code: string;
    public players: Player[] = [];
    public gameState: GameStatus = 'LOBBY';
    public board: Card[] = [];
    private deck: number[] = [];
    private hands: Map<string, Card[]> = new Map();

    constructor(code: string) {
        this.code = code;
    }

    addPlayer(id: string, name: string, ws: any): Player {
        const isHost = this.players.length === 0;
        const player: Player = { id, name, isHost, ws };
        this.players.push(player);
        return player;
    }

    removePlayer(id: string) {
        this.players = this.players.filter(p => p.id !== id);
        if (this.players.length > 0 && !this.players.some(p => p.isHost)) {
            // Assign new host if host left
            this.players[0]!.isHost = true;
        }
    }

    // --- Game Logic ---

    startGame() {
        if (this.players.length < 1) return;

        this.gameState = 'PLAYING';
        this.deck = Array.from({ length: 100 }, (_, i) => i + 1);
        this.hands.clear();

        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // @ts-ignore
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        // Deal 1 card (Level 1)
        this.players.forEach(player => {
            const hand: Card[] = [];
            const val = this.deck.pop();
            if (val) {
                hand.push({
                    id: crypto.randomUUID(),
                    value: val,
                    playerId: player.id,
                    isFaceUp: false
                });
            }
            this.hands.set(player.id, hand);
        });

        // Broadcast GAME_STARTED with private hands
        this.players.forEach(player => {
            if (player.ws && player.ws.readyState === 1) { // 1 = OPEN
                const hand = this.hands.get(player.id) || [];
                player.ws.send(JSON.stringify({
                    type: 'GAME_STARTED',
                    payload: { hand, board: this.board }
                }));
            }
        });

        // Also broadcast generic room update so lobby UI switches
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
    }

    broadcast(message: WsResponse) {
        const data = JSON.stringify(message);
        this.players.forEach(player => {
            if (player.ws && player.ws.readyState === 1) {
                player.ws.send(data);
            }
        });
    }

    updateBoard(newBoard: Card[]) {
        this.board = newBoard;
        // Broadcast the update to everyone
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
    }

    revealNext() {
        if (this.board.length === 0) return;

        // Find first hidden card
        const nextHiddenIndex = this.board.findIndex(c => !c.isFaceUp);

        if (nextHiddenIndex !== -1) {
            const card = this.board[nextHiddenIndex];
            // @ts-ignore
            card.isFaceUp = true;

            // Logic: Check if Ascending
            // If index > 0, check if this card < previous card
            if (nextHiddenIndex > 0) {
                const prevCard = this.board[nextHiddenIndex - 1];
                // @ts-ignore
                if (card.value < prevCard.value) {
                    console.log("❌ FAIL: Order broken!");
                    // For now, just log and continue revealing? 
                    // Or trigger ROUND_END? The original spec says "Round Over Immediately".
                    // Let's mark game as ROUND_END maybe?
                    // For this Iteration, let's just flip it and maybe send a special alert?
                    // We'll leave the state as PLAYING but maybe the UI detects the red flag?
                }
            }

            this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
        }
    }

    getState(): RoomState {
        return {
            code: this.code,
            gameState: this.gameState,
            players: this.players.map(({ ws, ...rest }) => rest), // Exclude ws from state
            board: this.board
        };
    }
}
