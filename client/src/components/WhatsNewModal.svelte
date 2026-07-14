<script lang="ts">
    import Button from "./UI/Button.svelte";
    import { onMount } from "svelte";

    export let isOpen = false;
    export let onClose: () => void;

    const CURRENT_VERSION = "2.1"; // Bumped for UX/UI polish

    const PATCH_NOTES = [
        {
            version: "2.1",
            date: "2026-07-14",
            title: "UX / UI Polish",
            features: [
                "<b>Clearer Ordering:</b> Cards now fill the board left-to-right with a LOW → HIGH guide, so the ascending order is easy to follow even with lots of cards.",
                "<b>Drop Preview:</b> A dashed slot shows exactly where your card will land as you drag it onto the board.",
                "<b>Collapsible Hand:</b> Hide your hand with one tap to free up more of the board.",
                "<b>Mobile-Friendly:</b> Cards and the topic panel now resize to fit phones and tablets.",
                "<b>Readable Topics:</b> Short topics no longer squish the 1 / 100 scale labels together.",
            ],
        },
        {
            version: "1.3",
            date: "2025-01-25",
            title: "Content Update",
            features: [
                "<b>Pack Selection:</b> Hosts can now browse and select Official Packs directly in the lobby!",
                "<b>Lobby Upgrade:</b> Improved UI for managing game settings.",
            ],
        },
        {
            version: "1.2",
            date: "2025-01-20",
            title: "Democracy Update",
            features: [
                "<b>Voting System:</b> Decide together! Vote to RETRY the current level or proceed to the NEXT LEVEL.",
                "<b>Tie-Breaker:</b> In case of a split vote, the Host has the final say.",
                "<b>Host Kick:</b> Hosts can now remove players from the lobby.",
            ],
        },
        {
            version: "1.1",
            date: "2025-01-15",
            title: "Quality of Life",
            features: [
                "<b>Ghost Mode:</b> Toggle card visibility for better streaming/casting experience.",
                "<b>Bug Fixes:</b> Smoother gameplay and reliable reconnections.",
            ],
        },
    ];

    function handleClose() {
        localStorage.setItem("seen_patch_version", CURRENT_VERSION);
        onClose();
    }
</script>

{#if isOpen}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onclick={handleClose}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === "Escape" && handleClose()}
        ></div>

        <!-- Modal -->
        <div
            class="relative bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200"
        >
            <!-- Header -->
            <div
                class="bg-primary-yellow border-b-4 border-black p-4 flex justify-between items-center"
            >
                <h2 class="text-2xl font-black font-mono uppercase">
                    WHAT'S NEW
                </h2>
                <button
                    class="font-black hover:opacity-50 text-xl px-2"
                    onclick={handleClose}>✕</button
                >
            </div>

            <!-- Content -->
            <div class="p-6 overflow-y-auto flex-1 flex flex-col gap-8">
                {#each PATCH_NOTES as note}
                    <div class="flex flex-col gap-2">
                        <div
                            class="flex items-baseline justify-between border-b-2 border-black/10 pb-1"
                        >
                            <h3 class="text-xl font-bold uppercase">
                                {note.title}
                            </h3>
                            <span class="font-mono text-sm text-gray-500"
                                >v{note.version}</span
                            >
                        </div>
                        <ul class="list-disc list-inside space-y-2">
                            {#each note.features as feature}
                                <li class="text-sm font-medium pl-2">
                                    {@html feature}
                                </li>
                            {/each}
                        </ul>
                    </div>
                {/each}
            </div>

            <!-- Footer -->
            <div class="p-4 border-t-4 border-black bg-gray-50">
                <Button fullWidth onclick={handleClose}>AWESOME!</Button>
            </div>
        </div>
    </div>
{/if}
