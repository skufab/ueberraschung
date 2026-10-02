# ueberraschung.plastrotmann.de

Statische Geschenkseiten (GitHub Pages). Jedes Geschenk liegt unter `/<name>/`,
der Gutscheincode ist AES-verschlüsselt, der Schlüssel steckt nur im `#`-Teil des Links.

## Neues Geschenk (Eingabemaske)
1. `admin.html` im Browser öffnen (Doppelklick auf die Datei reicht).
2. Formular ausfüllen → „Geschenk erstellen" → Link kopieren, HTML kopieren.
3. GitHub: Add file → Create new file → `name/index.html` → HTML einfügen → Commit.

Die Adresse bekommt automatisch einen Zufalls-Token (z. B. `/hannes-k7x9q2mw4a/`), damit niemand Namen durchprobieren kann.
Sobald das Geschenk geöffnet wird, verschwinden Pfad und Schlüssel aus der Adresszeile, es bleibt nur `ueberraschung.plastrotmann.de`.
(Ein Neuladen danach zeigt die Startseite, dann den Original-Link erneut öffnen.)

## Alternative: Terminal
    node tools/new-gift.mjs --slug hannes --to Hannes --code "XXXX-XXXX" \
      --amount "50 €" --message "Alles Gute!" --expires 2026-12-31
    git add . && git commit -m "Geschenk hannes" && git push

Der Token wird automatisch angehängt (`--plain 1` = ohne). Optional: `--from`, `--pin`, `--url`, `--subline`, `--force 1`. Ohne `--expires` gelten 30 Tage, `--expires none` = nie.

## Ablauf & Aufräumen
- Nach dem Ablaufdatum zeigt die Seite „abgelaufen" und entschlüsselt nichts mehr.
- `.github/workflows/cleanup.yml` löscht abgelaufene Ordner täglich, 7 Tage nach Ablauf
  (Einstellung `GRACE_DAYS` in `tools/cleanup.mjs`). Manuell: `node tools/cleanup.mjs --dry`.

## Nach Änderungen an tools/template.html
    node tools/build-admin.mjs

## Domain ändern
`tools/config.json` und `CNAME` anpassen, danach `node tools/build-admin.mjs`. Bei Host Europe den CNAME-Eintrag entsprechend umbenennen.
