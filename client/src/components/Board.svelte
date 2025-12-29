<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import CardComponent from "./Card.svelte";
    import { dndzone, type DndEvent } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import type { Card } from "../lib/types";

    const flipDurationMs = 300;

    // Board Logic: Dynamic single drop zone with "Anti-Theft" pinning

    let isDragging = false;
    let pinnedForeignCards: Card[] = [];

    function handleDndConsider(e: CustomEvent<DndEvent<Card>>) {
        if (!isDragging) {
            const myPlayerId = $gameState.playerId;
            pinnedForeignCards = $gameState.board.filter(
                (c) => c.playerId !== myPlayerId,
            );
            isDragging = true;
        }
        gameState.setBoard(e.detail.items);
    }

    function handleDndFinalize(e: CustomEvent<DndEvent<Card>>) {
        isDragging = false;
        const newItems = e.detail.items;

        // Restore any missing foreign cards (Anti-Theft)
        const missing = pinnedForeignCards.filter(
            (pinned) => !newItems.some((n) => n.id === pinned.id),
        );

        let finalBoard = newItems;
        if (missing.length > 0) {
            finalBoard = [...newItems, ...missing];
        }

        gameState.setBoard(finalBoard);

        socketStore.sendMessage({
            type: "UPDATE_BOARD",
            payload: { board: finalBoard },
        });

        pinnedForeignCards = [];
    }
</script>

<div class="max-w-5xl mx-auto mt-20 relative flex justify-center px-4">
    <!-- Active Drop Zone (The Board) -->
    <!-- We make this the dashed container itself -->
    <div
        class="w-full min-h-[400px] border-4 border-dashed border-gray-300 rounded-3xl flex flex-wrap justify-center content-start gap-4 p-8 transition-colors bg-gray-50/50"
        use:dndzone={{ items: $gameState.board, flipDurationMs }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
    >
        {#if $gameState.board.length === 0}
            <div
                class="w-full h-full flex items-center justify-center text-gray-400 font-medium italic pointer-events-none absolute inset-0"
            >
                Place cards here in ascending order...
            </div>
        {/if}

        {#each $gameState.board as card (card.id)}
            <div animate:flip={{ duration: flipDurationMs }}>
                <CardComponent
                    {card}
                    hidden={!card.isFaceUp}
                    ownerName={$gameState.players.find(
                        (p) => p.id === card.playerId,
                    )?.name}
                />
            </div>
        {/each}
    </div>
</div>
