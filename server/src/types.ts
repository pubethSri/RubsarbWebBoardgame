export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    cardCount?: number;
    ws: any; // WebSocket connection
}

export interface Card {
    id: string;
    value: number; // 1-100
    playerId: string; // Owner
    isFaceUp: boolean;
    note?: string;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'REVEAL' | 'ROUND_END';

export interface Topic {
    text: string;
    minRange: string;
    maxRange: string;
}

export interface RoomState {
    code: string;
    players: Player[];
    gameState: GameStatus;
    board: Card[];
    topic: Topic | null;
    version: number;
}

export type WsMessage =
    | { type: 'CREATE_ROOM'; payload: { playerName: string } }
    | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string } }
    | { type: 'LEAVE_ROOM'; payload: null }
    | { type: 'START_GAME'; payload: null }
    | { type: 'MOVE_CARD'; payload: { cardId: string; targetIndex: number } } // Changed from null targetIndex
    | { type: 'RETURN_CARD'; payload: { cardId: string } }
    | { type: 'UPDATE_NOTE'; payload: { cardId: string; note: string } }
    | { type: 'UPDATE_BOARD'; payload: { board: Card[] } }
    | { type: 'REVEAL_NEXT'; payload: null }; // New message for full board sync

export type WsResponse =
    | { type: 'ROOM_UPDATED'; payload: RoomState }
    | { type: 'ERROR'; payload: { message: string } }
    | { type: 'JOINED_ROOM'; payload: { code: string; playerId: string } }
    | { type: 'GAME_STARTED'; payload: { hand: Card[]; board: Card[] } };
