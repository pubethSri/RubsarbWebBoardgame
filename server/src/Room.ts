import type { Player, RoomState, GameStatus, Card, WsResponse, Topic } from './types';
import { TopicManager } from './TopicManager';

const topicManager = new TopicManager();

const MAX_PLAYERS = 8;

export class Room {
    public code: string;
    public players: Player[] = [];
    public gameState: GameStatus = 'LOBBY';
    public board: Card[] = [];
    public topic: Topic | null = null;
    public version: number = 0;
    public level: number = 1;
    private deck: number[] = [];
    private hands: Map<string, Card[]> = new Map();
    private readyPlayers: Set<string> = new Set();
    public activePackId: string = "starter_pack";
    public activePackName: string = "The Essentials";
    public roundResult: 'WIN' | 'LOSS' | null = null;

    constructor(code: string) {
        this.code = code;
    }

    addPlayer(id: string, name: string, ws: any): Player {
        if (this.players.length >= MAX_PLAYERS) {
            throw new Error("Room is full (Max 8 players)");
        }
        const isHost = this.players.length === 0;
        const token = crypto.randomUUID();
        const player: Player = {
            id,
            name,
            isHost,
            ws,
            token,
            isConnected: true
        };
        this.players.push(player);
        return player;
    }

    handleDisconnect(id: string) {
        const player = this.players.find(p => p.id === id);
        if (!player) return;

        player.isConnected = false;

        // Start Grace Period Timer (60s)
        if (player.disconnectTimeout) clearTimeout(player.disconnectTimeout);
        player.disconnectTimeout = setTimeout(() => {
            console.log(`⏰ Grace period expired for ${player.name} (${player.id})`);
            this.removePlayer(player.id);
            this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
        }, 60000);

        this.broadcast({ type: 'PLAYER_DC', payload: { playerId: id } });
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
    }

    reconnectPlayer(token: string, ws: any): Player | null {
        const player = this.players.find(p => p.token === token);
        if (!player) return null;

        // Cancel Timer
        if (player.disconnectTimeout) {
            clearTimeout(player.disconnectTimeout);
            player.disconnectTimeout = undefined;
        }

        // Update Connection
        player.ws = ws;
        player.isConnected = true;

        this.broadcast({ type: 'PLAYER_RECONNECTED', payload: { playerId: player.id } });
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });

        return player;
    }

    removePlayer(id: string) {
        // Clear any pending timer
        const player = this.players.find(p => p.id === id);
        if (player && player.disconnectTimeout) {
            clearTimeout(player.disconnectTimeout);
        }

        this.players = this.players.filter(p => p.id !== id);
        if (this.players.length > 0 && !this.players.some(p => p.isHost)) {
            // Assign new host if host left
            this.players[0]!.isHost = true;
        }
    }

    setPack(id: string, name: string) {
        this.activePackId = id;
        this.activePackName = name;
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });
    }

    // --- Game Logic ---

    startGame() {
        if (this.players.length < 2) return;

        this.gameState = 'PLAYING';
        this.deck = Array.from({ length: 100 }, (_, i) => i + 1);
        this.hands.clear();
        this.version = 0; // Reset version on game start
        this.board = []; // Reset board
        this.readyPlayers.clear();
        this.roundResult = null; // Reset result

        // Shuffle
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // @ts-ignore
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }

        // Deal cards based on LEVEL
        // Level 1 = 1 card, Level 2 = 2 cards, etc.
        const cardsPerPlayer = this.level;

        this.players.forEach(player => {
            const hand: Card[] = [];
            for (let i = 0; i < cardsPerPlayer; i++) {
                const val = this.deck.pop();
                if (val) {
                    hand.push({
                        id: crypto.randomUUID(),
                        value: val,
                        playerId: player.id,
                        isFaceUp: false
                    });
                }
            }
            this.hands.set(player.id, hand);
        });

        const rawTopic = topicManager.getRandomTopic(this.activePackId);
        this.topic = {
            text: rawTopic.topic,
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

    handleReady(playerId: string) {
        this.readyPlayers.add(playerId);
        this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });

        // Check if all players are ready
        if (this.readyPlayers.size === this.players.length) {
            console.log(`[Room ${this.code}] All players ready! Starting Round (Level ${this.level})`);
            this.startGame();
        }
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
            this.broadcast({ type: 'ROOM_UPDATED', payload: this.getState() });

            // Logic: Check if Ascending
            if (nextHiddenIndex > 0) {
                const prevCard = this.board[nextHiddenIndex - 1];
                // @ts-ignore
                if (card.value < prevCard.value) {
                    console.log(`❌ FAIL: Order broken! ${card.value} < ${prevCard.value}`);
                    console.log(`❌ FAIL: Order broken! ${card.value} < ${prevCard.value}`);
                    this.gameState = 'ROUND_END';
                    this.roundResult = 'LOSS';
                    // Reveal ALL remaining cards
                    this.board.forEach(c => c.isFaceUp = true);

                    this.broadcast({
                        type: 'ROUND_ENDED',
                        payload: { result: 'LOSS', board: this.board }
                    });
                    // DO NOT increment Level. Voting "Ready" will restart same level.
                    return;
                }
            }

            // Check if ALL cards are now revealed
            const allRevealed = this.board.every(c => c.isFaceUp);
            if (allRevealed) {
                // Check if sorted
                const isSorted = this.board.every((c, i, arr) => i === 0 || c.value >= arr[i - 1].value);

                if (isSorted) {
                    console.log("✅ SUCCESS: All cards revealed in ascending order!");
                    this.gameState = 'ROUND_END';
                    this.roundResult = 'WIN';
                    this.level++; // Increment Level

                    this.broadcast({
                        type: 'ROUND_ENDED',
                        payload: { result: 'WIN', board: this.board }
                    });
                } else {
                    console.log("⚠️ GAME OVER: All cards revealed but order is wrong.");
                    // Should be caught above, but safe fallback
                }
            }
        }
    }

    getState(): RoomState {
        return {
            code: this.code,
            gameState: this.gameState,
            players: this.players.map(({ ws, disconnectTimeout, ...rest }) => ({
                ...rest,
                cardCount: this.hands.get(rest.id)?.length || 0
            })),
            board: this.board,
            topic: this.topic,
            version: this.version,
            level: this.level,
            readyCount: this.readyPlayers.size,
            activePackName: this.activePackName,
            activePackId: this.activePackId,
            roundResult: this.roundResult || undefined
        };
    }
}
