<script lang="ts">
    import { ArrowLeft, RefreshCcw } from "lucide-svelte";
    import { onMount } from "svelte";
    import { authStore } from "../lib/stores/auth";

    export let onBack: () => void;

    let historyLogs: any[] = [];
    let isLoading = true;

    onMount(async () => {
        await fetchHistory();
    });

    async function fetchHistory() {
        isLoading = true;
        try {
            const res = await fetch("/api/admin/history", {});
            if (res.ok) {
                const logs = await res.json();
                historyLogs = groupLogs(logs);
            }
        } catch (e) {
            console.error(e);
        } finally {
            isLoading = false;
        }
    }

    function groupLogs(logs: any[]) {
        const sessions = new Map();
        for (const log of logs) {
            if (!sessions.has(log.session_id)) {
                sessions.set(log.session_id, {
                    roomCode: log.room_code,
                    packName: log.pack_name,
                    startedAt: log.created_at,
                    rounds: [],
                });
            }
            const session = sessions.get(log.session_id);
            session.rounds.push({
                level: log.level,
                result: log.result,
                players: JSON.parse(log.players_snapshot || "[]"),
                time: log.created_at,
            });
        }
        return Array.from(sessions.values());
    }
</script>

<div class="w-full max-w-6xl mx-auto pb-12 text-black p-4">
    <!-- Header -->
    <div
        class="flex items-center justify-between border-b-4 border-black pb-4 mb-8"
    >
        <h1
            class="text-4xl font-black uppercase tracking-widest flex items-center gap-4"
        >
            <button
                onclick={onBack}
                class="hover:underline flex items-center gap-2"
            >
                <ArrowLeft size={32} /> GAME HISTORY
            </button>
        </h1>
        <button
            onclick={fetchHistory}
            class="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_#000000] active:translate-y-px active:shadow-none bg-white"
            title="Refresh History"
        >
            <RefreshCcw size={20} class={isLoading ? "animate-spin" : ""} />
        </button>
    </div>

    {#if isLoading}
        <div class="text-center py-12 font-mono text-xl animate-pulse">
            Loading History...
        </div>
    {:else}
        <div class="flex flex-col gap-6">
            {#each historyLogs as session}
                <div
                    class="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] p-6"
                >
                    <div
                        class="flex justify-between items-start mb-4 border-b-2 border-black pb-2"
                    >
                        <div>
                            <h3 class="text-2xl font-black uppercase">
                                Room: {session.roomCode}
                            </h3>
                            <p class="font-mono text-sm text-gray-500">
                                Pack: {session.packName} • {new Date(
                                    session.startedAt * 1000,
                                ).toLocaleDateString()}
                            </p>
                        </div>
                        <!-- Show Players of last round -->
                        <div class="flex flex-wrap gap-2 justify-end max-w-md">
                            {#each session.rounds[0].players as p}
                                <span
                                    class="px-2 py-0.5 border border-black text-xs bg-gray-100"
                                    >{p}</span
                                >
                            {/each}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 gap-2">
                        {#each session.rounds as round}
                            <div
                                class="flex items-center gap-4 p-2 hover:bg-gray-50 border-b border-gray-200 last:border-0"
                            >
                                <span class="font-mono font-bold w-24"
                                    >Level {round.level}</span
                                >
                                <span
                                    class="px-2 py-1 text-xs font-bold border-2 border-black min-w-[80px] text-center
                                    {round.result === 'WIN'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-primary-red text-white'}"
                                >
                                    {round.result}
                                </span>
                                <span class="font-mono text-xs text-gray-400">
                                    {new Date(
                                        round.time * 1000,
                                    ).toLocaleTimeString()}
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
            {#if historyLogs.length === 0}
                <div class="text-center font-mono text-gray-400 py-12">
                    No history logs found.
                </div>
            {/if}
        </div>
    {/if}
</div>
