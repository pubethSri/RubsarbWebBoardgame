import { Elysia } from "elysia";
import { RoomManager } from './RoomManager';
import type { WsMessage } from './types';
import { db } from './db';
import { migrate } from './db/migrate';
import { rateLimit } from './middleware/rateLimit';
import { adminAuth } from './middleware/adminAuth';
import { creatorAuth } from './middleware/creatorAuth';
import { CreatePackSchema } from './schemas/topic';

// Initialize Database & Run Migrations
// The original `initDB()` call is removed as `db` is now imported directly.
await migrate();

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
    .post("/api/packs", ({ body, set }) => {
        const result = CreatePackSchema.safeParse(body);
        if (!result.success) {
            set.status = 400;
            return result.error.flatten();
        }

        const { name, author, topics } = result.data;
        const packId = crypto.randomUUID();

        try {
            const insertPack = db.prepare(`
                INSERT INTO packs (id, name, author, is_official) VALUES (?, ?, ?, 0)
            `);
            const updateShareCode = db.prepare("UPDATE packs SET share_code = ? WHERE id = ?");

            const insertTopic = db.prepare(`
                INSERT INTO topics (id, pack_id, topic, type, min_label, max_label) VALUES (?, ?, ?, ?, 'Min', 'Max')
            `);

            // Generate 6-char share code OUTSIDE transaction to be available for return
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            const transaction = db.transaction(() => {
                insertPack.run(packId, name, author);
                updateShareCode.run(code, packId);

                for (const t of topics) {
                    insertTopic.run(crypto.randomUUID(), packId, t.topic, t.type);
                }
            });

            transaction();
            console.log(`📦 New Pack Created: ${name} by ${author}`);
            return { success: true, packId, shareCode: code };

        } catch (e) {
            console.error("Failed to insert pack:", e);
            set.status = 500;
            return "Database Error";
        }
    }, {
        beforeHandle: [rateLimit, creatorAuth]
    })
    .post("/api/rooms/:id/pack", ({ params: { id }, body, set }) => {
        const room = roomManager.getRoom(id);
        if (!room) {
            set.status = 404;
            return "Room not found";
        }

        const { shareCode } = body as { shareCode: string };
        if (!shareCode) {
            set.status = 400;
            return "Share code required";
        }

        try {
            const pack = db.query("SELECT id, name FROM packs WHERE share_code = ?").get(shareCode.toUpperCase()) as { id: string, name: string } | null;

            if (!pack) {
                set.status = 404;
                return "Pack not found";
            }

            room.setPack(pack.id, pack.name);
            return { success: true, packName: pack.name };

        } catch (e) {
            set.status = 500;
            return "Database Error";
        }
    })
    .group("/api/admin", app => app
        .derive(({ request }) => {
            // Optional: shared derive logic
        })
        .guard({ beforeHandle: [adminAuth] }, app => app
            .get("/packs", ({ set }) => {
                try {
                    // List all packs with topic count
                    const packs = db.query(`
                        SELECT p.id, p.name, p.author, p.share_code, p.is_official, p.created_at, COUNT(t.id) as topic_count
                        FROM packs p
                        LEFT JOIN topics t ON p.id = t.pack_id
                        GROUP BY p.id
                        ORDER BY p.created_at DESC
                    `).all();
                    return packs;
                } catch (e) {
                    set.status = 500;
                    return "Database Error";
                }
            })
            .delete("/packs/:id", ({ params: { id }, set }) => {
                try {
                    db.query("DELETE FROM packs WHERE id = ?").run(id);
                    return { success: true, message: "Pack deleted" };
                } catch (e) {
                    set.status = 500;
                    return "Database Error";
                }
            })
            .get("/packs/:id/topics", ({ params: { id }, set }) => {
                try {
                    const topics = db.query("SELECT * FROM topics WHERE pack_id = ?").all(id);
                    return topics;
                } catch (e) {
                    set.status = 500;
                    return "Database Error";
                }
            })
        )
    )
    .listen(3000);

console.log(
    `🦊 Rubsarb Server is running at ${app.server?.hostname}:${app.server?.port}`
);