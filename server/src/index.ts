import { Elysia } from "elysia";
import { RoomManager } from './RoomManager';
import type { WsMessage } from './types';

const roomManager = new RoomManager();

const activeSessions = new Map<string, { roomId: string, playerId: string }>();

const app = new Elysia()
    .ws('/ws', {
        open(ws) {
            console.log('✨ Client connected:', ws.id);
        },
        message(ws, message: any) {
            // Parse message if it's a string, otherwise cast it
            const msg: WsMessage = typeof message === 'string' ? JSON.parse(message) : message;
            const session = activeSessions.get(ws.id);
            const prefix = session ? `[Room ${session.roomId}] ` : `[Unknown] `;
            console.log(`${prefix}📩 Received:`, msg);

            if (msg.type === 'CREATE_ROOM') {
                const room = roomManager.createRoom();
                const player = room.addPlayer(ws.id, msg.payload.playerName, ws);

                // Store session in local Map
                activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });

                ws.send(JSON.stringify({ type: 'JOINED_ROOM', payload: { code: room.code, playerId: player.id, token: player.token } }));
                room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
            }

            if (msg.type === 'MOVE_CARD') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        const { cardId, targetIndex } = msg.payload;
                        room.moveCard(cardId, targetIndex);
                    }
                }
            }

            if (msg.type === 'RETURN_CARD') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        room.returnCard(msg.payload.cardId);
                    }
                }
            }

            if (msg.type === 'UPDATE_NOTE') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        const { cardId, note } = msg.payload;
                        room.updateNote(cardId, note);
                    }
                }
            }

            if (msg.type === 'JOIN_ROOM') {
                const room = roomManager.getRoom(msg.payload.roomCode);
                if (room) {
                    const player = room.addPlayer(ws.id, msg.payload.playerName, ws);

                    // Store session in local Map
                    activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });

                    ws.send(JSON.stringify({ type: 'JOINED_ROOM', payload: { code: room.code, playerId: player.id, token: player.token } }));
                    room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
                }
            }

            if (msg.type === 'LEAVE_ROOM') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const { roomId, playerId } = session;
                    const room = roomManager.getRoom(roomId);
                    if (room) {
                        room.removePlayer(playerId);
                        console.log(`🚪 Player ${playerId} manually left room ${roomId}`);
                        if (room.players.length === 0) {
                            roomManager.removeRoom(roomId);
                        } else {
                            room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
                        }
                    }
                    activeSessions.delete(ws.id);
                }
            }

            if (msg.type === 'START_GAME') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const { roomId, playerId } = session;
                    const room = roomManager.getRoom(roomId);
                    if (room) {
                        // verify host
                        const player = room.players.find(p => p.id === playerId);
                        if (player && player.isHost) {
                            room.startGame();
                            console.log(`🎮 Game started in room ${roomId} by ${playerId}`);
                        }
                    }
                }
            }

            if (msg.type === 'UPDATE_BOARD') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        // Ideally validate that the move is legal (player owns the card?)
                        // For Iteration 2 prototype: Trust client for DnD sync
                        room.updateBoard(msg.payload.board);
                    }
                }
            }

            if (msg.type === 'REVEAL_NEXT') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const player = roomManager.getRoom(session.roomId)?.players.find(p => p.id === session.playerId);
                    if (player && player.isHost) {
                        const room = roomManager.getRoom(session.roomId);
                        // @ts-ignore
                        room.revealNext();
                    }
                }
            }

            if (msg.type === 'PLAYER_READY') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        room.handleReady(session.playerId);
                    }
                }
            }

            if (msg.type === 'RECONNECT') {
                const room = roomManager.getRoom(msg.payload.roomId);
                if (room) {
                    const player = room.reconnectPlayer(msg.payload.token, ws);
                    if (player) {
                        console.log(`♻️ Player ${player.name} reconnected to room ${room.code}`);

                        // Register Session
                        activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });

                        // Send Welcome Back
                        ws.send(JSON.stringify({
                            type: 'WELCOME_BACK',
                            payload: {
                                gameState: room.getState(),
                                // @ts-ignore
                                hand: room.hands.get(player.id) || []
                            }
                        }));
                    } else {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Session expired or invalid token' } }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
                }
            }
        },
        close(ws) {
            const session = activeSessions.get(ws.id);

            if (session) {
                const { roomId, playerId } = session;
                console.log(`🔌 Disconnect event for player ${playerId} in room ${roomId}`);

                const room = roomManager.getRoom(roomId);
                if (room) {
                    // room.removePlayer(playerId);
                    room.handleDisconnect(playerId);
                    console.log(`❌ Player ${playerId} disconnected (Grace period started)`);

                    // Clean up room only if EVERYONE is gone (no one active)
                    const activePlayers = room.players.filter(p => p.isConnected);
                    if (room.players.length === 0 || (activePlayers.length === 0 && room.players.length === 0)) {
                        // Actually, we should probably keep the room alive if people are in grace period?
                        // For now, let's keep it simple: If players array empty -> delete.
                        // But wait, handleDisconnect doesn't remove from array.
                        // So checking room.players.length is correct to keep it alive.
                    }
                    // We rely on the timer in Room.ts to eventually removePlayer -> which might empty the room.
                    // Accessing room manager from here to delete empty room might be tricky if done inside Room.ts
                    // But for now, we just don't delete immediately on disconnect.
                }
                // Cleanup session
                activeSessions.delete(ws.id);
            } else {
                console.log(`⚠️ Unknown client disconnected (id: ${ws.id})`);
            }
        }
    })
    .get("/", () => "Rubsarb API is running...")
    .listen(3000);

console.log(
    `🦊 Rubsarb Server is running at ${app.server?.hostname}:${app.server?.port}`
);