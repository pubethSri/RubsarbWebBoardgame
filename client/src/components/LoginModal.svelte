<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";
    import { authStore } from "../lib/stores/auth";

    const dispatch = createEventDispatcher();

    let username = "";
    let password = "";
    let errorMsg = "";
    let isLoading = false;

    async function handleLogin() {
        if (!username || !password) return;
        isLoading = true;
        errorMsg = "";

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok) {
                authStore.set({
                    username: data.username,
                    role: data.role,
                    token: data.token,
                });
                dispatch("close");
            } else {
                errorMsg = data.message || "Login failed";
            }
        } catch (e) {
            errorMsg = "Connection error";
        } finally {
            isLoading = false;
        }
    }
</script>

<div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    transition:slide
>
    <div
        class="bg-white border-4 border-black rounded-xl p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
    >
        <h2 class="text-2xl font-black uppercase mb-4 text-center">Login</h2>

        {#if errorMsg}
            <div
                class="bg-black text-white p-2 rounded mb-4 text-sm font-bold text-center border-2 border-dashed border-gray-500"
            >
                {errorMsg}
            </div>
        {/if}

        <div class="flex flex-col gap-4">
            <input
                bind:value={username}
                type="text"
                placeholder="Username"
                class="border-2 border-black p-3 rounded font-mono"
            />
            <input
                bind:value={password}
                type="password"
                placeholder="Password"
                class="border-2 border-black p-3 rounded font-mono"
                on:keydown={(e) => e.key === "Enter" && handleLogin()}
            />

            <button
                on:click={handleLogin}
                disabled={isLoading}
                class="w-full py-3 bg-black text-white font-bold rounded hover:opacity-80 disabled:opacity-50"
            >
                {isLoading ? "Logging in..." : "ENTER"}
            </button>

            <button
                on:click={() => dispatch("close")}
                class="text-sm text-gray-500 underline hover:text-black"
            >
                Cancel
            </button>
        </div>
    </div>
</div>
