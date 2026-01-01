<script lang="ts">
    import { slide } from "svelte/transition";
    import { Plus, X, ArrowLeft, Save } from "lucide-svelte";
    import { flip } from "svelte/animate";
    import { fly } from "svelte/transition";

    import { authStore } from "../lib/stores/auth";

    export let onBack: () => void;

    let packName = "";
    let authorName = "";
    let topics: { id: string; topic: string; type: "NORMAL" | "SPICY" }[] = [
        { id: crypto.randomUUID(), topic: "", type: "NORMAL" },
        { id: crypto.randomUUID(), topic: "", type: "NORMAL" },
        { id: crypto.randomUUID(), topic: "", type: "NORMAL" },
        { id: crypto.randomUUID(), topic: "", type: "NORMAL" },
        { id: crypto.randomUUID(), topic: "", type: "NORMAL" },
    ];

    let isSubmitting = false;
    let errorMsg = "";
    let successMsg = "";

    function addTopic() {
        topics = [
            ...topics,
            { id: crypto.randomUUID(), topic: "", type: "NORMAL" },
        ];
    }

    function removeTopic(id: string) {
        if (topics.length <= 5) return;
        topics = topics.filter((t) => t.id !== id);
    }

    async function submitPack() {
        errorMsg = "";
        successMsg = "";

        // Simple Validation
        if (packName.length < 3) return (errorMsg = "Pack name too short");
        if (authorName.length < 2) return (errorMsg = "Author name too short");
        if (topics.length < 5) return (errorMsg = "Need at least 5 topics");
        const validTopics = topics.filter((t) => t.topic.trim().length > 0);
        if (validTopics.length < 5)
            return (errorMsg = "Please fill in at least 5 topics");

        if (!$authStore) return (errorMsg = "You must be logged in");

        isSubmitting = true;

        try {
            const res = await fetch("/api/packs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": $authStore.token,
                },
                body: JSON.stringify({
                    name: packName,
                    author: authorName,
                    topics: validTopics.map((t) => ({
                        topic: t.topic,
                        type: t.type,
                    })),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // @ts-ignore
                errorMsg = data.message || "Failed to create pack";
                if (res.status === 429)
                    errorMsg = "You are doing that too fast! (Rate Limit)";
            } else {
                successMsg = `Pack Created! Code: ${data.shareCode || "Unknown"}`;
                // Keep it longer so they can read/copy/write down the code
                setTimeout(() => {
                    onBack();
                }, 5000);
            }
        } catch (e) {
            errorMsg = "Network Error";
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="flex flex-col gap-6 w-full max-w-2xl mx-auto pb-12">
    <!-- Header -->
    <div class="flex items-center gap-4">
        <button
            onclick={onBack}
            class="p-2 border-2 border-black bg-white rounded hover:bg-gray-100 transition-colors"
        >
            <ArrowLeft size={24} />
        </button>
        <h1 class="text-3xl font-black uppercase tracking-widest">
            Create Pack
        </h1>
    </div>

    {#if errorMsg}
        <div
            class="bg-black text-white p-4 rounded font-bold border-2 border-dashed border-gray-500"
        >
            {errorMsg}
        </div>
    {/if}

    {#if successMsg}
        <div
            class="bg-white border-2 border-black text-black p-4 rounded font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
        >
            {successMsg}
        </div>
    {/if}

    <!-- Meta Info -->
    <div
        class="flex flex-col gap-4 p-6 bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
        <div class="flex flex-col gap-2">
            <label class="font-bold uppercase text-xs tracking-wider"
                >Pack Name</label
            >
            <input
                bind:value={packName}
                type="text"
                placeholder="e.g. My Awesome Pack"
                class="border-2 border-black p-2 rounded font-mono focus:outline-none focus:ring-2 focus:ring-black"
                maxlength="30"
            />
        </div>
        <div class="flex flex-col gap-2">
            <label class="font-bold uppercase text-xs tracking-wider"
                >Author</label
            >
            <input
                bind:value={authorName}
                type="text"
                placeholder="Your Name"
                class="border-2 border-black p-2 rounded font-mono focus:outline-none focus:ring-2 focus:ring-black"
                maxlength="20"
            />
        </div>
    </div>

    <!-- Topics -->
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold uppercase">
                Topics ({topics.length})
            </h2>
            <button
                onclick={addTopic}
                disabled={topics.length >= 50}
                class="flex items-center gap-2 px-3 py-1 bg-black text-white rounded font-bold text-sm hover:scale-105 transition-transform disabled:opacity-50"
            >
                <Plus size={16} /> Add Topic
            </button>
        </div>

        <div class="flex flex-col gap-3">
            {#each topics as topic (topic.id)}
                <div
                    animate:flip={{ duration: 300 }}
                    transition:slide|local
                    class="flex items-center gap-2"
                >
                    <div
                        class="px-3 py-2 bg-black text-white font-mono font-bold rounded"
                    >
                        {topics.indexOf(topic) + 1}
                    </div>
                    <input
                        bind:value={topic.topic}
                        type="text"
                        placeholder="Topic text..."
                        class="flex-1 border-2 border-black p-2 rounded font-mono"
                        maxlength="200"
                    />
                    <button
                        onclick={() => removeTopic(topic.id)}
                        disabled={topics.length <= 5}
                        class="p-2 text-black hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>
            {/each}
        </div>
    </div>

    <!-- Footer -->
    <div class="sticky bottom-4">
        <button
            onclick={submitPack}
            disabled={isSubmitting}
            class="w-full py-4 bg-white text-black border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-black text-xl hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isSubmitting ? "SAVING..." : "PUBLISH PACK"}
        </button>
    </div>
</div>
