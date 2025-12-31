import type { Context } from 'elysia';

export function adminAuth(c: Context) {
    const providedPass = c.request.headers.get('x-admin-password');
    const correctPass = process.env.ADMIN_PASSWORD;

    if (!correctPass) {
        c.set.status = 500;
        return { error: 'Server Verification Error', message: 'Admin password not configured on server.' };
    }

    if (providedPass !== correctPass) {
        c.set.status = 401;
        return { error: 'Unauthorized', message: 'Invalid Admin Password' };
    }
}
