<script lang="ts">
    import { socketStore } from "../lib/stores/socket";

    let playerName = $state("");
    let roomCode = $state("");
    let joinMode = $state(false);

    function createRoom() {
        if (!playerName.trim()) return;
        socketStore.sendMessage({
            type: "CREATE_ROOM",
            payload: { playerName },
        });
    }

    function joinRoom() {
        if (!playerName.trim() || !roomCode.trim()) return;
        socketStore.sendMessage({
            type: "JOIN_ROOM",
            payload: { roomCode: roomCode.toUpperCase(), playerName },
        });
    }
</script>

<div
    class="flex flex-col items-center justify-center min-h-screen p-4 bg-white text-black"
>
    <h1 class="text-6xl font-bold mb-8 text-black tracking-tight">Rubsarb</h1>

    <div
        class="w-full max-w-md p-8 bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
    >
        <div class="mb-6">
            <label
                class="block text-sm font-bold mb-2 text-black uppercase tracking-wider"
                for="name"
            >
                Your Name
            </label>
            <input
                id="name"
                type="text"
                bind:value={playerName}
                placeholder="Enter your name"
                class="w-full px-4 py-3 rounded-lg border-2 border-black focus:bg-gray-50 outline-none text-lg font-medium text-black placeholder:text-gray-400 transition-all"
            />
        </div>

        {#if !joinMode}
            <button
                onclick={createRoom}
                class="w-full py-4 rounded-xl bg-black text-white font-bold text-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all hover:bg-gray-800 mb-4 cursor-pointer"
            >
                Create New Room
            </button>

            <button
                onclick={() => (joinMode = true)}
                class="w-full py-4 rounded-xl bg-white border-2 border-black text-black font-bold text-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1"
            >
                Join Existing Room
            </button>
        {:else}
            <div class="mb-6 animate-in fade-in slide-in-from-bottom-2">
                <label
                    class="block text-sm font-bold mb-2 text-black uppercase tracking-wider"
                    for="code"
                >
                    Room Code
                </label>
                <input
                    id="code"
                    type="text"
                    bind:value={roomCode}
                    placeholder="ABCD"
                    maxlength="4"
                    class="w-full px-4 py-3 rounded-lg border-2 border-black focus:bg-gray-50 outline-none text-lg font-medium text-black placeholder:text-gray-400 uppercase tracking-widest text-center transition-all"
                />
            </div>

            <div class="flex gap-3">
                <button
                    onclick={() => (joinMode = false)}
                    class="flex-1 py-3 rounded-xl bg-white border-2 border-black text-black font-bold hover:bg-gray-50 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1"
                >
                    Back
                </button>
                <button
                    onclick={joinRoom}
                    class="flex-[2] py-3 rounded-xl bg-black border-2 border-black text-white font-bold text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all hover:bg-gray-800 cursor-pointer"
                >
                    Join Room
                </button>
            </div>
        {/if}
    </div>
</div>
