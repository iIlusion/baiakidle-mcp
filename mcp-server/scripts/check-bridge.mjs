import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocket } from "ws";
import { BrowserBridge } from "../dist/bridge.js";

const port = 19_000 + (process.pid % 1_000);
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

const preflight = await fetch(`http://127.0.0.1:${port}/status`, { method: "OPTIONS" });
assert.equal(preflight.status, 204);
const hostilePreflight = await fetch(`http://127.0.0.1:${port}/status`, {
  method: "OPTIONS",
  headers: { origin: "https://evil.example" }
});
assert.equal(hostilePreflight.status, 204);
assert.equal(hostilePreflight.headers.get("access-control-allow-origin"), null);

const invalidJson = await fetch(`http://127.0.0.1:${port}/rpc`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{"
});
assert.equal(invalidJson.status, 400);

const invalidRpc = await fetch(`http://127.0.0.1:${port}/rpc`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ params: {} })
});
assert.equal(invalidRpc.status, 400);

const invalidContentType = await fetch(`http://127.0.0.1:${port}/rpc`, {
  method: "POST",
  headers: { "content-type": "text/plain" },
  body: JSON.stringify({ method: "status" })
});
assert.equal(invalidContentType.status, 415);

const hostileSocket = new WebSocket(`ws://127.0.0.1:${port}/browser`, {
  headers: { origin: "https://evil.example" }
});
const hostileSocketResult = await new Promise(resolve => {
  hostileSocket.once("open", () => resolve("open"));
  hostileSocket.once("error", () => resolve("error"));
});
if (hostileSocketResult === "open") hostileSocket.close();
assert.equal(hostileSocketResult, "error");

const socket = new WebSocket(`ws://127.0.0.1:${port}/browser`);
await once(socket, "open");
assert.equal(bridge.connected(), true);
assert.equal(bridge.status().browserConnected, true);

const incoming = once(socket, "message");
const pending = bridge.request("dom.query", { selector: "body" });
const [raw] = await incoming;
const cmd = JSON.parse(raw.toString());
assert.equal(cmd.method, "dom.query");
assert.equal(cmd.params.selector, "body");
assert.ok(cmd.id);
socket.send(JSON.stringify({ id: cmd.id, result: [{ tag: "body" }] }));
assert.deepEqual(await pending, [{ tag: "body" }]);

const replacement = new WebSocket(`ws://127.0.0.1:${port}/browser`);
const firstClosed = once(socket, "close");
await once(replacement, "open");
const [replacedCode] = await firstClosed;
assert.equal(replacedCode, 4003);
assert.equal(bridge.connected(), true);

const pingMsg = once(replacement, "message");
const pingPending = bridge.request("status", {});
const [pingRaw] = await pingMsg;
const pingCmd = JSON.parse(pingRaw.toString());
assert.equal(pingCmd.method, "status");
replacement.send(JSON.stringify({ id: pingCmd.id, result: { version: "1.2.0" } }));
assert.deepEqual(await pingPending, { version: "1.2.0" });

replacement.close();
await delay(20);
bridge.close();
await delay(20);
console.log("bridge checks passed");
