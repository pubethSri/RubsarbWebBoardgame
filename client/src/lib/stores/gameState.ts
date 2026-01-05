import { writable } from 'svelte/store';
import type { Player, GameStatus, RoomState, GameState as GameStateInterface, Card, BoardSlot } from '../types';

// Use the GameState interface from types.ts, or defining a generic Store type
type GameStore = GameStateInterface;

const initialState: GameStore = {
    isConnected: false,
    roomCode: null,
    playerId: null,
    players: [],
    gameState: 'LOBBY',
    board: [],
    hand: [],
    topic: null,
    error: null,
    level: 1,
    roundResult: null,
    readyCount: 0,
    lastRoundLevel: 1
};

function createGameState() {
    const { subscribe, update, set } = writable<GameStore>(initialState);

    return {
        subscribe,
        setConnected: (connected: boolean) => update(s => ({ ...s, isConnected: connected })),
        joinRoom: (code: string, playerId: string) => update(s => ({ ...s, roomCode: code, playerId })),
        leaveRoom: () => update(s => ({ ...s, roomCode: null, playerId: null, players: [], gameState: 'LOBBY', board: [], hand: [], topic: null, error: null })),
        updateRoom: (state: RoomState) =>
            update(s => ({
                ...s,
                players: state.players,
                gameState: state.gameState,
                board: state.board || [],
                topic: state.topic,
                level: state.level,
                readyCount: state.readyCount,
                activePackName: state.activePackName,
                activePackId: state.activePackId,
                roundResult: state.roundResult || s.roundResult
            })),
        startGame: (hand: Card[], board: Card[]) => update(s => ({ ...s, gameState: 'PLAYING', hand, board, roundResult: null })),
        setHand: (hand: Card[]) => update(s => ({ ...s, hand })),
        setBoard: (board: Card[]) => update(s => ({ ...s, board })),
        setError: (error: string) => update(s => ({ ...s, error })),
        setRoundResult: (result: 'WIN' | 'LOSS', board: Card[]) => update(s => ({ ...s, gameState: 'ROUND_END', roundResult: result, board, lastRoundLevel: s.level })),
        setFullState: (state: RoomState, hand: Card[], playerId: string) => update(s => ({
            ...s,
            players: state.players,
            gameState: state.gameState,
            board: state.board || [],
            topic: state.topic,
            level: state.level,
            readyCount: state.readyCount,
            hand: hand,
            roomCode: state.code,
            playerId: playerId,
            isConnected: true,
            roundResult: state.roundResult || null
        })),
        reset: () => set(initialState)
    };
}

export const gameState = createGameState();
