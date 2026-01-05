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
        class="flex items-center gap-2 px-2 py-2 bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000000] active:translate-y-1 active:shadow-none transition-all font-mono font-bold text-sm hover:bg-yellow-50"
    >
        <span class="flex items-center gap-2 uppercase">
            Players ({$gameState.players.length})
        </span>
        {#if isOpen}
            <ChevronUp size={16} />
        {:else}
            <ChevronDown size={16} />
        {/if}
    </button>

    {#if isOpen}
        <div
            transition:slide
            class="mt-2 w-64 bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000000]"
        >
            <div class="flex flex-col">
                {#each $gameState.players as player}
                    <div
                        class="flex items-center justify-between p-3 border-b-4 border-black last:border-b-0"
                        class:bg-gray-100={!player.isConnected}
                    >
                        <div
                            class="flex items-center gap-3 flex-1 min-w-0 mr-2"
                        >
                            <div
                                class="w-8 h-8 border-2 border-black flex items-center justify-center font-bold text-xs bg-white font-mono shrink-0"
                                class:text-gray-400={!player.isConnected}
                                class:border-gray-400={!player.isConnected}
                            >
                                {player.name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex flex-col min-w-0 flex-1">
                                <span
                                    class="font-bold text-sm flex items-center gap-2"
                                    class:text-gray-500={!player.isConnected}
                                >
                                    <span class="truncate">{player.name}</span>
                                    {#if player.isHost}
                                        <span
                                            class="text-[10px] bg-black text-white px-1.5 rounded border border-black shrink-0"
                                            >HOST</span
                                        >
                                    {/if}
                                    {#if player.id === $gameState.playerId}
                                        <span
                                            class="text-[10px] border border-black px-1.5 rounded shrink-0"
                                            >YOU</span
                                        >
                                    {/if}
                                </span>
                            </div>
                        </div>

                        {#if player.isConnected}
                            <div
                                class="w-2 h-2 bg-green-500 animate-pulse border border-black"
                                title="Online"
                            ></div>
                        {:else}
                            <div
                                class="w-2 h-2 bg-red-500 border border-black"
                                title="Disconnected"
                            ></div>
                        {/if}
                    </div>
                {/each}
            </div>

            <div class="p-2 border-t-2 border-black bg-gray-50">
                <button
                    onclick={() => socketStore.disconnect()}
                    class="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-bold font-mono uppercase bg-black text-white border-2 border-black hover:bg-primary-red transition-colors"
                >
                    <LogOut size={14} />
                    Leave Room
                </button>
            </div>
        </div>
    {/if}
</div>
