import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, request } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
export class BrowserBridge {
    port;
    client;
    pending = new Map();
    events = [];
    commands = [];
    eventFile;
    flushTimer;
    lastWsMessageAt = 0;
    sequence = 0;
    constructor(port = Number(process.env.BAIAKIDLE_BRIDGE_PORT ?? 8945)) {
        this.port = port;
        this.eventFile = process.env.BAIAKIDLE_EVENT_FILE
            ? resolve(process.env.BAIAKIDLE_EVENT_FILE)
            : fileURLToPath(new URL("../data/events.json", import.meta.url));
        mkdirSync(dirname(this.eventFile), { recursive: true });
        const http = createServer((req, res) => {
            if (req.method === "GET" && req.url === "/status") {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(this.status()));
                return;
            }
            if (req.method === "GET" && req.url === "/commands") {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(this.commands.splice(0)));
                return;
            }
            if (req.method === "POST" && req.url === "/commands") {
                this.readJson(req, res, value => {
                    const command = value;
                    if (this.connected() && Date.now() - this.lastWsMessageAt < 2_000) {
                        this.client.send(JSON.stringify({ type: "command", command }));
                    }
                    else {
                        this.commands.push(command);
                    }
                });
                return;
            }
            if (req.method === "POST" && req.url === "/events") {
                this.readJson(req, res, value => {
                    const parsed = value;
                    for (const event of Array.isArray(parsed) ? parsed : [parsed])
                        this.record(event);
                });
                return;
            }
            res.writeHead(404).end();
        });
        const wss = new WebSocketServer({ noServer: true });
        http.on("upgrade", (req, socket, head) => {
            wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws));
        });
        wss.on("connection", ws => this.attach(ws));
        const listen = () => http.listen(this.port, "127.0.0.1");
        http.on("error", error => {
            if (error.code === "EADDRINUSE") {
                setTimeout(listen, 1_000);
            }
            else {
                console.error("[baiakidle-mcp] bridge error", error);
            }
        });
        listen();
    }
    connected() {
        return this.client?.readyState === WebSocket.OPEN;
    }
    status() {
        return {
            port: this.port,
            browserConnected: this.connected(),
            capturedEvents: this.events.length,
            queuedCommands: this.commands.length,
            eventFile: this.eventFile
        };
    }
    list(limit = 100) {
        const count = Math.min(Math.max(limit, 1), 2_000);
        try {
            const disk = JSON.parse(readFileSync(this.eventFile, "utf8"));
            return disk.slice(-count);
        }
        catch {
            return this.events.slice(-count);
        }
    }
    clear() {
        this.events.length = 0;
        this.flush();
    }
    enqueue(command) {
        return new Promise((resolvePromise, reject) => {
            const body = JSON.stringify(command);
            const req = request({
                host: "127.0.0.1",
                port: this.port,
                path: "/commands",
                method: "POST",
                headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) }
            }, response => {
                response.resume();
                response.statusCode === 202
                    ? resolvePromise({ queued: true })
                    : reject(new Error(`Bridge respondeu HTTP ${response.statusCode}`));
            });
            req.on("error", reject);
            req.end(body);
        });
    }
    requestEvent(command, timeoutMs = 15_000) {
        const requestId = `${process.pid}-${++this.sequence}`;
        return new Promise((resolvePromise, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error(`Timeout aguardando ${String(command.type ?? "comando")}`));
            }, timeoutMs);
            this.pending.set(requestId, { resolve: resolvePromise, reject, timer });
            void this.enqueue({ ...command, requestId }).catch(error => {
                const pending = this.pending.get(requestId);
                if (!pending)
                    return;
                this.pending.delete(requestId);
                clearTimeout(pending.timer);
                pending.reject(error instanceof Error ? error : new Error(String(error)));
            });
        });
    }
    readJson(req, res, accept) {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                accept(JSON.parse(body));
                res.writeHead(202).end();
            }
            catch {
                res.writeHead(400).end();
            }
        });
    }
    attach(ws) {
        this.client?.close(4001, "new browser tab");
        this.client = ws;
        this.record({ type: "bridge_connected", time: new Date().toISOString() });
        ws.on("message", raw => {
            this.lastWsMessageAt = Date.now();
            try {
                const message = JSON.parse(raw.toString());
                if (message.type === "event" && message.event)
                    this.record(message.event);
            }
            catch {
                // Ignore malformed browser messages; valid captures continue flowing.
            }
        });
        ws.on("close", () => {
            if (this.client === ws)
                this.client = undefined;
        });
        for (const command of this.commands.splice(0)) {
            ws.send(JSON.stringify({ type: "command", command }));
        }
    }
    record(event) {
        this.events.push(event);
        if (this.events.length > 2_000)
            this.events.shift();
        if (event.requestId) {
            const pending = this.pending.get(event.requestId);
            if (pending) {
                this.pending.delete(event.requestId);
                clearTimeout(pending.timer);
                pending.resolve(event);
            }
        }
        if (!this.flushTimer)
            this.flushTimer = setTimeout(() => this.flush(), 250);
    }
    flush() {
        if (this.flushTimer)
            clearTimeout(this.flushTimer);
        this.flushTimer = undefined;
        try {
            writeFileSync(this.eventFile, JSON.stringify(this.events));
        }
        catch {
            // Captures stay available in memory if persistence is unavailable.
        }
    }
}
