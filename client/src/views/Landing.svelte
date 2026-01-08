<script lang="ts">
    import { type Snippet } from "svelte";
    import { socketStore } from "../lib/stores/socket";
    import { gameState } from "../lib/stores/gameState";

    import CreatePack from "./CreatePack.svelte";
    import Admin from "./Admin.svelte";
    import LoginModal from "../components/LoginModal.svelte";
    import HowToPlayModal from "../components/HowToPlayModal.svelte";
    import Button from "../components/UI/Button.svelte";
    import { authStore, logout } from "../lib/stores/auth";
    import { HelpCircle, Star, Zap, Trash2 } from "lucide-svelte";

    import { onMount, onDestroy } from "svelte";
    import { PLAYER_COLORS } from "../lib/types";

    // ... imports

    let playerName = $state("");
    let roomCode = $state("");
    let viewMode = $state<"HOME" | "JOIN" | "CREATE_PACK" | "ADMIN">("HOME");
    let showLogin = $state(false);
    let showHowToPlay = $state(false);

    // Showcase Animation State
    let demoColorIndex = $state(0);
    let cursorX = $state(20); // Start offset
    let cursorY = $state(20);
    let cursorScale = $state(1);
    let animationInterval: any;

    onMount(() => {
        // Animation Loop
        let step = 0;
        animationInterval = setInterval(() => {
            step = (step + 1) % 4;

            if (step === 0) {
                // Move In
                cursorX = -10;
                cursorY = -10;
                cursorScale = 1;
            } else if (step === 1) {
                // Click Down
                cursorScale = 0.8;
            } else if (step === 2) {
                // Color Change & Release
                cursorScale = 1;
                demoColorIndex = (demoColorIndex + 1) % PLAYER_COLORS.length;
            } else if (step === 3) {
                // Move Away
                cursorX = 20;
                cursorY = 20;
            }
        }, 1000);
    });

    onDestroy(() => {
        if (animationInterval) clearInterval(animationInterval);
    });

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

