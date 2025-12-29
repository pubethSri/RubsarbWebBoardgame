<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import CardComponent from "./Card.svelte";
    import { dndzone, type DndEvent } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import type { Card } from "../lib/types";

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
    }
</script>

<div
    class="fixed bottom-0 left-0 right-0 p-8 flex justify-center items-end h-64 pointer-events-none"
>
    <!-- Container for DnD -->
    <div
        class="flex gap-4 pointer-events-auto min-w-[200px] min-h-[160px] items-end justify-center rounded-xl p-4 transition-colors"
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
