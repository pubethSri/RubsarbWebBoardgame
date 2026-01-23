import { writable } from "svelte/store";

export interface User {
    username: string;
    role: "ADMIN" | "CREATOR" | "USER";
    // Token is now HttpOnly Cookie
}

export const authStore = writable<User | null>(null);

export async function logout() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) { console.error(e); }
    authStore.set(null);
}

export async function checkSession() {
    try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
            const user = await res.json() as User;
            authStore.set(user);
        } else {
            authStore.set(null);
        }
    } catch (e) {
        authStore.set(null);
    }
}
