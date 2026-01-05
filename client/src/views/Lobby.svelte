<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import { fade, fly, slide } from "svelte/transition";
    import HostGuideModal from "../components/HostGuideModal.svelte";
    import Button from "../components/UI/Button.svelte";
    import { HelpCircle, Crown, User, Star } from "lucide-svelte";

    // No need for $state for store subscriptions in Svelte 5 if using auto-subscription in template
    // But we can derive values if needed.

    let packShareCode = $state("");
    let isChangingPack = $state(false);
    let showHostGuide = $state(false);
    let isConfiguring = $state(false);

    async function changePack() {
        if (!packShareCode || packShareCode.length < 6) return;
        isChangingPack = true;
        try {
            const res = await fetch(`/api/rooms/${$gameState.roomCode}/pack`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shareCode: packShareCode }),
            });
            const data = await res.json();
            if (res.ok) {
                packShareCode = "";
                // Success msg or just let UI update
            } else {
                alert(
                    typeof data === "string"
                        ? data
                        : data.message || "Failed to change pack",
                );
            }
        } catch (e) {
            alert("Network Error");
        } finally {
            isChangingPack = false;
        }
    }
</script>

<div
    class="flex flex-col items-center min-h-screen p-6 bg-gray-50 text-black relative overflow-hidden"
>
    <!-- Decoration Background -->
    <div
        class="absolute inset-0 z-0 opacity-5 pointer-events-none"
        style="background-image: radial-gradient(#000 2px, transparent 2px); background-size: 20px 20px;"
    ></div>

    <!-- Content Wrapper -->
    <div class="z-10 w-full max-w-3xl flex flex-col gap-8">
        <!-- Header Section -->
        <div
            class="flex flex-col md:flex-row justify-between items-center gap-4"
        >
            <h1
                class="text-4xl font-black font-mono tracking-tighter uppercase border-b-4 border-black pb-2"
            >
                Lobby Area
            </h1>

            <div class="flex gap-4 items-center">
                <div class="flex flex-col items-end">
                    <span class="text-[10px] font-bold uppercase text-gray-500"
                        >Room Code</span
                    >
                    <span
                        class="text-4xl font-mono font-bold bg-primary-yellow px-4 border-4 border-black shadow-[4px_4px_0px_0px_#000000]"
                    >
                        {$gameState.roomCode}
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => socketStore.disconnect()}
                    class="h-full"
                >
                    LEAVE
                </Button>
            </div>
        </div>

        <!-- Host Controls (Pack Selection) -->
        <div
            class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000000] relative"
        >
            <!-- Badge -->
            <div
                class="absolute -top-4 -left-4 bg-primary-blue text-white p-2 border-4 border-black rotate-[-6deg] shadow-sm"
            >
                <Star class="fill-current w-6 h-6" />
            </div>

            <div class="flex flex-col items-center gap-4 text-center">
                <div class="space-y-1">
                    <span class="brutal-text text-sm text-gray-500"
                        >Current Topic Pack</span
                    >
                    <div
                        class="text-2xl md:text-4xl font-black font-mono uppercase leading-tight max-w-lg"
                    >
                        {$gameState.activePackName || "The Essentials"}
                    </div>
                </div>

                {#if $gameState.players.find((p) => p.id === $gameState.playerId)?.isHost}
                    <!-- Toggle Button -->
                    <button
                        class="text-xs font-bold font-mono underline hover:text-primary-blue"
                        onclick={() => (isConfiguring = !isConfiguring)}
                    >
                        {isConfiguring ? "CANCEL" : "CHANGE PACK"}
                    </button>

                    {#if isConfiguring}
                        <div
                            transition:slide
                            class="w-full max-w-xs flex gap-2 pt-4 border-t-2 border-dashed border-gray-300"
                        >
                            <input
                                bind:value={packShareCode}
                                placeholder="PACK CODE..."
                                class="flex-1 h-12 border-4 border-black px-3 font-mono text-center uppercase focus:bg-yellow-50 placeholder:text-gray-400"
                                maxlength="6"
                            />
                            <Button
                                variant="primary"
                                size="sm"
                                onclick={changePack}
                                disabled={isChangingPack ||
                                    packShareCode.length < 6}
                            >
                                {isChangingPack ? "..." : "LOAD"}
                            </Button>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- Start Game Action -->
        {#if $gameState.players.find((p) => p.id === $gameState.playerId)?.isHost}
            <div class="flex justify-center">
                <Button
                    variant="primary"
                    size="lg"
                    class="text-3xl w-full md:w-auto py-6"
                    onclick={() =>
                        socketStore.sendMessage({
                            type: "START_GAME",
                            payload: null,
                        })}
                    disabled={$gameState.players.length < 2}
                >
                    START GAME
                </Button>
            </div>
        {:else}
            <div
                class="text-center font-mono font-bold text-gray-500 animate-pulse"
            >
                WAITING FOR HOST TO START...
            </div>
        {/if}

        <!-- Player Grid -->
        <div>
            <div
                class="flex justify-between items-end mb-4 border-b-4 border-black"
            >
                <h2 class="brutal-text text-xl">
                    Players ({$gameState.players.length}/8)
                </h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                {#each $gameState.players as player (player.id)}
                    <div
                        in:fly={{ y: 20, duration: 300 }}
                        out:fade
                        class="relative bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000000] flex items-center gap-4 transition-all"
                        class:bg-yellow-50={player.id === $gameState.playerId}
                    >
                        <!-- Avatar -->
                        <div
                            class="w-12 h-12 bg-black text-white border-2 border-black flex items-center justify-center font-mono font-bold text-xl"
                        >
                            {player.name.charAt(0).toUpperCase()}
                        </div>

                        <!-- Info -->
                        <div class="flex-1 min-w-0">
                            <div
                                class="font-bold truncate text-lg uppercase flex items-center gap-2"
                            >
                                {player.name}
                                {#if player.id === $gameState.playerId}
                                    <span
                                        class="text-[10px] bg-black text-white px-1.5 py-0.5 rounded-none"
                                        >YOU</span
                                    >
                                {/if}
                            </div>

                            {#if player.isHost}
                                <div
                                    class="text-xs font-mono font-bold text-primary-blue flex items-center gap-1 mt-1"
                                >
                                    <Crown size={14} class="fill-current" /> HOST
                                    {#if player.id === $gameState.playerId}
                                        <button
                                            onclick={(e) => {
                                                e.stopPropagation();
                                                showHostGuide = true;
                                            }}
                                            class="text-black hover:bg-black hover:text-white rounded-full p-0.5 transition-colors border border-black ml-2"
                                        >
                                            <HelpCircle size={12} />
                                        </button>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}

                <!-- Empty Slots -->
                {#if $gameState.players.length < 3}
                    <div
                        class="border-4 border-dashed border-gray-300 p-4 flex items-center justify-center font-mono text-gray-400 h-[88px]"
                    >
                        Waiting...
                    </div>
                {/if}
            </div>
        </div>
    </div>

    {#if showHostGuide}
        <HostGuideModal on:close={() => (showHostGuide = false)} />
    {/if}
</div>
