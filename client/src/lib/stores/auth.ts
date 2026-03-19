import { writable } from "svelte/store";

export interface User {
    username: string;
    role: "ADMIN" | "CREATOR" | "USER";
    // Token is now HttpOnly Cookie
}

export const authStore = writable<User | null>(null);

export async function logout(local: boolean = false) {
    try {
        const url = local ? "/api/auth/logout?local=true" : "/api/auth/logout";
        const res = await fetch(url, { method: "POST" });
        if (res.ok) {
            const data = await res.json() as { success: boolean, redirectUrl?: string };
            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
            }
        }
    } catch (e) { console.error(e); }
    authStore.set(null);
    window.location.href = "/";
}

export async function checkSession(): Promise<boolean> {
    try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
            const user = await res.json() as User;
            authStore.set(user);
            return true;
        } else {
            authStore.set(null);
            return false;
        }
    } catch (e) {
        authStore.set(null);
        return false;
    }
}

export function checkSilentSession() {
    const hasChecked = sessionStorage.getItem("silent_auth_checked");
    if (!hasChecked) {
        sessionStorage.setItem("silent_auth_checked", "true");
        window.location.href = '/api/auth/login/authentik/silent';
    }
}
