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
        };

        socket.onmessage = (event) => {
            try {
                const msg: WsResponse = JSON.parse(event.data);
                console.log("📩 Received:", msg);

                switch (msg.type) {
                    case 'JOINED_ROOM':
                        gameState.joinRoom(msg.payload.code, msg.payload.playerId);
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
                    case 'ERROR':
                        gameState.setError(msg.payload.message);
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
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'LEAVE_ROOM', payload: null }));
            gameState.leaveRoom();
        }
    }
};
