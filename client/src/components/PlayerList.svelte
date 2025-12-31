<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import { slide } from "svelte/transition";
    import {
        Users,
        Wifi,
        WifiOff,
        ChevronDown,
        ChevronUp,
        LogOut,
    } from "lucide-svelte"; // Assuming lucide-svelte is available or we use SVGs

    let isOpen = false;
</script>

<div class="absolute top-4 left-4 z-50">
    <button
        onclick={() => (isOpen = !isOpen)}
        class="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all font-bold text-sm hover:bg-gray-50"
    >
        <span class="flex items-center gap-2">
            Players ({$gameState.players.length})
        </span>
        {#if isOpen}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"><path d="m18 15-6-6-6 6" /></svg
            >
        {:else}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"><path d="m6 9 6 6 6-6" /></svg
            >
        {/if}
    </button>

    {#if isOpen}
        <div
            transition:slide
            class="mt-2 w-64 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        >
            <div class="flex flex-col">
                {#each $gameState.players as player}
                    <div
                        class="flex items-center justify-between p-3 border-b-2 border-black last:border-b-0"
                        class:bg-gray-100={!player.isConnected}
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs bg-white"
                                class:text-gray-400={!player.isConnected}
                                class:border-gray-400={!player.isConnected}
                            >
                                {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex flex-col">
                                <span
                                    class="font-bold text-sm flex items-center gap-2"
                                    class:text-gray-500={!player.isConnected}
                                >
                                    {player.name}
                                    {#if player.isHost}
                                        <span
                                            class="text-[10px] bg-black text-white px-1.5 rounded"
                                            >HOST</span
                                        >
                                    {/if}
                                    {#if player.id === $gameState.playerId}
                                        <span
                                            class="text-[10px] border border-black px-1.5 rounded"
                                            >YOU</span
                                        >
                                    {/if}
                                </span>
                            </div>
                        </div>

                        {#if player.isConnected}
                            <div
                                class="w-2 h-2 rounded-full bg-green-500 animate-pulse"
                                title="Online"
                            ></div>
                        {:else}
                            <div
                                class="w-2 h-2 rounded-full bg-red-500"
                                title="Disconnected"
                            ></div>
                        {/if}
                    </div>
                {/each}
            </div>
            
            <div class="p-2 border-t-2 border-black bg-gray-50">
                <button
                    onclick={() => socketStore.disconnect()}
                    class="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold text-red-600 border border-red-200 rounded hover:bg-red-50 hover:border-red-400 transition-colors"
                >
                    <LogOut size={14} />
                    Leave Room
                </button>
            </div>
        </div>
    {/if}
</div>
