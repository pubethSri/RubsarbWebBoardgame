import type { Context } from 'elysia';

export function creatorAuth(c: Context) {
    const providedPass = c.request.headers.get('x-creator-password');
    const correctPass = process.env.CREATOR_PASSWORD;

    if (!correctPass) {
        c.set.status = 500;
        return { error: 'Server Verification Error', message: 'Creator password not configured on server.' };
    }

    if (providedPass !== correctPass) {
        c.set.status = 401;
        return { error: 'Unauthorized', message: 'Invalid Creator Password' };
    }
}
