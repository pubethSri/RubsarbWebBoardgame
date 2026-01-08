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

    function getPlayerColor(playerId: string) {
        return (
            $gameState.players.find((p) => p.id === playerId)?.color || "#000"
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
        socketStore.disconnect();
    }

    import Button from "../components/UI/Button.svelte";
</script>

<div
    class="min-h-screen w-full flex flex-col items-center justify-center p-8 gap-8 font-sans relative overflow-hidden"
    class:bg-white={result === "WIN"}
    class:bg-black={result === "LOSS"}
    class:text-white={result === "LOSS"}
    class:text-black={result === "WIN"}
>
    <!-- Background Pattern -->
    <div
        class="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style="background-image: radial-gradient(currentColor 2px, transparent 2px); background-size: 20px 20px;"
    ></div>

    <!-- Header -->
    <div class="text-center z-10 relative">
        {#if playerCount < 2}
            <h1
                class="text-4xl md:text-6xl font-black font-mono uppercase mb-4 bg-white text-black border-4 border-black p-4 shadow-[8px_8px_0px_0px_#000000] rotate-2"
            >
                SESSION ENDED
            </h1>
            <p
                class="text-xl font-bold font-mono bg-black text-white inline-block px-2"
            >
                Everyone left...
            </p>
        {:else if result === "WIN"}
            <div class="relative">
                <h1
                    class="text-6xl md:text-8xl font-black font-mono uppercase mb-2 text-primary-blue drop-shadow-[4px_4px_0px_#000000]"
                >
                    VICTORY!
                </h1>
                <p
                    class="text-3xl font-black uppercase tracking-widest bg-black text-white inline-block px-4 py-1 border-4 border-white rotate-[-2deg]"
                >
                    Level {level} Complete
                </p>
            </div>
        {:else}
            <div class="relative">
                <h1
                    class="text-6xl md:text-8xl font-black font-mono uppercase mb-2 text-primary-red drop-shadow-[4px_4px_0px_#ffffff]"
                >
                    FAILED
                </h1>
                <p
                    class="text-2xl font-bold font-mono uppercase bg-white text-black inline-block px-4 py-1 border-4 border-white"
                >
                    Try Level {level} Again?
                </p>
            </div>
        {/if}
    </div>

    <!-- Topic Display -->
    {#if topic}
        <div class="flex flex-col items-center gap-2 z-10">
            <div
                class="bg-white px-6 py-3 border-4 border-black shadow-[4px_4px_0px_0px_#000000]"
                class:shadow-[4px_4px_0px_0px_#ffffff]={result === "LOSS"}
                class:border-white={result === "LOSS"}
                class:text-black={result === "LOSS"}
            >
                Topic: <span class="font-bold font-mono uppercase"
                    >{topic.text}</span
                >
            </div>
        </div>
    {/if}

    <!-- Cards Display (All Revealed) -->
    <div
        class="flex flex-wrap gap-4 justify-center items-center max-w-4xl z-10"
        in:fly={{ y: 50, duration: 800, delay: 300 }}
    >
        {#each finalBoard as card}
            <!-- Mini Card Display -->
            <div class="flex flex-col items-center group">
                <div
                    class="w-16 h-24 border-2 border-black flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_#000000] transition-transform group-hover:-translate-y-1"
                >
                    <span class="text-xl font-mono font-bold text-black"
                        >{card.value}</span
                    >
                </div>
                {#if card.note}
                    <span
                        class="text-[10px] font-bold mt-1 max-w-[4rem] truncate bg-primary-yellow text-black px-1 border border-black"
                        >{card.note}</span
                    >
                {/if}
                <span
                    class="text-[10px] font-bold mt-1 text-white px-2 border border-black shadow-[2px_2px_0px_0px_#000000]"
                    class:border-white={result === "LOSS"}
                    style="background-color: {getPlayerColor(card.playerId)}"
                >
                    {getPlayerName(card.playerId)}
                </span>
            </div>
        {/each}
    </div>

    <!-- Actions -->
    <div class="flex flex-col items-center gap-6 w-full max-w-2xl z-10 mt-8">
        {#if playerCount < 2}
            <div class="w-72">
                <Button
                    size="lg"
                    fullWidth
                    variant="secondary"
                    onclick={leaveRoom}
                >
                    EXIT
                </Button>
            </div>
        {:else if result === "WIN"}
            {@const myId = $gameState.playerId || ""}
            {@const myVote = $gameState.votes[myId]}
            {@const hasVoted = !!myVote}

            <div class="flex flex-row gap-8 w-full justify-center">
                <!-- RETRY SECTION -->
                <div class="flex flex-col gap-2 flex-1 max-w-xs">
                    <Button
                        size="lg"
                        fullWidth
                        variant="secondary"
                        onclick={() =>
                            socketStore.sendMessage({
                                type: "VOTE",
                                payload: { vote: "RETRY" },
                            })}
                        class={myVote === "RETRY"
                            ? "ring-4 ring-black ring-offset-2 scale-105"
                            : hasVoted
                              ? "opacity-50 hover:opacity-100 transition-opacity"
                              : ""}
                    >
                        RETRY LEVEL {level}
                    </Button>

                    <!-- Voter Avatars -->
                    <div
                        class="flex flex-wrap gap-2 min-h-[2rem] p-2 bg-black/20 rounded-lg border-2 border-black/10"
                    >
                        {#each $gameState.players.filter((p) => $gameState.votes[p.id] === "RETRY") as p}
                            <div
                                class="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative"
                                style="background-color: {p.color}"
                                title={p.name}
                            >
                                {p.name.slice(0, 2).toUpperCase()}
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- NEXT SECTION -->
                <div class="flex flex-col gap-2 flex-1 max-w-xs">
                    <Button
                        size="lg"
                        fullWidth
                        variant="primary"
                        onclick={() =>
                            socketStore.sendMessage({
                                type: "VOTE",
                                payload: { vote: "NEXT" },
                            })}
                        class={myVote === "NEXT"
                            ? "ring-4 ring-black ring-offset-2 scale-105"
                            : hasVoted
                              ? "opacity-50 hover:opacity-100 transition-opacity"
                              : ""}
                    >
                        NEXT LEVEL {level + 1}
                    </Button>

                    <!-- Voter Avatars -->
                    <div
                        class="flex flex-wrap gap-2 min-h-[2rem] p-2 bg-black/20 rounded-lg border-2 border-black/10"
                    >
                        {#each $gameState.players.filter((p) => $gameState.votes[p.id] === "NEXT") as p}
                            <div
                                class="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-white overflow-hidden relative"
                                style="background-color: {p.color}"
                                title={p.name}
                            >
                                {p.name.slice(0, 2).toUpperCase()}
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            {#if hasVoted}
                <div
                    class="text-black font-bold font-mono bg-white px-4 py-2 border-2 border-black animate-pulse"
                >
                    WAITING FOR OTHERS...
                </div>
            {/if}
        {:else}
            <!-- LOSS: Simple Ready to Retry -->
            <div class="w-full max-w-sm flex flex-col gap-4">
                <Button
                    size="lg"
                    fullWidth
                    variant="secondary"
                    onclick={sendReady}
                    disabled={isReady}
                >
                    {#if isReady}
                        WAITING... ({readyCount}/{playerCount})
                    {:else}
                        RETRY LEVEL {level}
                    {/if}
                </Button>
            </div>
        {/if}

        <Button
            variant="ghost"
            class={result === "LOSS"
                ? "text-white hover:bg-white/10 hover:border-white border-white w-48"
                : "w-48"}
            onclick={leaveRoom}
        >
            LEAVE ROOM
        </Button>
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
</style>
