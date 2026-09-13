/**
 * Lightweight parsers for high-value ROOM_DATA payloads.
 * Decode once at capture; MCP list_events never re-parses base64.
 */

import { lookupMessage } from "./headers";
import { opcodeName, readRoomMessageHead } from "./codec";

const decoder = new TextDecoder();
const SELL_RE = /vendidos|sold \{n\} items for|sold \{mc\} materials for/i;

function readFixStr(bytes: Uint8Array, offset: number): [string, number] | undefined {
  if (offset >= bytes.length) return;
  const p = bytes[offset]!;
  let len = 0;
  let next = offset + 1;
  if ((p & 0xe0) === 0xa0) len = p & 0x1f;
  else if (p === 0xd9) {
    if (offset + 1 >= bytes.length) return;
    len = bytes[offset + 1]!;
    next = offset + 2;
  } else if (p === 0xda) {
    if (offset + 2 >= bytes.length) return;
    len = ((bytes[offset + 1]! << 8) | bytes[offset + 2]!) >>> 0;
    next = offset + 3;
  } else return;
  if (next + len > bytes.length) return;
  try {
    return [decoder.decode(bytes.subarray(next, next + len)), next + len];
  } catch {
    return;
  }
}

function readUint(bytes: Uint8Array, offset: number): [number, number] | undefined {
  if (offset >= bytes.length) return;
  const p = bytes[offset]!;
  if (p <= 0x7f) return [p, offset + 1];
  if (p === 0xcc && offset + 1 < bytes.length) return [bytes[offset + 1]!, offset + 2];
  if (p === 0xcd && offset + 2 < bytes.length) {
    return [((bytes[offset + 1]! << 8) | bytes[offset + 2]!) >>> 0, offset + 3];
  }
  if (p === 0xce && offset + 4 < bytes.length) {
    return [
      bytes[offset + 1]! * 0x1000000 +
        (bytes[offset + 2]! << 16) +
        (bytes[offset + 3]! << 8) +
        bytes[offset + 4]!,
      offset + 5
    ];
  }
}

/**
 * Best-effort extract of notify/log text for sell detection and previews.
 */
export function parseNotifyPreview(
  bytes: Uint8Array
): { text?: string; soldGold?: number } | undefined {
  const head = readRoomMessageHead(bytes);
  if (head.opcode !== 0x0d || !head.msgType) return;
  if (head.msgType !== "notify" && head.msgType !== "log") return;

  const needle = [0xa4, 0x74, 0x65, 0x78, 0x74]; // fixstr4 "text"
  let text: string | undefined;
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

  // Dual: "Vendidos {n} itens por {g}g + {mc} materiais por {mg}g." → g + mg
  let g = 0;
  let mg = 0;
  for (let i = head.payloadOffset; i < bytes.length - 3; i++) {
    if (bytes[i] === 0xa1 && bytes[i + 1] === 0x67) {
      const v = readUint(bytes, i + 2);
      if (v !== undefined && v[0] > g) g = v[0];
    }
    if (bytes[i] === 0xa2 && bytes[i + 1] === 0x6d && bytes[i + 2] === 0x67) {
      const v = readUint(bytes, i + 3);
      if (v !== undefined && v[0] > mg) mg = v[0];
    }
  }
  const soldGold = g + mg;

  return {
    text: text.slice(0, 200),
    soldGold: soldGold > 0 ? soldGold : undefined
  };
}

export type ParsedPacket = {
  opcode: number;
  opcodeName: string;
  msgType: string | null;
  category: string;
  spam: boolean;
  summary?: string;
  soldGold?: number;
};

export function describePacket(bytes: Uint8Array): ParsedPacket {
  const head = readRoomMessageHead(bytes);
  const meta = lookupMessage(head.msgType);
  const base: ParsedPacket = {
    opcode: head.opcode,
    opcodeName: opcodeName(head.opcode),
    msgType: head.msgType,
    category: meta.category,
    // ROOM_DATA only. PATCH/STATE/SCHEMA floods freeze the page if we emit them.
    spam: meta.spam || head.opcode !== 0x0d
  };

  if (head.msgType === "notify" || head.msgType === "log") {
    const n = parseNotifyPreview(bytes);
    if (n?.text) base.summary = n.text;
    if (n?.soldGold !== undefined) base.soldGold = n.soldGold;
  } else if (head.msgType) {
    base.summary = head.msgType;
  } else {
    base.summary = base.opcodeName;
  }

  return base;
}
