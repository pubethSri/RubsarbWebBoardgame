<script lang="ts">
    import Board from "../components/Board.svelte";
    import Hand from "../components/Hand.svelte";
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
</script>

<div class="min-h-screen bg-white text-black relative overflow-hidden">
    <!-- Header info -->
    <div
        class="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10"
    >
        <div class="font-bold text-xl tracking-tight">Rubsarb</div>

        <div class="flex gap-4 items-center">
            {#if $gameState.players.find((p) => p.id === $gameState.playerId)?.isHost}
                {@const allCardsPlaced = $gameState.players.every(
                    (p) => (p.cardCount ?? 0) === 0,
                )}
                <button
                    onclick={() =>
                        socketStore.sendMessage({
                            type: "REVEAL_NEXT",
                            payload: null,
                        })}
                    disabled={!allCardsPlaced}
                    class="px-4 py-1 rounded-lg bg-black text-white font-bold border-2 border-black hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-0.5 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                    title={!allCardsPlaced
                        ? "Wait for all players to place cards"
                        : "Reveal next card"}
                >
                    Reveal Next
                </button>
            {/if}

            <div
                class="px-4 py-1 border-2 border-black rounded-lg font-mono text-sm font-bold bg-white"
            >
                Level 1
            </div>
        </div>
    </div>

    <!-- Game Area -->
    <Board />

    <!-- Player Hand -->
    <Hand />
</div>
