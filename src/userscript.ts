import { createSocketRole, observeSocket, type SocketRole } from "./socket-role";

declare const unsafeWindow: Window & typeof globalThis;
declare function GM_xmlhttpRequest(details: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
  onload?: (response: { responseText: string; status: number }) => void;
  onerror?: () => void;
}): void;

const BRIDGE = "ws://127.0.0.1:8945/browser";
const BRIDGE_HTTP = "http://127.0.0.1:8945";
const page = unsafeWindow;
const monitored = /^wss?:\/\/(?:rt\d+\.)?baiakidle\.com(?:\/|$)/i;
const clip = (value: unknown) => String(value ?? "").slice(0, 20_000);
const MAX_BINARY_BYTES = 256 * 1024;
const sockets = new Map<string, WebSocket>();
const socketRoles = new Map<WebSocket, SocketRole>();
const monitoredSocketInstances = new WeakSet<WebSocket>();
const pendingEvents: string[] = [];
let bridgeSocket: WebSocket | undefined;
let httpFlushPending = false;

type SocketData = string | Blob | ArrayBufferLike | ArrayBufferView;
type CapturedSocketEvent =
  | { type: "message" | "send"; data: SocketData }
  | { type: "close"; code: number; reason: string }
  | { type: "error" };
type EarlySocketRecord = {
  url: string;
  socket: WebSocket;
  events: CapturedSocketEvent[];
  dispatch: ((event: CapturedSocketEvent) => void) | null;
};
type EarlySocketHook = {
  native: typeof WebSocket;
  subscribe: (subscriber: (record: EarlySocketRecord) => void) => void;
};
const earlyHook = (page as typeof page & {
  __BAIAKIDLE_EARLY_WS__?: EarlySocketHook;
}).__BAIAKIDLE_EARLY_WS__;

async function toBytes(value: Blob | ArrayBufferLike | ArrayBufferView): Promise<Uint8Array> {
  if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return new Uint8Array(value);
}

function classifySocket(url: string, socket: WebSocket, bytes: Uint8Array): void {
  const role = socketRoles.get(socket)!;
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
}

function emit(event: Record<string, unknown>): void {
  const message = JSON.stringify({
    type: "event",
    event: {
      ...event,
      time: new Date().toISOString(),
      page: page.location.href
    }
  });
  if (bridgeSocket?.readyState === 1 && bridgeSocket.bufferedAmount < 4 * 1024 * 1024) {
    bridgeSocket.send(message);
  } else {
    pendingEvents.push(message);
    if (pendingEvents.length > 500) pendingEvents.shift();
  }
}

async function encodeBinary(value: Blob | ArrayBufferLike | ArrayBufferView): Promise<Record<string, unknown>> {
  const bytes = await toBytes(value);

  const captured = bytes.subarray(0, MAX_BINARY_BYTES);
  let binary = "";
  for (let offset = 0; offset < captured.length; offset += 0x8000) {
    binary += String.fromCharCode(...captured.subarray(offset, offset + 0x8000));
  }

  return {
    encoding: "base64",
    byteLength: bytes.byteLength,
    truncated: bytes.byteLength > captured.byteLength,
    data: btoa(binary),
    hexPreview: [...captured.subarray(0, 64)]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("")
  };
}

function handleSocketEvent(url: string, socket: WebSocket, event: CapturedSocketEvent): void {
  if (event.type === "message") {
    if (typeof event.data === "string") {
      classifySocket(url, socket, new TextEncoder().encode(event.data));
      emit({ type: "ws_message", url, encoding: "text", data: clip(event.data) });
      return;
    }
    void toBytes(event.data).then(bytes => {
      classifySocket(url, socket, bytes);
      return encodeBinary(bytes);
    }).then(payload => emit({ type: "ws_message", url, ...payload }));
  } else if (event.type === "send") {
    if (typeof event.data === "string") {
      emit({ type: "ws_send", url, encoding: "text", data: clip(event.data) });
    } else {
      void encodeBinary(event.data).then(payload => emit({ type: "ws_send", url, ...payload }));
    }
  } else if (event.type === "close") {
    sockets.delete(url);
    socketRoles.delete(socket);
    emit({ type: "ws_close", url, code: event.code, reason: event.reason });
  } else {
    emit({ type: "ws_error", url });
  }
}

