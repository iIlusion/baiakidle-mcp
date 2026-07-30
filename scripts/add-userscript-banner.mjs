import { readFile, writeFile } from "node:fs/promises";

const common = `// @match https://baiakidle.com/jogar/
// @match https://baiakidle.com/jogar/*
// @run-at document-start`;
const banner = `// ==UserScript==
// @name BaiakIdle MCP Bridge
// @namespace baiakidle-page-bridge
// @version 1.0.0
// @description Local page and WebSocket bridge for Codex MCP tools.
${common}
// @grant GM_xmlhttpRequest
// @grant unsafeWindow
// @connect 127.0.0.1
// ==/UserScript==
`;
const devLoader = `// ==UserScript==
// @name BaiakIdle MCP Bridge DEV
// @namespace baiakidle-page-bridge
// @version 1.0.0-dev
${common}
// @sandbox raw
// @grant GM_xmlhttpRequest
// @grant unsafeWindow
// @connect 127.0.0.1
// @downloadURL none
// @updateURL none
// ==/UserScript==

(() => {
  const page = unsafeWindow;
  const monitored = /^wss?:\\/\\/(?:rt\\d+\\.)?baiakidle\\.com(?:\\/|$)/i;

  if (!page.__BAIAKIDLE_EARLY_WS__) {
    const NativeWebSocket = page.WebSocket;
    const records = [];
    const subscribers = [];

    function EarlyWebSocket(url, protocols) {
      const socket = protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols);
      if (!monitored.test(String(url))) return socket;

      const record = { url: String(url), socket, events: [], dispatch: null };
      const capture = event => {
        if (record.dispatch) record.dispatch(event);
        else if (record.events.length < 500) record.events.push(event);
      };
      socket.addEventListener("message", event => capture({ type: "message", data: event.data }));
      socket.addEventListener("close", event => capture({ type: "close", code: event.code, reason: event.reason }));
      socket.addEventListener("error", () => capture({ type: "error" }));

      const nativeSend = socket.send;
      socket.send = function (data) {
        capture({ type: "send", data });
        nativeSend.call(this, data);
      };

      records.push(record);
      for (const subscriber of subscribers) subscriber(record);
      return socket;
    }

    EarlyWebSocket.prototype = NativeWebSocket.prototype;
    Object.setPrototypeOf(EarlyWebSocket, NativeWebSocket);
    page.WebSocket = EarlyWebSocket;
    page.__BAIAKIDLE_EARLY_WS__ = {
      native: NativeWebSocket,
      subscribe(subscriber) {
        subscribers.push(subscriber);
        for (const record of records) subscriber(record);
      }
    };
  }

  GM_xmlhttpRequest({
    method: "GET",
    url: "http://127.0.0.1:8947/baiakidle-bridge.user.js?t=" + Date.now(),
    onload: response => {
      if (response.status !== 200) {
        console.error("[BaiakIdle MCP DEV] bundle HTTP", response.status);
        return;
      }
      eval(response.responseText + "\\n//# sourceURL=baiakidle-mcp.dev.js");
    },
    onerror: error => console.error("[BaiakIdle MCP DEV] run npm run dev", error)
  });
})();
`;

const file = "dist/baiakidle-bridge.user.js";
await Promise.all([
  writeFile(file, banner + await readFile(file, "utf8")),
  writeFile("dist/baiakidle-bridge.dev.user.js", devLoader)
]);