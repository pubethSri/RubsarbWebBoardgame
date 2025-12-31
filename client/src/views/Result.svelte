<script lang="ts">
    import type { Card, Topic } from "../lib/types";
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";

    interface Props {
        result: "WIN" | "LOSS";
        finalBoard: Card[];
        topic: Topic | null;
        level: number;
        readyCount: number;
        playerCount: number;
    }

    let { result, finalBoard, topic, level, readyCount, playerCount }: Props =
        $props();

    let isReady = $state(false);

    function getPlayerName(playerId: string) {
        return (
            $gameState.players.find((p) => p.id === playerId)?.name || "Unknown"
        );
    }

    function sendReady() {
        if (!isReady) {
            isReady = true;
            socketStore.sendMessage({ type: "PLAYER_READY", payload: null });
        }
    }

    import { scale, fly } from "svelte/transition";
    import { elasticOut } from "svelte/easing";

    function leaveRoom() {
        socketStore.sendMessage({ type: "LEAVE_ROOM", payload: null });
        gameState.leaveRoom();
    }
</script>

<div
    class="h-full w-full flex flex-col items-center justify-center p-8 gap-8 bg-white text-black font-sans"
>
    <!-- Header -->
    <div class="text-center">
        {#if playerCount < 2}
            <h1 class="text-6xl font-bold mb-2">SESSION ENDED</h1>
            <p class="text-xl text-gray-600">
                Everyone left... You are the only one remaining.
            </p>
        {:else if result === "WIN"}
            <h1 class="text-6xl font-bold mb-2">ROUND CLEARED!</h1>
            <p class="text-xl text-gray-600">Level {level} Complete</p>
        {:else}
            <h1 class="text-6xl font-bold mb-2">FAILED</h1>
            <p class="text-xl text-gray-600">
                Would you like to try Level {level} again?
            </p>
        {/if}
    </div>

    <!-- Topic Display -->
    {#if topic}
        <div class="flex flex-col items-center gap-2">
            <div
                class="bg-gray-100 px-6 py-3 rounded-full text-lg border border-gray-300"
            >
                Topic: <span class="font-bold">{topic.text}</span>
            </div>
            <div
                class="text-xs font-bold font-mono text-gray-500 uppercase tracking-widest flex gap-8"
            >
                <span>1 = {topic.minRange}</span>
                <span>100 = {topic.maxRange}</span>
            </div>
        </div>
    {/if}

    <!-- Cards Display (All Revealed) -->
    <div
        class="flex flex-wrap gap-4 justify-center items-center max-w-4xl"
        in:fly={{ y: 50, duration: 800, delay: 300 }}
    >
        {#each finalBoard as card}
            <!-- Mini Card Display -->
            <div class="flex flex-col items-center">
                <div
                    class="w-16 h-24 border-2 border-black rounded-lg flex items-center justify-center bg-white shadow-md"
                >
                    <span class="text-xl font-bold text-black"
                        >{card.value}</span
                    >
                </div>
                {#if card.note}
                    <span
                        class="text-[10px] text-gray-500 mt-1 max-w-[4rem] truncate"
                        >{card.note}</span
                    >
                {/if}
                <span
                    class="text-[10px] font-bold mt-1 bg-gray-200 px-2 rounded-full"
                >
                    {getPlayerName(card.playerId)}
                </span>
            </div>
        {/each}
    </div>

    <!-- Actions -->
    <div class="flex flex-col gap-4 mt-8 w-64">
        <button
            class="w-full py-3 text-lg font-bold border-2 border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
            class:bg-black={playerCount < 2 || !isReady}
            class:text-white={playerCount < 2 || !isReady}
            class:bg-gray-200={playerCount >= 2 && isReady}
            class:text-gray-500={playerCount >= 2 && isReady}
            onclick={playerCount < 2 ? leaveRoom : sendReady}
            disabled={isReady && playerCount >= 2}
        >
            {#if playerCount < 2}
                RETURN TO MAIN MENU
            {:else if isReady}
                WAITING... ({readyCount}/{playerCount})
            {:else if result === "WIN"}
                READY FOR LEVEL {level + 1}
            {:else}
                RETRY LEVEL {level}
            {/if}
        </button>

        <button
            class="w-full py-2 text-sm font-bold text-gray-500 hover:text-black underline"
            onclick={leaveRoom}
        >
            LEAVE ROOM
        </button>
    </div>
</div>

<style>
    @keyframes shake {
        0%,
        100% {
            transform: translateX(0);
        }
        10%,
        30%,
        50%,
        70%,
        90% {
            transform: translateX(-4px);
        }
        20%,
        40%,
        60%,
        80% {
            transform: translateX(4px);
        }
    }
    .shake {
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
    }
</style>
