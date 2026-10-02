#!/usr/bin/env node
// Baut admin.html (Eingabemaske) neu. Nach jeder Änderung an tools/template.html ausführen.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tpl = readFileSync(join(root, "tools/template.html"), "utf8");
const src = readFileSync(join(root, "tools/admin.src.html"), "utf8");
// "<" escapen, damit </script> im Template die Seite nicht zerlegt
const lit = JSON.stringify(tpl).replace(/</g, "\\u003c");
const { domain } = JSON.parse(readFileSync(join(root, "tools/config.json"), "utf8"));
writeFileSync(join(root, "admin.html"), src.replace("/*__DOMAIN__*/", domain).replace('"/*__TEMPLATE__*/"', () => lit));
console.log("admin.html gebaut.");
