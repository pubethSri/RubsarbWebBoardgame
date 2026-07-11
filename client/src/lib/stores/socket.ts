import { gameState } from './gameState';
import type { WsMessage, WsResponse } from '../types';

let socket: WebSocket | null = null;

export const socketStore = {
    connect: (url: string) => {
        if (socket) return;

        socket = new WebSocket(url);

        socket.onopen = () => {
            console.log("🟢 Connected to WebSocket");
            gameState.setConnected(true);

            // AUTO-RECONNECT LOGIC
            const sessionRaw = sessionStorage.getItem('game_session');
            if (sessionRaw) {
                try {
                    const session = JSON.parse(sessionRaw);
                    if (session.token && session.roomId) {
                        console.log("🔄 Attempting to Reconnect...", session.roomId);
                        socket?.send(JSON.stringify({
                            type: 'RECONNECT',
                            payload: {
                                token: session.token,
                                roomId: session.roomId
                            }
                        }));
                    }
                } catch (e) {
                    console.error("Invalid session data", e);
                    sessionStorage.removeItem('game_session');
                }
            }
        };

        socket.onmessage = (event) => {
            try {
                const msg: WsResponse = JSON.parse(event.data);
                console.log("📩 Received:", msg);

                switch (msg.type) {
                    case 'JOINED_ROOM':
                        gameState.joinRoom(msg.payload.code, msg.payload.playerId);
                        sessionStorage.setItem('game_session', JSON.stringify({
                            token: msg.payload.token,
                            roomId: msg.payload.code,
                            playerId: msg.payload.playerId
                        }));
                        break;
                    case 'ROOM_UPDATED':
                        gameState.updateRoom(msg.payload);
                        break;
                    case 'GAME_STARTED':
                        gameState.startGame(msg.payload.hand, msg.payload.board);
                        break;
                    case 'ROUND_ENDED':
                        gameState.setRoundResult(msg.payload.result, msg.payload.board);
                        break;
                    case 'GAME_COMPLETE':
                        gameState.setGameComplete(msg.payload.board, msg.payload.level);
                        break;
                    case 'WELCOME_BACK':
                        // Restore state
                        const session = sessionStorage.getItem('game_session');
                        const playerId = session ? JSON.parse(session).playerId : null;
                        if (playerId) {
                            gameState.setFullState(msg.payload.gameState, msg.payload.hand, playerId);
                        }
                        break;
                    case 'ERROR':
                        // If session error (e.g. expired), clear storage
                        if (msg.payload.message.includes('Session expired')) {
                            sessionStorage.removeItem('game_session');
                            window.location.reload();
                        }
                        gameState.setError(msg.payload.message);
                        break;
                    case 'KICKED':
                        sessionStorage.removeItem('game_session');
                        gameState.setError("You have been kicked from the room.");
                        gameState.leaveRoom();
                        if (socket) socket.close();
                        break;
                    case 'VOTE_UPDATED':
                        gameState.updateVotes(msg.payload.votes);
                        break;
                }
            } catch (e) {
                console.error("Error parsing message", e);
            }
        };

        socket.onclose = () => {
            console.log("🔴 Disconnected");
            gameState.setConnected(false);
            socket = null;
        };
    },

    sendMessage: (msg: WsMessage) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(msg));
        } else {
            console.error("Socket not connected");
        }
    },

    disconnect: () => {
        sessionStorage.removeItem('game_session');
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'LEAVE_ROOM', payload: null }));
        }
        gameState.leaveRoom();
        // Optional: Reload to ensure clean slate, but state reset should be enough
        // window.location.reload(); 
    }
};
