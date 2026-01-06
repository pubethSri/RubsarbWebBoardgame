<script lang="ts">
    import { ArrowLeft, Trash2, ShieldAlert, Plus, Edit } from "lucide-svelte";
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
                const rawTopics = await res.json();
                selectedTopics = rawTopics.map((t: any) => ({
                    ...t,
                    minLabel: t.min_label || "Min", // Map DB snake_case to Client camelCase
                    maxLabel: t.max_label || "Max",
                }));
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
        isEditing = false; // Reset mode
    }

    let isSaving = false;
    let isEditing = false;

    function toggleEdit() {
        isEditing = !isEditing;
        if (!isEditing) {
            // Reload to discard changes
            viewTopics(selectedPack);
        }
    }

    function generateUUID() {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                var r = (Math.random() * 16) | 0,
                    v = c == "x" ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            },
        );
    }

    function addTopic() {
        // Generate a temporary ID (Pollyfill for HTTP usage)
        selectedTopics = [
            ...selectedTopics,
            {
                id: generateUUID(),
                topic: "",
                type: "NORMAL",
                minLabel: "Min",
                maxLabel: "Max",
            },
        ];
    }

    function removeTopic(index: number) {
        if (selectedTopics.length <= 5) {
            alert("Minimum 5 topics required");
            return;
        }
        selectedTopics = selectedTopics.filter((_, i) => i !== index);
    }

    async function saveTopics() {
        if (selectedTopics.length < 5) {
            alert("Minimum 5 topics required");
            return;
        }

        // Validate content
        if (selectedTopics.some((t) => !t.topic.trim())) {
            alert("All topics must have text");
            return;
        }

        isSaving = true;
        try {
            const res = await fetch(
                `/api/admin/packs/${selectedPack.id}/topics`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "x-auth-token": $authStore!.token,
                    },
                    body: JSON.stringify({ topics: selectedTopics }),
                },
            );

            if (res.ok) {
                alert("Topics Updated!");
                closeModal();
                // Refresh pack list topic counts if needed
                fetchPacks();
            } else {
                const data = await res.json();
                alert(
                    typeof data === "string" ? data : "Failed to update topics",
                );
            }
        } catch (e) {
            alert("Network Error");
        } finally {
            isSaving = false;
        }
    }

    function formatDate(unix: number) {
        return (
            new Date(unix * 1000).toLocaleDateString() +
            " " +
            new Date(unix * 1000).toLocaleTimeString()
        );
    }

    async function updateShareCode(pack: any) {
        const newCode = prompt("Enter new 6-character code:", pack.share_code);
        if (!newCode || newCode.trim().length < 3) return;

        try {
            const res = await fetch(`/api/admin/packs/${pack.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": $authStore!.token,
                },
                body: JSON.stringify({ shareCode: newCode.trim() }),
            });

            if (res.ok) {
                const data = await res.json();
                alert(`Code updated to: ${data.shareCode}`);
                fetchPacks();
            } else {
                const err = await res.text();
                alert(`Failed: ${err}`);
            }
        } catch (e) {
            alert("Network Error");
        }
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
                                <td class="p-4 font-bold text-black">
                                    <div class="flex items-center gap-2">
                                        {pack.share_code || "-"}
                                        <button
                                            onclick={() =>
                                                updateShareCode(pack)}
                                            class="opacity-30 hover:opacity-100 transition-opacity"
                                            title="Edit Share Code"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    </div>
                                </td>
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
                    <div class="flex-1">
                        <div class="flex items-center gap-4">
                            <h2
                                class="text-3xl font-black uppercase font-mono bg-primary-yellow inline-block px-2 border-2 border-black"
                            >
                                {selectedPack?.name}
                            </h2>
                            {#if !isEditing}
                                <button
                                    onclick={() => (isEditing = true)}
                                    class="text-xs bg-black text-white px-2 py-1 font-bold uppercase hover:bg-gray-800"
                                >
                                    Edit Topics
                                </button>
                            {/if}
                        </div>
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

                <div
                    class="overflow-y-auto flex-1 flex flex-col gap-2 pr-2 mb-4"
                >
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="font-bold uppercase">
                            Topics ({selectedTopics.length})
                        </h3>
                        {#if isEditing}
                            <button
                                onclick={() => addTopic()}
                                class="px-2 py-1 bg-black text-white text-xs font-bold uppercase hover:bg-gray-800"
                            >
                                + Add Topic
                            </button>
                        {/if}
                    </div>

                    {#each selectedTopics as topic, i}
                        <div
                            class="flex flex-col gap-2 p-3 bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000000]"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="font-mono font-bold text-white bg-black w-8 h-8 flex items-center justify-center border-2 border-black shrink-0"
                                    >#{i + 1}</span
                                >
                                {#if isEditing}
                                    <input
                                        bind:value={topic.topic}
                                        class="flex-1 border-b-2 border-gray-300 focus:border-black outline-none font-mono uppercase px-1"
                                        placeholder="Topic Text..."
                                    />
                                {:else}
                                    <span
                                        class="flex-1 font-mono uppercase font-medium"
                                        >{topic.topic}</span
                                    >
                                {/if}

                                {#if topic.type === "SPICY"}
                                    <span
                                        class="text-[10px] bg-primary-red text-white border-2 border-black px-1 py-0.5 font-bold shadow-[2px_2px_0px_0px_#000000]"
                                        >SPICY</span
                                    >
                                {/if}

                                {#if isEditing}
                                    <button
                                        onclick={() => removeTopic(i)}
                                        class="text-red-500 hover:text-red-700 disabled:opacity-30"
                                        disabled={selectedTopics.length <= 5}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                {/if}
                            </div>

                            <!-- Min/Max Labels -->
                            <div class="flex gap-2 pl-10">
                                {#if isEditing}
                                    <input
                                        bind:value={topic.minLabel}
                                        placeholder="Min Label"
                                        class="w-1/3 border-b border-gray-200 text-xs font-mono uppercase focus:border-black outline-none"
                                    />
                                    <input
                                        bind:value={topic.maxLabel}
                                        placeholder="Max Label"
                                        class="w-1/3 border-b border-gray-200 text-xs font-mono uppercase focus:border-black outline-none"
                                    />
                                {:else}
                                    <div
                                        class="text-xs text-gray-500 font-mono uppercase flex gap-4"
                                    >
                                        <span
                                            >Min: <span
                                                class="text-black font-bold"
                                                >{topic.minLabel}</span
                                            ></span
                                        >
                                        <span
                                            >Max: <span
                                                class="text-black font-bold"
                                                >{topic.maxLabel}</span
                                            ></span
                                        >
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>

                {#if isEditing}
                    <div
                        class="border-t-4 border-black pt-4 flex justify-end gap-2"
                    >
                        <button
                            onclick={toggleEdit}
                            class="px-4 py-2 bg-gray-200 text-black font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-y-px hover:shadow-none transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onclick={saveTopics}
                            disabled={isSaving}
                            class="px-4 py-2 bg-primary-blue text-white font-bold uppercase border-2 border-black shadow-[2px_2px_0px_0px_#000000] hover:translate-y-px hover:shadow-none transition-all disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
