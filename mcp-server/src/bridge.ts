import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

const DEFAULT_PORT = Number(process.env.BAIAKIDLE_BRIDGE_PORT ?? 8945);
const HEARTBEAT_MS = 15_000;
const HEARTBEAT_MISS_LIMIT = 2;
const MAX_BROWSER_FRAME_BYTES = 256 * 1024;
const MAX_RPC_BODY_BYTES = 256 * 1024;
const MAX_RPC_TIMEOUT_MS = 60_000;

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
  method: string;
};

type RpcResponse = {
  type?: "pong";
  id?: string;
  result?: unknown;
  error?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class BrowserBridge {
  private readonly port: number;
  private readonly http = createServer((req, res) => this.handleHttp(req, res));
  private readonly wss = new WebSocketServer({ noServer: true });
  private readonly pending = new Map<string, Pending>();
  private client: WebSocket | undefined;
  private clientAlive = false;
  private heartbeatMisses = 0;
  private sequence = 0;
  private ownsServer = false;
  private listening = false;
  private ownerRetry: NodeJS.Timeout | null = null;
  private readonly heartbeat: NodeJS.Timeout;

  constructor(port = DEFAULT_PORT) {
    this.port = port;
    this.http.on("upgrade", (req, socket, head) => {
      if (req.url !== "/browser") {
        socket.destroy();
        return;
      }
      const origin = req.headers.origin;
      if (origin && !/^(?:chrome|moz)-extension:\/\/[^/]+$/i.test(origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, ws => this.wss.emit("connection", ws));
    });
    this.wss.on("connection", ws => this.attach(ws));
    this.http.on("error", (error: NodeJS.ErrnoException) => {
      this.listening = false;
      if (error.code === "EADDRINUSE") {
        this.scheduleOwnerRetry();
        return;
      }
      console.error("[baiakidle-mcp] bridge error", error);
    });
    this.http.on("close", () => {
      this.ownsServer = false;
      this.listening = false;
      this.scheduleOwnerRetry();
    });
    this.listen();
    this.heartbeat = setInterval(() => this.checkHeartbeat(), HEARTBEAT_MS);
    this.heartbeat.unref();
  }

  close(): void {
    clearInterval(this.heartbeat);
    if (this.ownerRetry) {
      clearTimeout(this.ownerRetry);
      this.ownerRetry = null;
    }
    this.rejectPending(new Error("bridge fechada"));
    const client = this.client;
    this.client = undefined;
    if (client) {
      try {
        client.terminate();
      } catch {
        /* ignore */
      }
    }
    try {
      this.wss.close();
    } catch {
      /* ignore */
    }
    try {
      this.http.close();
    } catch {
      /* ignore */
    }
    this.ownsServer = false;
  }

  connected(): boolean {
    return this.ownsServer && this.client?.readyState === WebSocket.OPEN;
  }

  status(): Record<string, unknown> {
    return {
      port: this.port,
      transport: "websocket",
      browserConnected: this.connected(),
      pending: this.pending.size
    };
  }

  request<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 12_000): Promise<T> {
    if (!this.ownsServer) return this.requestViaOwner<T>(method, params, timeoutMs);
    if (!this.connected()) {
      return Promise.reject(
        new Error(
          "browser desconectado — carregue a extensão BaiakIdle MCP Bridge e recarregue https://baiakidle.com/jogar/"
        )
      );
    }
    const id = `${process.pid}-${++this.sequence}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timeout aguardando ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer, method });
      try {
        this.client!.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private attach(ws: WebSocket): void {
    if (this.client && this.client !== ws) {
      const prev = this.client;
      this.client = undefined;
      prev.removeAllListeners();
      try {
        prev.close(4003, "replaced by new browser");
      } catch {
        /* ignore */
      }
      this.rejectPending(new Error("bridge reconectou (aba substituída)"));
    }
    this.client = ws;
    this.clientAlive = true;
    this.heartbeatMisses = 0;

    ws.on("pong", () => {
      this.clientAlive = true;
      this.heartbeatMisses = 0;
    });
    ws.on("message", raw => this.onMessage(raw.toString()));
    ws.on("close", () => {
      if (this.client !== ws) return;
      this.client = undefined;
      this.clientAlive = false;
      this.heartbeatMisses = 0;
      this.rejectPending(new Error("browser desconectou durante a chamada MCP"));
    });
  }

  private onMessage(raw: string): void {
    if (Buffer.byteLength(raw, "utf8") > MAX_BROWSER_FRAME_BYTES) return;
    let response: RpcResponse;
    try {
      response = JSON.parse(raw) as RpcResponse;
    } catch {
      return;
    }
    if (response.type === "pong") {
      this.clientAlive = true;
      this.heartbeatMisses = 0;
      return;
    }
    if (!response.id) return;
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    clearTimeout(pending.timer);
    if (response.error) pending.reject(new Error(response.error));
    else pending.resolve(response.result);
  }

  private checkHeartbeat(): void {
    const client = this.client;
    if (!client || client.readyState !== WebSocket.OPEN) return;
    if (!this.clientAlive) {
      this.heartbeatMisses += 1;
      if (this.heartbeatMisses >= HEARTBEAT_MISS_LIMIT) client.terminate();
      return;
    }
    this.clientAlive = false;
    try {
      client.send(JSON.stringify({ type: "ping" }));
      client.ping();
    } catch {
      /* ignore */
    }
  }

  private rejectPending(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private handleHttp(req: IncomingMessage, res: ServerResponse): void {
    if (req.method === "OPTIONS") {
      res.writeHead(204, { "cache-control": "no-store" }).end();
      return;
    }
    if (req.method === "GET" && req.url === "/status") {
      res.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json",
        "x-content-type-options": "nosniff"
      });
      res.end(JSON.stringify(this.status()));
      return;
    }
    if (req.method === "POST" && req.url === "/rpc") {
      this.handleRpc(req, res);
      return;
    }
    res.writeHead(404).end();
  }

  private handleRpc(req: IncomingMessage, res: ServerResponse): void {
    const contentType = req.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      res.writeHead(415, { "content-type": "application/json", "x-content-type-options": "nosniff" });
      res.end(JSON.stringify({ error: "RPC exige Content-Type application/json" }));
      req.resume();
      return;
    }

    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;
    req.on("data", chunk => {
      if (rejected) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > MAX_RPC_BODY_BYTES) {
        rejected = true;
        res.writeHead(413, { "content-type": "application/json", "x-content-type-options": "nosniff" });
        res.end(JSON.stringify({ error: "RPC request excedeu o limite" }));
        req.resume();
        return;
      }
      chunks.push(buffer);
    });
    req.on("end", () => {
      if (rejected) return;
      void (async () => {
        const body = Buffer.concat(chunks).toString("utf8");
        let message: { method?: unknown; params?: unknown; timeoutMs?: unknown };
        try {
          message = JSON.parse(body) as { method?: unknown; params?: unknown; timeoutMs?: unknown };
        } catch {
          res.writeHead(400, { "content-type": "application/json", "x-content-type-options": "nosniff" });
          res.end(JSON.stringify({ error: "RPC body precisa ser JSON válido" }));
          return;
        }
        const method = typeof message.method === "string" ? message.method.trim() : "";
        const params = message.params === undefined ? {} : message.params;
        const timeoutMs = message.timeoutMs;
        if (
          !method ||
          !isRecord(params) ||
          (timeoutMs !== undefined &&
            (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_RPC_TIMEOUT_MS))
        ) {
          res.writeHead(400, { "content-type": "application/json", "x-content-type-options": "nosniff" });
          res.end(JSON.stringify({ error: "RPC request inválido" }));
          return;
        }
        try {
          const result = await this.request(method, params, timeoutMs);
          res.writeHead(200, {
            "cache-control": "no-store",
            "content-type": "application/json",
            "x-content-type-options": "nosniff"
          });
          res.end(JSON.stringify({ result }));
        } catch (error) {
          res.writeHead(500, { "content-type": "application/json", "x-content-type-options": "nosniff" });
          res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
        }
      })();
    });
  }

  private requestViaOwner<T>(method: string, params: Record<string, unknown>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const body = JSON.stringify({ method, params, timeoutMs });
      const request = httpRequest(
        {
          host: "127.0.0.1",
          port: this.port,
          path: "/rpc",
          method: "POST",
          headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
          timeout: timeoutMs + 1_000
        },
        response => {
          let value = "";
          response.on("data", chunk => {
            value += chunk;
          });
          response.on("end", () => {
            try {
              const message = JSON.parse(value) as { result?: T; error?: string };
              if (message.error) reject(new Error(message.error));
              else resolve(message.result as T);
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          });
        }
      );
      request.on("timeout", () => request.destroy(new Error(`Timeout aguardando ${method}`)));
      request.on("error", error => {
        if ((error as NodeJS.ErrnoException).code === "ECONNREFUSED") this.listen(true);
        reject(error);
      });
      request.end(body);
    });
  }

  private listen(immediate = false): void {
    if (this.ownsServer || this.listening) return;
    if (!immediate && this.ownerRetry) return;
    if (immediate && this.ownerRetry) {
      clearTimeout(this.ownerRetry);
      this.ownerRetry = null;
    }
    this.listening = true;
    this.http.listen(this.port, "127.0.0.1", () => {
      this.listening = false;
      this.ownsServer = true;
    });
  }

  private scheduleOwnerRetry(): void {
    if (this.ownsServer || this.ownerRetry) return;
    this.ownerRetry = setTimeout(() => {
      this.ownerRetry = null;
      this.listen();
    }, 2_000);
    this.ownerRetry.unref();
  }
}
