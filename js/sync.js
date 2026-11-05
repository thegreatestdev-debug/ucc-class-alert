import { ED25519_SPKI_B64, TIMETABLE_URL } from "./config.js";
import { loadLectures, saveLectures } from "./store.js";

function canonicalPayload(bundle) {
    const payload = {
        issuedAt: bundle.issuedAt,
        lectures: bundle.lectures.map((row) => ({
            course: row.course,
            day: row.day,
            time: row.time,
            room: row.room,
        })),
    };
    return new TextEncoder().encode(JSON.stringify(payload));
}

function b64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
        out[i] = bin.charCodeAt(i);
    }
    return out;
}

async function importPublicKey() {
    return crypto.subtle.importKey(
        "spki",
        b64ToBytes(ED25519_SPKI_B64),
        { name: "Ed25519" },
        false,
        ["verify"]
    );
}

export async function verifyBundle(bundle) {
    if (!bundle || !Array.isArray(bundle.lectures) || !bundle.signature) {
        return false;
    }
    const key = await importPublicKey();
    return crypto.subtle.verify("Ed25519", key, b64ToBytes(bundle.signature), canonicalPayload(bundle));
}

export async function pullOfficialTimetable() {
    const response = await fetch(TIMETABLE_URL, { cache: "no-store" });
    if (!response.ok) {
        throw new Error("Could not download timetable (" + response.status + ")");
    }
    const bundle = await response.json();
    const ok = await verifyBundle(bundle);
    if (!ok) {
        throw new Error("Rejected: timetable signature is invalid");
    }

    const existing = loadLectures().filter((row) => row.source !== "official");
    const official = bundle.lectures.map((row) => ({
        id: crypto.randomUUID(),
        course: String(row.course),
        day: Number(row.day),
        time: String(row.time),
        room: String(row.room),
        source: "official",
    }));
    const merged = existing.concat(official);
    saveLectures(merged);
    return { count: official.length, issuedAt: bundle.issuedAt };
}
