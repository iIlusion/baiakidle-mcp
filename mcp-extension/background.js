/**
 * BaiakIdle MCP Bridge — MV3 service worker.
 * Holds ws://127.0.0.1:8945/browser outside the page (no LNA, no Tampermonkey).
 */
const BRIDGE_URL = "ws://127.0.0.1:8945/browser";
const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 8000;

let activePort = null;
let socket = null;
let retryTimer = 0;
let retryDelay = MIN_RETRY_MS;
let generation = 0;
let connectInFlight = false;

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "baiakidle-mcp") return;
  activePort = port;
  port.onMessage.addListener(message => onPortMessage(port, message));
  port.onDisconnect.addListener(() => {
    if (activePort === port) activePort = null;
  });
  ensureSocket();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "baiakidle-mcp-keepalive") ensureSocket();
});
chrome.alarms.create("baiakidle-mcp-keepalive", { periodInMinutes: 1 });

function onPortMessage(port, message) {
  if (activePort !== port || !message || typeof message !== "object") return;
  if (message.type === "response" && typeof message.payload === "string") {
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(message.payload);
      } catch {
        /* ignore */
      }
    }
  }
}

function ensureSocket() {
  const state = socket?.readyState;
  if (state === WebSocket.OPEN || state === WebSocket.CONNECTING || connectInFlight) return;
  connect();
}

function connect() {
  if (connectInFlight) return;
  const state = socket?.readyState;
  if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
  connectInFlight = true;
  const currentGeneration = ++generation;
  clearTimeout(retryTimer);
  retryTimer = 0;

  let next;
  try {
    next = new WebSocket(BRIDGE_URL);
  } catch {
    connectInFlight = false;
    scheduleReconnect();
    return;
  }
  socket = next;

  next.addEventListener("open", () => {
    if (currentGeneration !== generation) {
      try {
        next.close(1000, "stale");
      } catch {
        /* ignore */
      }
      return;
    }
    connectInFlight = false;
    retryDelay = MIN_RETRY_MS;
    sendStatus("connected");
  });

  next.addEventListener("message", event => {
    if (currentGeneration !== generation || typeof event.data !== "string") return;
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message?.type === "ping") {
      try {
        next.send(JSON.stringify({ type: "pong" }));
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      activePort?.postMessage({ type: "request", payload: event.data });
    } catch {
      /* port gone */
    }
  });

  next.addEventListener("close", event => {
    if (socket === next) socket = null;
    if (currentGeneration === generation) connectInFlight = false;
    if (currentGeneration !== generation) return;
    if (event.code === 1000 || event.code === 4003) {
      sendStatus("disconnected");
      return;
    }
    sendStatus("disconnected");
    scheduleReconnect();
  });

  next.addEventListener("error", () => {
    if (next.readyState !== WebSocket.CLOSED && next.readyState !== WebSocket.CLOSING) {
      try {
        next.close();
      } catch {
        /* ignore */
      }
    }
  });
}

function scheduleReconnect() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = 0;
    ensureSocket();
  }, retryDelay);
  retryDelay = Math.min(MAX_RETRY_MS, Math.floor(retryDelay * 1.6));
}

function sendStatus(status) {
  try {
    activePort?.postMessage({ type: "status", status });
  } catch {
    /* tab closed */
  }
}
