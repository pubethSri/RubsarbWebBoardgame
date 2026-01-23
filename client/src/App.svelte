<script lang="ts">
  import { onMount } from "svelte";
  import { socketStore } from "./lib/stores/socket";
  import { gameState } from "./lib/stores/gameState";
  import { checkSession } from "./lib/stores/auth";
  import Landing from "./views/Landing.svelte";
  import Lobby from "./views/Lobby.svelte";
  import Game from "./views/Game.svelte";

  onMount(() => {
    // Connect to the Elysia server (Relative path handles both Dev Proxy and Prod)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host; // Includes port if present
    socketStore.connect(`${protocol}//${host}/ws`);

    // Check for Session via HttpOnly Cookie (Server validates)
    checkSession();
  });
</script>

<main
  class="min-h-screen bg-white font-sans text-black selection:bg-black selection:text-white"
>
  {#if !$gameState.isConnected}
    <div class="flex items-center justify-center min-h-screen flex-col gap-4">
      <div
        class="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"
      ></div>
      <p class="text-black font-medium animate-pulse">
        Connecting to Server...
      </p>
    </div>
  {:else if $gameState.roomCode}
    {#if $gameState.gameState === "LOBBY"}
      <Lobby />
    {:else}
      <Game />
    {/if}
  {:else}
    <Landing />
  {/if}
</main>
