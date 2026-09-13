/**
 * Cheap Colyseus ROOM_DATA (0x0d) type extraction — no full msgpack decode.
 */

const decoder = new TextDecoder();

export type RoomMessageHead = {
  /** Colyseus opcode: 0x0d = ROOM_DATA, 0x0e = ROOM_STATE, etc. */
  opcode: number;
  /** Message type string when opcode is ROOM_DATA. */
  msgType: string | null;
  /** Byte offset where payload starts (after type string). */
  payloadOffset: number;
};

/**
 * Read first msgpack string after 0x0d (room message type).
 * Returns null type for non-ROOM_DATA frames.
 */
export function readRoomMessageHead(bytes: Uint8Array): RoomMessageHead {
  if (bytes.length < 2) return { opcode: bytes[0] ?? 0, msgType: null, payloadOffset: 0 };
  const opcode = bytes[0]!;
  if (opcode !== 0x0d) return { opcode, msgType: null, payloadOffset: 1 };

  const prefix = bytes[1]!;
  let offset = 2;
  let length = 0;
  if ((prefix & 0xe0) === 0xa0) {
    length = prefix & 0x1f;
  } else if (prefix === 0xd9) {
    if (bytes.length < 3) return { opcode, msgType: null, payloadOffset: 2 };
    length = bytes[2]!;
    offset = 3;
  } else if (prefix === 0xda) {
    if (bytes.length < 4) return { opcode, msgType: null, payloadOffset: 2 };
    length = ((bytes[2]! << 8) | bytes[3]!) >>> 0;
    offset = 4;
  } else {
    return { opcode, msgType: null, payloadOffset: 2 };
  }

  if (length <= 0 || offset + length > bytes.length) {
    return { opcode, msgType: null, payloadOffset: offset };
  }

  try {
    const msgType = decoder.decode(bytes.subarray(offset, offset + length));
    return { opcode, msgType, payloadOffset: offset + length };
  } catch {
    return { opcode, msgType: null, payloadOffset: offset };
  }
}

export function hexPreview(bytes: Uint8Array, max = 48): string {
  const n = Math.min(bytes.length, max);
  let out = "";
  for (let i = 0; i < n; i++) out += bytes[i]!.toString(16).padStart(2, "0");
  if (bytes.length > max) out += "…";
  return out;
}

export function opcodeName(opcode: number): string {
  switch (opcode) {
    case 0x0a:
      return "JOIN_ROOM";
    case 0x0d:
      return "ROOM_DATA";
    case 0x0e:
      return "ROOM_STATE";
    case 0x0f:
      return "ROOM_STATE_PATCH";
    case 0x14:
      return "ROOM_DATA_SCHEMA";
    default:
      return `OP_0x${opcode.toString(16)}`;
  }
}
