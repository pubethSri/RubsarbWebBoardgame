<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import CardComponent from "./Card.svelte";
    import { dndzone, type DndEvent } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import type { Card } from "../lib/types";

    const flipDurationMs = 300;

    // --- CONCURRENCY STATE ---
    let localBoard: Card[] = [];
    let isDragging = false;
    let pendingServerUpdate: Card[] | null = null;
    let pinnedForeignCards: Card[] = [];

    // --- SYNC LOGIC (Update Buffering) ---
    // Reactive: Sync localBoard from store only if NOT dragging
    $: if (!isDragging && $gameState.board) {
        // If we just finished dragging and had a pending update, apply it?
        // Or if we are idle, always mirror the server.
        // We defer to the server state when idle.
        localBoard = $gameState.board;
    }

    function handleDndConsider(e: CustomEvent<DndEvent<Card>>) {
        if (!isDragging) {
            // Start of Drag
            const myPlayerId = $gameState.playerId;
            pinnedForeignCards = localBoard.filter(
                (c) => c.playerId !== myPlayerId,
            );
            isDragging = true;
        }

        // --- ENFORCE LOCKED WALL ---
        const lockedRevealed = localBoard.filter((c) => c.isFaceUp);
        const newItems = e.detail.items;
        const movingHidden = newItems.filter((c) => !c.isFaceUp);

        // Force merge
        const forcedOrder = [...lockedRevealed, ...movingHidden];

        localBoard = forcedOrder;
    }

    function handleDndFinalize(e: CustomEvent<DndEvent<Card>>) {
        const newItemsFromDnd = e.detail.items;

        // --- 1. ENFORCE LOCKED WALL ---
        const lockedRevealed = localBoard.filter((c) => c.isFaceUp);
        const movingHidden = newItemsFromDnd.filter((c) => !c.isFaceUp);
        let finalBoard = [...lockedRevealed, ...movingHidden];

        // Update local visual state immediately
        localBoard = finalBoard;

        // --- 3. DETECT MOVED CARD & SEND INTENT ---
        // We need to find which card ID caused this event.
        // svelte-dnd-action usually provides `info` in detail.
        // @ts-ignore
        const movedCardId = e.detail.info.id;

        if (movedCardId) {
            const targetIndex = finalBoard.findIndex(
                (c) => c.id === movedCardId,
            );
            if (targetIndex !== -1) {
                // Send Atomic Move Intent
                socketStore.sendMessage({
                    type: "MOVE_CARD",
                    payload: { cardId: movedCardId, targetIndex },
                });
            }
        }

        pinnedForeignCards = [];
        isDragging = false;

        // Note: isDragging = false will trigger the reactive statement `$gameState.board`
        // to overwrite `localBoard` with the server state.
        // However, if we moved a card, the server hasn't confirmed it yet!
        // This might cause a "jump back" if the server is slow.
        // Ideally, we should wait for a matching version or keep our speculative state.
        // But for now, the "jump" is safer than "drag kill".
        // We could improve this by checking versions later.
    }
</script>

<div class="w-full max-w-5xl mx-auto mt-4 relative flex justify-center px-4">
    <!-- Active Drop Zone (The Board) -->
    <div
        class="w-full min-h-[400px] border-4 border-black border-dashed bg-white flex flex-wrap justify-center content-start gap-4 p-8 transition-colors shadow-[8px_8px_0px_0px_#000000]"
        use:dndzone={{ items: localBoard, flipDurationMs }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
    >
        {#if localBoard.length === 0}
            <div
                class="w-full h-full flex items-center justify-center text-gray-400 font-black uppercase text-xl tracking-widest pointer-events-none absolute inset-0 opacity-30"
            >
                Place cards here in ascending order...
            </div>
        {/if}

        {#each localBoard as card (card.id)}
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
