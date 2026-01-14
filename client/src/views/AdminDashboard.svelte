<script lang="ts">
    import {
        ArrowLeft,
        Box,
        BarChart3,
        Settings,
        LogOut,
        RefreshCcw,
        History,
    } from "lucide-svelte"; // Added History
    import { authStore, logout } from "../lib/stores/auth";
    import { onMount } from "svelte";
    import ManagePacks from "./ManagePacks.svelte";
    import HistoryView from "./HistoryView.svelte";

    export let onBack: () => void;

    let currentView: "DASHBOARD" | "PACKS" | "HISTORY" = "DASHBOARD";
    let stats: any = null;
    let isLoading = true;

    onMount(async () => {
        if (
            !$authStore ||
            ($authStore.role !== "ADMIN" && $authStore.role !== "CREATOR")
        ) {
            onBack();
            return;
        }
        // Stats might be Admin only? Let's check API.
        // But for now let's try to fetch stats, if it fails fine.
        await fetchStats();
    });

    async function fetchStats() {
        isLoading = true;
        try {
            const res = await fetch("/api/admin/stats", {
                headers: { "x-auth-token": $authStore?.token || "" },
            });
            if (res.ok) {
                stats = await res.json();
            }
        } catch (e) {
            console.error(e);
        } finally {
            isLoading = false;
        }
    }

    function handleLogout() {
        logout(); // Call exported function
        onBack();
    }
</script>

{#if currentView === "PACKS"}
    <ManagePacks onBack={() => (currentView = "DASHBOARD")} />
{:else if currentView === "HISTORY"}
    <HistoryView onBack={() => (currentView = "DASHBOARD")} />
{:else}
    <div
        class="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-12 text-black p-4"
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between border-b-4 border-black pb-4"
        >
            <h1
                class="text-4xl font-black uppercase tracking-widest flex items-center gap-4"
            >
                <div class="bg-black text-white p-2">
                    <BarChart3 size={32} />
                </div>
                Dashboard ({$authStore?.role})
            </h1>
            <div class="flex items-center gap-4">
                <button
                    onclick={fetchStats}
                    class="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0px_0px_#000000] active:translate-y-px active:shadow-none bg-white"
                    title="Refresh Data"
                >
                    <RefreshCcw
                        size={20}
                        class={isLoading ? "animate-spin" : ""}
                    />
                </button>
                <button
                    onclick={handleLogout}
                    class="flex items-center gap-2 p-2 px-4 border-2 border-black hover:bg-black hover:text-white transition-colors font-bold uppercase shadow-[4px_4px_0px_0px_#000000] active:translate-y-px active:shadow-none"
                >
                    <LogOut size={20} /> Logout
                </button>
            </div>
        </div>

        {#if isLoading}
            <div class="text-center py-12 font-mono text-xl animate-pulse">
                Loading Stats...
            </div>
        {:else if stats}
            <!-- Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Active Rooms -->
                <div
                    class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000000]"
                >
                    <h3
                        class="font-mono font-bold uppercase text-gray-500 mb-2"
                    >
                        Active Rooms
                    </h3>
                    <p class="text-6xl font-black">{stats.roomCount}</p>
                </div>
                <!-- Total Players -->
                <div
                    class="bg-primary-yellow border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000000]"
                >
                    <h3
                        class="font-mono font-bold uppercase text-black/60 mb-2"
                    >
                        Total Players
                    </h3>
                    <p class="text-6xl font-black">{stats.playerCount}</p>
                </div>
                <!-- Games Playing -->
                <div
                    class="bg-primary-blue text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#000000]"
                >
                    <h3
                        class="font-mono font-bold uppercase text-white/60 mb-2"
                    >
                        In Game
                    </h3>
                    <p class="text-6xl font-black">{stats.playingRooms}</p>
                </div>
            </div>

            <!-- Active Rooms Details -->
            <div
                class="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000]"
            >
                <div
                    class="p-4 bg-gray-100 border-b-4 border-black flex justify-between items-center"
                >
                    <h2 class="text-xl font-black uppercase">
                        Active Rooms ({stats.rooms?.length || 0})
                    </h2>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr
                                class="bg-black text-white uppercase text-xs tracking-wider font-mono"
                            >
                                <th class="p-4 font-bold">Code</th>
                                <th class="p-4 font-bold">State</th>
                                <th class="p-4 font-bold">Pack</th>
                                <th class="p-4 font-bold">Players</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#if stats.rooms}
                                {#each stats.rooms as room}
                                    <tr
                                        class="border-b-2 border-black font-mono text-sm last:border-b-0 hover:bg-yellow-50 transition-colors"
                                    >
                                        <td class="p-4 font-bold text-lg"
                                            >{room.code}</td
                                        >
                                        <td class="p-4">
                                            <span
                                                class="px-2 py-1 text-xs font-bold border-2 border-black shadow-[2px_2px_0px_0px_#000000]
                                                {room.gameState === 'PLAYING'
                                                    ? 'bg-primary-red text-white'
                                                    : 'bg-primary-yellow text-black'}"
                                            >
                                                {room.gameState}
                                            </span>
                                        </td>
                                        <td
                                            class="p-4 uppercase font-bold text-gray-700"
                                            >{room.packName}</td
                                        >
                                        <td class="p-4">
                                            <div class="flex flex-wrap gap-2">
                                                {#each room.players as p}
                                                    <span
                                                        class="px-2 py-0.5 border border-black text-xs bg-white flex items-center gap-1
                                                        {p.isHost
                                                            ? 'ring-2 ring-primary-yellow ring-offset-1'
                                                            : ''}
                                                        {!p.isConnected
                                                            ? 'opacity-50 line-through'
                                                            : ''}"
                                                    >
                                                        {p.name}
                                                        {#if p.isHost}
                                                            <span
                                                                class="text-[10px] text-yellow-600"
                                                                >👑</span
                                                            >
                                                        {/if}
                                                    </span>
                                                {/each}
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            {/if}
                            {#if !stats.rooms || stats.rooms.length === 0}
                                <tr>
                                    <td
                                        colspan="4"
                                        class="p-8 text-center text-gray-400 font-bold"
                                        >No Active Rooms</td
                                    >
                                </tr>
                            {/if}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Pack Manager Button -->
                <button
                    onclick={() => (currentView = "PACKS")}
                    class="group flex flex-col items-center justify-center gap-4 p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#000000] transition-all"
                >
                    <Box
                        size={48}
                        class="group-hover:scale-110 transition-transform"
                    />
                    <div class="text-center">
                        <h2 class="text-2xl font-black uppercase">
                            Pack Manager
                        </h2>
                        <p class="font-mono text-sm text-gray-500">
                            Manage Cards, Topics, and UGC
                        </p>
                    </div>
                </button>

                <!-- History Button -->
                <button
                    onclick={() => (currentView = "HISTORY")}
                    class="group flex flex-col items-center justify-center gap-4 p-8 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] hover:translate-y-1 hover:shadow-[4px_4px_0px_0px_#000000] transition-all"
                >
                    <History
                        size={48}
                        class="group-hover:scale-110 transition-transform"
                    />
                    <div class="text-center">
                        <h2 class="text-2xl font-black uppercase">
                            Game History
                        </h2>
                        <p class="font-mono text-sm text-gray-500">
                            View past game logs and results
                        </p>
                    </div>
                </button>
            </div>
        {:else}
            <div class="text-center py-12 font-mono text-xl text-red-500">
                Failed to load stats.
            </div>
        {/if}
    </div>
{/if}
