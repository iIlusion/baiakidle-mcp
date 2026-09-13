#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrowserBridge } from "./bridge.js";
import { listKnownMessages } from "./protocol/catalog.js";

process.on("uncaughtException", error => console.error("[baiakidle-mcp] uncaughtException:", error));
process.on("unhandledRejection", reason => console.error("[baiakidle-mcp] unhandledRejection:", reason));

const bridge = new BrowserBridge();

const tools = [
  {
    name: "bridge_status",
    description: "Estado da bridge local (WS 8945) e, se conectada, snapshot leve da página.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "probe",
    description:
      "Um probe compacto (HUD + pacotes recentes + DOM opcional). Prefira isto a várias leituras largas.",
    inputSchema: {
      type: "object",
      properties: {
        dom: {
          type: "object",
          properties: {
            selector: { type: "string" },
            limit: { type: "number" },
            html: { type: "boolean" }
          }
        },
        packets: {
          type: "object",
          properties: {
            msgType: { type: "string" },
            msgTypes: { type: "array", items: { type: "string" } },
            direction: { type: "string", enum: ["incoming", "outgoing"] },
            name: { type: "string" },
            limit: { type: "number" },
            since: { type: "number" }
          }
        }
      }
    }
  },
  {
    name: "packets_get",
    description:
      "Lê o ring buffer in-page (pull, como o Luminus). Nada é empurrado da página. Default limit=10.",
    inputSchema: {
      type: "object",
      properties: {
        msgType: { type: "string" },
        msgTypes: { type: "array", items: { type: "string" } },
        categories: { type: "array", items: { type: "string" } },
        direction: { type: "string", enum: ["incoming", "outgoing"] },
        name: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 100, default: 10 },
        since: { type: "number" }
      }
    }
  },
  {
    name: "list_events",
    description: "Alias de packets_get (compat).",
    inputSchema: {
      type: "object",
      properties: {
        msgTypes: { type: "array", items: { type: "string" } },
        categories: { type: "array", items: { type: "string" } },
        limit: { type: "number", minimum: 1, maximum: 100, default: 10 }
      }
    }
  },
  {
    name: "packets_clear",
    description: "Limpa o ring buffer na página.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "clear_events",
    description: "Alias de packets_clear (compat).",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "list_packet_headers",
    description: "Catálogo local de message types Colyseus (name + category + spam).",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "dom_query",
    description: "Query CSS na página. Resumo compacto (tag/id/classes/texto). html:true só em seletor estreito.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50, default: 10 },
        html: { type: "boolean", default: false }
      },
      required: ["selector"]
    }
  },
  {
    name: "inspect_selector",
    description: "Alias de dom_query (compat).",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        limit: { type: "number", minimum: 1, maximum: 50, default: 10 }
      },
      required: ["selector"]
    }
  },
  {
    name: "dom_eval",
    description: "Executa JS no contexto da página (/jogar). Use return para devolver valor. Resultado compactado.",
    inputSchema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"]
    }
  },
  {
    name: "get_page_snapshot",
    description: "Snapshot leve: URL, HUD (inv/backpack), sockets. Sem HTML da página.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "reload_page",
    description: "Recarrega https://baiakidle.com/jogar/.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "send_packet",
    description: "Envia Base64 no WebSocket de gameplay.",
    inputSchema: {
      type: "object",
      properties: {
        base64: { type: "string" },
        targetHost: { type: "string" }
      },
      required: ["base64"]
    }
  },
  {
    name: "send_raw_packet",
    description: "Alias de send_packet (compat).",
    inputSchema: {
      type: "object",
      properties: {
        base64: { type: "string" },
        targetHost: { type: "string" }
      },
      required: ["base64"]
    }
  }
];

const server = new Server(
  { name: "baiakidle-page-bridge", version: "1.2.0" },
  { capabilities: { tools: {} } }
);

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map(v => String(v)).filter(Boolean);
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "bridge_status": {
      const local = bridge.status();
      if (!bridge.connected()) return local;
      try {
        return { ...local, page: await bridge.request("status", {}, 4_000) };
      } catch (error) {
        return { ...local, pageError: error instanceof Error ? error.message : String(error) };
      }
    }
    case "probe": {
      const params: Record<string, unknown> = {};
      if (args.dom && typeof args.dom === "object") params.dom = args.dom;
      if (args.packets && typeof args.packets === "object") params.packets = args.packets;
      return bridge.request("probe", params);
    }
    case "packets_get":
    case "list_events":
      return bridge.request("packets.get", {
        msgType: args.msgType !== undefined ? String(args.msgType) : undefined,
        msgTypes: asStringArray(args.msgTypes),
        categories: asStringArray(args.categories),
        direction: args.direction !== undefined ? String(args.direction) : undefined,
        name: args.name !== undefined ? String(args.name) : undefined,
        limit: args.limit !== undefined ? Number(args.limit) : 10,
        since: args.since !== undefined ? Number(args.since) : undefined
      });
    case "packets_clear":
    case "clear_events":
      return bridge.request("packets.clear");
    case "list_packet_headers":
      return {
        protocol: "colyseus-room-data-string-types",
        note: "BaiakIdle uses string message names after 0x0d, not numeric Habbo headers.",
        messages: listKnownMessages()
      };
    case "dom_query":
    case "inspect_selector":
      return bridge.request("dom.query", {
        selector: String(args.selector),
        limit: Number(args.limit ?? 10),
        html: Boolean(args.html)
      });
    case "dom_eval":
      return bridge.request("dom.eval", { code: String(args.code) });
    case "get_page_snapshot":
      return bridge.request("snapshot");
    case "reload_page":
      return bridge.request("reload");
    case "send_packet":
    case "send_raw_packet":
      return bridge.request("packets.send", {
        base64: String(args.base64),
        targetHost: args.targetHost ? String(args.targetHost) : undefined
      });
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async request => {
  try {
    const result = await callTool(request.params.name, (request.params.arguments ?? {}) as Record<string, unknown>);
    let text = JSON.stringify(result);
    if (text.length > 24_000) {
      text = JSON.stringify({
        error: "response_too_large",
        chars: text.length,
        hint: "Reduza limit/filtros"
      });
    }
    return { content: [{ type: "text", text }] };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }]
    };
  }
});

await server.connect(new StdioServerTransport());
