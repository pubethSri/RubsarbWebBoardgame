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

        // --- ENFORCE LOCKED WALL ---
        // 1. Get the authoritative list of revealed cards (These CANNOT move)
        // We trust the local store's order of revealed cards, or just filter from store.
        const lockedRevealed = $gameState.board.filter((c) => c.isFaceUp);

        // 2. Get the new proposed order from dndzone
        const newItems = e.detail.items;

        // 3. Extract the hidden cards from the new order (These are what the user is moving)
        const movingHidden = newItems.filter((c) => !c.isFaceUp);

        // 4. Force merge: [Locked Revealed] + [Moving Hidden]
        // This physically prevents any hidden card from having an index < lockedRevealed.length
        const forcedOrder = [...lockedRevealed, ...movingHidden];

        gameState.setBoard(forcedOrder);
    }

    function handleDndFinalize(e: CustomEvent<DndEvent<Card>>) {
        isDragging = false;

        // --- 1. ENFORCE LOCKED WALL (Same as Consider) ---
        const lockedRevealed = $gameState.board.filter((c) => c.isFaceUp);
        const newItemsFromDnd = e.detail.items;
        const movingHidden = newItemsFromDnd.filter((c) => !c.isFaceUp);
        let finalBoard = [...lockedRevealed, ...movingHidden]; // Initial forced state

        // --- 2. RESTORE MISSING FOREIGN CARDS (Anti-Theft) ---
        // We check against 'finalBoard' (which has the wall enforced).
        // Any foreign card that was hidden and is now missing needs to be put back.
        // Wait, 'pinnedForeignCards' might include revealed ones too?
        // Yes, but revealed ones are in 'lockedRevealed' so they are safe.
        // So we only really care about hidden foreign cards being stolen.
        const missing = pinnedForeignCards.filter(
            (pinned) => !finalBoard.some((n) => n.id === pinned.id),
        );

        if (missing.length > 0) {
            // Append them back
            finalBoard = [...finalBoard, ...missing];
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
            <div
                animate:flip={{ duration: flipDurationMs }}
                class:pointer-events-none={card.isFaceUp}
                class:opacity-100={card.isFaceUp}
            >
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
