import { Elysia } from "elysia";
import { RoomManager } from './RoomManager';
import type { WsMessage } from './types';
import { db, initDB } from './db';
import { migrate } from './db/migrate';
import { seedUsers } from './db/seed_users';
import { rateLimit } from './middleware/rateLimit';
// import { adminAuth } from './middleware/adminAuth';
// import { creatorAuth } from './middleware/creatorAuth';
import { AuthUtils, authMiddleware } from './auth';
import { AuthentikService } from './services/authentik';
import { KeycloakService } from './services/keycloak';
import * as jose from 'jose';
import { staticPlugin } from "@elysiajs/static";
import { CreatePackSchema } from './schemas/topic';

const authentikService = new AuthentikService();
const keycloakService = new KeycloakService();

// Initialize Database & Run Migrations
initDB();
await migrate();
await seedUsers();

const roomManager = new RoomManager();

const activeSessions = new Map<string, { roomId: string, playerId: string }>();

const app = new Elysia()
    // Serve Static Assets Manually (Docker specific fix)
    .get("/assets/*", ({ params }) => {
        const filePath = process.env.NODE_ENV === 'production'
            ? `/app/client/dist/assets/${params['*']}`
            : `../client/dist/assets/${params['*']}`;
        return Bun.file(filePath);
    })
    .get("/index.html", () => {
        const filePath = process.env.NODE_ENV === 'production'
            ? `/app/client/dist/index.html`
            : `../client/dist/index.html`;
        return Bun.file(filePath);
    })
    .get("/", () => {
        const filePath = process.env.NODE_ENV === 'production'
            ? `/app/client/dist/index.html`
            : `../client/dist/index.html`;
        return Bun.file(filePath);
    })
    .ws('/ws', {
        idleTimeout: 3600, // 1 Hour
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
                    try {
                        const player = room.addPlayer(ws.id, msg.payload.playerName, ws);

                        // Store session in local Map
                        activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });

                        ws.send(JSON.stringify({ type: 'JOINED_ROOM', payload: { code: room.code, playerId: player.id, token: player.token } }));
                        room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
                    } catch (e: any) {
                        ws.send(JSON.stringify({ type: 'ERROR', payload: { message: e.message || 'Failed to join room' } }));
                    }
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

            if (msg.type === 'CHANGE_COLOR') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        room.changeColor(session.playerId, msg.payload.color);
                    }
                }
            }

            if (msg.type === 'KICK_PLAYER') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        room.kickPlayer(msg.payload.playerId, session.playerId);
                    }
                }
            }

            if (msg.type === 'VOTE') {
                const session = activeSessions.get(ws.id);
                if (session) {
                    const room = roomManager.getRoom(session.roomId);
                    if (room) {
                        room.handleVote(session.playerId, msg.payload.vote);
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

    .group("/api/auth", app => app
        .get("/login/authentik", () => {
            const url = authentikService.getAuthorizationUrl();
            return Response.redirect(url);
        })
        .get("/callback/authentik", async ({ query, set, cookie }) => {
            const code = query.code as string;
            if (!code) {
                set.status = 400;
                return "No Authorization Code Provided";
            }

            const tokenResponse = await authentikService.getToken(code);
            if (!tokenResponse) {
                set.status = 401;
                return "Failed to retrieve Access Token from Authentik";
            }
            const { access_token, id_token } = tokenResponse;

            const userInfo = await authentikService.getUserInfo(access_token);
            if (!userInfo) {
                set.status = 500;
                return "Failed to retrieve User Info from Authentik";
            }

            // Map Roles
            const role = authentikService.mapGroupsToRole(userInfo.groups);

            // Generate Session Token
            const token = AuthUtils.createToken();

            // Upsert User
            try {
                const upsert = db.prepare(`
                    INSERT INTO users (id, username, role, token, id_token) 
                    VALUES ($id, $username, $role, $token, $id_token)
                    ON CONFLICT(id) DO UPDATE SET
                        username = $username,
                        role = $role,
                        token = $token,
                        id_token = $id_token
                `);

                upsert.run({
                    $id: userInfo.sub,
                    $username: userInfo.preferred_username,
                    $role: role,
                    $token: token,
                    $id_token: id_token || null
                });

                // Set HttpOnly Cookie
                // @ts-ignore
                if (cookie && cookie.auth_token) {
                    // @ts-ignore
                    cookie.auth_token.set({
                        value: token,
                        httpOnly: true,
                        path: '/',
                        maxAge: 7 * 86400, // 7 Days
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production'
                    });
                }

                // Redirect to Frontend (Clean URL)
                return Response.redirect('/');
            } catch (e) {
                console.error("DB Error during login:", e);
                set.status = 500;
                return "Internal Database Error";
            }
        })
        .get("/login/keycloak", () => {
            const url = keycloakService.getAuthorizationUrl();
            return Response.redirect(url);
        })
        .get("/callback/keycloak", async ({ query, set, cookie }) => {
            const code = query.code as string;
            if (!code) {
                set.status = 400;
                return "No Authorization Code Provided";
            }

            const tokenResponse = await keycloakService.getToken(code);
            if (!tokenResponse) {
                set.status = 401;
                return "Failed to retrieve Access Token from Keycloak";
            }
            const { access_token, id_token } = tokenResponse;

            const userInfo = await keycloakService.getUserInfo(access_token);
            if (!userInfo) {
                set.status = 500;
                return "Failed to retrieve User Info from Keycloak";
            }

            // Map Roles
            const role = keycloakService.mapGroupsToRole(userInfo.groups);

            // Generate Session Token
            const token = AuthUtils.createToken();

            // Upsert User
            try {
                const upsert = db.prepare(`
                    INSERT INTO users (id, username, role, token, id_token) 
                    VALUES ($id, $username, $role, $token, $id_token)
                    ON CONFLICT(id) DO UPDATE SET
                        username = $username,
                        role = $role,
                        token = $token,
                        id_token = $id_token
                `);

                upsert.run({
                    $id: userInfo.sub,
                    $username: userInfo.preferred_username,
                    $role: role,
                    $token: token,
                    $id_token: id_token || null
                });

                // Set HttpOnly Cookie
                // @ts-ignore
                if (cookie && cookie.auth_token) {
                    // @ts-ignore
                    cookie.auth_token.set({
                        value: token,
                        httpOnly: true,
                        path: '/',
                        maxAge: 7 * 86400, // 7 Days
                        sameSite: 'lax',
                        secure: process.env.NODE_ENV === 'production'
                    });
                }

                // Redirect to Frontend (Clean URL)
                return Response.redirect('/');
            } catch (e) {
                console.error("DB Error during Keycloak login:", e);
                set.status = 500;
                return "Internal Database Error";
            }
        })
        .post("/logout", ({ query, cookie }) => {
            let redirectUrl: string | undefined;
            const isLocal = query.local === 'true';

            // @ts-ignore
            if (cookie && cookie.auth_token && cookie.auth_token.value) {
                // @ts-ignore
                const token = cookie.auth_token.value;
                const user = AuthUtils.getUserByToken(token);

                // Get id_token from DB for hint (ONLY if not local logout)
                if (user && !isLocal) {
                    // @ts-ignore
                    const dbUser = db.query("SELECT id_token FROM users WHERE id = ?").get(user.id) as { id_token: string };
                    if (dbUser && dbUser.id_token) {
                        try {
                            // Decode to find issuer
                            const claims = jose.decodeJwt(dbUser.id_token);
                            if (claims.iss?.includes("authentik") || claims.iss?.includes("application/o/ito-app")) {
                                redirectUrl = authentikService.getLogoutUrl(dbUser.id_token);
                            } else if (claims.iss?.includes("keycloak") || claims.iss?.includes("realms/itkmitl")) {
                                redirectUrl = keycloakService.getLogoutUrl(dbUser.id_token);
                            }
                        } catch (e) {
                            console.error("Failed to decode id_token for logout:", e);
                        }
                    }
                }

                // Clear Cookie
                // @ts-ignore
                cookie.auth_token.remove();
            }
            return { success: true, redirectUrl };
        })
        .post("/backchannel-logout", async ({ body, set }) => {
            const { logout_token } = body as { logout_token: string };
            if (!logout_token) {
                set.status = 400;
                return "Missing logout_token";
            }

            const sub = await authentikService.verifyLogoutToken(logout_token);
            if (!sub) {
                set.status = 400;
                return "Invalid Logout Token";
            }

            console.log(`🔌 Backchannel Logout received for sub: ${sub}`);

            // Invalidate session (Clear token)
            try {
                db.query("UPDATE users SET token = NULL, id_token = NULL WHERE id = ?").run(sub);
                return "OK";
            } catch (e) {
                console.error("DB Error during backchannel logout:", e);
                set.status = 500;
                return "Internal Error";
            }
        })
        .get("/me", ({ request, set, cookie }) => {
            // Check Cookie first, then Header
            // @ts-ignore
            const cookieToken = cookie?.auth_token?.value;
            const headerToken = request.headers.get("x-auth-token");
            const token = typeof cookieToken === 'string' ? cookieToken : headerToken;

            if (!token) { set.status = 401; return "No Token"; }
            const user = AuthUtils.getUserByToken(token);
            if (!user) { set.status = 401; return "Invalid Token"; }
            return { username: user.username, role: user.role };
        })
    )
    .get("/api/packs/official", ({ set }) => {
        try {
            const results = db.query(`
                SELECT * FROM packs WHERE is_official = 1
            `).all();
            return results;
        } catch (e) {
            set.status = 500;
            return "Database Error";
        }
    })
    .post("/api/packs", ({ body, set, user }: any) => {
        // Role Check
        if (user.role !== 'CREATOR' && user.role !== 'ADMIN') {
            set.status = 403;
            return "Forbidden: Creators only";
        }

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
                INSERT INTO topics (id, pack_id, topic, type, min_label, max_label) VALUES (?, ?, ?, ?, ?, ?)
            `);

            // Generate 6-char share code OUTSIDE transaction to be available for return
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            const transaction = db.transaction(() => {
                insertPack.run(packId, name, author);
                updateShareCode.run(code, packId);

                for (const t of topics) {
                    insertTopic.run(
                        crypto.randomUUID(),
                        packId,
                        t.topic,
                        t.type,
                        t.minLabel || 'Min',
                        t.maxLabel || 'Max'
                    );
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
        // @ts-ignore
        beforeHandle: [rateLimit, authMiddleware]
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
        .guard({ beforeHandle: [authMiddleware] }, app => app
            .onBeforeHandle(({ request, set }) => {
                // Double check admin role
                // @ts-ignore
                const user = AuthUtils.getUserByToken(request.headers.get("x-auth-token"));
                if (!user || (user.role !== 'ADMIN' && user.role !== 'CREATOR')) {
                    set.status = 403;
                    return "Admins or Creators only";
                }
            })
            .get("/stats", ({ set }) => {
                return roomManager.getStats();
            })
            .get("/history", ({ set }) => {
                try {
                    const logs = db.query(`
                        SELECT * FROM game_logs
                        ORDER BY created_at DESC
                        LIMIT 100
                    `).all();
                    return logs;
                } catch (e) {
                    set.status = 500;
                    return "Database Error";
                }
            })
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
            .patch("/packs/:id", ({ params: { id }, body, set }) => {
                const { shareCode } = body as { shareCode: string };
                if (!shareCode || shareCode.length < 3) {
                    set.status = 400;
                    return "Invalid Code";
                }

                const upperCode = shareCode.toUpperCase();

                // Check uniqueness
                const existing = db.query("SELECT id FROM packs WHERE share_code = ?").get(upperCode) as { id: string } | null;
                if (existing && existing.id !== id) {
                    set.status = 409;
                    return "Code already taken";
                }

                try {
                    db.query("UPDATE packs SET share_code = ? WHERE id = ?").run(upperCode, id);
                    return { success: true, shareCode: upperCode };
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
            .put("/packs/:id/topics", ({ params: { id }, body, set }) => {
                const { topics } = body as { topics: any[] };

                if (!topics || !Array.isArray(topics) || topics.length < 5) {
                    set.status = 400;
                    return "At least 5 topics required";
                }

                // Basic validation
                for (const t of topics) {
                    if (!t.topic || t.topic.length < 1) {
                        set.status = 400;
                        return "Invalid topic data";
                    }
                }

                try {
                    const deleteTopics = db.prepare("DELETE FROM topics WHERE pack_id = ?");
                    const insertTopic = db.prepare(`
                        INSERT INTO topics (id, pack_id, topic, type, min_label, max_label) VALUES (?, ?, ?, ?, ?, ?)
                    `);

                    const transaction = db.transaction(() => {
                        deleteTopics.run(id);
                        for (const t of topics) {
                            insertTopic.run(
                                crypto.randomUUID(),
                                id,
                                t.topic,
                                t.type || 'NORMAL',
                                t.minLabel || 'Min',
                                t.maxLabel || 'Max'
                            );
                        }
                    });

                    transaction();
                    return { success: true };

                } catch (e) {
                    console.error(e);
                    set.status = 500;
                    return "Database Error";
                }
            })
        )
    )
    .listen({
        port: process.env.PORT || 3000,
        hostname: '0.0.0.0'
    });

console.log(
    `🦊 Ito Server is running at ${app.server?.hostname}:${app.server?.port}`
);