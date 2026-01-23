import { db } from "./db";
import type { Context } from "elysia";

export const AuthUtils = {
    verifyPassword: async (password: string, hash: string) => {
        return await Bun.password.verify(password, hash);
    },

    createToken: () => {
        return crypto.randomUUID();
    },

    getUserByToken: (token: string) => {
        return db.query("SELECT id, username, role FROM users WHERE token = ?").get(token) as { id: string, username: string, role: string } | null;
    }
};

// @ts-ignore
export function authMiddleware(c: Context) {
    // Check for token in Cookie or Header
    // @ts-ignore
    const cookieToken = c.cookie?.auth_token?.value;
    const headerToken = c.request.headers.get("x-auth-token");
    const token = cookieToken || headerToken;

    if (!token) {
        c.set.status = 401;
        return { error: "Unauthorized", message: "Missing Auth Token" };
    }

    const user = AuthUtils.getUserByToken(token as string);
    if (!user) {
        c.set.status = 401;
        return { error: "Unauthorized", message: "Invalid Session" };
    }

    // Attach user to context
    // @ts-ignore
    c.user = user;
}
