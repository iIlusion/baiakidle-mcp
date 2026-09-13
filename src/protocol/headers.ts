/**
 * BaiakIdle Colyseus room message types (string "headers").
 * Extracted from game client onMessage / send registrations + helper probes.
 *
 * Unlike Habbo (numeric EvaWire headers), BaiakIdle uses msgpack type strings
 * after Colyseus ROOM_DATA (0x0d).
 */

export type MessageCategory =
  | "combat"
  | "vfx"
  | "chat"
  | "economy"
  | "nav"
  | "party"
  | "system"
  | "social"
  | "house"
  | "wz"
  | "arena"
  | "unknown";

export type MessageMeta = {
  name: string;
  direction: "in" | "out" | "both";
  category: MessageCategory;
  /** Drop from MCP capture by default (high-frequency / low value). */
  spam: boolean;
};

/** Incoming room messages (server → client). */
export const INCOMING = {
  ach: { name: "ach", direction: "in", category: "system", spam: false },
  addonbonus: { name: "addonbonus", direction: "in", category: "system", spam: false },
  arenaResult: { name: "arenaResult", direction: "in", category: "arena", spam: false },
  arenaStatus: { name: "arenaStatus", direction: "in", category: "arena", spam: false },
  aucshareerr: { name: "aucshareerr", direction: "in", category: "economy", spam: false },
  aucshareok: { name: "aucshareok", direction: "in", category: "economy", spam: false },
  auctionnotice: { name: "auctionnotice", direction: "in", category: "economy", spam: false },
  autobossstate: { name: "autobossstate", direction: "in", category: "nav", spam: false },
  banlist: { name: "banlist", direction: "in", category: "social", spam: false },
  banpreview: { name: "banpreview", direction: "in", category: "social", spam: false },
  bansearch: { name: "bansearch", direction: "in", category: "social", spam: false },
  benchequip: { name: "benchequip", direction: "in", category: "system", spam: false },
  broadcastnew: { name: "broadcastnew", direction: "in", category: "system", spam: false },
  broadcastok: { name: "broadcastok", direction: "in", category: "system", spam: false },
  buyresult: { name: "buyresult", direction: "in", category: "economy", spam: false },
  chat: { name: "chat", direction: "in", category: "chat", spam: true },
  chaterr: { name: "chaterr", direction: "in", category: "chat", spam: false },
  chatgaps: { name: "chatgaps", direction: "in", category: "chat", spam: true },
  chathist: { name: "chathist", direction: "in", category: "chat", spam: true },
  chatme: { name: "chatme", direction: "in", category: "chat", spam: true },
  chatsys: { name: "chatsys", direction: "in", category: "chat", spam: false },
  combatlog: { name: "combatlog", direction: "in", category: "combat", spam: true },
  cping: { name: "cping", direction: "in", category: "system", spam: true },
  dailyresult: { name: "dailyresult", direction: "in", category: "system", spam: false },
  dailystatus: { name: "dailystatus", direction: "in", category: "system", spam: false },
  deaths: { name: "deaths", direction: "in", category: "combat", spam: false },
  destroyresult: { name: "destroyresult", direction: "in", category: "economy", spam: false },
  features: { name: "features", direction: "in", category: "system", spam: false },
  forgestepres: { name: "forgestepres", direction: "in", category: "system", spam: false },
  fx: { name: "fx", direction: "in", category: "vfx", spam: true },
  gmreply: { name: "gmreply", direction: "in", category: "social", spam: false },
  go: { name: "go", direction: "in", category: "nav", spam: false },
  goldinbox: { name: "goldinbox", direction: "in", category: "economy", spam: false },
  grantconfirm: { name: "grantconfirm", direction: "in", category: "system", spam: false },
  guildmsg: { name: "guildmsg", direction: "in", category: "social", spam: false },
  guildwaratk: { name: "guildwaratk", direction: "in", category: "social", spam: false },
  houseinfo: { name: "houseinfo", direction: "in", category: "house", spam: false },
  houseresult: { name: "houseresult", direction: "in", category: "house", spam: false },
  huntgate: { name: "huntgate", direction: "in", category: "nav", spam: false },
  ignerr: { name: "ignerr", direction: "in", category: "social", spam: false },
  ignlist: { name: "ignlist", direction: "in", category: "social", spam: false },
  joined: { name: "joined", direction: "in", category: "system", spam: false },
  log: { name: "log", direction: "in", category: "system", spam: false },
  marketsync: { name: "marketsync", direction: "in", category: "economy", spam: false },
  mine: { name: "mine", direction: "in", category: "economy", spam: false },
  muteerr: { name: "muteerr", direction: "in", category: "social", spam: false },
  muteok: { name: "muteok", direction: "in", category: "social", spam: false },
  notify: { name: "notify", direction: "in", category: "system", spam: false },
  offlineInfo: { name: "offlineInfo", direction: "in", category: "system", spam: false },
  offlineReport: { name: "offlineReport", direction: "in", category: "system", spam: false },
  party: { name: "party", direction: "in", category: "party", spam: false },
  partyApplied: { name: "partyApplied", direction: "in", category: "party", spam: false },
  partyhunt: { name: "partyhunt", direction: "in", category: "party", spam: true },
  partystate: { name: "partystate", direction: "in", category: "party", spam: false },
  pm: { name: "pm", direction: "in", category: "chat", spam: false },
  pos: { name: "pos", direction: "in", category: "combat", spam: true },
  reconnectOk: { name: "reconnectOk", direction: "in", category: "system", spam: false },
  reperr: { name: "reperr", direction: "in", category: "social", spam: false },
  repok: { name: "repok", direction: "in", category: "social", spam: false },
  rerollstepres: { name: "rerollstepres", direction: "in", category: "system", spam: false },
  resume: { name: "resume", direction: "in", category: "nav", spam: false },
  say: { name: "say", direction: "in", category: "chat", spam: true },
  sayerr: { name: "sayerr", direction: "in", category: "chat", spam: false },
  serverdrop: { name: "serverdrop", direction: "in", category: "system", spam: false },
  shareerr: { name: "shareerr", direction: "in", category: "social", spam: false },
  shareitem: { name: "shareitem", direction: "in", category: "social", spam: false },
  shareok: { name: "shareok", direction: "in", category: "social", spam: false },
  staffhist: { name: "staffhist", direction: "in", category: "social", spam: false },
  staffinfo: { name: "staffinfo", direction: "in", category: "social", spam: false },
  takeover: { name: "takeover", direction: "in", category: "system", spam: false },
  testdmgreport: { name: "testdmgreport", direction: "in", category: "combat", spam: false },
  testdmgstate: { name: "testdmgstate", direction: "in", category: "combat", spam: true },
  toCity: { name: "toCity", direction: "in", category: "nav", spam: false },
  toHunt: { name: "toHunt", direction: "in", category: "nav", spam: false },
  viperr: { name: "viperr", direction: "in", category: "system", spam: false },
  viplist: { name: "viplist", direction: "in", category: "system", spam: false },
  who: { name: "who", direction: "in", category: "social", spam: false },
  // Common combat/system names seen on wire (not always in onMessage list)
  hit: { name: "hit", direction: "in", category: "combat", spam: true },
  heal: { name: "heal", direction: "in", category: "combat", spam: true },
  death: { name: "death", direction: "in", category: "combat", spam: true },
  attack: { name: "attack", direction: "in", category: "combat", spam: true },
  effect: { name: "effect", direction: "in", category: "vfx", spam: true },
  gold: { name: "gold", direction: "in", category: "economy", spam: false },
  sellcd: { name: "sellcd", direction: "in", category: "economy", spam: false },
  gear: { name: "gear", direction: "in", category: "system", spam: false },
  supply: { name: "supply", direction: "in", category: "economy", spam: false },
  citypos: { name: "citypos", direction: "in", category: "nav", spam: true },
  citypresence: { name: "citypresence", direction: "in", category: "nav", spam: true }
} as const satisfies Record<string, MessageMeta>;

