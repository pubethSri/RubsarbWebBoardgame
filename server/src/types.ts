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

export interface RoomState {
    code: string;
    players: Omit<Player, 'ws'>[];
    gameState: GameStatus;
    board: Card[];
}

export type WsMessage =
    | { type: 'CREATE_ROOM'; payload: { playerName: string } }
    | { type: 'JOIN_ROOM'; payload: { roomCode: string; playerName: string } }
    | { type: 'LEAVE_ROOM'; payload: null }
    | { type: 'START_GAME'; payload: null }
    | { type: 'MOVE_CARD'; payload: { cardId: string; targetIndex: number | null } }
    | { type: 'UPDATE_BOARD'; payload: { board: Card[] } }
    | { type: 'REVEAL_NEXT'; payload: null }; // New message for full board sync

export type WsResponse =
    | { type: 'ROOM_UPDATED'; payload: RoomState }
    | { type: 'ERROR'; payload: { message: string } }
    | { type: 'JOINED_ROOM'; payload: { code: string; playerId: string } }
    | { type: 'GAME_STARTED'; payload: { hand: Card[]; board: Card[] } };
