/** Isolated-world relay: page CustomEvents ↔ extension background ↔ ws://127.0.0.1:8945 */
const REQUEST_EVENT = "baiakidle-mcp-request";
const RESPONSE_EVENT = "baiakidle-mcp-response";
const STATUS_EVENT = "baiakidle-mcp-status";
const READY_EVENT = "baiakidle-mcp-ready";
const RECONNECT_MS = 1500;

let port = null;
let reconnectTimer = 0;
let disposed = false;

connectPort();
dispatch(READY_EVENT, { ready: true });

document.addEventListener(RESPONSE_EVENT, event => {
  if (typeof event.detail !== "string") return;
  post({ type: "response", payload: event.detail });
});

function connectPort() {
  if (disposed || port) return port;
  if (!chrome?.runtime?.id) {
    disposed = true;
    dispatch(STATUS_EVENT, { status: "disconnected" });
    return null;
  }
  let next;
  try {
    next = chrome.runtime.connect({ name: "baiakidle-mcp" });
  } catch {
    schedulePortReconnect();
    return null;
  }
  port = next;
  next.onMessage.addListener(message => {
    if (message?.type === "request" && typeof message.payload === "string") {
      document.dispatchEvent(new CustomEvent(REQUEST_EVENT, { detail: message.payload }));
    } else if (message?.type === "status") {
      dispatch(STATUS_EVENT, { status: message.status });
    }
  });
  next.onDisconnect.addListener(() => {
    if (port === next) port = null;
    dispatch(STATUS_EVENT, { status: "disconnected" });
    void chrome.runtime.lastError;
    if (!chrome.runtime?.id) {
      disposed = true;
      return;
    }
    schedulePortReconnect();
  });
  return next;
}

function schedulePortReconnect() {
  if (disposed || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = 0;
    connectPort();
    dispatch(READY_EVENT, { ready: true });
  }, RECONNECT_MS);
}

function post(message) {
  if (!port) connectPort();
  if (!port) return;
  try {
    port.postMessage(message);
  } catch {
    port = null;
    schedulePortReconnect();
  }
}

function dispatch(name, value) {
  document.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(value) }));
}
