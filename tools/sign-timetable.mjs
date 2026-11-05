import { generateKeyPairSync, sign } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const privPath = join(root, "tools", "ed25519.private.pem");
const pubPath = join(root, "tools", "ed25519.public.pem");
const timetablePath = join(root, "data", "timetable.json");
const configPath = join(root, "js", "config.js");

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
  return Buffer.from(JSON.stringify(payload), "utf8");
}

if (!existsSync(privPath)) {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  writeFileSync(privPath, privateKey.export({ type: "pkcs8", format: "pem" }));
  writeFileSync(pubPath, publicKey.export({ type: "spki", format: "pem" }));
}

const privateKey = readFileSync(privPath, "utf8");
const publicKey = readFileSync(pubPath, "utf8");
const bundle = JSON.parse(readFileSync(timetablePath, "utf8"));
const signature = sign(null, canonicalPayload(bundle), privateKey).toString("base64");
bundle.signature = signature;
writeFileSync(timetablePath, JSON.stringify(bundle, null, 2) + "\n");

const spki = publicKey
  .replace("-----BEGIN PUBLIC KEY-----", "")
  .replace("-----END PUBLIC KEY-----", "")
  .replace(/\s+/g, "");

writeFileSync(
  configPath,
  `export const APP_NAME = "UCC Class Alert";\n` +
    `export const STORAGE_VERSION = 1;\n` +
    `export const DEFAULT_LEAD_MINUTES = 15;\n` +
    `export const TICK_MS = 1000;\n` +
    `export const TIMETABLE_URL = "./data/timetable.json";\n` +
    `export const ED25519_SPKI_B64 = "${spki}";\n`
);

console.log("signed timetable.json and wrote js/config.js");
