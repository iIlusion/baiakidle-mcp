(function() {
  "use strict";
  const INCOMING = {
    ach: { name: "ach", direction: "in", category: "system", spam: false },
    addonbonus: { name: "addonbonus", direction: "in", category: "system", spam: false },
    arenaResult: { name: "arenaResult", direction: "in", category: "arena", spam: false },
    arenaStatus: { name: "arenaStatus", direction: "in", category: "arena", spam: false },
    aucshareerr: { name: "aucshareerr", direction: "in", category: "economy", spam: false },
    aucshareok: { name: "aucshareok", direction: "in", category: "economy", spam: false },
    auctionnotice: { name: "auctionnotice", direction: "in", category: "economy", spam: false },
    autobossstate: { name: "autobossstate", direction: "in", category: "nav", spam: false },
    banlist: { name: "banlist", direction: "in", category: "social", spam: false },
    banpreview: { name: "banpreview", direction: "in", category: "social", spam: false },
    bansearch: { name: "bansearch", direction: "in", category: "social", spam: false },
    benchequip: { name: "benchequip", direction: "in", category: "system", spam: false },
    broadcastnew: { name: "broadcastnew", direction: "in", category: "system", spam: false },
    broadcastok: { name: "broadcastok", direction: "in", category: "system", spam: false },
    buyresult: { name: "buyresult", direction: "in", category: "economy", spam: false },
    chat: { name: "chat", direction: "in", category: "chat", spam: true },
    chaterr: { name: "chaterr", direction: "in", category: "chat", spam: false },
    chatgaps: { name: "chatgaps", direction: "in", category: "chat", spam: true },
    chathist: { name: "chathist", direction: "in", category: "chat", spam: true },
    chatme: { name: "chatme", direction: "in", category: "chat", spam: true },
    chatsys: { name: "chatsys", direction: "in", category: "chat", spam: false },
    combatlog: { name: "combatlog", direction: "in", category: "combat", spam: true },
    cping: { name: "cping", direction: "in", category: "system", spam: true },
    dailyresult: { name: "dailyresult", direction: "in", category: "system", spam: false },
    dailystatus: { name: "dailystatus", direction: "in", category: "system", spam: false },
    deaths: { name: "deaths", direction: "in", category: "combat", spam: false },
    destroyresult: { name: "destroyresult", direction: "in", category: "economy", spam: false },
    features: { name: "features", direction: "in", category: "system", spam: false },
    forgestepres: { name: "forgestepres", direction: "in", category: "system", spam: false },
    fx: { name: "fx", direction: "in", category: "vfx", spam: true },
    gmreply: { name: "gmreply", direction: "in", category: "social", spam: false },
    go: { name: "go", direction: "in", category: "nav", spam: false },
    goldinbox: { name: "goldinbox", direction: "in", category: "economy", spam: false },
    grantconfirm: { name: "grantconfirm", direction: "in", category: "system", spam: false },
    guildmsg: { name: "guildmsg", direction: "in", category: "social", spam: false },
    guildwaratk: { name: "guildwaratk", direction: "in", category: "social", spam: false },
    houseinfo: { name: "houseinfo", direction: "in", category: "house", spam: false },
    houseresult: { name: "houseresult", direction: "in", category: "house", spam: false },
    huntgate: { name: "huntgate", direction: "in", category: "nav", spam: false },
    ignerr: { name: "ignerr", direction: "in", category: "social", spam: false },
    ignlist: { name: "ignlist", direction: "in", category: "social", spam: false },
    joined: { name: "joined", direction: "in", category: "system", spam: false },
    log: { name: "log", direction: "in", category: "system", spam: false },
    marketsync: { name: "marketsync", direction: "in", category: "economy", spam: false },
    mine: { name: "mine", direction: "in", category: "economy", spam: false },
    muteerr: { name: "muteerr", direction: "in", category: "social", spam: false },
    muteok: { name: "muteok", direction: "in", category: "social", spam: false },
    notify: { name: "notify", direction: "in", category: "system", spam: false },
    offlineInfo: { name: "offlineInfo", direction: "in", category: "system", spam: false },
    offlineReport: { name: "offlineReport", direction: "in", category: "system", spam: false },
    party: { name: "party", direction: "in", category: "party", spam: false },
    partyApplied: { name: "partyApplied", direction: "in", category: "party", spam: false },
    partyhunt: { name: "partyhunt", direction: "in", category: "party", spam: true },
    partystate: { name: "partystate", direction: "in", category: "party", spam: false },
    pm: { name: "pm", direction: "in", category: "chat", spam: false },
    pos: { name: "pos", direction: "in", category: "combat", spam: true },
    reconnectOk: { name: "reconnectOk", direction: "in", category: "system", spam: false },
    reperr: { name: "reperr", direction: "in", category: "social", spam: false },
    repok: { name: "repok", direction: "in", category: "social", spam: false },
    rerollstepres: { name: "rerollstepres", direction: "in", category: "system", spam: false },
    resume: { name: "resume", direction: "in", category: "nav", spam: false },
    say: { name: "say", direction: "in", category: "chat", spam: true },
    sayerr: { name: "sayerr", direction: "in", category: "chat", spam: false },
    serverdrop: { name: "serverdrop", direction: "in", category: "system", spam: false },
    shareerr: { name: "shareerr", direction: "in", category: "social", spam: false },
    shareitem: { name: "shareitem", direction: "in", category: "social", spam: false },
    shareok: { name: "shareok", direction: "in", category: "social", spam: false },
    staffhist: { name: "staffhist", direction: "in", category: "social", spam: false },
    staffinfo: { name: "staffinfo", direction: "in", category: "social", spam: false },
    takeover: { name: "takeover", direction: "in", category: "system", spam: false },
    testdmgreport: { name: "testdmgreport", direction: "in", category: "combat", spam: false },
    testdmgstate: { name: "testdmgstate", direction: "in", category: "combat", spam: true },
    toCity: { name: "toCity", direction: "in", category: "nav", spam: false },
    toHunt: { name: "toHunt", direction: "in", category: "nav", spam: false },
    viperr: { name: "viperr", direction: "in", category: "system", spam: false },
    viplist: { name: "viplist", direction: "in", category: "system", spam: false },
    who: { name: "who", direction: "in", category: "social", spam: false },
    // Common combat/system names seen on wire (not always in onMessage list)
    hit: { name: "hit", direction: "in", category: "combat", spam: true },
    heal: { name: "heal", direction: "in", category: "combat", spam: true },
    death: { name: "death", direction: "in", category: "combat", spam: true },
    attack: { name: "attack", direction: "in", category: "combat", spam: true },
    effect: { name: "effect", direction: "in", category: "vfx", spam: true },
    gold: { name: "gold", direction: "in", category: "economy", spam: false },
    sellcd: { name: "sellcd", direction: "in", category: "economy", spam: false },
    gear: { name: "gear", direction: "in", category: "system", spam: false },
    supply: { name: "supply", direction: "in", category: "economy", spam: false },
    citypos: { name: "citypos", direction: "in", category: "nav", spam: true },
    citypresence: { name: "citypresence", direction: "in", category: "nav", spam: true }
  };
  const OUTGOING = {
    PING: { name: "PING", direction: "out", category: "system", spam: true },
    PONG: { name: "PONG", direction: "out", category: "system", spam: true },
    achinfo: { name: "achinfo", direction: "out", category: "system", spam: false },
    appearance: { name: "appearance", direction: "out", category: "system", spam: false },
    aucshare: { name: "aucshare", direction: "out", category: "economy", spam: false },
    autosellfull: { name: "autosellfull", direction: "out", category: "economy", spam: false },
    autosellpct: { name: "autosellpct", direction: "out", category: "economy", spam: false },
    bagmove: { name: "bagmove", direction: "out", category: "economy", spam: false },
    boss: { name: "boss", direction: "out", category: "nav", spam: false },
    cityPos: { name: "cityPos", direction: "out", category: "nav", spam: true },
    cityPresence: { name: "cityPresence", direction: "out", category: "nav", spam: true },
    cpong: { name: "cpong", direction: "out", category: "system", spam: true },
    leaveearly: { name: "leaveearly", direction: "out", category: "nav", spam: false },
    mode: { name: "mode", direction: "out", category: "nav", spam: false },
    move: { name: "move", direction: "out", category: "combat", spam: true },
    msg: { name: "msg", direction: "out", category: "chat", spam: true },
    pm: { name: "pm", direction: "out", category: "chat", spam: false },
    say: { name: "say", direction: "out", category: "chat", spam: true },
    sellall: { name: "sellall", direction: "out", category: "economy", spam: false },
    stage: { name: "stage", direction: "out", category: "nav", spam: false },
    supplymove: { name: "supplymove", direction: "out", category: "economy", spam: false },
    tocity: { name: "tocity", direction: "out", category: "nav", spam: false },
    useitem: { name: "useitem", direction: "out", category: "economy", spam: false },
    usepotion: { name: "usepotion", direction: "out", category: "economy", spam: false },
    equip: { name: "equip", direction: "out", category: "system", spam: false },
    rotation: { name: "rotation", direction: "out", category: "combat", spam: true },
    turn: { name: "turn", direction: "out", category: "combat", spam: true },
    potion: { name: "potion", direction: "out", category: "combat", spam: true },
    potmove: { name: "potmove", direction: "out", category: "economy", spam: false },
    loop: { name: "loop", direction: "out", category: "nav", spam: false },
    ready: { name: "ready", direction: "out", category: "system", spam: true },
    who: { name: "who", direction: "out", category: "social", spam: false }
  };
  const BY_NAME = /* @__PURE__ */ new Map();
  for (const meta of Object.values(INCOMING)) BY_NAME.set(meta.name.toLowerCase(), meta);
  for (const meta of Object.values(OUTGOING)) {
    if (!BY_NAME.has(meta.name.toLowerCase())) BY_NAME.set(meta.name.toLowerCase(), meta);
  }
  function lookupMessage(name) {
    if (!name) {
      return { name: "?", direction: "both", category: "unknown", spam: false };
    }
    return BY_NAME.get(name.toLowerCase()) ?? {
      name,
      direction: "both",
      category: "unknown",
      spam: false
    };
  }
  function listKnownMessages() {
    return [...BY_NAME.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  const decoder$1 = new TextDecoder();
  function readRoomMessageHead(bytes) {
    if (bytes.length < 2) return { opcode: bytes[0] ?? 0, msgType: null, payloadOffset: 0 };
    const opcode = bytes[0];
    if (opcode !== 13) return { opcode, msgType: null, payloadOffset: 1 };
    const prefix = bytes[1];
    let offset = 2;
    let length = 0;
    if ((prefix & 224) === 160) {
      length = prefix & 31;
    } else if (prefix === 217) {
      if (bytes.length < 3) return { opcode, msgType: null, payloadOffset: 2 };
      length = bytes[2];
      offset = 3;
    } else if (prefix === 218) {
      if (bytes.length < 4) return { opcode, msgType: null, payloadOffset: 2 };
      length = (bytes[2] << 8 | bytes[3]) >>> 0;
      offset = 4;
    } else {
      return { opcode, msgType: null, payloadOffset: 2 };
    }
    if (length <= 0 || offset + length > bytes.length) {
      return { opcode, msgType: null, payloadOffset: offset };
    }
    try {
      const msgType = decoder$1.decode(bytes.subarray(offset, offset + length));
      return { opcode, msgType, payloadOffset: offset + length };
    } catch {
      return { opcode, msgType: null, payloadOffset: offset };
    }
  }
  function opcodeName(opcode) {
    switch (opcode) {
      case 10:
        return "JOIN_ROOM";
      case 13:
        return "ROOM_DATA";
      case 14:
        return "ROOM_STATE";
      case 15:
        return "ROOM_STATE_PATCH";
      case 20:
        return "ROOM_DATA_SCHEMA";
      default:
        return `OP_0x${opcode.toString(16)}`;
    }
  }
  const decoder = new TextDecoder();
  const SELL_RE = /vendidos|sold \{n\} items for|sold \{mc\} materials for/i;
  function readFixStr(bytes, offset) {
    if (offset >= bytes.length) return;
    const p = bytes[offset];
    let len = 0;
    let next = offset + 1;
    if ((p & 224) === 160) len = p & 31;
    else if (p === 217) {
      if (offset + 1 >= bytes.length) return;
      len = bytes[offset + 1];
      next = offset + 2;
    } else if (p === 218) {
      if (offset + 2 >= bytes.length) return;
      len = (bytes[offset + 1] << 8 | bytes[offset + 2]) >>> 0;
      next = offset + 3;
    } else return;
    if (next + len > bytes.length) return;
    try {
      return [decoder.decode(bytes.subarray(next, next + len)), next + len];
    } catch {
      return;
    }
  }
  function readUint(bytes, offset) {
    if (offset >= bytes.length) return;
    const p = bytes[offset];
    if (p <= 127) return [p, offset + 1];
    if (p === 204 && offset + 1 < bytes.length) return [bytes[offset + 1], offset + 2];
    if (p === 205 && offset + 2 < bytes.length) {
      return [(bytes[offset + 1] << 8 | bytes[offset + 2]) >>> 0, offset + 3];
    }
    if (p === 206 && offset + 4 < bytes.length) {
      return [
        bytes[offset + 1] * 16777216 + (bytes[offset + 2] << 16) + (bytes[offset + 3] << 8) + bytes[offset + 4],
        offset + 5
      ];
    }
  }
  function parseNotifyPreview(bytes) {
    const head = readRoomMessageHead(bytes);
    if (head.opcode !== 13 || !head.msgType) return;
    if (head.msgType !== "notify" && head.msgType !== "log") return;
    const needle = [164, 116, 101, 120, 116];
    let text;
    for (let i = head.payloadOffset; i < bytes.length - 6; i++) {
      let ok = true;
      for (let j = 0; j < needle.length; j++) {
        if (bytes[i + j] !== needle[j]) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      const s = readFixStr(bytes, i + needle.length);
      if (s) {
        text = s[0];
        break;
      }
    }
    if (!text) return;
    if (!SELL_RE.test(text)) return { text: text.slice(0, 200) };
    let g = 0;
    let mg = 0;
    for (let i = head.payloadOffset; i < bytes.length - 3; i++) {
      if (bytes[i] === 161 && bytes[i + 1] === 103) {
        const v = readUint(bytes, i + 2);
        if (v !== void 0 && v[0] > g) g = v[0];
      }
      if (bytes[i] === 162 && bytes[i + 1] === 109 && bytes[i + 2] === 103) {
        const v = readUint(bytes, i + 3);
        if (v !== void 0 && v[0] > mg) mg = v[0];
      }
    }
    const soldGold = g + mg;
    return {
      text: text.slice(0, 200),
      soldGold: soldGold > 0 ? soldGold : void 0
    };
  }
  function describePacket(bytes) {
    const head = readRoomMessageHead(bytes);
    const meta = lookupMessage(head.msgType);
    const base = {
      opcode: head.opcode,
      opcodeName: opcodeName(head.opcode),
      msgType: head.msgType,
      category: meta.category,
      // ROOM_DATA only. PATCH/STATE/SCHEMA floods freeze the page if we emit them.
      spam: meta.spam || head.opcode !== 13
    };
    if (head.msgType === "notify" || head.msgType === "log") {
      const n = parseNotifyPreview(bytes);
      if (n?.text) base.summary = n.text;
      if (n?.soldGold !== void 0) base.soldGold = n.soldGold;
    } else if (head.msgType) {
      base.summary = head.msgType;
    } else {
      base.summary = base.opcodeName;
    }
    return base;
  }
  const VERSION = "1.2.0";
  const REQ_EVT = "baiakidle-mcp-request";
  const RES_EVT = "baiakidle-mcp-response";
  const READY_EVT = "baiakidle-mcp-ready";
  const MAX_PACKETS = 1500;
  const MAX_QUERY = 100;
  const page = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  if (page.__BAIAKIDLE_MCP_MONITOR__ || page.__BAIAKIDLE_MCP_BRIDGE__) {
    console.info("[BaiakIdle monitor] duplicate hook ignored");
  } else {
    let peekSync = function(data, max) {
      if (typeof data === "string") return new TextEncoder().encode(data.slice(0, max));
      if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, Math.min(max, data.byteLength));
      }
      if (data instanceof ArrayBuffer) return new Uint8Array(data, 0, Math.min(max, data.byteLength));
      return null;
    }, pushPacket = function(entry) {
      if (packets.length < MAX_PACKETS) {
        packets.push(entry);
        return;
      }
      packets[writeIndex] = entry;
      writeIndex = (writeIndex + 1) % MAX_PACKETS;
    }, orderedPackets = function() {
      return packets.length < MAX_PACKETS || writeIndex === 0 ? packets : [...packets.slice(writeIndex), ...packets.slice(0, writeIndex)];
    }, onGameFrame = function(url, data, direction) {
      const head = peekSync(data, 80);
      if (!head || head[0] !== 13) return;
      let info = describePacket(head);
      if (info.msgType === "notify" || info.msgType === "log") {
        const body = peekSync(data, 2048);
        if (body) info = describePacket(body);
      }
      pushPacket({
        ts: Date.now(),
        direction,
        msgType: info.msgType ?? void 0,
        category: info.category,
        summary: info.summary,
        soldGold: info.soldGold,
        opcode: info.opcode
      });
    }, trackSocket = function(url, socket) {
      if (!gameWs.test(url) || seen.has(socket)) return;
      seen.add(socket);
      sockets.set(url, socket);
      socket.addEventListener("message", (ev) => onGameFrame(url, ev.data, "incoming"));
      const nativeSend = socket.send.bind(socket);
      socket.send = function send(data) {
        try {
          onGameFrame(url, data, "outgoing");
        } catch {
        }
        return nativeSend(data);
      };
      socket.addEventListener("close", () => sockets.delete(url), { once: true });
    }, gameplaySocket = function(targetHost) {
      const open = [...sockets.entries()].filter(
        ([url, socket]) => socket.readyState === WebSocket.OPEN && (!targetHost || new URL(url).host === targetHost)
      );
      return open.find(([url]) => url.includes("/rt")) ?? open[0];
    }, sendRawPacket = function(base64, targetHost) {
      const entry = gameplaySocket(targetHost);
      if (!entry) return false;
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      entry[1].send(bytes);
      return true;
    }, TrackedWebSocket = function(url, protocols) {
      const href = String(url);
      const socket = protocols === void 0 ? new NativeWS(url) : new NativeWS(url, protocols);
      trackSocket(href, socket);
      return socket;
    }, reply = function(id, result, error) {
      if (!id) return;
      page.document.dispatchEvent(
        new CustomEvent(RES_EVT, { detail: JSON.stringify({ id, result, error }) })
      );
    }, hudText = function(id) {
      return clip(page.document.getElementById(id)?.textContent, 80);
    }, snapshot = function() {
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
    }, summarizeElement = function(el, includeHtml) {
      const attrs = {};
      for (const attr of el.attributes) {
        if (attr.name === "class" || attr.name === "id") continue;
        attrs[attr.name] = attr.value.slice(0, 200);
      }
      const out = {
        tag: el.tagName.toLowerCase(),
        id: el.id,
        classes: [...el.classList],
        attrs,
        text: (el.textContent ?? "").trim().slice(0, 200)
      };
      if (includeHtml) out.html = el.outerHTML.slice(0, 2e3);
      return out;
    }, getPackets = function(params) {
      const limit = Math.min(MAX_QUERY, Math.max(1, Math.floor(Number(params.limit ?? 10))));
      const direction = params.direction === "incoming" || params.direction === "outgoing" ? params.direction : void 0;
      const since = typeof params.since === "number" ? params.since : void 0;
      const name = typeof params.name === "string" ? params.name.toLowerCase() : void 0;
      const msgType = typeof params.msgType === "string" ? params.msgType.toLowerCase() : void 0;
      const msgTypes = Array.isArray(params.msgTypes) ? new Set(params.msgTypes.map((v) => String(v).toLowerCase())) : void 0;
      const categories = Array.isArray(params.categories) ? new Set(params.categories.map((v) => String(v).toLowerCase())) : void 0;
      let entries = orderedPackets();
      if (direction) entries = entries.filter((e) => e.direction === direction);
      if (since) entries = entries.filter((e) => e.ts >= since);
      if (msgType) entries = entries.filter((e) => e.msgType?.toLowerCase() === msgType);
      if (msgTypes?.size) entries = entries.filter((e) => e.msgType && msgTypes.has(e.msgType.toLowerCase()));
      if (categories?.size) entries = entries.filter((e) => e.category && categories.has(e.category.toLowerCase()));
      if (name) entries = entries.filter((e) => e.msgType?.toLowerCase().includes(name) || e.summary?.toLowerCase().includes(name));
      return entries.slice(-limit);
    }, compact = function(value, depth = 0) {
      if (value === null || typeof value !== "object") {
        if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
        return value;
      }
      if (depth >= 3) return "[nested]";
      if (typeof Element !== "undefined" && value instanceof Element) return summarizeElement(value, false);
      if (typeof Function !== "undefined" && value instanceof Function) return `[function ${value.name || "anonymous"}]`;
      if (Array.isArray(value)) {
        const items = value.slice(0, 32).map((item) => compact(item, depth + 1));
        return value.length > items.length ? [...items, `[+${value.length - items.length}]`] : items;
      }
      const output = {};
      const entries = Object.entries(value);
      for (const [key, item] of entries.slice(0, 24)) output[key] = compact(item, depth + 1);
      if (entries.length > 24) output.__omitted = entries.length - 24;
      return output;
    }, onRequest = function(raw) {
      void (async () => {
        let request;
        try {
          request = JSON.parse(raw);
        } catch {
          return;
        }
        if (request.type === "ping") {
          page.document.dispatchEvent(new CustomEvent(RES_EVT, { detail: JSON.stringify({ type: "pong" }) }));
          return;
        }
        const method = request.method ?? (request.type && request.type !== "command" ? request.type : void 0);
        const id = request.id;
        if (!method || !id) return;
        try {
          reply(id, await handleMethod(method, request.params ?? {}));
        } catch (error) {
          reply(id, void 0, error instanceof Error ? error.message : String(error));
        }
      })();
    };
    Object.defineProperty(page, "__BAIAKIDLE_MCP_MONITOR__", { configurable: true, value: true });
    const NativeWS = page.__BAIAKIDLE_EARLY_WS__?.native ?? page.WebSocket;
    const gameWs = /^wss?:\/\/(?:rt\d+\.)?baiakidle\.com(?:\/|$)/i;
    const sockets = /* @__PURE__ */ new Map();
    const seen = /* @__PURE__ */ new WeakSet();
    const packets = [];
    let writeIndex = 0;
    const clip = (value, max) => String(value ?? "").slice(0, max);
    page.__BAIAKIDLE_EARLY_WS__?.subscribe((record) => trackSocket(record.url, record.socket));
    TrackedWebSocket.prototype = NativeWS.prototype;
    Object.setPrototypeOf(TrackedWebSocket, NativeWS);
    page.WebSocket = TrackedWebSocket;
    Object.defineProperty(page, "__BAIAKIDLE_MCP_BRIDGE__", {
      configurable: true,
      value: Object.freeze({
        version: 1,
        gameplayConnected: () => Boolean(gameplaySocket()),
        sendRawPacket: (base64) => sendRawPacket(base64)
      })
    });
    async function handleMethod(method, params) {
      if (method === "packets.get" || method === "list_events") return getPackets(params);
      if (method === "packets.clear" || method === "clear_events") {
        packets.length = 0;
        writeIndex = 0;
        return { cleared: true };
      }
      if (method === "packets.send" || method === "send_raw_packet") {
        const base64 = String(params.base64 ?? "");
        if (!base64) throw new Error("base64 obrigatório");
        return { ok: sendRawPacket(base64, params.targetHost ? String(params.targetHost) : void 0) };
      }
      if (method === "dom.query" || method === "inspect_selector") {
        const selector = String(params.selector ?? "");
        const limit = Math.min(Math.max(Number(params.limit ?? 10), 1), 50);
        const includeHtml = Boolean(params.html);
        try {
          const all = page.document.querySelectorAll(selector);
          return {
            count: all.length,
            elements: [...all].slice(0, limit).map((el) => summarizeElement(el, includeHtml))
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
        const out = { snapshot: snapshot() };
        if (params.dom && typeof params.dom === "object") {
          out.dom = await handleMethod("dom.query", params.dom);
        }
        if (params.packets && typeof params.packets === "object") {
          out.packets = getPackets(params.packets);
        } else {
          out.packets = getPackets({ limit: 10 });
        }
        return out;
      }
      throw new Error(`Método desconhecido: ${method}`);
    }
    page.document.addEventListener(READY_EVT, () => {
      console.info("[BaiakIdle monitor]", VERSION, "ext-transport");
    });
    page.document.addEventListener(REQ_EVT, (event) => {
      const detail = event.detail;
      if (typeof detail === "string") onRequest(detail);
    });
    console.info("[BaiakIdle monitor]", VERSION, "genesis-style (in-page buffer, ext RPC)");
  }
})();
