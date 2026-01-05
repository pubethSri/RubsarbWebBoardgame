<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";
    import { authStore } from "../lib/stores/auth";
    import Button from "./UI/Button.svelte";

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
        class="bg-white border-4 border-black p-8 w-full max-w-sm shadow-[8px_8px_0px_0px_#000000] relative"
    >
        <div
            class="absolute -top-3 -left-3 bg-primary-blue w-full h-full -z-10 border-4 border-black transition-transform group-hover:translate-x-2 group-hover:translate-y-2"
        ></div>

        <h2
            class="text-3xl font-black font-mono uppercase mb-6 text-center border-b-4 border-black pb-4"
        >
            Login
        </h2>

        {#if errorMsg}
            <div
                class="bg-primary-red text-white p-2 mb-4 text-sm font-bold font-mono text-center border-4 border-black shadow-[4px_4px_0px_0px_#000000]"
            >
                {errorMsg}
            </div>
        {/if}

        <div class="flex flex-col gap-4">
            <input
                bind:value={username}
                type="text"
                placeholder="USERNAME"
                class="h-12 border-4 border-black px-3 font-mono text-lg uppercase focus:bg-yellow-50 placeholder:text-gray-400"
            />
            <input
                bind:value={password}
                type="password"
                placeholder="PASSWORD"
                class="h-12 border-4 border-black px-3 font-mono text-lg placeholder:text-gray-400"
                on:keydown={(e) => e.key === "Enter" && handleLogin()}
            />

            <Button
                variant="primary"
                fullWidth
                disabled={isLoading}
                onclick={handleLogin}
                class="mt-2"
            >
                {isLoading ? "..." : "ENTER"}
            </Button>

            <Button
                variant="ghost"
                fullWidth
                size="sm"
                onclick={() => dispatch("close")}
            >
                CANCEL
            </Button>
        </div>
    </div>
</div>
