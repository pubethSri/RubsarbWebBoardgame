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

export function authMiddleware(c: Context) {
    const token = c.request.headers.get("x-auth-token");
    if (!token) {
        c.set.status = 401;
        return { error: "Unauthorized", message: "Missing Auth Token" };
    }

    const user = AuthUtils.getUserByToken(token);
    if (!user) {
        c.set.status = 401;
        return { error: "Unauthorized", message: "Invalid Session" };
    }

    // Attach user to context (simulated via request for now as Elysia context extension needs type juggling)
    // @ts-ignore
    c.user = user;
}
