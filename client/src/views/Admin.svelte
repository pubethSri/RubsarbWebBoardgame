<script lang="ts">
    import { ArrowLeft, Trash2, ShieldAlert } from "lucide-svelte";
    import { slide } from "svelte/transition";
    import { authStore } from "../lib/stores/auth";
    import { onMount } from "svelte";

    export let onBack: () => void;

    let isLoading = true;
    let errorMsg = "";
    let packs: any[] = [];
    let selectedPack: any = null;
    let selectedTopics: any[] = [];
    let showModal = false;

    const APP_VERSION = "0.6.0"; // Local Auth Update

    onMount(async () => {
        if (!$authStore || $authStore.role !== "ADMIN") {
            errorMsg = "Access Denied";
            isLoading = false;
            return;
        }
        await fetchPacks();
    });

    async function fetchPacks() {
        isLoading = true;
        try {
            // @ts-ignore
            const res = await fetch("/api/admin/packs", {
                headers: { "x-auth-token": $authStore.token },
            });

            if (res.ok) {
                packs = await res.json();
            } else {
                errorMsg = "Failed to load packs";
            }
        } catch (e) {
            errorMsg = "Connection Failed";
        } finally {
            isLoading = false;
        }
    }

    async function deletePack(id: string) {
        if (!confirm("Are you sure? This cannot be undone.")) return;

        try {
            const res = await fetch(`/api/admin/packs/${id}`, {
                method: "DELETE",
                headers: { "x-auth-token": $authStore!.token },
            });

            if (res.ok) {
                packs = packs.filter((p) => p.id !== id);
            } else {
                alert("Failed to delete pack");
            }
        } catch (e) {
            alert("Network Error");
        }
    }

    async function viewTopics(pack: any) {
        selectedPack = pack;
        try {
            const res = await fetch(`/api/admin/packs/${pack.id}/topics`, {
                headers: { "x-auth-token": $authStore!.token },
            });
            if (res.ok) {
                selectedTopics = await res.json();
                showModal = true;
            } else {
                alert("Failed to fetch topics");
            }
        } catch (e) {
            alert("Network Error");
        }
    }

    function closeModal() {
        showModal = false;
        selectedPack = null;
        selectedTopics = [];
    }

    function formatDate(unix: number) {
        return (
            new Date(unix * 1000).toLocaleDateString() +
            " " +
            new Date(unix * 1000).toLocaleTimeString()
        );
    }
</script>

<div
    class="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-12 text-black relative"
>
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <button
                onclick={onBack}
                class="p-2 border-2 border-black bg-white rounded hover:bg-gray-100 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <h1
                class="text-3xl font-black uppercase tracking-widest flex items-center gap-2"
            >
                <ShieldAlert size={32} /> Admin
            </h1>
        </div>
        <div class="font-mono text-xs opacity-50">v{APP_VERSION}</div>
    </div>

    {#if errorMsg}
        <div
            class="flex flex-col gap-4 p-8 bg-black text-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md mx-auto mt-12 w-full text-center"
        >
            <h2 class="text-xl font-bold uppercase text-white">
                Restricted Access
            </h2>
            <p class="text-gray-300 font-bold">{errorMsg}</p>
        </div>
    {:else}
        <div
            class="bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        >
            <div
                class="p-4 bg-gray-50 border-b-2 border-black flex justify-between items-center"
            >
                <span class="font-bold">Total Packs: {packs.length}</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr
                            class="bg-black text-white uppercase text-xs tracking-wider"
                        >
                            <th class="p-4 font-bold">Pack Name</th>
                            <th class="p-4 font-bold">Code</th>
                            <th class="p-4 font-bold">Author</th>
                            <th class="p-4 font-bold text-center">Topics</th>
                            <th class="p-4 font-bold text-center">Type</th>
                            <th class="p-4 font-bold text-right">Created</th>
                            <th class="p-4 font-bold text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each packs as pack (pack.id)}
                            <tr
                                class="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                <td class="p-4 font-bold">{pack.name}</td>
                                <td class="p-4 font-mono font-bold text-black"
                                    >{pack.share_code || "-"}</td
                                >
                                <td class="p-4 font-mono text-sm"
                                    >{pack.author}</td
                                >
                                <td class="p-4 text-center"
                                    >{pack.topic_count}</td
                                >
                                <td class="p-4 text-center">
                                    {#if pack.is_official}
                                        <span
                                            class="bg-black text-white px-2 py-1 rounded text-[10px] font-bold"
                                            >OFFICIAL</span
                                        >
                                    {:else}
                                        <span
                                            class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-bold"
                                            >UGC</span
                                        >
                                    {/if}
                                </td>
                                <td
                                    class="p-4 text-right font-mono text-xs text-gray-500"
                                    >{formatDate(pack.created_at)}</td
                                >
                                <td
                                    class="p-4 text-center flex justify-center gap-2"
                                >
                                    <button
                                        onclick={() => viewTopics(pack)}
                                        class="px-2 py-1 text-xs border border-black rounded hover:bg-black hover:text-white transition-colors"
                                    >
                                        View
                                    </button>
                                    {#if !pack.is_official}
                                        <button
                                            onclick={() => deletePack(pack.id)}
                                            class="p-1 text-black hover:bg-gray-200 rounded border border-transparent hover:border-black transition-all"
                                            title="Delete Pack"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                        {#if packs.length === 0}
                            <tr>
                                <td
                                    colspan="6"
                                    class="p-8 text-center text-gray-400 font-bold"
                                    >No Packs Found</td
                                >
                            </tr>
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}

    {#if showModal}
        <div
            class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            transition:slide
        >
            <div
                class="bg-white border-4 border-black rounded-xl p-6 w-full max-w-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-[80vh] flex flex-col"
            >
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h2 class="text-2xl font-black uppercase">
                            {selectedPack?.name}
                        </h2>
                        <p class="text-gray-500 font-mono text-sm">
                            by {selectedPack?.author}
                        </p>
                    </div>
                    <button
                        onclick={closeModal}
                        class="p-1 hover:bg-gray-100 rounded border-2 border-transparent hover:border-black transition-all"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                <div
                    class="overflow-y-auto flex-1 border-t-2 border-black pt-4 flex flex-col gap-2"
                >
                    {#each selectedTopics as topic, i}
                        <div
                            class="flex gap-4 p-3 bg-gray-50 border border-gray-200 rounded"
                        >
                            <span class="font-mono font-bold text-gray-400"
                                >#{i + 1}</span
                            >
                            <span class="font-medium">{topic.topic}</span>
                            {#if topic.type === "SPICY"}
                                <span
                                    class="ml-auto text-[10px] bg-black text-white px-2 py-1 rounded font-bold self-start"
                                    >SPICY</span
                                >
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>
