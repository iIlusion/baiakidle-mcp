import { describePacket, listKnownMessages } from "./protocol";

declare const unsafeWindow: (Window & typeof globalThis) | undefined;

const VERSION = "1.2.0";
const REQ_EVT = "baiakidle-mcp-request";
const RES_EVT = "baiakidle-mcp-response";
const READY_EVT = "baiakidle-mcp-ready";
const MAX_PACKETS = 1_500;
const MAX_QUERY = 100;
const page = (typeof unsafeWindow !== "undefined" ? unsafeWindow : window) as Window &
  typeof globalThis & {
    __BAIAKIDLE_MCP_MONITOR__?: true;
    __BAIAKIDLE_MCP_BRIDGE__?: unknown;
    __BAIAKIDLE_EARLY_WS__?: {
      native: typeof WebSocket;
      subscribe: (subscriber: (record: { url: string; socket: WebSocket }) => void) => void;
    };
  };

if (page.__BAIAKIDLE_MCP_MONITOR__ || page.__BAIAKIDLE_MCP_BRIDGE__) {
  console.info("[BaiakIdle monitor] duplicate hook ignored");
} else {
  Object.defineProperty(page, "__BAIAKIDLE_MCP_MONITOR__", { configurable: true, value: true });

  const NativeWS: typeof WebSocket = page.__BAIAKIDLE_EARLY_WS__?.native ?? page.WebSocket;
  const gameWs = /^wss?:\/\/(?:rt\d+\.)?baiakidle\.com(?:\/|$)/i;
  const sockets = new Map<string, WebSocket>();
  const seen = new WeakSet<WebSocket>();
  const packets: PacketEntry[] = [];
  let writeIndex = 0;

  type PacketEntry = {
    ts: number;
    direction: "incoming" | "outgoing";
    msgType?: string;
    category?: string;
    summary?: string;
    soldGold?: number;
    opcode?: number;
  };

  type RpcRequest = { id?: string; type?: string; method?: string; params?: Record<string, unknown> };

  const clip = (value: unknown, max: number) => String(value ?? "").slice(0, max);

  function peekSync(data: unknown, max: number): Uint8Array | null {
    if (typeof data === "string") return new TextEncoder().encode(data.slice(0, max));
    if (ArrayBuffer.isView(data)) {
      return new Uint8Array(data.buffer, data.byteOffset, Math.min(max, data.byteLength));
    }
    if (data instanceof ArrayBuffer) return new Uint8Array(data, 0, Math.min(max, data.byteLength));
    return null;
  }

  function pushPacket(entry: PacketEntry): void {
    if (packets.length < MAX_PACKETS) {
      packets.push(entry);
      return;
    }
    packets[writeIndex] = entry;
    writeIndex = (writeIndex + 1) % MAX_PACKETS;
  }

  function orderedPackets(): PacketEntry[] {
    return packets.length < MAX_PACKETS || writeIndex === 0
      ? packets
      : [...packets.slice(writeIndex), ...packets.slice(0, writeIndex)];
  }

  function onGameFrame(url: string, data: unknown, direction: PacketEntry["direction"]): void {
    const head = peekSync(data, 80);
    if (!head || head[0] !== 0x0d) return;
    let info = describePacket(head);
    if (info.msgType === "notify" || info.msgType === "log") {
      const body = peekSync(data, 2_048);
      if (body) info = describePacket(body);
    }
    pushPacket({
      ts: Date.now(),
      direction,
      msgType: info.msgType ?? undefined,
      category: info.category,
      summary: info.summary,
      soldGold: info.soldGold,
      opcode: info.opcode
    });
  }

  function trackSocket(url: string, socket: WebSocket): void {
    if (!gameWs.test(url) || seen.has(socket)) return;
    seen.add(socket);
    sockets.set(url, socket);
    socket.addEventListener("message", ev => onGameFrame(url, ev.data, "incoming"));
    const nativeSend = socket.send.bind(socket);
    socket.send = function send(data: Parameters<WebSocket["send"]>[0]) {
      try {
        onGameFrame(url, data, "outgoing");
      } catch {
        /* never block gameplay send */
      }
      return nativeSend(data);
    };
    socket.addEventListener("close", () => sockets.delete(url), { once: true });
  }

  function gameplaySocket(targetHost?: string): [string, WebSocket] | undefined {
    const open = [...sockets.entries()].filter(
      ([url, socket]) =>
        socket.readyState === WebSocket.OPEN && (!targetHost || new URL(url).host === targetHost)
    );
    return open.find(([url]) => url.includes("/rt")) ?? open[0];
  }

  function sendRawPacket(base64: string, targetHost?: string): boolean {
    const entry = gameplaySocket(targetHost);
    if (!entry) return false;
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    entry[1].send(bytes);
    return true;
  }

  page.__BAIAKIDLE_EARLY_WS__?.subscribe(record => trackSocket(record.url, record.socket));

  function TrackedWebSocket(url: string | URL, protocols?: string | string[]): WebSocket {
    const href = String(url);
    const socket = protocols === undefined ? new NativeWS(url) : new NativeWS(url, protocols);
    trackSocket(href, socket);
    return socket;
  }
  TrackedWebSocket.prototype = NativeWS.prototype;
  Object.setPrototypeOf(TrackedWebSocket, NativeWS);
  page.WebSocket = TrackedWebSocket as unknown as typeof WebSocket;

  Object.defineProperty(page, "__BAIAKIDLE_MCP_BRIDGE__", {
    configurable: true,
    value: Object.freeze({
      version: 1,
      gameplayConnected: () => Boolean(gameplaySocket()),
      sendRawPacket: (base64: string) => sendRawPacket(base64)
    })
  });

  function reply(id: string | undefined, result?: unknown, error?: string): void {
    if (!id) return;
    page.document.dispatchEvent(
      new CustomEvent(RES_EVT, { detail: JSON.stringify({ id, result, error }) })
    );
  }

  function hudText(id: string): string {
    return clip(page.document.getElementById(id)?.textContent, 80);
  }

  function snapshot(): Record<string, unknown> {
    return {
      url: page.location.href,
      title: page.document.title,
      readyState: page.document.readyState,
      version: VERSION,
      gameplayConnected: Boolean(gameplaySocket()),
      sockets: [...sockets.keys()],
      packets: packets.length,
      hud: {
        inv: hudText("inv-count"),
        backpack: hudText("backpack-count")
      }
    };
  }

  function summarizeElement(el: Element, includeHtml: boolean): Record<string, unknown> {
    const attrs: Record<string, string> = {};
    for (const attr of el.attributes) {
      if (attr.name === "class" || attr.name === "id") continue;
      attrs[attr.name] = attr.value.slice(0, 200);
    }
    const out: Record<string, unknown> = {
      tag: el.tagName.toLowerCase(),
      id: el.id,
      classes: [...el.classList],
      attrs,
      text: (el.textContent ?? "").trim().slice(0, 200)
    };
    if (includeHtml) out.html = el.outerHTML.slice(0, 2_000);
    return out;
  }

  function getPackets(params: Record<string, unknown>): PacketEntry[] {
    const limit = Math.min(MAX_QUERY, Math.max(1, Math.floor(Number(params.limit ?? 10))));
    const direction = params.direction === "incoming" || params.direction === "outgoing" ? params.direction : undefined;
    const since = typeof params.since === "number" ? params.since : undefined;
    const name = typeof params.name === "string" ? params.name.toLowerCase() : undefined;
    const msgType = typeof params.msgType === "string" ? params.msgType.toLowerCase() : undefined;
    const msgTypes = Array.isArray(params.msgTypes)
      ? new Set(params.msgTypes.map(v => String(v).toLowerCase()))
      : undefined;
    const categories = Array.isArray(params.categories)
      ? new Set(params.categories.map(v => String(v).toLowerCase()))
      : undefined;
    let entries = orderedPackets();
    if (direction) entries = entries.filter(e => e.direction === direction);
    if (since) entries = entries.filter(e => e.ts >= since);
    if (msgType) entries = entries.filter(e => e.msgType?.toLowerCase() === msgType);
    if (msgTypes?.size) entries = entries.filter(e => e.msgType && msgTypes.has(e.msgType.toLowerCase()));
    if (categories?.size) entries = entries.filter(e => e.category && categories.has(e.category.toLowerCase()));
    if (name) entries = entries.filter(e => e.msgType?.toLowerCase().includes(name) || e.summary?.toLowerCase().includes(name));
    return entries.slice(-limit);
  }

  function compact(value: unknown, depth = 0): unknown {
    if (value === null || typeof value !== "object") {
      if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
      return value;
    }
    if (depth >= 3) return "[nested]";
    if (typeof Element !== "undefined" && value instanceof Element) return summarizeElement(value, false);
    if (typeof Function !== "undefined" && value instanceof Function) return `[function ${value.name || "anonymous"}]`;
    if (Array.isArray(value)) {
      const items = value.slice(0, 32).map(item => compact(item, depth + 1));
      return value.length > items.length ? [...items, `[+${value.length - items.length}]`] : items;
    }
    const output: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>);
    for (const [key, item] of entries.slice(0, 24)) output[key] = compact(item, depth + 1);
    if (entries.length > 24) output.__omitted = entries.length - 24;
    return output;
  }

  async function handleMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (method === "packets.get" || method === "list_events") return getPackets(params);
    if (method === "packets.clear" || method === "clear_events") {
      packets.length = 0;
      writeIndex = 0;
      return { cleared: true };
    }
    if (method === "packets.send" || method === "send_raw_packet") {
      const base64 = String(params.base64 ?? "");
      if (!base64) throw new Error("base64 obrigatório");
      return { ok: sendRawPacket(base64, params.targetHost ? String(params.targetHost) : undefined) };
    }
    if (method === "dom.query" || method === "inspect_selector") {
      const selector = String(params.selector ?? "");
      const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 50);
      const includeHtml = Boolean(params.html);
      try {
        const all = page.document.querySelectorAll(selector);
        return {
          count: all.length,
          elements: [...all].slice(0, limit).map(el => summarizeElement(el, includeHtml))
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    }
    if (method === "dom.eval") {
      const code = String(params.code ?? "");
      const fn = new Function(`"use strict"; return (async () => { ${code} })();`);
      return compact(await fn());
    }
    if (method === "snapshot" || method === "snapshot_page") return snapshot();
    if (method === "status") return snapshot();
    if (method === "headers" || method === "list_headers") return { messages: listKnownMessages() };
    if (method === "reload" || method === "reload_page") {
      setTimeout(() => page.location.reload(), 50);
      return { ok: true };
    }
    if (method === "probe") {
      const out: Record<string, unknown> = { snapshot: snapshot() };
      if (params.dom && typeof params.dom === "object") {
        out.dom = await handleMethod("dom.query", params.dom as Record<string, unknown>);
      }
      if (params.packets && typeof params.packets === "object") {
        out.packets = getPackets(params.packets as Record<string, unknown>);
      } else {
        out.packets = getPackets({ limit: 10 });
      }
      return out;
    }
    throw new Error(`Método desconhecido: ${method}`);
  }

  function onRequest(raw: string): void {
    void (async () => {
      let request: RpcRequest;
      try {
        request = JSON.parse(raw) as RpcRequest;
      } catch {
        return;
      }
      if (request.type === "ping") {
        page.document.dispatchEvent(new CustomEvent(RES_EVT, { detail: JSON.stringify({ type: "pong" }) }));
        return;
      }
      const method = request.method ?? (request.type && request.type !== "command" ? request.type : undefined);
      const id = request.id;
      if (!method || !id) return;
      try {
        reply(id, await handleMethod(method, request.params ?? {}));
      } catch (error) {
        reply(id, undefined, error instanceof Error ? error.message : String(error));
      }
    })();
  }

  page.document.addEventListener(READY_EVT, () => {
    console.info("[BaiakIdle monitor]", VERSION, "ext-transport");
  });
  page.document.addEventListener(REQ_EVT, event => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === "string") onRequest(detail);
  });

  console.info("[BaiakIdle monitor]", VERSION, "genesis-style (in-page buffer, ext RPC)");
}
