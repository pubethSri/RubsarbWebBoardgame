import { writable } from "svelte/store";

export interface User {
    username: string;
    role: "ADMIN" | "CREATOR" | "USER";
    token: string;
}

const getStoredUser = (): User | null => {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
};

export const authStore = writable<User | null>(getStoredUser());

authStore.subscribe((value) => {
    if (typeof localStorage !== 'undefined') {
        if (value) {
            localStorage.setItem("auth_user", JSON.stringify(value));
        } else {
            localStorage.removeItem("auth_user");
        }
    }
});

export function logout() {
    authStore.set(null);
}

export async function checkSession() {
    const user = getStoredUser();
    if (!user) return;

    // Verify token validity with backend
    try {
        const res = await fetch("/api/auth/me", {
            headers: { "x-auth-token": user.token }
        });
        if (!res.ok) {
            logout();
        }
    } catch (e) {
        // If network error, maybe keep session or logout? Safety -> logout
        logout();
    }
}
