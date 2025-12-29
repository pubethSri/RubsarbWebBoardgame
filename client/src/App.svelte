<script lang="ts">
  import { onMount } from 'svelte';

  let status = "Disconnected 🔴";
  let messages: string[] = [];
  let socket: WebSocket;

  onMount(() => {
    // Connect to the Elysia server
    socket = new WebSocket('ws://localhost:3000/ws');

    socket.addEventListener('open', () => {
      status = "Connected 🟢";
      console.log("Connected to Rubsarb Server");
      socket.send("Hello from Frontend!");
    });

    socket.addEventListener('message', (event) => {
      messages = [...messages, event.data];
    });

    socket.addEventListener('close', () => {
        status = "Disconnected 🔴";
    });
  });
</script>

<main>
  <h1>Rubsarb (รับทราบ)</h1>
  <h2>Status: {status}</h2>
  
  <h3>Server Logs:</h3>
  <ul>
    {#each messages as msg}
      <li>{msg}</li>
    {/each}
  </ul>
</main>