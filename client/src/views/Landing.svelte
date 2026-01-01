<script lang="ts">
    import { socketStore } from "../lib/stores/socket";
    import { gameState } from "../lib/stores/gameState";

    import CreatePack from "./CreatePack.svelte";
    import Admin from "./Admin.svelte";
    import LoginModal from "../components/LoginModal.svelte";
    import HowToPlayModal from "../components/HowToPlayModal.svelte";
    import { authStore, logout } from "../lib/stores/auth";
    import { HelpCircle } from "lucide-svelte";

    let playerName = $state("");
    let roomCode = $state("");
    let viewMode = $state<"HOME" | "JOIN" | "CREATE_PACK" | "ADMIN">("HOME");
    let showLogin = $state(false);
    let showHowToPlay = $state(false);

    function createRoom() {
        if (!playerName.trim()) return;
        socketStore.sendMessage({
            type: "CREATE_ROOM",
            payload: { playerName },
        });
    }

    function joinRoom() {
        if (!playerName.trim() || !roomCode.trim()) return;
        socketStore.sendMessage({
            type: "JOIN_ROOM",
            payload: { roomCode: roomCode.toUpperCase(), playerName },
        });
    }
</script>

{#if viewMode === "CREATE_PACK"}
    <CreatePack onBack={() => (viewMode = "HOME")} />
{:else if viewMode === "ADMIN"}
    <Admin onBack={() => (viewMode = "HOME")} />
{:else}
    <div
        class="flex flex-col items-center justify-center min-h-screen p-4 bg-white text-black"
    >
        <h1 class="text-6xl font-bold mb-8 text-black tracking-tight">
            Rubsarb
        </h1>

        <div
            class="w-full max-w-md p-8 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
            <div class="mb-6">
                <label
                    class="block text-sm font-bold mb-2 text-black uppercase tracking-wider"
                    for="name"
                >
                    Your Name
                </label>
                <input
                    id="name"
                    type="text"
                    bind:value={playerName}
                    placeholder="Enter your name"
                    class="w-full px-4 py-3 rounded-lg border-2 border-black focus:bg-gray-50 outline-none text-lg font-medium text-black placeholder:text-gray-400 transition-all"
                />
            </div>

            {#if $gameState.error}
                <div
                    class="mb-4 p-3 bg-black text-white border-2 border-dashed border-gray-500 font-bold rounded text-center text-sm"
                >
                    ⚠️ {$gameState.error}
                </div>
            {/if}

            {#if viewMode === "HOME"}
                <button
                    onclick={createRoom}
                    class="w-full py-4 rounded-xl bg-black text-white font-bold text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all hover:bg-gray-800 mb-4 cursor-pointer"
                >
                    Create New Room
                </button>

                <button
                    onclick={() => (viewMode = "JOIN")}
                    class="w-full py-4 rounded-xl bg-white border-2 border-black text-black font-bold text-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1"
                >
                    Join Existing Room
                </button>

                {#if $authStore && ($authStore.role === "CREATOR" || $authStore.role === "ADMIN")}
                    <div
                        class="mt-4 pt-4 border-t-2 border-dashed border-gray-300 animate-in fade-in"
                    >
                        <button
                            onclick={() => (viewMode = "CREATE_PACK")}
                            class="w-full py-2 text-sm font-bold text-gray-500 hover:text-black hover:underline transition-all"
                        >
                            Or create your own Topics Pack?
                        </button>
                    </div>
                {/if}
            {:else if viewMode === "JOIN"}
                <div class="mb-6 animate-in fade-in slide-in-from-bottom-2">
                    <label
                        class="block text-sm font-bold mb-2 text-black uppercase tracking-wider"
                        for="code"
                    >
                        Room Code
                    </label>
                    <input
                        id="code"
                        type="text"
                        bind:value={roomCode}
                        placeholder="ABCD"
                        maxlength="4"
                        class="w-full px-4 py-3 rounded-lg border-2 border-black focus:bg-gray-50 outline-none text-lg font-medium text-black placeholder:text-gray-400 uppercase tracking-widest text-center transition-all"
                    />
                </div>

                <div class="flex gap-3">
                    <button
                        onclick={() => (viewMode = "HOME")}
                        class="flex-1 py-3 rounded-xl bg-white border-2 border-black text-black font-bold hover:bg-gray-50 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1"
                    >
                        Back
                    </button>
                    <button
                        onclick={joinRoom}
                        class="flex-[2] py-3 rounded-xl bg-black border-2 border-black text-white font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all hover:bg-gray-800 cursor-pointer"
                    >
                        Join Room
                    </button>
                </div>
            {/if}
        </div>

        <!-- How To Play (Top Left) -->
        <div class="fixed top-4 left-4">
            <button
                onclick={() => (showHowToPlay = true)}
                class="flex items-center gap-2 text-xs font-bold hover:underline opacity-60 hover:opacity-100 transition-opacity"
            >
                <HelpCircle size={16} /> HOW TO PLAY
            </button>
        </div>

        <!-- Auth Controls -->
        <div class="fixed top-4 right-4 flex gap-4 items-center">
            {#if $authStore}
                <div class="text-xs font-mono">
                    <span class="font-bold">{$authStore.username}</span>
                    <span class="opacity-50">({$authStore.role})</span>
                </div>
                <button
                    onclick={logout}
                    class="text-xs underline hover:bg-black hover:text-white px-1"
                >
                    Logout
                </button>
            {:else}
                <button
                    onclick={() => (showLogin = true)}
                    class="text-xs font-bold hover:underline"
                >
                    LOGIN
                </button>
            {/if}
        </div>

        <!-- Admin / Creator Links -->
        <div class="fixed bottom-2 right-2 flex flex-col items-end gap-1">
            {#if $authStore?.role === "ADMIN"}
                <button
                    onclick={() => (viewMode = "ADMIN")}
                    class="text-[10px] text-gray-400 hover:text-black font-bold font-mono uppercase border border-transparent hover:border-black px-1"
                >
                    Admin Dashboard
                </button>
            {/if}
        </div>
    </div>

    {#if showLogin}
        <LoginModal on:close={() => (showLogin = false)} />
    {/if}

    {#if showHowToPlay}
        <HowToPlayModal on:close={() => (showHowToPlay = false)} />
    {/if}
{/if}
