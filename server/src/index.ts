import { Elysia } from "elysia";
import { RoomManager } from './RoomManager';
import type { Room } from './Room';
import type { WsMessage } from './types';
import { db, initDB } from './db';
import { migrate } from './db/migrate';
import { rateLimit } from './middleware/rateLimit';
import { AuthUtils, authMiddleware, getUserFromRequest } from './auth';
import { AuthentikService } from './services/authentik';
import { CreatePackSchema } from './schemas/topic';

// OIDC is optional: without it the game runs fully anonymous,
// only pack creation and the admin dashboard need a login.
const authentikService = AuthentikService.fromEnv();

// Initialize Database & Run Migrations
initDB();
await migrate();

const roomManager = new RoomManager();

const activeSessions = new Map<string, { roomId: string, playerId: string }>();

// Built frontend location, relative to the server working directory.
// Works for local dev (repo layout) and Docker (WORKDIR /app/server, dist at /app/client/dist).
const CLIENT_DIST = "../client/dist";

/** Stores the session + notifies everyone. Shared by CREATE_ROOM / JOIN_ROOM. */
function completeJoin(ws: any, room: Room, player: { id: string, token: string }) {
    activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });
    ws.send(JSON.stringify({ type: 'JOINED_ROOM', payload: { code: room.code, playerId: player.id, token: player.token } }));
    room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
}

/** Resolves the sender's room (and player) or null when there is no session. */
function getSessionContext(ws: any): { room: Room, playerId: string } | null {
    const session = activeSessions.get(ws.id);
    if (!session) return null;
    const room = roomManager.getRoom(session.roomId);
    if (!room) return null;
    return { room, playerId: session.playerId };
}

/**
 * Creates/updates the local user row after a successful OIDC login and
 * returns the new session token. Usernames are unique; on a collision with
 * a different account we retry once with a suffix.
 */
function upsertOidcUser(userInfo: { sub: string, preferred_username: string, groups: string[] }, idToken: string | undefined): string {
    const role = authentikService!.mapGroupsToRole(userInfo.groups);
    const token = AuthUtils.createToken();

    const upsert = db.prepare(`
        INSERT INTO users (id, username, role, token, id_token)
        VALUES ($id, $username, $role, $token, $id_token)
        ON CONFLICT(id) DO UPDATE SET
            username = $username,
            role = $role,
            token = $token,
            id_token = $id_token
    `);

    const params = {
        $id: userInfo.sub,
        $username: userInfo.preferred_username,
        $role: role,
        $token: token,
        $id_token: idToken || null
    };

    try {
        upsert.run(params);
    } catch (e: any) {
        if (!e.message?.includes("UNIQUE constraint failed: users.username")) throw e;
        console.log(`⚠️ Username collision for ${userInfo.preferred_username}. Retrying with suffix...`);
        upsert.run({ ...params, $username: `${userInfo.preferred_username} (${userInfo.sub.slice(0, 6)})` });
    }

    return token;
}

