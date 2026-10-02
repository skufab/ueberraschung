#!/usr/bin/env node
// "Backend": erzeugt eine Geschenkseite /<slug>/ mit verschlüsseltem Gutscheincode.
//
// Beispiel:
//   node tools/new-gift.mjs --slug hannes --to Hannes --code "ABCD-1234" \
//     --amount "50 €" --message "Alles Gute zum Geburtstag!" --from "Fabian & Elena"
//
// Die Adresse bekommt automatisch einen Zufalls-Token (hannes-k7x9q2mw4a); mit --plain 1 ohne.
// Optional: --expires 2026-12-31 (Standard: 30 Tage, "none" = nie)  --pin 1234  --url https://www.uniqlo.com/de/  --subline "Ein kleines Geschenk"
import { randomBytes, createCipheriv } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { domain } = JSON.parse(readFileSync(join(root, "tools/config.json"), "utf8"));
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith("--")) args[process.argv[i].slice(2)] = process.argv[++i];
}

const need = ["slug", "to", "code"].filter((k) => !args[k]);
if (need.length) {
  console.error(`Fehlt: ${need.map((n) => "--" + n).join(", ")}\nSiehe Kommentar am Dateianfang.`);
  process.exit(1);
}
if (!args.plain) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  args.slug += "-" + Array.from(randomBytes(10), (b) => alphabet[b % alphabet.length]).join("");
}
if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(args.slug)) {
  console.error("slug: nur a-z, 0-9 und Bindestrich (2–50 Zeichen).");
  process.exit(1);
}
if (["assets", "tools"].includes(args.slug)) {
  console.error("Dieser slug ist reserviert.");
  process.exit(1);
}

const dir = join(root, args.slug);
if (existsSync(dir) && !args.force) {
  console.error(`/${args.slug}/ existiert schon. Mit --force 1 überschreiben (neuer Link, alter ungültig).`);
  process.exit(1);
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const b64u = (buf) => Buffer.from(buf).toString("base64url");

// AES-128-GCM; Format: iv(12) || ciphertext || tag(16) – direkt von WebCrypto lesbar.
const key = randomBytes(16);
const iv = randomBytes(12);
const cipher = createCipheriv("aes-128-gcm", key, iv);
const plain = JSON.stringify({
  code: args.code,
  amount: args.amount || "",
  pin: args.pin || "",
  url: args.url || "",
});
const payload = b64u(Buffer.concat([iv, cipher.update(plain, "utf8"), cipher.final(), cipher.getAuthTag()]));

let expires = args.expires;
if (!expires) {
  const d = new Date(Date.now() + 30 * 864e5);
  expires = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
if (expires === "none") expires = "";
else if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
  console.error("--expires: Format JJJJ-MM-TT oder none.");
  process.exit(1);
}

const shop = args.url || "https://www.uniqlo.com/de/de/";
const html = readFileSync(join(root, "tools/template.html"), "utf8")
  .replaceAll("{{TO}}", esc(args.to))
  .replaceAll("{{SUBLINE}}", esc(args.subline || "Da ist etwas für dich."))
  .replaceAll("{{MESSAGE}}", esc(args.message || ""))
  .replaceAll("{{FROM}}", esc(args.from || "Von Fabian, Elena & Romi ❤️"))
  .replaceAll("{{SHOP}}", esc(shop))
  .replaceAll("{{EXPIRES}}", expires)
  .replaceAll("{{PAYLOAD}}", payload);

mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "index.html"), html);

console.log(`\n✔ /${args.slug}/index.html erstellt` + (expires ? ` (läuft ab: ${expires})` : ""));
console.log(`\nLink zum Verschicken (Schlüssel steckt hinter dem #):\n`);
console.log(`  https://${domain}/${args.slug}/#${b64u(key)}\n`);
console.log("Den Link nur an die beschenkte Person geben. Nicht im Repo/Chat-Verlauf mit Fremden teilen.");
console.log("Danach: git add . && git commit -m 'Geschenk " + args.slug + "' && git push");
