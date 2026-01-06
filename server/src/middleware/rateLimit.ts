import type { Context } from 'elysia';

const RATE_LIMIT_WINDOW = 1 * 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // Effectively disabled

const ipMap = new Map<string, number[]>();

export function rateLimit(c: Context) {
    const ip = c.server?.requestIP(c.request)?.address || "unknown";

    // Clean up old requests
    const now = Date.now();
    const timestamps = ipMap.get(ip) || [];
    const recent = timestamps.filter(t => t > now - RATE_LIMIT_WINDOW);

    if (recent.length >= MAX_REQUESTS) {
        c.set.status = 429;
        return { error: 'Too Many Requests', message: 'You are creating packs too fast. Please wait.' };
    }

    // Update map
    recent.push(now);
    ipMap.set(ip, recent);
}
