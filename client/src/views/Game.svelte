<script lang="ts">
    import Board from "../components/Board.svelte";
    import Hand from "../components/Hand.svelte";
    import Result from "./Result.svelte";
    import PlayerList from "../components/PlayerList.svelte";
    import { gameState } from "../lib/stores/gameState";
    import { socketStore } from "../lib/stores/socket";

    // Hand collapse state — persisted per tab (matches game_session in sessionStorage).
    let handCollapsed = $state(
        typeof sessionStorage !== "undefined" &&
            sessionStorage.getItem("hand_collapsed") === "1",
    );
    $effect(() => {
        sessionStorage.setItem("hand_collapsed", handCollapsed ? "1" : "0");
    });
</script>

<div class="min-h-screen bg-primary-yellow text-black relative overflow-hidden">
    <!-- Decoration Background -->
    <div
        class="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style="background-image: radial-gradient(#000 2px, transparent 2px); background-size: 20px 20px;"
    ></div>
    {#if $gameState.gameState === "ROUND_END" || $gameState.gameState === "GAME_COMPLETE"}
        <Result
            result={$gameState.roundResult || "WIN"}
            finalBoard={$gameState.board}
            topic={$gameState.topic}
            level={$gameState.lastRoundLevel}
            playerCount={$gameState.players.length}
            gameComplete={$gameState.gameState === "GAME_COMPLETE"}
        />
    {:else}
        <PlayerList />

        <!-- Header info -->
        <div
            class="absolute top-0 left-0 right-0 p-4 flex justify-end items-center z-10 pointers-events-none"
        >
            <div class="flex gap-4 items-center pointer-events-auto">
                {#if $gameState.players.find((p) => p.id === $gameState.playerId)?.isHost}
                    {@const allCardsPlaced = $gameState.players.every(
                        (p) => (p.cardCount ?? 0) === 0,
                    )}
                    <button
                        onclick={() =>
                            socketStore.sendMessage({
                                type: "REVEAL_NEXT",
                                payload: null,
                            })}
                        disabled={!allCardsPlaced}
                        class="px-6 py-2 bg-black text-white font-mono font-bold uppercase border-4 border-black hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#fff] transition-all shadow-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                        title={!allCardsPlaced
                            ? "Wait for all players to place cards"
                            : "Reveal next card"}
                    >
                        Reveal Next
                    </button>
                {/if}

                <div
                    class="px-4 py-2 border-4 border-black font-mono font-bold bg-white text-black uppercase shadow-[4px_4px_0px_0px_#000000]"
                >
                    Level {$gameState.level}
                </div>
            </div>
        </div>

        <!-- Main Content Container with padding for header -->
        <!-- Bottom padding clears the fixed Hand; shrinks when the hand is collapsed. -->
        <div
            class="w-full h-screen pt-20 flex flex-col items-center overflow-y-auto transition-[padding] duration-300"
            class:pb-64={!handCollapsed}
            class:pb-20={handCollapsed}
        >
            <!-- Topic Display -->
            {#if $gameState.topic}
                <div
                    class="flex flex-col items-center justify-center p-6 pointer-events-none mb-8 relative z-10"
                >
                    <div
                        class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000000] rotate-1 min-w-[18rem]"
                    >
                        <h1
                            class="text-2xl md:text-4xl font-black text-center font-mono uppercase leading-tight max-w-4xl"
                        >
                            {$gameState.topic.text}
                        </h1>
                        <div
                            class="flex flex-wrap justify-between gap-6 mt-4 text-xs font-bold font-mono text-black uppercase border-t-4 border-black pt-2"
                        >
                            <span>1 = {$gameState.topic.minRange}</span>
                            <span>100 = {$gameState.topic.maxRange}</span>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Game Area -->
            <Board />
        </div>

        <!-- Player Hand -->
        <Hand bind:collapsed={handCollapsed} />
    {/if}
</div>