/** Outgoing room messages (client → server). */
export const OUTGOING = {
  PING: { name: "PING", direction: "out", category: "system", spam: true },
  PONG: { name: "PONG", direction: "out", category: "system", spam: true },
  achinfo: { name: "achinfo", direction: "out", category: "system", spam: false },
  appearance: { name: "appearance", direction: "out", category: "system", spam: false },
  aucshare: { name: "aucshare", direction: "out", category: "economy", spam: false },
  autosellfull: { name: "autosellfull", direction: "out", category: "economy", spam: false },
  autosellpct: { name: "autosellpct", direction: "out", category: "economy", spam: false },
  bagmove: { name: "bagmove", direction: "out", category: "economy", spam: false },
  boss: { name: "boss", direction: "out", category: "nav", spam: false },
  cityPos: { name: "cityPos", direction: "out", category: "nav", spam: true },
  cityPresence: { name: "cityPresence", direction: "out", category: "nav", spam: true },
  cpong: { name: "cpong", direction: "out", category: "system", spam: true },
  leaveearly: { name: "leaveearly", direction: "out", category: "nav", spam: false },
  mode: { name: "mode", direction: "out", category: "nav", spam: false },
  move: { name: "move", direction: "out", category: "combat", spam: true },
  msg: { name: "msg", direction: "out", category: "chat", spam: true },
  pm: { name: "pm", direction: "out", category: "chat", spam: false },
  say: { name: "say", direction: "out", category: "chat", spam: true },
  sellall: { name: "sellall", direction: "out", category: "economy", spam: false },
  stage: { name: "stage", direction: "out", category: "nav", spam: false },
  supplymove: { name: "supplymove", direction: "out", category: "economy", spam: false },
  tocity: { name: "tocity", direction: "out", category: "nav", spam: false },
  useitem: { name: "useitem", direction: "out", category: "economy", spam: false },
  usepotion: { name: "usepotion", direction: "out", category: "economy", spam: false },
  equip: { name: "equip", direction: "out", category: "system", spam: false },
  rotation: { name: "rotation", direction: "out", category: "combat", spam: true },
  turn: { name: "turn", direction: "out", category: "combat", spam: true },
  potion: { name: "potion", direction: "out", category: "combat", spam: true },
  potmove: { name: "potmove", direction: "out", category: "economy", spam: false },
  loop: { name: "loop", direction: "out", category: "nav", spam: false },
  ready: { name: "ready", direction: "out", category: "system", spam: true },
  who: { name: "who", direction: "out", category: "social", spam: false }
} as const satisfies Record<string, MessageMeta>;

const BY_NAME = new Map<string, MessageMeta>();
for (const meta of Object.values(INCOMING)) BY_NAME.set(meta.name.toLowerCase(), meta);
for (const meta of Object.values(OUTGOING)) {
  if (!BY_NAME.has(meta.name.toLowerCase())) BY_NAME.set(meta.name.toLowerCase(), meta);
}

export function lookupMessage(name: string | undefined | null): MessageMeta {
  if (!name) {
    return { name: "?", direction: "both", category: "unknown", spam: false };
  }
  return (
    BY_NAME.get(name.toLowerCase()) ?? {
      name,
      direction: "both",
      category: "unknown",
      spam: false
    }
  );
}

export function listKnownMessages(): MessageMeta[] {
  return [...BY_NAME.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Categories dropped from MCP capture by default. */
export const DEFAULT_SPAM_CATEGORIES: ReadonlySet<MessageCategory> = new Set([
  "combat",
  "vfx",
  "chat"
]);
