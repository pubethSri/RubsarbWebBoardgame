import type { Player, RoomState, GameStatus, Card, WsResponse, Topic } from './types';
import { TopicManager } from './TopicManager';

const topicManager = new TopicManager();

export class Room {
    public code: string;
    public players: Player[] = [];
    public gameState: GameStatus = 'LOBBY';
    public board: Card[] = [];
    public topic: Topic | null = null;
    public version: number = 0;
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
        this.version = 0; // Reset version on game start

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

        const rawTopic = topicManager.getRandomTopic();
        this.topic = {
            text: rawTopic.text,
            minRange: rawTopic.min_label,
            maxRange: rawTopic.max_label
        };

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

    // New Atomic Move Logic
    moveCard(cardId: string, targetIndex: number) {
        // 1. Find the card in the current board
        const currentIndex = this.board.findIndex(c => c.id === cardId);

        // If not found in board, check if it's in a hand (First play)
        if (currentIndex === -1) {
            // Find in hands
            let foundInHand = false;
            for (const [playerId, hand] of this.hands.entries()) {
                const handIndex = hand.findIndex(c => c.id === cardId);
                if (handIndex !== -1) {
                    const [card] = hand.splice(handIndex, 1);
                    // Add to board at targetIndex
                    this.board.splice(targetIndex, 0, card);
                    foundInHand = true;
                    break;
                }
            }
            if (!foundInHand) {
                console.warn(`Card ${cardId} not found in board or hands`);
                return;
            }
        } else {
            // Move within board
            const [card] = this.board.splice(currentIndex, 1);
            if (card.isFaceUp) {
                console.warn(`Attempt to move revealed card ${cardId}`);
                // Revert
                this.board.splice(currentIndex, 0, card);
                return;
            }
            this.board.splice(targetIndex, 0, card);
        }

        // Increment version
        this.version++;
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
    }

    returnCard(cardId: string) {
        console.log(`[Room ${this.code}] returnCard request: ${cardId}`);
        const index = this.board.findIndex(c => c.id === cardId);
        if (index === -1) {
            console.warn(`Card ${cardId} not found on board to return`);
            return;
        }

        const card = this.board[index];
        // @ts-ignore
        if (card.isFaceUp) {
            console.warn(`Cannot return revealed card ${cardId}`);
            return;
        }

        // Remove from board
        this.board.splice(index, 1);

        // Return to owner's hand
        // @ts-ignore
        const hand = this.hands.get(card.playerId);
        if (hand) {
            // @ts-ignore
            hand.push(card);
            // Optionally: sort hand?
        } else {
            // Should not happen if player is in room
            // @ts-ignore
            this.hands.set(card.playerId, [card]);
        }

        this.version++;
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
    }

    updateNote(cardId: string, note: string) {
        // 1. Try to find in Board
        const boardCard = this.board.find(c => c.id === cardId);
        if (boardCard) {
            boardCard.note = note;
            this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
            return;
        }

        // 2. Try to find in Hands
        for (const [playerId, hand] of this.hands.entries()) {
            const handCard = hand.find(c => c.id === cardId);
            if (handCard) {
                handCard.note = note;
                // Resend GAME_STARTED to update private hands
                const player = this.players.find(p => p.id === playerId);
                if (player && player.ws) {
                    player.ws.send(JSON.stringify({
                        type: 'GAME_STARTED',
                        payload: { hand, board: this.board }
                    }));
                }
                return;
            }
        }
    }

    updateBoard(newBoard: Card[]) {
        // Fallback or Deprecated? 
        // For now, let's keep it but ideally we switch to moveCard everywhere.
        this.board = newBoard;
        this.version++; // Even full overwrites bump version
        // ... (rest of updateBoard logic)

        newBoard.forEach(card => {
            // ... (hand syncing logic)
            const playerHand = this.hands.get(card.playerId);
            if (playerHand) {
                const cardIndex = playerHand.findIndex(c => c.id === card.id);
                if (cardIndex !== -1) {
                    playerHand.splice(cardIndex, 1);
                }
            }
        });

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

            // Check if ALL cards are now revealed
            const allRevealed = this.board.every(c => c.isFaceUp);
            if (allRevealed) {
                // Check if sorted
                const isSorted = this.board.every((c, i, arr) => i === 0 || c.value >= arr[i - 1].value);

                if (isSorted) {
                    console.log("✅ SUCCESS: All cards revealed in ascending order!");
                    // TODO: Trigger round win state/animation in future
                } else {
                    console.log("⚠️ GAME OVER: All cards revealed but order is wrong.");
                }
            }
        }
    }

    getState(): RoomState {
        return {
            code: this.code,
            gameState: this.gameState,
            players: this.players.map(({ ws, ...rest }) => ({
                ...rest,
                cardCount: this.hands.get(rest.id)?.length || 0
            })),
            board: this.board,
            topic: this.topic,
            version: this.version
        };
    }
}
