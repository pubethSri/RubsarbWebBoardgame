<script lang="ts">
    import {
        X,
        ArrowRight,
        EyeOff,
        MessageSquareOff,
        TrendingUp,
    } from "lucide-svelte";
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
        class="relative bg-white border-4 border-black w-full max-w-lg shadow-[8px_8px_0px_0px_#000000] flex flex-col max-h-[90vh]"
        transition:slide={{ duration: 300, axis: "y" }}
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between p-6 border-b-4 border-black bg-primary-yellow"
        >
            <h2
                class="text-2xl font-black font-mono uppercase tracking-tighter"
            >
                How to Play??
            </h2>
            <button
                onclick={() => dispatch("close")}
                class="p-2 hover:bg-gray-100 rounded-full transition-colors border-2 border-transparent hover:border-black"
            >
                <X size={24} />
            </button>
        </div>

        <!-- Content -->
        <div class="p-6 overflow-y-auto space-y-8">
            <!-- Core Concept -->
            <div class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="bg-black text-white p-2 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <h3 class="text-xl font-bold uppercase">The Goal</h3>
                </div>

                <p class="font-medium text-gray-600 leading-relaxed">
                    You are dealt cards from <span class="text-black font-black"
                        >1 to 100</span
                    >. Cards played from your hand are placed
                    <strong class="text-black">face down</strong> on the board.
                </p>
                <p class="font-medium text-gray-600 leading-relaxed">
                    Work together to sort them in <span
                        class="underline decoration-2 text-black font-bold"
                        >Ascending Order</span
                    >. Once ready, the Host reveals them from Left to Right.
                </p>

                <p class="text-sm text-gray-400 italic font-medium">
                    you can still discuss and move the remaining face-down cards
                    before the next reveal!
                </p>

                <!-- Visual Scenarios -->
                <div class="flex flex-col gap-6 mt-6">
                    <!-- Scenario 1: Gameplay -->
                    <div class="space-y-2">
                        <span class="text-xs font-bold uppercase text-gray-400"
                            >1. The Board</span
                        >
                        <div
                            class="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl border border-gray-200"
                        >
                            <!-- Revealed -->
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                12
                            </div>
                            <!-- Face Down -->
                            <div
                                class="w-10 h-14 bg-gray-300 rounded border-2 border-gray-400 flex items-center justify-center font-bold text-gray-500 text-xs"
                            >
                                ?
                            </div>
                            <div
                                class="w-10 h-14 bg-gray-300 rounded border-2 border-gray-400 flex items-center justify-center font-bold text-gray-500 text-xs"
                            >
                                ?
                            </div>
                            <div
                                class="w-10 h-14 bg-gray-300 rounded border-2 border-gray-400 flex items-center justify-center font-bold text-gray-500 text-xs"
                            >
                                ?
                            </div>
                        </div>
                    </div>

                    <!-- Scenario 2: Fail -->
                    <div class="space-y-2">
                        <span class="text-xs font-bold uppercase text-gray-400"
                            >2. Game Over (Not Ascending)</span
                        >
                        <div
                            class="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl border border-gray-200 relative overflow-hidden"
                        >
                            <!-- 24 -->
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                24
                            </div>
                            <!-- 61 -->
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                61
                            </div>
                            <!-- 52 (FAIL) -->
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm relative"
                            >
                                52
                                <div
                                    class="absolute inset-0 border-4 border-black/20 rounded"
                                ></div>
                            </div>
                            <!-- Rest -->
                            <div
                                class="w-10 h-14 bg-gray-300 rounded border-2 border-gray-400 flex items-center justify-center font-bold text-gray-500 text-xs"
                            >
                                ?
                            </div>

                            <!-- X Mark Overlay -->
                            <div
                                class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20"
                            >
                                <X size={64} class="text-black" />
                            </div>
                        </div>
                    </div>

                    <!-- Scenario 3: Win -->
                    <div class="space-y-2">
                        <span class="text-xs font-bold uppercase text-gray-400"
                            >3. Victory!</span
                        >
                        <div
                            class="flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-xl border border-gray-200"
                        >
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                10
                            </div>
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                25
                            </div>
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                45
                            </div>
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                80
                            </div>
                            <div
                                class="w-10 h-14 bg-white rounded border-2 border-black flex items-center justify-center font-black text-lg shadow-sm"
                            >
                                99
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- The Catch -->
            <div class="space-y-4">
                <div class="flex items-center gap-3">
                    <div class="bg-black text-white p-2 rounded-lg">
                        <MessageSquareOff size={24} />
                    </div>
                    <h3 class="text-xl font-bold uppercase">The Catch</h3>
                </div>
                <ul class="space-y-3 font-medium text-gray-600">
                    <li class="flex items-start gap-3">
                        <EyeOff class="shrink-0 mt-1" size={18} />
                        <span
                            >You <strong class="text-black">cannot see</strong> anyone
                            else's cards.</span
                        >
                    </li>
                    <li class="flex items-start gap-3">
                        <MessageSquareOff class="shrink-0 mt-1" size={18} />
                        <span
                            >You <strong class="text-black">cannot talk</strong>
                            about your numbers.</span
                        >
                    </li>
                </ul>
            </div>

            <!-- Topic Mechanic -->
            <div
                class="bg-black p-4 text-white space-y-2 relative overflow-hidden border-4 border-black shadow-[4px_4px_0px_0px_#000000]"
            >
                <div class="absolute top-0 right-0 p-4 opacity-20">
                    <MessageSquareOff size={100} />
                </div>
                <h3
                    class="font-bold font-mono uppercase text-lg relative z-10 text-primary-yellow"
                >
                    Use The Topic!
                </h3>
                <p class="text-sm text-gray-300 relative z-10 font-mono">
                    Between levels, you can discuss the <span
                        class="text-primary-yellow font-bold underline decoration-2"
                        >Current Topic</span
                    > to get a sense of each other’s scale.
                </p>
                <div
                    class="mt-3 p-3 bg-white text-black border-2 border-white text-xs font-mono font-bold relative z-10 italic"
                >
                    "If the topic is 'Animals (Size)' and I have a Mouse, that's
                    small (low number). An Elephant is big (high number)!"
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="p-6 border-t-4 border-black bg-gray-50">
            <button
                onclick={() => dispatch("close")}
                class="w-full py-3 bg-primary-blue text-white font-mono font-bold text-xl border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_#000000] transition-all"
            >
                GOT IT
            </button>
        </div>
    </div>
</div>
