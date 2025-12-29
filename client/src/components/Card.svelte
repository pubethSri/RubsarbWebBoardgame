<script lang="ts">
    import type { Card } from "../lib/types";

    interface Props {
        card: Card;
        hidden?: boolean;
        ownerName?: string; // Optional: Only shown if provided (e.g. on Board)
    }

    let { card, hidden = false, ownerName }: Props = $props();
</script>

<div class="flex flex-col items-center gap-2">
    <div
        class="w-24 h-36 border-2 border-black rounded-xl flex items-center justify-center bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 cursor-grab active:cursor-grabbing font-mono select-none"
        class:bg-black={hidden}
        class:text-white={hidden}
    >
        {#if hidden}
            <span class="text-4xl font-bold">?</span>
        {:else}
            <span class="text-4xl font-bold text-black">{card.value}</span>
        {/if}
    </div>

    {#if ownerName}
        <span
            class="text-xs font-bold text-black bg-white border border-black px-2 py-0.5 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
        >
            {ownerName}
        </span>
    {/if}
</div>
