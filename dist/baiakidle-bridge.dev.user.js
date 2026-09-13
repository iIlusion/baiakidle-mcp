// ==UserScript==
// @name BaiakIdle MCP Bridge DEV
// @namespace baiakidle-page-bridge
// @version 1.2.0-dev
// @match https://baiakidle.com/jogar/
// @match https://baiakidle.com/jogar/*
// @run-at document-start
// @sandbox raw
// @grant unsafeWindow
// @downloadURL none
// @updateURL none
// ==/UserScript==

(() => {
  const page = unsafeWindow;
  if (page.__BAIAKIDLE_MCP_MONITOR__ || page.__BAIAKIDLE_MCP_BRIDGE__) {
    console.info("[BaiakIdle MCP DEV] duplicate userscript ignored");
    return;
  }
  page.__BAIAKIDLE_MCP_MONITOR__ = true;
  const monitored = /^wss?:\/\/(?:rt\d+\.)?baiakidle\.com(?:\/|$)/i;

  if (!page.__BAIAKIDLE_EARLY_WS__) {
    const NativeWebSocket = page.WebSocket;
    const records = [];
    const subscribers = [];

    function EarlyWebSocket(url, protocols) {
      const socket = protocols === undefined
        ? new NativeWebSocket(url)
        : new NativeWebSocket(url, protocols);
      if (!monitored.test(String(url))) return socket;

      const record = { url: String(url), socket };

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
        delete page.__BAIAKIDLE_MCP_MONITOR__;
        console.error("[BaiakIdle MCP DEV] bundle HTTP", response.status);
        return;
      }
      delete page.__BAIAKIDLE_MCP_MONITOR__;
      eval(response.responseText + "\n//# sourceURL=baiakidle-mcp.dev.js");
    },
    onerror: error => {
      delete page.__BAIAKIDLE_MCP_MONITOR__;
      console.error("[BaiakIdle MCP DEV] run npm run dev", error);
    }
  });
})();
