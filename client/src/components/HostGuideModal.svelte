<script lang="ts">
    import { X, Crown, Play, Eye } from "lucide-svelte";
    import { slide, fade } from "svelte/transition";
    import { createEventDispatcher } from "svelte";
    import Button from "./UI/Button.svelte";

    const dispatch = createEventDispatcher();
</script>

<div
    class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    transition:fade={{ duration: 200 }}
>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="absolute inset-0" onclick={() => dispatch("close")}></div>

    <div
        class="relative bg-white border-4 border-black w-full max-w-md shadow-[8px_8px_0px_0px_#000000] flex flex-col"
        transition:slide={{ duration: 300, axis: "y" }}
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between p-6 border-b-4 border-black bg-primary-yellow"
        >
            <h2
                class="text-xl font-black font-mono uppercase tracking-wider flex items-center gap-2"
            >
                <Crown size={24} /> Host Guide
            </h2>
            <button
                onclick={() => dispatch("close")}
                class="p-1 hover:bg-black hover:text-white transition-colors border-2 border-transparent hover:border-white"
            >
                <X size={24} />
            </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
            <p class="font-medium text-gray-600">
                As the Host, you control the flow of the game. Here is what you
                need to know:
            </p>

            <div class="space-y-4">
                <div class="flex gap-4">
                    <div
                        class="bg-black text-white border-2 border-black p-3 h-12 w-12 flex items-center justify-center shrink-0 shadow-[4px_4px_0px_0px_rgba(255,0,0,1)]"
                    >
                        <Eye size={24} />
                    </div>
                    <div>
                        <h3 class="font-bold font-mono text-lg uppercase mb-1">
                            Reveal Next
                        </h3>
                        <p class="text-sm border-l-4 border-black pl-2">
                            Use <strong class="bg-black text-white px-1"
                                >REVEAL NEXT</strong
                            > to show the Left-Most hidden card.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t-4 border-black bg-gray-50">
            <Button
                variant="primary"
                fullWidth
                onclick={() => dispatch("close")}
            >
                I'M READY
            </Button>
        </div>
    </div>
</div>
