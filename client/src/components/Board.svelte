<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import CardComponent from "./Card.svelte";
    import {
        dndzone,
        SHADOW_ITEM_MARKER_PROPERTY_NAME,
        type DndEvent,
    } from "svelte-dnd-action";
    import { flip } from "svelte/animate";
    import type { Card } from "../lib/types";
    import { Eye, EyeOff } from "lucide-svelte";

    const flipDurationMs = 300;

    // --- CONCURRENCY STATE ---
    let localBoard: Card[] = [];
    let isDragging = false;
    let pendingServerUpdate: Card[] | null = null;
    let pinnedForeignCards: Card[] = [];
    let isPrivateView = false;

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
        const movedCardId = e.detail.info?.id;

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

<div
    class="w-full max-w-5xl mx-auto mt-4 relative flex flex-col items-center px-4"
>
    <!-- Controls -->
    <div class="w-full flex justify-end mb-2">
        <button
            on:click={() => (isPrivateView = !isPrivateView)}
            class="flex items-center gap-2 px-3 py-1.5 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all text-xs font-bold font-mono uppercase hover:bg-yellow-50"
            title={isPrivateView
                ? "Show my card numbers"
                : "Hide my card numbers"}
        >
            {#if isPrivateView}
                <EyeOff size={16} />
                <span>Hidden</span>
            {:else}
                <Eye size={16} />
                <span>Visible</span>
            {/if}
        </button>
    </div>

    <!-- Active Drop Zone (The Board) -->
    <div
        class="w-full min-h-[400px] border-4 border-black border-dashed bg-white flex flex-wrap justify-start content-start gap-4 p-4 md:p-8 transition-colors shadow-[8px_8px_0px_0px_#000000] relative"
        use:dndzone={{
            items: localBoard,
            flipDurationMs,
            dropTargetStyle: { outline: "4px solid #000", outlineOffset: "8px" },
        }}
        on:consider={handleDndConsider}
        on:finalize={handleDndFinalize}
    >
        {#if localBoard.length === 0}
            <div
                class="w-full h-full flex items-center justify-center text-gray-400 font-black uppercase text-xl tracking-widest pointer-events-none absolute inset-0 opacity-30 p-4 text-center"
            >
                Place cards here...
            </div>
        {/if}

        {#each localBoard as card (card.id)}
            <div
                animate:flip={{ duration: flipDurationMs }}
                class:pointer-events-none={card.isFaceUp}
                class:opacity-100={card.isFaceUp}
            >
                {#if SHADOW_ITEM_MARKER_PROPERTY_NAME in card}
                    <!-- Drop-slot placeholder: shows exactly where the dragged card will land.
                         svelte-dnd-action sets visibility:hidden on the shadow wrapper (its
                         default indicator is the empty gap); `visible` here overrides that so
                         our dashed slot actually shows. -->
                    <div
                        class="visible w-20 h-32 sm:w-24 sm:h-36 md:w-28 md:h-44 lg:w-32 lg:h-48 border-4 border-dashed border-black bg-black/10 flex items-center justify-center text-center font-mono font-black text-xs uppercase text-black/70 select-none"
                    >
                        Drop here
                    </div>
                {:else}
                    <CardComponent
                        {card}
                        hidden={!card.isFaceUp}
                        forceHide={isPrivateView}
                        ownerName={$gameState.players.find(
                            (p) => p.id === card.playerId,
                        )?.name}
                        ownerColor={$gameState.players.find(
                            (p) => p.id === card.playerId,
                        )?.color}
                    />
                {/if}
            </div>
        {/each}
    </div>

    <!-- Low -> High axis rail: reinforces that the sequence reads left (low) to right (high) -->
    <div
        class="w-full flex items-center gap-3 mt-3 px-1 text-xs font-black font-mono uppercase text-black/60 select-none pointer-events-none"
    >
        <span class="whitespace-nowrap">Low · 1</span>
        <span class="flex-1 border-t-4 border-dashed border-black/30"></span>
        <span class="whitespace-nowrap">100 · High</span>
    </div>
</div>
