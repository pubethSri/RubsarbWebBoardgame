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
                headers: { "x-auth-token": $authStore?.token || "" },
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
    <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
            <button
                onclick={onBack}
                class="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000000]"
            >
                <ArrowLeft size={24} />
            </button>
            <h1
                class="text-4xl font-black uppercase tracking-widest flex items-center gap-2 bg-primary-red text-white border-4 border-black px-4 py-1 -rotate-1 shadow-[4px_4px_0px_0px_#000000]"
            >
                <ShieldAlert size={32} /> Admin
            </h1>
        </div>
        <div class="font-mono text-xs opacity-50 bg-black text-white px-2 py-1">
            v{APP_VERSION}
        </div>
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
            class="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] overflow-hidden"
        >
            <div
                class="p-4 bg-primary-yellow border-b-4 border-black flex justify-between items-center"
            >
                <span class="font-bold font-mono uppercase text-lg"
                    >Total Packs: {packs.length}</span
                >
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr
                            class="bg-black text-white uppercase text-xs tracking-wider font-mono"
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
                                class="border-b-2 border-black hover:bg-yellow-50 transition-colors font-mono text-sm"
                            >
                                <td class="p-4 font-bold uppercase"
                                    >{pack.name}</td
                                >
                                <td class="p-4 font-bold text-black"
                                    >{pack.share_code || "-"}</td
                                >
                                <td class="p-4 uppercase">{pack.author}</td>
                                <td class="p-4 text-center font-bold"
                                    >{pack.topic_count}</td
                                >
                                <td class="p-4 text-center">
                                    {#if pack.is_official}
                                        <span
                                            class="bg-primary-blue text-white border border-black px-2 py-1 text-[10px] font-bold shadow-[2px_2px_0px_0px_#000000]"
                                            >OFFICIAL</span
                                        >
                                    {:else}
                                        <span
                                            class="bg-white text-black border border-black px-2 py-1 text-[10px] font-bold"
                                            >UGC</span
                                        >
                                    {/if}
                                </td>
                                <td class="p-4 text-right text-xs text-gray-500"
                                    >{formatDate(pack.created_at)}</td
                                >
                                <td
                                    class="p-4 text-center flex justify-center gap-2"
                                >
                                    <button
                                        onclick={() => viewTopics(pack)}
                                        class="px-2 py-1 text-xs border-2 border-black bg-white hover:bg-black hover:text-white transition-colors font-bold uppercase shadow-[2px_2px_0px_0px_#000000] active:translate-y-px active:shadow-none"
                                    >
                                        View
                                    </button>
                                    {#if !pack.is_official}
                                        <button
                                            onclick={() => deletePack(pack.id)}
                                            class="p-1 text-black bg-white border-2 border-black hover:bg-red-500 hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000000] active:translate-y-px active:shadow-none"
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
                class="bg-white border-4 border-black p-6 w-full max-w-2xl shadow-[12px_12px_0px_0px_#000000] max-h-[80vh] flex flex-col relative"
            >
                <div
                    class="flex justify-between items-start mb-4 border-b-4 border-black pb-4"
                >
                    <div>
                        <h2
                            class="text-3xl font-black uppercase font-mono bg-primary-yellow inline-block px-2 border-2 border-black"
                        >
                            {selectedPack?.name}
                        </h2>
                        <p
                            class="text-gray-500 font-mono text-sm mt-1 font-bold"
                        >
                            by <span class="text-black uppercase"
                                >{selectedPack?.author}</span
                            >
                        </p>
                    </div>
                    <button
                        onclick={closeModal}
                        class="p-2 border-2 border-black hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_#000000]"
                    >
                        <ArrowLeft size={24} />
                    </button>
                </div>

                <div class="overflow-y-auto flex-1 flex flex-col gap-2 pr-2">
                    {#each selectedTopics as topic, i}
                        <div
                            class="flex gap-4 p-3 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000000] items-center"
                        >
                            <span
                                class="font-mono font-bold text-white bg-black w-8 h-8 flex items-center justify-center border-2 border-black"
                                >#{i + 1}</span
                            >
                            <span class="font-medium font-mono uppercase"
                                >{topic.topic}</span
                            >
                            {#if topic.type === "SPICY"}
                                <span
                                    class="ml-auto text-[10px] bg-primary-red text-white border-2 border-black px-2 py-1 font-bold self-center shadow-[2px_2px_0px_0px_#000000]"
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