{#if viewMode === "CREATE_PACK"}
    <CreatePack onBack={() => (viewMode = "HOME")} />
{:else if viewMode === "ADMIN"}
    <Admin onBack={() => (viewMode = "HOME")} />
{:else}
    <div
        class="min-h-screen bg-primary-yellow relative overflow-hidden flex flex-col"
    >
        <!-- Decoration Background -->
        <div
            class="absolute inset-0 z-0 opacity-10 pointer-events-none"
            style="background-image: radial-gradient(#000 2px, transparent 2px); background-size: 20px 20px;"
        ></div>

        <!-- Large Marquee Header -->
        <div
            class="w-full bg-black text-white py-4 overflow-hidden border-b-4 border-black z-10"
        >
            <h1
                class="text-6xl md:text-8xl font-black font-mono tracking-tighter whitespace-nowrap animate-marquee"
            >
                ITO · BOARDGAME · ITO · BOARDGAME · ITO · BOARDGAME
            </h1>
        </div>

        <div
            class="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full max-w-4xl mx-auto"
        >
            <!-- Main Content Box -->
            <div
                class="w-full max-w-lg bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000000] p-8 relative"
            >
                <!-- Decorative Badge -->
                <div
                    class="absolute -top-6 -right-6 bg-primary-blue text-white p-3 border-4 border-black shadow-[4px_4px_0px_0px_#000000] rotate-12 z-20"
                >
                    <Star class="fill-current w-8 h-8" />
                </div>

                <!-- Input Section -->
                <div class="mb-8 space-y-4">
                    <label class="brutal-text text-xl block" for="name">
                        WHO ARE YOU?
                    </label>
                    <input
                        id="name"
                        type="text"
                        bind:value={playerName}
                        placeholder="ENTER NAME..."
                        class="w-full h-14 bg-gray-100 border-4 border-black px-4 font-mono text-xl focus:bg-white placeholder:text-gray-400 transition-colors uppercase"
                    />
                </div>

                {#if $gameState.error}
                    <div
                        class="mb-6 p-4 bg-primary-red text-white border-4 border-black font-mono font-bold flex items-center gap-3 shadow-[4px_4px_0px_0px_#000000]"
                    >
                        <Zap class="fill-white" />
                        {$gameState.error}
                    </div>
                {/if}

                <div class="space-y-4">
                    {#if viewMode === "HOME"}
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onclick={createRoom}
                            class="text-2xl"
                        >
                            CREATE ROOM
                        </Button>

                        <div class="relative">
                            <div class="absolute inset-0 flex items-center">
                                <div
                                    class="w-full border-t-4 border-black"
                                ></div>
                            </div>
                            <div class="relative flex justify-center text-sm">
                                <span
                                    class="bg-white px-2 font-mono font-bold text-black border-2 border-black"
                                    >OR</span
                                >
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="lg"
                            fullWidth
                            onclick={() => (viewMode = "JOIN")}
                            class="text-2xl"
                        >
                            JOIN ROOM
                        </Button>

                        {#if $authStore && ($authStore.role === "CREATOR" || $authStore.role === "ADMIN")}
                            <div
                                class="pt-4 mt-4 border-t-4 border-black/10 border-dashed"
                            >
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    fullWidth
                                    onclick={() => (viewMode = "CREATE_PACK")}
                                >
                                    Build Custom Pack →
                                </Button>
                            </div>
                        {/if}
                    {:else if viewMode === "JOIN"}
                        <div
                            class="space-y-4 animate-in slide-in-from-right duration-200"
                        >
                            <div>
                                <label
                                    class="brutal-text text-lg block mb-2"
                                    for="code">ROOM CODE</label
                                >
                                <input
                                    id="code"
                                    type="text"
                                    bind:value={roomCode}
                                    placeholder="ABCD"
                                    maxlength="4"
                                    class="w-full h-16 text-center text-4xl font-mono font-bold border-4 border-black uppercase tracking-[0.5em] focus:bg-yellow-50 placeholder:tracking-normal placeholder:text-gray-300"
                                />
                            </div>

                            <div class="flex gap-4">
                                <Button
                                    variant="outline"
                                    class="w-1/3"
                                    onclick={() => (viewMode = "HOME")}
                                >
                                    BACK
                                </Button>
                                <Button
                                    variant="primary"
                                    class="flex-1"
                                    onclick={joinRoom}
                                >
                                    JOIN
                                </Button>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>

        <!-- How To Play (Fixed) -->
        <div class="fixed top-24 left-4 md:top-8 md:left-8 z-50">
            <Button
                variant="accent"
                size="sm"
                onclick={() => (showHowToPlay = true)}
                class="rotate-[-2deg] hover:rotate-0"
            >
                <HelpCircle size={20} class="mr-2" /> HOW TO PLAY??
            </Button>
        </div>

        <!-- Auth Controls (Fixed) -->
        <div class="fixed top-24 right-4 md:top-8 md:right-8 z-50">
            {#if $authStore}
                <div
                    class="flex items-center gap-2 bg-white border-4 border-black p-2 shadow-[4px_4px_0px_0px_#000000]"
                >
                    <div class="font-mono text-sm">
                        <span class="font-bold block leading-none"
                            >{$authStore.username}</span
                        >
                        <span class="text-[10px] text-gray-500 uppercase"
                            >{$authStore.role}</span
                        >
                    </div>
                    <button
                        onclick={logout}
                        class="bg-black text-white p-1 hover:bg-primary-red transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            {:else}
                <Button
                    variant="ghost"
                    size="sm"
                    onclick={() => (showLogin = true)}
                    class="bg-white border-4 border-black shadow-[4px_4px_0px_0px_#000000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                >
                    LOGIN
                </Button>
            {/if}
        </div>

        <!-- Admin Link -->
        <!-- Admin Link (Moved to Left) -->
        {#if $authStore?.role === "ADMIN"}
            <div class="fixed bottom-4 left-4 z-50">
                <Button
                    variant="secondary"
                    size="sm"
                    onclick={() => (viewMode = "ADMIN")}
                >
                    ADMIN DASHBOARD
                </Button>
            </div>
        {/if}

        <!-- Color Change Showcase (Moved to Right) -->
        <div
            class="fixed bottom-4 right-4 z-40 hidden md:flex flex-col items-center gap-2"
        >
            <!-- Label (Above) -->
            <div
                class="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase -rotate-2 font-mono border-2 border-white shadow-md max-w-[150px] text-center mb-1"
            >
                You can click your icon to change color!
            </div>

            <div class="relative group">
                <!-- Avatar -->
                <div
                    class="w-16 h-16 border-4 border-black flex items-center justify-center font-mono font-bold text-2xl text-white shadow-[4px_4px_0px_0px_#000000] transition-colors duration-200"
                    style="background-color: {PLAYER_COLORS[demoColorIndex]}"
                >
                    ?
                </div>

                <!-- Cursor Animation -->
                <div
                    class="absolute transition-transform duration-500 ease-in-out pointer-events-none drop-shadow-md"
                    style="transform: translate({cursorX}px, {cursorY}px) scale({cursorScale}); top: 100%; left: 100%;"
                >
                    <!-- Simple SVG Cursor -->
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="black"
                        stroke="white"
                        stroke-width="2"
                    >
                        <path
                            d="M5.5 3.21l10.08 5.25c.57.3.62 1.1.09 1.47l-4.13 2.87 2.87 4.13c.27.39.12.92-.32 1.09l-1.99.76c-.44.17-.93-.05-1.09-.49l-2.61-3.77-2.92 4.07c-.42.59-1.34.42-1.48-.29L2.5 4.5c-.17-.89.87-1.48 1.62-.97.55.37 1.38.68 1.38-.32z"
                        />
                    </svg>
                </div>
            </div>
        </div>
    </div>

    {#if showLogin}
        <LoginModal on:close={() => (showLogin = false)} />
    {/if}

    {#if showHowToPlay}
        <HowToPlayModal on:close={() => (showHowToPlay = false)} />
    {/if}
{/if}
