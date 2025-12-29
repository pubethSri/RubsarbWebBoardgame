<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import { fade, fly } from "svelte/transition";

    // No need for $state for store subscriptions in Svelte 5 if using auto-subscription in template
    // But we can derive values if needed.
</script>

<div class="flex flex-col items-center min-h-screen p-6 bg-white text-black">
    <!-- Header -->
    <div class="w-full max-w-2xl flex justify-between items-center mb-12">
        <h1 class="text-3xl font-bold tracking-tight text-black">Rubsarb</h1>
        <div class="flex items-center gap-4">
            <div
                class="px-4 py-2 bg-white rounded-lg border-2 border-black font-mono text-xl font-bold tracking-widest text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
                Room: <span class="text-black">{$gameState.roomCode}</span>
            </div>
            <button
                onclick={() => socketStore.disconnect()}
                class="px-4 py-2 rounded-lg bg-black text-white border-2 border-black font-bold hover:bg-gray-800 transition-colors cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1"
            >
                Leave
            </button>
        </div>
    </div>

    <!-- Host Actions -->
    {#if $gameState.players.find((p) => p.id === $gameState.playerId)?.isHost}
        <div class="mb-8 w-full max-w-2xl flex justify-center">
            <button
                onclick={() =>
                    socketStore.sendMessage({
                        type: "START_GAME",
                        payload: null,
                    })}
                class="px-8 py-4 rounded-xl bg-black text-white border-2 border-black font-bold text-2xl hover:scale-105 transition-transform cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={$gameState.players.length < 1}
            >
                START GAME
            </button>
        </div>
    {/if}

    <!-- Content -->
    <div class="w-full max-w-2xl">
        <h2
            class="text-xl font-bold text-black uppercase tracking-wider mb-6 border-b-2 border-black pb-2 inline-block"
        >
            Players ({$gameState.players.length})
        </h2>

        <div class="grid gap-4">
            {#each $gameState.players as player (player.id)}
                <div
                    in:fly={{ y: 20, duration: 300 }}
                    out:fade
                    class="flex items-center p-4 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                    class:bg-gray-50={player.id === $gameState.playerId}
                >
                    <div
                        class="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl mr-4 border-2 border-black font-bold"
                    >
                        {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1">
                        <div
                            class="font-bold text-lg text-black flex items-center gap-2"
                        >
                            {player.name}
                            {#if player.id === $gameState.playerId}
                                <span
                                    class="text-xs px-2 py-1 rounded-full bg-black text-white font-bold"
                                    >YOU</span
                                >
                            {/if}
                            {#if player.isHost}
                                <span
                                    class="text-xs px-2 py-1 rounded-full border border-black text-black font-bold"
                                    >HOST</span
                                >
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}

            <!-- Empty Slots placeholders (visual only) -->
            {#if $gameState.players.length < 3}
                <div
                    class="p-4 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 italic font-medium"
                >
                    Waiting for players...
                </div>
            {/if}
        </div>
    </div>
</div>
