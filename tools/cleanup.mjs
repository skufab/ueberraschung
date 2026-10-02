#!/usr/bin/env node
// Löscht Geschenk-Ordner, deren Ablaufdatum länger als GRACE_DAYS zurückliegt.
// Läuft täglich per GitHub Action (.github/workflows/cleanup.yml), geht auch manuell:
//   node tools/cleanup.mjs          (löscht)
//   node tools/cleanup.mjs --dry    (zeigt nur an)
import { readdirSync, readFileSync, rmSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const GRACE_DAYS = 7; // so lange sehen Beschenkte noch „abgelaufen“, danach 404
const SKIP = new Set(["assets", "tools", "node_modules"]);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dry = process.argv.includes("--dry");

const cutoff = new Date(Date.now() - GRACE_DAYS * 864e5);
const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

let removed = 0;
for (const name of readdirSync(root)) {
  if (name.startsWith(".") || SKIP.has(name)) continue;
  const dir = join(root, name);
  if (!statSync(dir).isDirectory()) continue;
  const file = join(dir, "index.html");
  if (!existsSync(file)) continue;
  const m = readFileSync(file, "utf8").match(/GIFT_EXPIRES = "(\d{4}-\d{2}-\d{2})"/);
  if (m && m[1] < cutoffStr) {
    console.log(`${dry ? "[dry] würde löschen" : "lösche"}: /${name}/ (abgelaufen ${m[1]})`);
    if (!dry) rmSync(dir, { recursive: true, force: true });
    removed++;
  }
}
console.log(removed ? `${removed} Ordner ${dry ? "gefunden" : "gelöscht"}.` : "Nichts abgelaufen.");
