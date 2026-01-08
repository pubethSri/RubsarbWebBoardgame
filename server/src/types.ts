export interface Player {
    id: string;
    name: string;
    isHost: boolean;
    cardCount?: number;
    ws?: any; // WebSocket connection
    token: string; // Session token
    isConnected: boolean;
    disconnectTimeout?: any;
    color: string;
}

export const PLAYER_COLORS = [
    "#FF0000", // Red
    "#0000FF", // Blue
    "#00FF00", // Green
    "#FFA500", // Orange
    "#800080", // Purple
    "#FFC0CB", // Pink
    "#00FFFF", // Cyan
    "#A52A2A", // Brown
    "#808080", // Gray
];

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
    level: number;
    readyCount: number;
    activePackId: string;
    activePackName: string;
    roundResult?: 'WIN' | 'LOSS';
    votes: Record<string, 'RETRY' | 'NEXT'>;
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
    | { type: 'PLAYER_READY'; payload: null }
    | { type: 'RECONNECT'; payload: { token: string; roomId: string } }
    | { type: 'CHANGE_COLOR'; payload: { color: string } }
    | { type: 'KICK_PLAYER'; payload: { playerId: string } }
    | { type: 'VOTE', payload: { vote: 'RETRY' | 'NEXT' } };

export type WsResponse =
    | { type: 'ROOM_UPDATED'; payload: RoomState }
    | { type: 'ERROR'; payload: { message: string } }
    | { type: 'JOINED_ROOM'; payload: { code: string; playerId: string; token: string } }
    | { type: 'GAME_STARTED'; payload: { hand: Card[]; board: Card[] } }
    | { type: 'ROUND_ENDED'; payload: { result: 'WIN' | 'LOSS'; board: Card[] } }
    | { type: 'WELCOME_BACK'; payload: { gameState: RoomState; hand: Card[] } }
    | { type: 'PLAYER_DC'; payload: { playerId: string } }
    | { type: 'PLAYER_RECONNECTED'; payload: { playerId: string } }
    | { type: 'PLAYER_KICKED'; payload: { playerId: string } }
    | { type: 'KICKED'; payload: null }
    | { type: 'VOTE_UPDATED', payload: { votes: Record<string, 'RETRY' | 'NEXT'> } };
