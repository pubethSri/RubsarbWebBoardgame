export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    cardCount?: number;
}

export interface Card {
    id: string;
    value: number; // 1-100
    playerId: string; // Owner
    isFaceUp: boolean;
    note?: string;
}

export interface BoardSlot {
    index: number;
    card: Card | null;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'REVEAL' | 'ROUND_END';

export interface RoomState {
    code: string;
    players: Player[];
    gameState: GameStatus;
    board: Card[];
}

export interface GameState {
    isConnected: boolean;
    roomCode: string | null;
    playerId: string | null;
    players: Player[];
    gameState: GameStatus;
    board: Card[];
    hand: Card[];
    error: string | null;
}

export type WsMessage =
    | { type: 'CREATE_ROOM'; payload: { playerName: string } }
    | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string } }
    | { type: 'LEAVE_ROOM'; payload: null }
    | { type: 'START_GAME'; payload: null }
    | { type: 'MOVE_CARD'; payload: { cardId: string; targetIndex: number | null } }
    | { type: 'UPDATE_BOARD'; payload: { board: Card[] } }
    | { type: 'REVEAL_NEXT'; payload: null }; // New Reveal action

export type WsResponse =
    | { type: 'ROOM_UPDATED'; payload: RoomState }
    | { type: 'ERROR'; payload: { message: string } }
    | { type: 'JOINED_ROOM'; payload: { code: string; playerId: string } }
    | { type: 'GAME_STARTED'; payload: { hand: Card[]; board: Card[] } };
