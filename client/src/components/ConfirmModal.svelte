<script lang="ts">
    import { fade, scale } from "svelte/transition";
    import Button from "./UI/Button.svelte";
    import { AlertTriangle } from "lucide-svelte";
    import { createEventDispatcher } from "svelte";

    export let title = "Are you sure?";
    export let message = "This action cannot be undone.";
    export let confirmText = "Confirm";
    export let cancelText = "Cancel";
    export let danger = false;

    const dispatch = createEventDispatcher();
</script>

<div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    transition:fade={{ duration: 200 }}
>
    <div
        class="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] p-6 max-w-sm w-full flex flex-col gap-4 relative"
        transition:scale={{ duration: 200, start: 0.95 }}
    >
        <div class="flex items-start gap-4">
            {#if danger}
                <div
                    class="bg-primary-red p-2 border-2 border-black text-white"
                >
                    <AlertTriangle size={24} />
                </div>
            {/if}
            <div class="flex-1">
                <h3
                    class="font-black font-mono text-xl uppercase leading-none mb-2"
                >
                    {title}
                </h3>
                <p class="font-bold text-sm text-gray-600 leading-relaxed">
                    {message}
                </p>
            </div>
        </div>

        <div class="flex gap-2 justify-end mt-2">
            <Button
                variant="outline"
                size="sm"
                onclick={() => dispatch("cancel")}
            >
                {cancelText}
            </Button>
            <Button
                variant={danger ? "primary" : "secondary"}
                size="sm"
                onclick={() => dispatch("confirm")}
            >
                {confirmText}
            </Button>
        </div>
    </div>
</div>
