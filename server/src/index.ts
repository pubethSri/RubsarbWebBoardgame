// server/src/index.ts
import { Elysia } from "elysia";
import { websocket } from "@elysiajs/websocket";

const app = new Elysia()
  .use(websocket())
  .ws('/ws', {
    open(ws) {
      console.log('✨ A client connected!');
      ws.send('Rubsarb Server: Connection established!');
    },
    message(ws, message) {
      console.log('📩 Received:', message);
      ws.send(`Echo: ${message}`);
    },
    close(ws) {
      console.log('❌ A client disconnected');
    }
  })
  .get("/", () => "Rubsarb API is running...")
  .listen(3000);

console.log(
  `🦊 Rubsarb Server is running at ${app.server?.hostname}:${app.server?.port}`
);