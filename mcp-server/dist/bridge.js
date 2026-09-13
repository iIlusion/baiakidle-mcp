import { createServer, request as httpRequest } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
const DEFAULT_PORT = Number(process.env.BAIAKIDLE_BRIDGE_PORT ?? 8945);
const HEARTBEAT_MS = 15_000;
const HEARTBEAT_MISS_LIMIT = 2;
const MAX_BROWSER_FRAME_BYTES = 256 * 1024;
const MAX_RPC_BODY_BYTES = 256 * 1024;
const MAX_RPC_TIMEOUT_MS = 60_000;
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
export class BrowserBridge {
    port;
    http = createServer((req, res) => this.handleHttp(req, res));
    wss = new WebSocketServer({ noServer: true });
    pending = new Map();
    client;
    clientAlive = false;
    heartbeatMisses = 0;
    sequence = 0;
    ownsServer = false;
    listening = false;
    ownerRetry = null;
    heartbeat;
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
        this.http.on("error", (error) => {
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
    close() {
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
            }
            catch {
                /* ignore */
            }
        }
        try {
            this.wss.close();
        }
        catch {
            /* ignore */
        }
        try {
            this.http.close();
        }
        catch {
            /* ignore */
        }
        this.ownsServer = false;
    }
    connected() {
        return this.ownsServer && this.client?.readyState === WebSocket.OPEN;
    }
    status() {
        return {
            port: this.port,
            transport: "websocket",
            browserConnected: this.connected(),
            pending: this.pending.size
        };
    }
    request(method, params = {}, timeoutMs = 12_000) {
        if (!this.ownsServer)
            return this.requestViaOwner(method, params, timeoutMs);
        if (!this.connected()) {
            return Promise.reject(new Error("browser desconectado — carregue a extensão BaiakIdle MCP Bridge e recarregue https://baiakidle.com/jogar/"));
        }
        const id = `${process.pid}-${++this.sequence}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Timeout aguardando ${method}`));
            }, timeoutMs);
            this.pending.set(id, { resolve: resolve, reject, timer, method });
            try {
                this.client.send(JSON.stringify({ id, method, params }));
            }
            catch (error) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    attach(ws) {
        if (this.client && this.client !== ws) {
            const prev = this.client;
            this.client = undefined;
            prev.removeAllListeners();
            try {
                prev.close(4003, "replaced by new browser");
            }
            catch {
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
            if (this.client !== ws)
                return;
            this.client = undefined;
            this.clientAlive = false;
            this.heartbeatMisses = 0;
            this.rejectPending(new Error("browser desconectou durante a chamada MCP"));
        });
    }
    onMessage(raw) {
        if (Buffer.byteLength(raw, "utf8") > MAX_BROWSER_FRAME_BYTES)
            return;
        let response;
        try {
            response = JSON.parse(raw);
        }
        catch {
            return;
        }
        if (response.type === "pong") {
            this.clientAlive = true;
            this.heartbeatMisses = 0;
            return;
        }
        if (!response.id)
            return;
        const pending = this.pending.get(response.id);
        if (!pending)
            return;
        this.pending.delete(response.id);
        clearTimeout(pending.timer);
        if (response.error)
            pending.reject(new Error(response.error));
        else
            pending.resolve(response.result);
    }
    checkHeartbeat() {
        const client = this.client;
        if (!client || client.readyState !== WebSocket.OPEN)
            return;
        if (!this.clientAlive) {
            this.heartbeatMisses += 1;
            if (this.heartbeatMisses >= HEARTBEAT_MISS_LIMIT)
                client.terminate();
            return;
        }
        this.clientAlive = false;
        try {
            client.send(JSON.stringify({ type: "ping" }));
            client.ping();
        }
        catch {
            /* ignore */
        }
    }
    rejectPending(error) {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timer);
            pending.reject(error);
        }
        this.pending.clear();
    }
    handleHttp(req, res) {
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
    handleRpc(req, res) {
        const contentType = req.headers["content-type"]?.split(";", 1)[0].trim().toLowerCase();
        if (contentType !== "application/json") {
            res.writeHead(415, { "content-type": "application/json", "x-content-type-options": "nosniff" });
            res.end(JSON.stringify({ error: "RPC exige Content-Type application/json" }));
            req.resume();
            return;
        }
        const chunks = [];
        let size = 0;
        let rejected = false;
        req.on("data", chunk => {
            if (rejected)
                return;
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
            if (rejected)
                return;
            void (async () => {
                const body = Buffer.concat(chunks).toString("utf8");
                let message;
                try {
                    message = JSON.parse(body);
                }
                catch {
                    res.writeHead(400, { "content-type": "application/json", "x-content-type-options": "nosniff" });
                    res.end(JSON.stringify({ error: "RPC body precisa ser JSON válido" }));
                    return;
                }
                const method = typeof message.method === "string" ? message.method.trim() : "";
                const params = message.params === undefined ? {} : message.params;
                const timeoutMs = message.timeoutMs;
                if (!method ||
                    !isRecord(params) ||
                    (timeoutMs !== undefined &&
                        (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > MAX_RPC_TIMEOUT_MS))) {
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
                }
                catch (error) {
                    res.writeHead(500, { "content-type": "application/json", "x-content-type-options": "nosniff" });
                    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
                }
            })();
        });
    }
    requestViaOwner(method, params, timeoutMs) {
        return new Promise((resolve, reject) => {
            const body = JSON.stringify({ method, params, timeoutMs });
            const request = httpRequest({
                host: "127.0.0.1",
                port: this.port,
                path: "/rpc",
                method: "POST",
                headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) },
                timeout: timeoutMs + 1_000
            }, response => {
                let value = "";
                response.on("data", chunk => {
                    value += chunk;
                });
                response.on("end", () => {
                    try {
                        const message = JSON.parse(value);
                        if (message.error)
                            reject(new Error(message.error));
                        else
                            resolve(message.result);
                    }
                    catch (error) {
                        reject(error instanceof Error ? error : new Error(String(error)));
                    }
                });
            });
            request.on("timeout", () => request.destroy(new Error(`Timeout aguardando ${method}`)));
            request.on("error", error => {
                if (error.code === "ECONNREFUSED")
                    this.listen(true);
                reject(error);
            });
            request.end(body);
        });
    }
    listen(immediate = false) {
        if (this.ownsServer || this.listening)
            return;
        if (!immediate && this.ownerRetry)
            return;
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
    scheduleOwnerRetry() {
        if (this.ownsServer || this.ownerRetry)
            return;
        this.ownerRetry = setTimeout(() => {
            this.ownerRetry = null;
            this.listen();
        }, 2_000);
        this.ownerRetry.unref();
    }
}
