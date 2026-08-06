(function() {
  "use strict";
  const gameplaySignals = [
    "combatlog",
    "sellcd",
    "gear",
    "supply",
    "effect",
    "attack",
    "hit",
    "heal",
    "death",
    "gold",
    "citypos"
  ];
  const decoder = new TextDecoder();
  function createSocketRole() {
    return { score: 0, messages: 0, signals: /* @__PURE__ */ new Set(), chat: false };
  }
  function messageType(bytes) {
    if (bytes[0] !== 13) return "";
    const prefix = bytes[1];
    let offset = 2;
    let length = 0;
    if ((prefix & 224) === 160) length = prefix & 31;
    else if (prefix === 217) {
      length = bytes[2];
      offset = 3;
    } else if (prefix === 218) {
      length = bytes[2] << 8 | bytes[3];
      offset = 4;
    } else return "";
    return decoder.decode(bytes.subarray(offset, offset + length)).toLowerCase();
  }
  function observeSocket(role, bytes) {
    role.messages += 1;
    role.score += 1;
    if (role.chat || role.signals.size > 0) return;
    if (messageType(bytes) === "chat") {
      role.chat = true;
      role.signals.add("chat");
      role.score = -1e3;
      return;
    }
    const sample = decoder.decode(bytes.subarray(0, 4096)).toLowerCase();
    for (const signal of gameplaySignals) {
      if (sample.includes(signal) && !role.signals.has(signal)) {
        role.signals.add(signal);
        role.score += 25;
      }
    }
  }
  const BRIDGE = "ws://127.0.0.1:8945/browser";
  const page = unsafeWindow;
  const runtimePage = page;
  if (runtimePage.__BAIAKIDLE_MCP_MONITOR__ || runtimePage.__BAIAKIDLE_MCP_BRIDGE__) {
    console.info("[BaiakIdle monitor] duplicate userscript ignored");
  } else {
    let classifySocket = function(url, socket, bytes) {
      const role = socketRoles.get(socket);
      const previous = `${role.chat}:${[...role.signals]}`;
      observeSocket(role, bytes);
      if (previous !== `${role.chat}:${[...role.signals]}`) {
        emit({
          type: "socket_role",
          url,
          role: role.chat ? "chat" : "gameplay",
          score: role.score,
          messages: role.messages,
          signals: [...role.signals]
        });
      }
    }, collectorOnline = function() {
      return bridgeSocket?.readyState === WebSocket.OPEN && bridgeSocket.bufferedAmount < 4 * 1024 * 1024;
    }, flushEvents = function() {
      if (eventFlushTimer !== void 0) page.clearTimeout(eventFlushTimer);
      eventFlushTimer = void 0;
      if (!eventBatch.length) return;
      if (!collectorOnline()) {
        eventBatch.length = 0;
        return;
      }
      bridgeSocket.send(JSON.stringify({ type: "events", events: eventBatch.splice(0) }));
    }, emit = function(event) {
      if (!collectorOnline()) return;
      eventBatch.push({
        ...event,
        time: (/* @__PURE__ */ new Date()).toISOString(),
        page: page.location.href
      });
      if (event.requestId || eventBatch.length >= 50) flushEvents();
      else eventFlushTimer ??= page.setTimeout(flushEvents, 50);
    }, handleSocketEvent = function(url, socket, event) {
      if (event.type === "message") {
        if (typeof event.data === "string") {
          classifySocket(url, socket, new TextEncoder().encode(event.data));
          if (!collectorOnline()) {
            droppedSocketEvents += 1;
            return;
          }
          emit({ type: "ws_message", url, encoding: "text", data: clip(event.data) });
          return;
        }
        void toBytes(event.data).then((bytes) => {
          classifySocket(url, socket, bytes);
          if (!collectorOnline()) {
            droppedSocketEvents += 1;
            return;
          }
          return encodeBinary(bytes);
        }).then((payload) => {
          if (payload) emit({ type: "ws_message", url, ...payload });
        });
      } else if (event.type === "send") {
        if (!collectorOnline()) {
          droppedSocketEvents += 1;
          return;
        }
        if (typeof event.data === "string") {
          emit({ type: "ws_send", url, encoding: "text", data: clip(event.data) });
        } else {
          void encodeBinary(event.data).then((payload) => emit({ type: "ws_send", url, ...payload }));
        }
      } else if (event.type === "close") {
        sockets.delete(url);
        socketRoles.delete(socket);
        emit({ type: "ws_close", url, code: event.code, reason: event.reason });
      } else {
        emit({ type: "ws_error", url });
      }
    }, monitorSocket = function(url, socket, earlyRecord) {
      if (!monitored.test(url) || monitoredSocketInstances.has(socket)) return;
      monitoredSocketInstances.add(socket);
      emit({ type: "ws_open", url, early: Boolean(earlyRecord) });
      sockets.set(url, socket);
      socketRoles.set(socket, createSocketRole());
      const dispatch = (event) => handleSocketEvent(url, socket, event);
      if (earlyRecord) {
        earlyRecord.dispatch = dispatch;
        for (const event of earlyRecord.events.splice(0)) dispatch(event);
        return;
      }
      socket.addEventListener("message", (event) => dispatch({ type: "message", data: event.data }));
      socket.addEventListener(
        "close",
        (event) => dispatch({ type: "close", code: event.code, reason: event.reason })
      );
      socket.addEventListener("error", () => dispatch({ type: "error" }));
      const nativeSend = socket.send;
      socket.send = function(data) {
        dispatch({ type: "send", data });
        nativeSend.call(this, data);
      };
    }, MonitoredWebSocket = function(url, protocols) {
      const socket = protocols === void 0 ? new CurrentWebSocket(url) : new CurrentWebSocket(url, protocols);
      monitorSocket(String(url), socket);
      return socket;
    }, gameplaySocket = function(targetHost) {
      return [...sockets.entries()].filter(
        ([url, socket]) => socket.readyState === WebSocket.OPEN && (!targetHost || new URL(url).host === targetHost) && !socketRoles.get(socket)?.chat && (socketRoles.get(socket)?.signals.size ?? 0) > 0
      ).sort(
        ([, a], [, b]) => (socketRoles.get(b)?.score ?? 0) - (socketRoles.get(a)?.score ?? 0)
      )[0];
    }, sendRawPacket = function(command) {
      const entry = gameplaySocket(command.targetHost);
      if (!entry) {
        emit({
          type: "command_result",
          command: "send_raw_packet",
          source: command.source,
          ok: false,
          error: "gameplay socket not found"
        });
        return false;
      }
      const bytes = Uint8Array.from(atob(command.base64), (char) => char.charCodeAt(0));
      entry[1].send(bytes);
      const role = socketRoles.get(entry[1]);
      emit({
        type: "command_result",
        command: "send_raw_packet",
        source: command.source,
        ok: true,
        url: entry[0],
        byteLength: bytes.byteLength,
        socketScore: role.score,
        socketMessages: role.messages,
        socketSignals: [...role.signals]
      });
      return true;
    }, monitorLootPouch = function() {
      const text = page.document.getElementById("inv-count")?.textContent ?? "";
      const match = /^\s*(\d+)\s*\/\s*(\d+)/.exec(text);
      if (!match) return;
      const current = Number(match[1]);
      const capacity = Number(match[2]);
      const full = capacity > 0 && current >= capacity;
      const sellButton = page.document.getElementById("sell-all");
      const cooldown = Boolean(sellButton?.disabled || sellButton?.classList.contains("cd"));
      const status = `${current}/${capacity}:${cooldown}`;
      if (status === lastLootPouchStatus) return;
      lastLootPouchStatus = status;
      emit({ type: "loot_pouch_status", current, capacity, full, cooldown });
    }, monitorGloothBag = function() {
      const counter = /^\s*(\d+)\s*\/\s*(\d+)/.exec(
        page.document.getElementById("inv-count")?.textContent ?? ""
      );
      const hasBag = Boolean(
        page.document.querySelector('#backpack-grid img[alt="glooth bag"]')
      );
      const current = Number(counter?.[1] ?? 0);
      const capacity = Number(counter?.[2] ?? 0);
      const full = capacity <= 0 || current >= capacity;
      const sellCooldown = Boolean(
        page.document.getElementById("sell-all")?.classList.contains("cd")
      );
      const status = `${hasBag}:${current}/${capacity}:${sellCooldown}`;
      if (status === lastGloothBagStatus) return;
      lastGloothBagStatus = status;
      emit({
        type: "glooth_bag_status",
        hasBag,
        current,
        capacity,
        full,
        sellCooldown
      });
    }, pageSnapshot = function(requestId) {
      const html = page.document.documentElement?.outerHTML ?? "";
      const text = page.document.body?.innerText ?? "";
      return {
        type: "page_snapshot",
        requestId,
        url: page.location.href,
        title: page.document.title,
        readyState: page.document.readyState,
        viewport: { width: page.innerWidth, height: page.innerHeight, devicePixelRatio: page.devicePixelRatio },
        activeElement: page.document.activeElement?.tagName ?? null,
        html: html.slice(0, 5e5),
        htmlTruncated: html.length > 5e5,
        text: text.slice(0, 1e5),
        textTruncated: text.length > 1e5,
        links: [...page.document.links].slice(0, 500).map((link) => ({ text: clip(link.textContent), href: link.href })),
        forms: [...page.document.forms].map((form) => ({ id: form.id, action: form.action, method: form.method })),
        scripts: [...page.document.scripts].map((script) => script.src || "inline").slice(0, 500),
        localStorageKeys: Object.keys(page.localStorage)
      };
    }, inspectSelector = function(selector, limit, requestId) {
      const cappedLimit = Math.min(Math.max(limit, 1), 100);
      try {
        const matches = [...page.document.querySelectorAll(selector)].slice(0, cappedLimit);
        return {
          type: "selector_result",
          requestId,
          selector,
          count: page.document.querySelectorAll(selector).length,
          elements: matches.map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              id: element.id,
              classes: [...element.classList],
              text: clip(element.textContent),
              html: element.outerHTML.slice(0, 2e4),
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            };
          })
        };
      } catch (error) {
        return {
          type: "selector_result",
          requestId,
          selector,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }, handleCommand = function(command) {
      if (command.type === "send_raw_packet") {
        const ok = sendRawPacket(command);
        if (command.requestId) emit({ type: "command_result", requestId: command.requestId, command: command.type, ok });
      } else if (command.type === "snapshot_page") {
        emit(pageSnapshot(command.requestId));
      } else if (command.type === "inspect_selector") {
        emit(inspectSelector(command.selector, command.limit ?? 20, command.requestId));
      } else if (command.type === "reload_page") {
        emit({ type: "command_result", command: "reload_page", ok: true });
        setTimeout(() => page.location.reload(), 100);
      }
    }, connectBridge = function() {
      const socket = new WebSocket(BRIDGE);
      bridgeSocket = socket;
      socket.addEventListener("open", () => {
        reconnectDelay = 1e3;
        const dropped = droppedSocketEvents;
        droppedSocketEvents = 0;
        emit({
          type: "ready",
          transport: "websocket",
          hook: "unsafeWindow-direct",
          bootstrap: Boolean(earlyHook),
          droppedWhileOffline: dropped
        });
        console.info("[BaiakIdle monitor] bridge connected", BRIDGE);
      });
      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === "command" && message.command) handleCommand(message.command);
        } catch (error) {
          console.error("[BaiakIdle monitor] invalid bridge command", error);
        }
      });
      socket.addEventListener("close", (event) => {
        if (bridgeSocket === socket) bridgeSocket = void 0;
        if (event.code === 4002) {
          console.info("[BaiakIdle monitor] duplicate bridge connection stopped");
          return;
        }
        const delay = reconnectDelay;
        reconnectDelay = Math.min(reconnectDelay * 2, 3e4);
        setTimeout(connectBridge, delay);
      });
      socket.addEventListener("error", () => socket.close());
    };
    Object.defineProperty(runtimePage, "__BAIAKIDLE_MCP_MONITOR__", {
      configurable: true,
      value: true
    });
    const monitored = /^wss?:\/\/(?:rt\d+\.)?baiakidle\.com(?:\/|$)/i;
    const clip = (value) => String(value ?? "").slice(0, 2e4);
    const MAX_BINARY_BYTES = 64 * 1024;
    const sockets = /* @__PURE__ */ new Map();
    const socketRoles = /* @__PURE__ */ new Map();
    const monitoredSocketInstances = /* @__PURE__ */ new WeakSet();
    let bridgeSocket;
    let droppedSocketEvents = 0;
    let reconnectDelay = 1e3;
    const eventBatch = [];
    let eventFlushTimer;
    const earlyHook = page.__BAIAKIDLE_EARLY_WS__;
    async function toBytes(value) {
      if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
      if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      return new Uint8Array(value);
    }
    async function encodeBinary(value) {
      const bytes = await toBytes(value);
      const captured = bytes.subarray(0, MAX_BINARY_BYTES);
      let binary = "";
      for (let offset = 0; offset < captured.length; offset += 32768) {
        binary += String.fromCharCode(...captured.subarray(offset, offset + 32768));
      }
      return {
        encoding: "base64",
        byteLength: bytes.byteLength,
        truncated: bytes.byteLength > captured.byteLength,
        data: btoa(binary),
        hexPreview: [...captured.subarray(0, 64)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
      };
    }
    const NativeWebSocket = earlyHook?.native ?? page.WebSocket;
    if (earlyHook) {
      earlyHook.subscribe((record) => monitorSocket(record.url, record.socket, record));
    }
    const CurrentWebSocket = page.WebSocket;
    MonitoredWebSocket.prototype = CurrentWebSocket.prototype;
    Object.setPrototypeOf(MonitoredWebSocket, CurrentWebSocket);
    page.WebSocket = MonitoredWebSocket;
    const nativePrototypeSend = NativeWebSocket.prototype.send;
    NativeWebSocket.prototype.send = function(data) {
      const url = String(this.url);
      if (monitored.test(url) && !monitoredSocketInstances.has(this)) {
        monitorSocket(url, this);
        handleSocketEvent(url, this, { type: "send", data });
      }
      nativePrototypeSend.call(this, data);
    };
    const nativeFetch = page.fetch;
    page.fetch = function(input, init) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      emit({ type: "fetch", url, method: init?.method ?? "GET" });
      return nativeFetch.call(this, input, init);
    };
    const nativeOpen = page.XMLHttpRequest.prototype.open;
    page.XMLHttpRequest.prototype.open = function(method, url, async = true, username, password) {
      const requestUrl = String(url);
      emit({ type: "xhr", method, url: requestUrl });
      if (requestUrl.includes("/rt/matchmake/")) {
        this.addEventListener("loadend", () => {
          let responseText = "";
          try {
            responseText = this.responseText;
          } catch {
          }
          emit({
            type: "xhr_result",
            method,
            url: requestUrl,
            status: this.status,
            responseType: this.responseType,
            responseText: clip(responseText)
          });
        }, { once: true });
      }
      return nativeOpen.call(this, method, url, async, username, password);
    };
    Object.defineProperty(page, "__BAIAKIDLE_MCP_BRIDGE__", {
      configurable: true,
      value: Object.freeze({
        version: 1,
        gameplayConnected: () => Boolean(gameplaySocket()),
        sendRawPacket: (base64, source) => sendRawPacket({ base64, source })
      })
    });
    let lastLootPouchStatus = "";
    let lastGloothBagStatus = "";
    setInterval(monitorLootPouch, 500);
    setInterval(monitorGloothBag, 500);
    monitorLootPouch();
    monitorGloothBag();
    connectBridge();
  }
})();
