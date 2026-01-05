<script lang="ts">
    import { slide } from "svelte/transition";
    import { Plus, X, ArrowLeft, Save } from "lucide-svelte";
    import { flip } from "svelte/animate";
    import { fly } from "svelte/transition";
    import Button from "../components/UI/Button.svelte";

    import { authStore } from "../lib/stores/auth";

    // Polyfill for insecure contexts (HTTP)
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

    let { onBack } = $props<{ onBack: () => void }>();

    let packName = $state("");
    let authorName = $state("");
    let topics: { id: string; topic: string; type: "NORMAL" | "SPICY" }[] =
        $state([
            { id: generateUUID(), topic: "", type: "NORMAL" },
            { id: generateUUID(), topic: "", type: "NORMAL" },
            { id: generateUUID(), topic: "", type: "NORMAL" },
            { id: generateUUID(), topic: "", type: "NORMAL" },
            { id: generateUUID(), topic: "", type: "NORMAL" },
        ]);

    let isSubmitting = $state(false);
    let errorMsg = $state("");
    let successMsg = $state("");

    function addTopic() {
        topics = [...topics, { id: generateUUID(), topic: "", type: "NORMAL" }];
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
    <div class="flex items-center gap-4 border-b-4 border-black pb-4 mb-4">
        <button
            onclick={onBack}
            class="p-2 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors shadow-[2px_2px_0px_0px_#000000]"
        >
            <ArrowLeft size={24} />
        </button>
        <h1
            class="text-3xl font-black uppercase tracking-widest bg-primary-yellow text-black border-4 border-black px-4 py-1 rotate-1 shadow-[4px_4px_0px_0px_#000000]"
        >
            Create Pack
        </h1>
    </div>

    {#if errorMsg}
        <div
            class="bg-primary-red text-white p-4 font-bold border-4 border-black shadow-[4px_4px_0px_0px_#000000]"
        >
            {errorMsg}
        </div>
    {/if}

    {#if successMsg}
        <div
            class="bg-white border-4 border-black text-black p-4 font-bold shadow-[4px_4px_0px_0px_#000000]"
        >
            {successMsg}
        </div>
    {/if}

    <!-- Meta Info -->
    <div
        class="flex flex-col gap-4 p-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000]"
    >
        <div class="flex flex-col gap-2">
            <label
                for="packName"
                class="font-bold uppercase text-xs tracking-wider bg-black text-white px-2 py-1 w-fit"
                >Pack Name</label
            >
            <input
                id="packName"
                bind:value={packName}
                type="text"
                placeholder="E.G. THE COOL PACK"
                class="border-4 border-black p-3 font-mono focus:outline-none focus:bg-yellow-50 placeholder:text-gray-400 uppercase text-lg"
                maxlength="30"
            />
        </div>
        <div class="flex flex-col gap-2">
            <label
                for="authorName"
                class="font-bold uppercase text-xs tracking-wider bg-black text-white px-2 py-1 w-fit"
                >Author</label
            >
            <input
                id="authorName"
                bind:value={authorName}
                type="text"
                placeholder="YOUR NAME"
                class="border-4 border-black p-3 font-mono focus:outline-none focus:bg-yellow-50 placeholder:text-gray-400 uppercase text-lg"
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
                    class="flex items-center gap-2 group"
                >
                    <div
                        class="px-3 py-3 bg-black text-white font-mono font-bold border-2 border-black"
                    >
                        {topics.indexOf(topic) + 1}
                    </div>
                    <input
                        bind:value={topic.topic}
                        type="text"
                        placeholder="TOPIC TEXT..."
                        class="flex-1 border-4 border-black p-2 font-mono uppercase focus:bg-yellow-50 focus:outline-none placeholder:text-gray-300"
                        maxlength="200"
                    />
                    <button
                        onclick={() => removeTopic(topic.id)}
                        disabled={topics.length <= 5}
                        class="p-3 text-black border-2 border-transparent hover:border-black hover:bg-primary-red hover:text-white transition-colors disabled:opacity-20"
                        title="Remove Topic"
                    >
                        <X size={20} />
                    </button>
                </div>
            {/each}
        </div>
    </div>

    <!-- Footer -->
    <div class="sticky bottom-4">
        <Button
            onclick={submitPack}
            disabled={isSubmitting}
            variant="primary"
            fullWidth
            size="lg"
        >
            {isSubmitting ? "SAVING..." : "PUBLISH PACK"}
        </Button>
    </div>
</div>
