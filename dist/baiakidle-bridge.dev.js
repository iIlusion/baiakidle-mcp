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
  const decoder$2 = new TextDecoder();
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
    return decoder$2.decode(bytes.subarray(offset, offset + length)).toLowerCase();
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
    const sample = decoder$2.decode(bytes.subarray(0, 4096)).toLowerCase();
    for (const signal of gameplaySignals) {
      if (sample.includes(signal) && !role.signals.has(signal)) {
        role.signals.add(signal);
        role.score += 25;
      }
    }
  }
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
  function hexPreview(bytes, max = 48) {
    const n = Math.min(bytes.length, max);
    let out = "";
    for (let i = 0; i < n; i++) out += bytes[i].toString(16).padStart(2, "0");
    if (bytes.length > max) out += "…";
    return out;
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
      spam: meta.spam || head.opcode === 14 || head.opcode === 15
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
  const BRIDGE_HOST = "127.0.0.1:8945";
  const BRIDGE_STATUS = `http://${BRIDGE_HOST}/status`;
  const BRIDGE_POLL = "http://127.0.0.1:8946/browser/poll";
  const LOCAL_BRIDGE = /^wss?:\/\/127\.0\.0\.1:8945(?:\/|$)/i;
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
    }, gmHttp = function() {
      return typeof GM_xmlhttpRequest === "function";
    }, unhookedWebSocket = function() {
      if (RealWebSocket) return RealWebSocket;
      try {
        const iframe = page.document.createElement("iframe");
        iframe.style.display = "none";
        (page.document.documentElement ?? page.document.head ?? page.document.body).appendChild(iframe);
        const ctor = iframe.contentWindow?.WebSocket;
        iframe.remove();
        if (ctor) {
          RealWebSocket = ctor;
          return ctor;
        }
      } catch {
      }
      RealWebSocket = earlyHook?.native ?? page.WebSocket;
      return RealWebSocket;
    }, collectorOnline = function() {
      if (httpFallbackActive) return true;
      return bridgeSocket?.readyState === WebSocket.OPEN && bridgeSocket.bufferedAmount < 2 * 1024 * 1024;
    }, flushEvents = function() {
      if (eventFlushTimer !== void 0) page.clearTimeout(eventFlushTimer);
      eventFlushTimer = void 0;
      if (!eventBatch.length) return;
      if (!collectorOnline()) {
        droppedSocketEvents += eventBatch.length;
        eventBatch.length = 0;
        return;
      }
      if (httpFallbackActive || bridgeSocket?.readyState !== WebSocket.OPEN) return;
      const chunk = eventBatch.splice(0, 80);
      bridgeSocket.send(JSON.stringify({ type: "events", events: chunk }));
      if (eventBatch.length) eventFlushTimer = page.setTimeout(flushEvents, 0);
    }, emit = function(event) {
      if (!collectorOnline()) return;
      eventBatch.push({
        ...event,
        time: (/* @__PURE__ */ new Date()).toISOString(),
        page: page.location.href
      });
      if (event.requestId || eventBatch.length >= 40) flushEvents();
      else eventFlushTimer ??= page.setTimeout(flushEvents, 80);
    }, bytesToBase64 = function(bytes, max = 8192) {
      const captured = bytes.subarray(0, max);
      let binary = "";
      for (let offset = 0; offset < captured.length; offset += 32768) {
        binary += String.fromCharCode(...captured.subarray(offset, offset + 32768));
      }
      return { data: btoa(binary), truncated: bytes.byteLength > captured.byteLength };
    }, packetEvent = function(direction, url, bytes, role) {
      const info = describePacket(bytes);
      if (info.spam) {
        droppedSpam += 1;
        return null;
      }
      if (role?.chat && info.category === "chat") {
        droppedSpam += 1;
        return null;
      }
      const meta = lookupMessage(info.msgType);
      const keepBody = Boolean(info.msgType && FULL_BODY_TYPES.has(info.msgType));
      const event = {
        type: direction === "in" ? "ws_in" : "ws_out",
        url,
        role: role?.chat ? "chat" : "gameplay",
        opcode: info.opcode,
        opcodeName: info.opcodeName,
        msgType: info.msgType,
        category: info.category,
        summary: info.summary,
        byteLength: bytes.byteLength,
        hex: hexPreview(bytes, 40)
      };
      if (info.soldGold !== void 0) event.soldGold = info.soldGold;
      if (keepBody && bytes.byteLength <= 16384) {
        const body = bytesToBase64(bytes, 8192);
        event.encoding = "base64";
        event.data = body.data;
        event.truncated = body.truncated;
      }
      if (meta.name !== "?" && meta.name !== info.msgType) event.metaName = meta.name;
      return event;
    }, handleSocketEvent = function(url, socket, event) {
      if (event.type === "message") {
        if (typeof event.data === "string") {
          const encoded = new TextEncoder().encode(event.data);
          classifySocket(url, socket, encoded);
          if (!collectorOnline()) {
            droppedSocketEvents += 1;
            return;
          }
          emit({
            type: "ws_in",
            url,
            role: socketRoles.get(socket)?.chat ? "chat" : "gameplay",
            encoding: "text",
            summary: clip(event.data, 400),
            byteLength: encoded.byteLength
          });
          return;
        }
        void toBytes(event.data).then((bytes) => {
          classifySocket(url, socket, bytes);
          if (!collectorOnline()) {
            droppedSocketEvents += 1;
            return;
          }
          const packed = packetEvent("in", url, bytes, socketRoles.get(socket));
          if (packed) emit(packed);
        });
      } else if (event.type === "send") {
        if (!collectorOnline()) {
          droppedSocketEvents += 1;
          return;
        }
        if (typeof event.data === "string") {
          emit({
            type: "ws_out",
            url,
            role: socketRoles.get(socket)?.chat ? "chat" : "gameplay",
            encoding: "text",
            summary: clip(event.data, 400),
            byteLength: event.data.length
          });
        } else {
          void toBytes(event.data).then((bytes) => {
            const packed = packetEvent("out", url, bytes, socketRoles.get(socket));
            if (packed) emit(packed);
          });
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
      const href = String(url);
      if (LOCAL_BRIDGE.test(href)) {
        const Native = unhookedWebSocket();
        return protocols === void 0 ? new Native(url) : new Native(url, protocols);
      }
      const socket = protocols === void 0 ? new CurrentWebSocket(url) : new CurrentWebSocket(url, protocols);
      monitorSocket(href, socket);
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
      const info = describePacket(bytes);
      emit({
        type: "command_result",
        command: "send_raw_packet",
        source: command.source,
        ok: true,
        url: entry[0],
        msgType: info.msgType,
        byteLength: bytes.byteLength
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
      const sellCooldown = Boolean(sellButton?.classList.contains("cd"));
      const canSell = Boolean(sellButton && !sellButton.disabled && !sellCooldown);
      const status = `${current}/${capacity}:${sellCooldown}:${canSell}`;
      if (status === lastLootPouchStatus) return;
      lastLootPouchStatus = status;
      emit({ type: "loot_pouch_status", current, capacity, full, sellCooldown, canSell });
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
        // Cap hard — giant HTML is the other common MCP hang.
        html: html.slice(0, 12e4),
        htmlTruncated: html.length > 12e4,
        text: text.slice(0, 4e4),
        textTruncated: text.length > 4e4,
        links: [...page.document.links].slice(0, 80).map((link) => ({
          text: clip(link.textContent, 80),
          href: clip(link.href, 200)
        })),
        forms: [...page.document.forms].slice(0, 20).map((form) => ({
          id: form.id,
          action: form.action,
          method: form.method
        })),
        scripts: [...page.document.scripts].map((script) => script.src || "inline").slice(0, 40)
      };
    }, inspectSelector = function(selector, limit, requestId) {
      const cappedLimit = Math.min(Math.max(limit, 1), 40);
      try {
        const all = page.document.querySelectorAll(selector);
        const matches = [...all].slice(0, cappedLimit);
        return {
          type: "selector_result",
          requestId,
          selector,
          count: all.length,
          elements: matches.map((element) => {
            const rect = element.getBoundingClientRect();
            const out = {
              tag: element.tagName.toLowerCase(),
              id: element.id,
              classes: [...element.classList].slice(0, 20),
              text: clip(element.textContent, 500),
              html: element.outerHTML.slice(0, 4e3),
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            };
            if (element instanceof HTMLImageElement) {
              out.src = clip(element.currentSrc || element.src, 400);
            }
            if (element instanceof HTMLCanvasElement) {
              out.canvas = { width: element.width, height: element.height };
              try {
                out.dataUrl = element.toDataURL("image/png");
              } catch (error) {
                out.canvasError = error instanceof Error ? error.message : String(error);
              }
            }
            return out;
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
      } else if (command.type === "list_headers") {
        emit({
          type: "packet_headers",
          requestId: command.requestId,
          messages: listKnownMessages()
        });
      } else if (command.type === "reload_page") {
        emit({ type: "command_result", command: "reload_page", ok: true });
        setTimeout(() => page.location.reload(), 100);
      }
    }, applyCommands = function(commands) {
      if (!Array.isArray(commands)) return;
      for (const command of commands) {
        if (command && typeof command === "object") handleCommand(command);
      }
    }, startHttpFallback = function(reason) {
      if (httpFallbackActive) return;
      if (!gmHttp()) {
        console.warn(
          "[BaiakIdle monitor] bridge ws down and GM_xmlhttpRequest missing.",
          "Allow local network for baiakidle.com, or reinstall the userscript.",
          reason
        );
        return;
      }
      httpFallbackActive = true;
      console.info("[BaiakIdle monitor] bridge HTTP via 127.0.0.1:8946", reason);
      emit({
        type: "ready",
        transport: "http",
        hook: "gm-lna-proxy",
        bootstrap: Boolean(earlyHook),
        droppedWhileOffline: droppedSocketEvents,
        droppedSpam,
        protocol: "colyseus-string-types"
      });
      pollHttp();
    }, pollHttp = function() {
      if (httpPollTimer !== void 0) page.clearTimeout(httpPollTimer);
      httpPollTimer = void 0;
      if (!httpFallbackActive) return;
      const chunk = eventBatch.splice(0, 80);
      GM_xmlhttpRequest({
        method: "POST",
        url: BRIDGE_POLL,
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({ type: "events", events: chunk }),
        onload: (response) => {
          if (response.status !== 200) {
            eventBatch.unshift(...chunk);
            httpPollTimer = page.setTimeout(pollHttp, 2e3);
            return;
          }
          try {
            const body = JSON.parse(response.responseText);
            applyCommands(body.commands);
          } catch (error) {
            console.error("[BaiakIdle monitor] invalid HTTP poll", error);
          }
          httpPollTimer = page.setTimeout(pollHttp, eventBatch.length ? 0 : 400);
        },
        onerror: () => {
          eventBatch.unshift(...chunk);
          httpPollTimer = page.setTimeout(pollHttp, 2e3);
        }
      });
    }, probeBridgeStatus = function() {
      const permissions = page.navigator.permissions;
      try {
        void permissions?.query({ name: "local-network-access" });
      } catch {
      }
      if (!gmHttp()) return Promise.resolve();
      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        page.setTimeout(done, 1500);
        GM_xmlhttpRequest({
          method: "GET",
          url: BRIDGE_STATUS,
          onload: (response) => {
            console.info("[BaiakIdle monitor] status", response.status, response.responseText.slice(0, 200));
            done();
          },
          onerror: () => done()
        });
      });
    };
    Object.defineProperty(runtimePage, "__BAIAKIDLE_MCP_MONITOR__", {
      configurable: true,
      value: true
    });
    const monitored = /^wss?:\/\/(?:rt\d+\.)?baiakidle\.com(?:\/|$)/i;
    const clip = (value, max = 2e3) => String(value ?? "").slice(0, max);
    const sockets = /* @__PURE__ */ new Map();
    const socketRoles = /* @__PURE__ */ new Map();
    const monitoredSocketInstances = /* @__PURE__ */ new WeakSet();
    let bridgeSocket;
    let droppedSocketEvents = 0;
    let droppedSpam = 0;
    let httpFallbackActive = false;
    let httpPollTimer;
    let RealWebSocket;
    const eventBatch = [];
    let eventFlushTimer;
    const FULL_BODY_TYPES = /* @__PURE__ */ new Set([
      "notify",
      "log",
      "sellcd",
      "features",
      "sellall",
      "aucshare",
      "aucshareok",
      "aucshareerr",
      "stage",
      "mode",
      "supplymove",
      "bagmove",
      "useitem",
      "reconnectOk",
      "takeover",
      "joined"
    ]);
    const earlyHook = page.__BAIAKIDLE_EARLY_WS__;
    async function toBytes(value) {
      if (value instanceof Blob) return new Uint8Array(await value.arrayBuffer());
      if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      return new Uint8Array(value);
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
      if (!/\.(js|css|png|jpg|webp|svg|woff2?|map)(\?|$)/i.test(url)) {
        emit({ type: "fetch", url: clip(url, 500), method: init?.method ?? "GET" });
      }
      return nativeFetch.call(this, input, init);
    };
    const nativeOpen = page.XMLHttpRequest.prototype.open;
    page.XMLHttpRequest.prototype.open = function(method, url, async = true, username, password) {
      const requestUrl = String(url);
      if (!/\.(js|css|png|jpg|webp|svg|woff2?|map)(\?|$)/i.test(requestUrl)) {
        emit({ type: "xhr", method, url: clip(requestUrl, 500) });
      }
      if (requestUrl.includes("/rt/matchmake/") || requestUrl.includes("/api/trpc/")) {
        this.addEventListener("loadend", () => {
          let responseText = "";
          try {
            responseText = this.responseText;
          } catch {
          }
          emit({
            type: "xhr_result",
            method,
            url: clip(requestUrl, 500),
            status: this.status,
            responseType: this.responseType,
            responseText: clip(responseText, 4e3)
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
    void probeBridgeStatus().finally(() => {
      startHttpFallback("lna-proxy");
    });
  }
})();
