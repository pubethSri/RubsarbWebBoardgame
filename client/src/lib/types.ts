export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    cardCount?: number;
    token: string;
    isConnected: boolean;
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
    level: number;
    readyCount: number;
}

export interface GameState {
    isConnected: boolean;
    roomCode: string | null;
    playerId: string | null;
    players: Player[];
    gameState: GameStatus;
    board: Card[];
    hand: Card[];
    topic: Topic | null;
    error: string | null;
    level: number;
    roundResult: 'WIN' | 'LOSS' | null;
    readyCount: number;
    lastRoundLevel: number;
}

export type WsMessage =
    | { type: 'CREATE_ROOM'; payload: { playerName: string } }
    | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string } }
    | { type: 'LEAVE_ROOM'; payload: null }
    | { type: 'START_GAME'; payload: null }
    | { type: 'MOVE_CARD'; payload: { cardId: string; targetIndex: number } }
    | { type: 'RETURN_CARD'; payload: { cardId: string } }
    | { type: 'UPDATE_NOTE'; payload: { cardId: string; note: string } }
    | { type: 'UPDATE_BOARD'; payload: { board: Card[] } }
    | { type: 'REVEAL_NEXT'; payload: null }
    | { type: 'PLAYER_READY'; payload: null }
    | { type: 'RECONNECT'; payload: { token: string; roomId: string } };

export type WsResponse =
    | { type: 'ROOM_UPDATED'; payload: RoomState }
    | { type: 'ERROR'; payload: { message: string } }
    | { type: 'JOINED_ROOM'; payload: { code: string; playerId: string; token: string } }
    | { type: 'GAME_STARTED'; payload: { hand: Card[]; board: Card[] } }
    | { type: 'ROUND_ENDED'; payload: { result: 'WIN' | 'LOSS'; board: Card[] } }
    | { type: 'WELCOME_BACK'; payload: { gameState: RoomState; hand: Card[] } }
    | { type: 'PLAYER_DC'; payload: { playerId: string } }
    | { type: 'PLAYER_RECONNECTED'; payload: { playerId: string } };