function monitorSocket(
  url: string,
  socket: WebSocket,
  earlyRecord?: EarlySocketRecord
): void {
  if (!monitored.test(url) || monitoredSocketInstances.has(socket)) return;
  monitoredSocketInstances.add(socket);
  emit({ type: "ws_open", url, early: Boolean(earlyRecord) });
  sockets.set(url, socket);
  socketRoles.set(socket, createSocketRole());
  const dispatch = (event: CapturedSocketEvent) => handleSocketEvent(url, socket, event);

  if (earlyRecord) {
    earlyRecord.dispatch = dispatch;
    for (const event of earlyRecord.events.splice(0)) dispatch(event);
    return;
  }

  socket.addEventListener("message", event => dispatch({ type: "message", data: event.data }));
  socket.addEventListener("close", event =>
    dispatch({ type: "close", code: event.code, reason: event.reason })
  );
  socket.addEventListener("error", () => dispatch({ type: "error" }));
  const nativeSend = socket.send;
  socket.send = function (data: SocketData): void {
    dispatch({ type: "send", data });
    nativeSend.call(this, data);
  };
}

const NativeWebSocket = earlyHook?.native ?? page.WebSocket;
if (earlyHook) {
  earlyHook.subscribe(record => monitorSocket(record.url, record.socket, record));
}
const CurrentWebSocket = page.WebSocket;
function MonitoredWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
  const socket = protocols === undefined
    ? new CurrentWebSocket(url)
    : new CurrentWebSocket(url, protocols);
  monitorSocket(String(url), socket);
  return socket;
}
MonitoredWebSocket.prototype = CurrentWebSocket.prototype;
Object.setPrototypeOf(MonitoredWebSocket, CurrentWebSocket);
page.WebSocket = MonitoredWebSocket as unknown as typeof WebSocket;

const nativePrototypeSend = NativeWebSocket.prototype.send;
NativeWebSocket.prototype.send = function (data: SocketData): void {
  const url = String(this.url);
  if (monitored.test(url) && !monitoredSocketInstances.has(this)) {
    monitorSocket(url, this);
    handleSocketEvent(url, this, { type: "send", data });
  }
  nativePrototypeSend.call(this, data);
};

const nativeFetch = page.fetch;
page.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  emit({ type: "fetch", url, method: init?.method ?? "GET" });
  return nativeFetch.call(this, input, init);
};

