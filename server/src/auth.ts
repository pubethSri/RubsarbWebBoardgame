import { db } from "./db";
import type { Context } from "elysia";

export interface SessionUser {
    id: string;
    username: string;
    role: string;
}

export const AuthUtils = {
    createToken: () => {
        return crypto.randomUUID();
    },

    getUserByToken: (token: string) => {
        return db.query("SELECT id, username, role FROM users WHERE token = ?").get(token) as SessionUser | null;
    }
};

/** Session token comes from the HttpOnly cookie, or the x-auth-token header as a fallback. */
export function getTokenFromRequest(c: { cookie?: any, request: Request }): string | null {
    const cookieToken = c.cookie?.auth_token?.value;
    if (typeof cookieToken === 'string' && cookieToken) return cookieToken;
    return c.request.headers.get("x-auth-token");
}

export function getUserFromRequest(c: { cookie?: any, request: Request }): SessionUser | null {
    const token = getTokenFromRequest(c);
    if (!token) return null;
    return AuthUtils.getUserByToken(token);
}

// @ts-ignore
export function authMiddleware(c: Context) {
    const user = getUserFromRequest(c);
    if (!user) {
        c.set.status = 401;
        return { error: "Unauthorized", message: "Missing or invalid auth token" };
    }
    // Attach user to context
    // @ts-ignore
    c.user = user;
}
