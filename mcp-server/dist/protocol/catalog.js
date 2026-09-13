/**
 * Server-side catalog mirror (names + categories) for list_events filters
 * and list_packet_headers. Keep in sync with src/protocol/headers.ts.
 */
const RAW = [
    // spam
    { name: "fx", direction: "in", category: "vfx", spam: true },
    { name: "combatlog", direction: "in", category: "combat", spam: true },
    { name: "pos", direction: "in", category: "combat", spam: true },
    { name: "hit", direction: "in", category: "combat", spam: true },
    { name: "heal", direction: "in", category: "combat", spam: true },
    { name: "death", direction: "in", category: "combat", spam: true },
    { name: "attack", direction: "in", category: "combat", spam: true },
    { name: "effect", direction: "in", category: "vfx", spam: true },
    { name: "chat", direction: "in", category: "chat", spam: true },
    { name: "chatme", direction: "in", category: "chat", spam: true },
    { name: "chathist", direction: "in", category: "chat", spam: true },
    { name: "chatgaps", direction: "in", category: "chat", spam: true },
    { name: "say", direction: "both", category: "chat", spam: true },
    { name: "msg", direction: "out", category: "chat", spam: true },
    { name: "move", direction: "out", category: "combat", spam: true },
    { name: "partyhunt", direction: "in", category: "party", spam: true },
    { name: "cping", direction: "in", category: "system", spam: true },
    { name: "cpong", direction: "out", category: "system", spam: true },
    { name: "PING", direction: "out", category: "system", spam: true },
    { name: "PONG", direction: "out", category: "system", spam: true },
    { name: "cityPos", direction: "out", category: "nav", spam: true },
    { name: "citypos", direction: "in", category: "nav", spam: true },
    { name: "cityPresence", direction: "out", category: "nav", spam: true },
    { name: "rotation", direction: "out", category: "combat", spam: true },
    { name: "potion", direction: "out", category: "combat", spam: true },
    { name: "testdmgstate", direction: "in", category: "combat", spam: true },
    // economy / high value
    { name: "notify", direction: "in", category: "system", spam: false },
    { name: "log", direction: "in", category: "system", spam: false },
    { name: "sellcd", direction: "in", category: "economy", spam: false },
    { name: "gold", direction: "in", category: "economy", spam: false },
    { name: "sellall", direction: "out", category: "economy", spam: false },
    { name: "autosellpct", direction: "out", category: "economy", spam: false },
    { name: "autosellfull", direction: "out", category: "economy", spam: false },
    { name: "aucshare", direction: "out", category: "economy", spam: false },
    { name: "aucshareok", direction: "in", category: "economy", spam: false },
    { name: "aucshareerr", direction: "in", category: "economy", spam: false },
    { name: "supplymove", direction: "out", category: "economy", spam: false },
    { name: "bagmove", direction: "out", category: "economy", spam: false },
    { name: "useitem", direction: "out", category: "economy", spam: false },
    { name: "stage", direction: "out", category: "nav", spam: false },
    { name: "mode", direction: "out", category: "nav", spam: false },
    { name: "features", direction: "in", category: "system", spam: false },
    { name: "gear", direction: "in", category: "system", spam: false },
    { name: "supply", direction: "in", category: "economy", spam: false },
    { name: "reconnectOk", direction: "in", category: "system", spam: false },
    { name: "takeover", direction: "in", category: "system", spam: false },
    { name: "joined", direction: "in", category: "system", spam: false },
    { name: "pm", direction: "both", category: "chat", spam: false }
];
const BY_NAME = new Map(RAW.map(m => [m.name.toLowerCase(), m]));
export function lookupMessage(name) {
    if (!name)
        return { name: "?", direction: "both", category: "unknown", spam: false };
    return (BY_NAME.get(name.toLowerCase()) ?? {
        name,
        direction: "both",
        category: "unknown",
        spam: false
    });
}
export function listKnownMessages() {
    return [...BY_NAME.values()].sort((a, b) => a.name.localeCompare(b.name));
}
