import { writable } from "svelte/store";

export interface User {
    username: string;
    role: "ADMIN" | "CREATOR" | "USER";
    // Token is now HttpOnly Cookie
}

export const authStore = writable<User | null>(null);
export const silentAuthStatus = writable<"IDLE" | "LOADING" | "SUCCESS" | "FAILED">("IDLE");

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
    silentAuthStatus.set("LOADING");

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = '/api/auth/login/authentik/silent';

    const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'SILENT_AUTH_SUCCESS') {
            const loggedIn = await checkSession();
            if (loggedIn) {
                silentAuthStatus.set("SUCCESS");
            } else {
                silentAuthStatus.set("FAILED");
            }
            cleanup();
        } else if (event.data?.type === 'SILENT_AUTH_ERROR') {
            console.warn("Silent Auth Error:", event.data.error);
            silentAuthStatus.set("FAILED");
            cleanup();
        }
    };

    const cleanup = () => {
        window.removeEventListener('message', handleMessage);
        if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
        }
    };

    window.addEventListener('message', handleMessage);
    document.body.appendChild(iframe);

    // Timeout fallback (e.g., 5 seconds)
    setTimeout(() => {
        let currentStatus;
        silentAuthStatus.subscribe(val => currentStatus = val)();
        if (currentStatus === "LOADING") {
            console.warn("Silent Auth Timeout");
            silentAuthStatus.set("FAILED");
            cleanup();
        }
    }, 5000);
}
