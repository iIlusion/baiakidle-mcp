#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrowserBridge } from "./bridge.js";
const bridge = new BrowserBridge();
const tools = [
    {
        name: "bridge_status",
        description: "Mostra o estado da conexão local entre o servidor MCP e a bridge do navegador.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "list_events",
        description: "Lista os eventos mais recentes da página, fetch/XHR, inventário e WebSockets.",
        inputSchema: {
            type: "object",
            properties: { limit: { type: "number", minimum: 1, maximum: 2000, default: 100 } }
        }
    },
    {
        name: "clear_events",
        description: "Limpa os eventos capturados em memória.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "get_page_snapshot",
        description: "Obtém um snapshot atual da página: HTML, texto, links, formulários, scripts e viewport.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "inspect_selector",
        description: "Inspeciona elementos atuais da página usando um seletor CSS.",
        inputSchema: {
            type: "object",
            properties: {
                selector: { type: "string", description: "Seletor CSS válido." },
                limit: { type: "number", minimum: 1, maximum: 100, default: 20 }
            },
            required: ["selector"]
        }
    },
    {
        name: "reload_page",
        description: "Solicita que a bridge recarregue a página BaiakIdle monitorada.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "send_raw_packet",
        description: "Envia um pacote binário Base64 pelo WebSocket de gameplay identificado pela bridge.",
        inputSchema: {
            type: "object",
            properties: {
                base64: { type: "string" },
                targetHost: { type: "string", description: "Host opcional para restringir o socket de destino." }
            },
            required: ["base64"]
        }
    }
];
const server = new Server({ name: "baiakidle-page-bridge", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const args = (request.params.arguments ?? {});
        let result;
        if (request.params.name === "bridge_status") {
            result = bridge.status();
        }
        else if (request.params.name === "list_events") {
            result = bridge.list(Number(args.limit ?? 100));
        }
        else if (request.params.name === "clear_events") {
            bridge.clear();
            result = { cleared: true };
        }
        else if (request.params.name === "get_page_snapshot") {
            result = await bridge.requestEvent({ type: "snapshot_page" });
        }
        else if (request.params.name === "inspect_selector") {
            result = await bridge.requestEvent({
                type: "inspect_selector",
                selector: String(args.selector),
                limit: Number(args.limit ?? 20)
            });
        }
        else if (request.params.name === "reload_page") {
            result = await bridge.enqueue({ type: "reload_page" });
        }
        else if (request.params.name === "send_raw_packet") {
            result = await bridge.requestEvent({
                type: "send_raw_packet",
                base64: String(args.base64),
                targetHost: args.targetHost ? String(args.targetHost) : undefined
            });
        }
        else {
            throw new Error(`Ferramenta desconhecida: ${request.params.name}`);
        }
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
    }
    catch (error) {
        return {
            isError: true,
            content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }]
        };
    }
});
await server.connect(new StdioServerTransport());
