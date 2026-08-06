import { createServer } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
export class BrowserBridge {
    port;
    client;
    pending = new Map();
    events = [];
    commands = [];
    sequence = 0;
    constructor(port = Number(process.env.BAIAKIDLE_BRIDGE_PORT ?? 8945)) {
        this.port = port;
        const http = createServer((req, res) => {
            if (req.method === "GET" && req.url === "/status") {
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(this.status()));
                return;
            }
            res.writeHead(404).end();
        });
        const wss = new WebSocketServer({ noServer: true });
        http.on("upgrade", (req, socket, head) => {
            if (req.url !== "/browser") {
                socket.destroy();
                return;
            }
            wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws));
        });
        wss.on("connection", ws => {
            if (this.connected()) {
                ws.close(4002, "bridge already connected");
                return;
            }
            this.attach(ws);
        });
        http.on("error", error => {
            console.error("[baiakidle-mcp] bridge error", error);
            if (error.code === "EADDRINUSE")
                process.exit(1);
        });
        http.listen(this.port, "127.0.0.1");
    }
    connected() {
        return this.client?.readyState === WebSocket.OPEN;
    }
    status() {
        return {
            port: this.port,
            transport: "websocket",
            browserConnected: this.connected(),
            capturedEvents: this.events.length,
            queuedCommands: this.commands.length
        };
    }
    list(limit = 100) {
        const count = Math.min(Math.max(limit, 1), 2_000);
        return this.events.slice(-count);
    }
    clear() {
        this.events.length = 0;
    }
    async enqueue(command) {
        if (this.connected()) {
            this.client.send(JSON.stringify({ type: "command", command }));
        }
        else {
            this.commands.push(command);
        }
        return { queued: true };
    }
    requestEvent(command, timeoutMs = 15_000) {
        const requestId = `${process.pid}-${++this.sequence}`;
        return new Promise((resolvePromise, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(requestId);
                reject(new Error(`Timeout aguardando ${String(command.type ?? "comando")}`));
            }, timeoutMs);
            this.pending.set(requestId, { resolve: resolvePromise, reject, timer });
            void this.enqueue({ ...command, requestId });
        });
    }
    attach(ws) {
        this.client = ws;
        this.record({ type: "bridge_connected", time: new Date().toISOString() });
        ws.on("message", raw => {
            try {
                const message = JSON.parse(raw.toString());
                if (message.type === "event" && message.event)
                    this.record(message.event);
                if (message.type === "events" && Array.isArray(message.events)) {
                    for (const event of message.events)
                        this.record(event);
                }
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
    }
}
