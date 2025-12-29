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
            console.log('📩 Received:', msg);

            if (msg.type === 'CREATE_ROOM') {
                const room = roomManager.createRoom();
                const player = room.addPlayer(ws.id, msg.payload.playerName, ws);

                // Store session in local Map
                activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });

                ws.send(JSON.stringify({ type: 'JOINED_ROOM', payload: { code: room.code, playerId: player.id } }));
                room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
            }

            if (msg.type === 'JOIN_ROOM') {
                const room = roomManager.getRoom(msg.payload.roomCode);
                if (room) {
                    const player = room.addPlayer(ws.id, msg.payload.playerName, ws);

                    // Store session in local Map
                    activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });

                    ws.send(JSON.stringify({ type: 'JOINED_ROOM', payload: { code: room.code, playerId: player.id } }));
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
        },
        close(ws) {
            const session = activeSessions.get(ws.id);

            if (session) {
                const { roomId, playerId } = session;
                console.log(`🔌 Disconnect event for player ${playerId} in room ${roomId}`);

                const room = roomManager.getRoom(roomId);
                if (room) {
                    room.removePlayer(playerId);
                    console.log(`❌ Player ${playerId} left room ${roomId}`);

                    if (room.players.length === 0) {
                        roomManager.removeRoom(roomId);
                    } else {
                        room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
                    }
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