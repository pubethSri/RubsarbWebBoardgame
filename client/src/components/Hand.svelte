<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import CardComponent from "./Card.svelte";
    import { dndzone, type DndEvent } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import type { Card } from "../lib/types";
    import { ChevronDown, ChevronUp } from "lucide-svelte";

    export let collapsed = false;

    const flipDurationMs = 300;

    function handleDndConsider(e: CustomEvent<DndEvent<Card>>) {
        const validItems = e.detail.items.filter(
            (c) => c.playerId === $gameState.playerId,
        );
        gameState.setHand(validItems);
    }

    function handleDndFinalize(e: CustomEvent<DndEvent<Card>>) {
        const validItems = e.detail.items.filter(
            (c) => c.playerId === $gameState.playerId,
        );
        gameState.setHand(validItems);

        // Detect if a new card was DROPPED here (Return to Hand)
        // Checks if 'info.id' is present (the item being dropped)
        // @ts-ignore
        const droppedCardId = e.detail.info?.id;

        // We only care if we "received" it.
        // Logic: if it wasn't in our hand before?
        // Or simpler: Hand always accepts drops. If it came from Board, we must tell server.
        // If it came from Hand (reorder), we don't need to tell server (Hand is private/local).
        // BUT telling server 'RETURN_CARD' for a card already in hand might be harmless (not found on board).
        // Let's send it to be safe/consistent if it's a drop event.

        if (droppedCardId) {
            // In svelte-dnd-action, info.id is the item being dragged.
            // We MUST check if it ended up IN the hand (validItems)
            // If we dragged OUT, it won't be in validItems, so we shouldn't ask to return it.
            const isNowInHand = validItems.some((c) => c.id === droppedCardId);

            if (isNowInHand) {
                socketStore.sendMessage({
                    type: "RETURN_CARD",
                    payload: { cardId: droppedCardId },
                });
            }
        }
    }
</script>

<div
    class="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none transition-transform duration-300 {collapsed
        ? 'translate-y-[calc(100%-3rem)]'
        : 'translate-y-0'}"
>
    <!-- Collapse / expand handle (always visible, even when collapsed) -->
    <button
        type="button"
        on:click={() => (collapsed = !collapsed)}
        class="pointer-events-auto mb-1 flex items-center gap-2 px-4 py-1.5 bg-black text-white font-mono font-bold text-xs uppercase border-4 border-black shadow-[2px_2px_0px_0px_#fff] hover:-translate-y-0.5 transition-transform cursor-pointer"
        title={collapsed ? "Show your hand" : "Hide your hand"}
    >
        {#if collapsed}
            <ChevronUp size={16} />
            <span>Show Hand ({$gameState.hand.length})</span>
        {:else}
            <ChevronDown size={16} />
            <span>Hide Hand</span>
        {/if}
    </button>

    <!-- Hand row -->
    <div
        class="w-full p-4 md:p-8 flex justify-start md:justify-center items-end overflow-x-auto pointer-events-none"
    >
        <!-- Container for DnD -->
        <div
            class="flex gap-4 pointer-events-auto min-w-[200px] min-h-[160px] items-end justify-start md:justify-center rounded-xl p-4 transition-colors shrink-0"
            use:dndzone={{ items: $gameState.hand, flipDurationMs }}
            on:consider={handleDndConsider}
            on:finalize={handleDndFinalize}
        >
            {#each $gameState.hand as card (card.id)}
                <div animate:flip={{ duration: flipDurationMs }}>
                    <CardComponent {card} />
                </div>
            {/each}
        </div>
    </div>
</div>
