import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";
import { BrowserBridge } from "../dist/bridge.js";

const port = 19_000 + process.pid % 1_000;
const bridge = new BrowserBridge(port);
let online = false;
for (let attempt = 0; attempt < 20 && !online; attempt += 1) {
  try {
    online = (await fetch(`http://127.0.0.1:${port}/status`)).ok;
  } catch {
    await delay(10);
  }
}
assert.equal(online, true);

const socket = new WebSocket(`ws://127.0.0.1:${port}/browser`);
await once(socket, "open");
socket.send(JSON.stringify({ type: "events", events: [{ type: "test", value: 42 }] }));
await delay(10);
assert.equal(bridge.status().transport, "websocket");
assert.deepEqual(bridge.list(1), [{ type: "test", value: 42 }]);

const duplicate = new WebSocket(`ws://127.0.0.1:${port}/browser`);
await once(duplicate, "open");
const [duplicateCode] = await once(duplicate, "close");
assert.equal(duplicateCode, 4002);
assert.equal(bridge.status().browserConnected, true);

const commandMessage = once(socket, "message");
await bridge.enqueue({ type: "ping" });
const [raw] = await commandMessage;
assert.deepEqual(JSON.parse(raw.toString()), { type: "command", command: { type: "ping" } });
bridge.clear();
assert.deepEqual(bridge.list(), []);
socket.close();
console.log("bridge checks passed");
process.exit(0);