function setAuthCookie(cookie: any, token: string) {
    cookie?.auth_token?.set({
        value: token,
        httpOnly: true,
        path: '/',
        maxAge: 7 * 86400, // 7 Days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    });
}

const app = new Elysia()
    // --- Static frontend (SPA) ---
    .get("/assets/*", ({ params }) => Bun.file(`${CLIENT_DIST}/assets/${params['*']}`))
    .get("/", () => Bun.file(`${CLIENT_DIST}/index.html`))
    .get("/index.html", () => Bun.file(`${CLIENT_DIST}/index.html`))

    .ws('/ws', {
        idleTimeout: 3600, // 1 Hour
        open(ws) {
            console.log('✨ Client connected:', ws.id);
        },
        message(ws, message: any) {
            const msg: WsMessage = typeof message === 'string' ? JSON.parse(message) : message;
            const session = activeSessions.get(ws.id);
            const prefix = session ? `[Room ${session.roomId}] ` : `[Unknown] `;
            console.log(`${prefix}📩 Received:`, msg.type);

            if (msg.type === 'CREATE_ROOM') {
                const room = roomManager.createRoom();
                const player = room.addPlayer(ws.id, msg.payload.playerName, ws);
                completeJoin(ws, room, player);
                return;
            }

            if (msg.type === 'JOIN_ROOM') {
                const room = roomManager.getRoom(msg.payload.roomCode);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
                    return;
                }
                try {
                    const player = room.addPlayer(ws.id, msg.payload.playerName, ws);
                    completeJoin(ws, room, player);
                } catch (e: any) {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: e.message || 'Failed to join room' } }));
                }
                return;
            }

            if (msg.type === 'RECONNECT') {
                const room = roomManager.getRoom(msg.payload.roomId);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Room not found' } }));
                    return;
                }
                const player = room.reconnectPlayer(msg.payload.token, ws);
                if (!player) {
                    ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Session expired or invalid token' } }));
                    return;
                }
                console.log(`♻️ Player ${player.name} reconnected to room ${room.code}`);
                activeSessions.set(ws.id, { roomId: room.code, playerId: player.id });
                ws.send(JSON.stringify({
                    type: 'WELCOME_BACK',
                    payload: {
                        gameState: room.getState(),
                        hand: room.hands.get(player.id) || []
                    }
                }));
                return;
            }

            // Everything below requires an active session in a live room
            const ctx = getSessionContext(ws);
            if (!ctx) return;
            const { room, playerId } = ctx;
            const isHost = () => room.players.find(p => p.id === playerId)?.isHost === true;

            switch (msg.type) {
                case 'LEAVE_ROOM':
                    room.removePlayer(playerId);
                    console.log(`🚪 Player ${playerId} manually left room ${room.code}`);
                    if (room.players.length > 0) {
                        room.broadcast({ type: 'ROOM_UPDATED', payload: room.getState() });
                    }
                    activeSessions.delete(ws.id);
                    break;

                case 'START_GAME':
                    if (isHost()) {
                        room.startGame();
                        console.log(`🎮 Game started in room ${room.code} by ${playerId}`);
                    }
                    break;

                case 'MOVE_CARD':
                    room.moveCard(msg.payload.cardId, msg.payload.targetIndex);
                    break;

                case 'RETURN_CARD':
                    room.returnCard(msg.payload.cardId);
                    break;

                case 'UPDATE_NOTE':
                    room.updateNote(msg.payload.cardId, msg.payload.note);
                    break;

                case 'REVEAL_NEXT':
                    if (isHost()) room.revealNext();
                    break;

                case 'CHANGE_COLOR':
                    room.changeColor(playerId, msg.payload.color);
                    break;

                case 'KICK_PLAYER':
                    room.kickPlayer(msg.payload.playerId, playerId);
                    break;

                case 'VOTE':
                    room.handleVote(playerId, msg.payload.vote);
                    break;
            }
        },
        close(ws) {
            const session = activeSessions.get(ws.id);
            if (!session) {
                console.log(`⚠️ Unknown client disconnected (id: ${ws.id})`);
                return;
            }

            const { roomId, playerId } = session;
            const room = roomManager.getRoom(roomId);
            if (room) {
                // Don't remove the player yet: Room starts a grace-period timer
                // and removes them itself if they never reconnect.
                room.handleDisconnect(playerId);
                console.log(`❌ Player ${playerId} disconnected (Grace period started)`);
            }
            activeSessions.delete(ws.id);
        }
    })

    .group("/api/auth", app => app
        // Lets the client know whether to render the login UI at all
        .get("/config", () => ({ oidcEnabled: authentikService !== null }))
        .get("/login/authentik", ({ set }) => {
            if (!authentikService) { set.status = 503; return "OIDC is not configured"; }
            return Response.redirect(authentikService.getAuthorizationUrl());
        })
        .get("/callback/authentik", async ({ query, set, cookie }) => {
            if (!authentikService) { set.status = 503; return "OIDC is not configured"; }

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

            const userInfo = await authentikService.getUserInfo(tokenResponse.access_token);
            if (!userInfo) {
                set.status = 500;
                return "Failed to retrieve User Info from Authentik";
            }

            try {
                const token = upsertOidcUser(userInfo, tokenResponse.id_token);
                setAuthCookie(cookie, token);
                return Response.redirect('/');
            } catch (e: any) {
                console.error("DB Error during login:", e);
                set.status = 500;
                return `Internal Database Error: ${e.message}`;
            }
        })
        .post("/logout", ({ query, cookie }) => {
            let redirectUrl: string | undefined;
            const isLocal = query.local === 'true';

            const token = cookie?.auth_token?.value;
            if (typeof token === 'string' && token) {
                const user = AuthUtils.getUserByToken(token);

                // For a global logout, send the user to the IdP end-session endpoint
                if (user && !isLocal && authentikService) {
                    const dbUser = db.query("SELECT id_token FROM users WHERE id = ?").get(user.id) as { id_token: string } | null;
                    if (dbUser?.id_token) {
                        redirectUrl = authentikService.getLogoutUrl(dbUser.id_token);
                    }
                }

                cookie.auth_token?.remove();
            }
            return { success: true, redirectUrl };
        })
        .post("/backchannel-logout", async ({ body, set }) => {
            if (!authentikService) { set.status = 503; return "OIDC is not configured"; }

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

            try {
                db.query("UPDATE users SET token = NULL, id_token = NULL WHERE id = ?").run(sub);
                return "OK";
            } catch (e) {
                console.error("DB Error during backchannel logout:", e);
                set.status = 500;
                return "Internal Error";
            }
        })
        .get("/me", (c) => {
            const user = getUserFromRequest(c);
            if (!user) { c.set.status = 401; return "Not logged in"; }
            return { username: user.username, role: user.role };
        })
    )
    .get("/api/packs/official", ({ set }) => {
        try {
            return db.query("SELECT * FROM packs WHERE is_official = 1").all();
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
                INSERT INTO packs (id, name, author, share_code, is_official) VALUES (?, ?, ?, ?, 0)
            `);
            const insertTopic = db.prepare(`
                INSERT INTO topics (id, pack_id, topic, type, min_label, max_label) VALUES (?, ?, ?, ?, ?, ?)
            `);

            const code = Math.random().toString(36).substring(2, 8).toUpperCase();

            const transaction = db.transaction(() => {
                insertPack.run(packId, name, author, code);

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
        .guard({
            beforeHandle: [(c: any) => {
                const user = getUserFromRequest(c);
                if (!user || (user.role !== 'ADMIN' && user.role !== 'CREATOR')) {
                    c.set.status = 403;
                    return "Admins or Creators only";
                }
            }]
        }, app => app
            .get("/stats", () => {
                return roomManager.getStats();
            })
            .get("/history", ({ set }) => {
                try {
                    return db.query(`
                        SELECT * FROM game_logs
                        ORDER BY created_at DESC
                        LIMIT 100
                    `).all();
                } catch (e) {
                    set.status = 500;
                    return "Database Error";
                }
            })
            .get("/packs", ({ set }) => {
                try {
                    // List all packs with topic count
                    return db.query(`
                        SELECT p.id, p.name, p.author, p.share_code, p.is_official, p.created_at, COUNT(t.id) as topic_count
                        FROM packs p
                        LEFT JOIN topics t ON p.id = t.pack_id
                        GROUP BY p.id
                        ORDER BY p.created_at DESC
                    `).all();
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
                    return db.query("SELECT * FROM topics WHERE pack_id = ?").all(id);
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