const nativeOpen = page.XMLHttpRequest.prototype.open as (
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  async?: boolean,
  username?: string | null,
  password?: string | null
) => void;
page.XMLHttpRequest.prototype.open = function (
  method: string,
  url: string | URL,
  async: boolean = true,
  username?: string | null,
  password?: string | null
): void {
  const requestUrl = String(url);
  emit({ type: "xhr", method, url: requestUrl });
  if (requestUrl.includes("/rt/matchmake/")) {
    this.addEventListener("loadend", () => {
      let responseText = "";
      try { responseText = this.responseText; } catch {}
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

function gameplaySocket(targetHost?: string): [string, WebSocket] | undefined {
  return [...sockets.entries()]
    .filter(([url, socket]) =>
      socket.readyState === WebSocket.OPEN &&
      (!targetHost || new URL(url).host === targetHost) &&
      !socketRoles.get(socket)?.chat &&
      (socketRoles.get(socket)?.signals.size ?? 0) > 0
    )
    .sort(([, a], [, b]) =>
      (socketRoles.get(b)?.score ?? 0) - (socketRoles.get(a)?.score ?? 0)
    )[0];
}

function sendRawPacket(command: {
  base64: string;
  targetHost?: string;
  source?: string;
}): boolean {
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
  const bytes = Uint8Array.from(atob(command.base64), char => char.charCodeAt(0));
  entry[1].send(bytes);
  const role = socketRoles.get(entry[1])!;
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
}

type PageBridgeApi = {
  version: 1;
  gameplayConnected: () => boolean;
  sendRawPacket: (base64: string, source?: string) => boolean;
};

Object.defineProperty(page, "__BAIAKIDLE_MCP_BRIDGE__", {
  configurable: true,
  value: Object.freeze<PageBridgeApi>({
    version: 1,
    gameplayConnected: () => Boolean(gameplaySocket()),
    sendRawPacket: (base64, source) => sendRawPacket({ base64, source })
  })
});

let lastLootPouchStatus = "";
let lastGloothBagStatus = "";

function monitorLootPouch(): void {
  const text = page.document.getElementById("inv-count")?.textContent ?? "";
  const match = /^\s*(\d+)\s*\/\s*(\d+)/.exec(text);
  if (!match) return;

  const current = Number(match[1]);
  const capacity = Number(match[2]);
  const full = capacity > 0 && current >= capacity;
  const sellButton = page.document.getElementById("sell-all") as HTMLButtonElement | null;
  const cooldown = Boolean(sellButton?.disabled || sellButton?.classList.contains("cd"));
  const status = `${current}/${capacity}:${cooldown}`;
  if (status === lastLootPouchStatus) return;
  lastLootPouchStatus = status;
  emit({ type: "loot_pouch_status", current, capacity, full, cooldown });
}

function monitorGloothBag(): void {
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
}
function pageSnapshot(requestId?: string): Record<string, unknown> {
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
    html: html.slice(0, 500_000),
    htmlTruncated: html.length > 500_000,
    text: text.slice(0, 100_000),
    textTruncated: text.length > 100_000,
    links: [...page.document.links].slice(0, 500).map(link => ({ text: clip(link.textContent), href: link.href })),
    forms: [...page.document.forms].map(form => ({ id: form.id, action: form.action, method: form.method })),
    scripts: [...page.document.scripts].map(script => script.src || "inline").slice(0, 500),
    localStorageKeys: Object.keys(page.localStorage)
  };
}

function inspectSelector(selector: string, limit: number, requestId?: string): Record<string, unknown> {
  const cappedLimit = Math.min(Math.max(limit, 1), 100);
  try {
    const matches = [...page.document.querySelectorAll(selector)].slice(0, cappedLimit);
    return {
      type: "selector_result",
      requestId,
      selector,
      count: page.document.querySelectorAll(selector).length,
      elements: matches.map(element => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          classes: [...element.classList],
          text: clip(element.textContent),
          html: element.outerHTML.slice(0, 20_000),
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
}

type BridgeCommand =
  | { type: "send_raw_packet"; base64: string; targetHost?: string; requestId?: string }
  | { type: "snapshot_page"; requestId?: string }
  | { type: "inspect_selector"; selector: string; limit?: number; requestId?: string }
  | { type: "reload_page" };

function handleCommand(command: BridgeCommand): void {
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
}

function flushHttpFallback(): void {
  if (bridgeSocket?.readyState === 1 || httpFlushPending || pendingEvents.length === 0) return;
  const messages = pendingEvents.splice(0, 100);
  const events = messages.map(message =>
    (JSON.parse(message) as { event: Record<string, unknown> }).event
  );
  httpFlushPending = true;
  const retry = () => {
    pendingEvents.unshift(...messages);
    if (pendingEvents.length > 500) pendingEvents.splice(0, pendingEvents.length - 500);
    httpFlushPending = false;
  };
  GM_xmlhttpRequest({
    method: "POST",
    url: `${BRIDGE_HTTP}/events`,
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(events),
    onload: response => {
      if (response.status !== 202) retry();
      else httpFlushPending = false;
    },
    onerror: retry
  });
}

function pollHttpFallback(): void {
  if (bridgeSocket?.readyState === 1) return;
  GM_xmlhttpRequest({
    method: "GET",
    url: `${BRIDGE_HTTP}/commands`,
    onload: response => {
      if (response.status !== 200) return;
      try {
        for (const command of JSON.parse(response.responseText) as BridgeCommand[]) {
          handleCommand(command);
        }
      } catch {}
    }
  });
}

function connectBridge(): void {
  const socket = new WebSocket(BRIDGE);
  bridgeSocket = socket;
  socket.addEventListener("open", () => {
    emit({
      type: "ready",
      transport: "websocket",
      hook: "unsafeWindow-direct",
      bootstrap: Boolean(earlyHook)
    });
    for (const message of pendingEvents.splice(0)) socket.send(message);
    console.info("[BaiakIdle monitor] bridge connected", BRIDGE);
  });
  socket.addEventListener("message", event => {
    try {
      const message = JSON.parse(String(event.data)) as {
        type?: string;
        command?: BridgeCommand;
      };
      if (message.type === "command" && message.command) handleCommand(message.command);
    } catch (error) {
      console.error("[BaiakIdle monitor] invalid bridge command", error);
    }
  });
  socket.addEventListener("close", () => {
    if (bridgeSocket === socket) bridgeSocket = undefined;
    setTimeout(connectBridge, 1_000);
  });
  socket.addEventListener("error", () => socket.close());
}

setInterval(monitorLootPouch, 500);
setInterval(monitorGloothBag, 500);
setInterval(flushHttpFallback, 500);
setInterval(pollHttpFallback, 1_000);
monitorLootPouch();
monitorGloothBag();
connectBridge();
setTimeout(() => {
  if (bridgeSocket?.readyState !== 1) {
    emit({
      type: "ready",
      transport: "http-batch-fallback",
      hook: "unsafeWindow-direct",
      bootstrap: Boolean(earlyHook)
    });
  }
}, 1_000);
