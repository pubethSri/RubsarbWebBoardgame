<script lang="ts">
    import { X, Crown, Play, Eye } from "lucide-svelte";
    import { slide, fade } from "svelte/transition";
    import { createEventDispatcher } from "svelte";

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
        class="relative bg-white border-4 border-black rounded-2xl w-full max-w-md shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] flex flex-col"
        transition:slide={{ duration: 300, axis: "y" }}
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between p-6 border-b-2 border-dashed border-gray-300"
        >
            <h2
                class="text-xl font-black uppercase tracking-wider flex items-center gap-2"
            >
                <Crown size={24} /> Host Guide
            </h2>
            <button
                onclick={() => dispatch("close")}
                class="p-2 hover:bg-gray-100 rounded-full transition-colors border-2 border-transparent hover:border-black"
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
                        class="bg-black text-white p-3 rounded-lg h-12 w-12 flex items-center justify-center shrink-0"
                    >
                        <Eye size={24} />
                    </div>
                    <div>
                        <h3 class="font-bold text-lg uppercase">Reveal Next</h3>
                        <p class="text-sm text-gray-300 leading-relaxed">
                            <span class="text-gray-600"
                                >During the game, use the <strong
                                    class="text-black">REVEAL NEXT</strong
                                >
                                button to reveal the <strong>Left-Most</strong> face-down
                                card on the board. You control the dramatic tension!</span
                            >
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div
            class="p-6 border-t-2 border-dashed border-gray-300 bg-gray-50 rounded-b-xl"
        >
            <button
                onclick={() => dispatch("close")}
                class="w-full py-3 bg-black text-white font-bold rounded-xl text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
                I'M READY
            </button>
        </div>
    </div>
</div>
