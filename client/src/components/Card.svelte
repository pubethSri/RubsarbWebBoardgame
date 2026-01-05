<script lang="ts">
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";
    import type { Card } from "../lib/types";
    import { untrack } from "svelte";

    interface Props {
        card: Card;
        hidden?: boolean;
        ownerName?: string; // Optional: Only shown if provided (e.g. on Board)
    }

    let { card, hidden = false, ownerName }: Props = $props();

    // Editable if: It's MY card AND it's NOT revealed (hidden on board or in hand).
    // Note: 'hidden' prop is passed to toggle visual style, but 'card.isFaceUp' is truth.
    // Actually, simple rule: Editable if I am the owner && !card.isFaceUp.
    // Even if it's in Hand (isFaceUp=false), it's editable.
    // If it's on Board and Hidden (isFaceUp=false), it's editable.
    // If it's on Board and Revealed (isFaceUp=true), it's Read-Only.

    let isOwner = $derived(card.playerId === $gameState.playerId);
    let canEdit = $derived(isOwner && !card.isFaceUp);

    let noteValue = $state(untrack(() => card.note || ""));

    function handleBlur() {
        if (canEdit && noteValue !== card.note) {
            socketStore.sendMessage({
                type: "UPDATE_NOTE",
                payload: { cardId: card.id, note: noteValue },
            });
        }
    }
</script>

<div class="flex flex-col items-center gap-2">
    <div
        class="w-32 h-48 border-4 border-black flex flex-col items-center justify-between bg-white shadow-[4px_4px_0px_0px_#000000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000000] cursor-grab active:cursor-grabbing font-mono select-none overflow-hidden relative"
        class:bg-black={hidden}
        class:text-white={hidden}
    >
        <!-- Pattern for Hidden Card (Back) -->
        {#if hidden}
            <div
                class="absolute inset-0 opacity-20"
                style="background-image: repeating-linear-gradient(45deg, #333 0, #333 2px, transparent 2px, transparent 8px);"
            ></div>
        {/if}
        <!-- Top: Value -->
        <div class="flex-1 flex items-center justify-center w-full">
            {#if hidden}
                <span class="text-4xl font-bold">?</span>
            {:else}
                <span class="text-4xl font-bold text-black">{card.value}</span>
            {/if}
        </div>

        <!-- Bottom: Note (1 Line) -->
        <div
            class="w-full h-8 border-t-4 border-black bg-primary-yellow text-black flex items-center justify-center p-0.5 z-10"
        >
            {#if canEdit}
                <input
                    type="text"
                    class="w-full h-full bg-transparent text-xs text-center border-none focus:ring-0 p-0 placeholder-black/30 font-bold font-mono uppercase"
                    placeholder="Note..."
                    bind:value={noteValue}
                    onblur={handleBlur}
                    onpointerdown={(e) => e.stopPropagation()}
                />
            {:else}
                <div
                    class="w-full h-full flex items-center justify-center text-xs text-center p-0 font-sans truncate px-1"
                >
                    {card.note || ""}
                </div>
            {/if}
        </div>
    </div>

    {#if ownerName}
        <span
            class="text-[10px] font-bold text-white bg-black border-2 border-black px-2 py-0.5 shadow-[2px_2px_0px_0px_#000000]"
        >
            {ownerName}
        </span>
    {/if}
</div>
