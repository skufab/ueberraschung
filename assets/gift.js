// Entschlüsselt den Gutschein im Browser. Der Schlüssel steht nur im #Fragment
// des Links und wird nie an den Server gesendet.
(() => {
  const b64 = (s) => {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  };

  async function decrypt(payload, keyStr) {
    const raw = b64(payload);
    const key = await crypto.subtle.importKey("raw", b64(keyStr), "AES-GCM", false, ["decrypt"]);
    const buf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
    return JSON.parse(new TextDecoder().decode(buf));
  }

  // ---- Konfetti (Canvas, keine Bibliothek) ----
  const canvas = document.getElementById("confetti");
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#d6342c", "#ffffff", "#f5c542", "#2d9cdb", "#27ae60", "#f2994a"];
  let pieces = [], raf = 0;

  function resize() {
    const d = window.devicePixelRatio || 1;
    canvas.width = innerWidth * d;
    canvas.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener("resize", resize);
  resize();

  function burst(originEl) {
    if (reduce) return;
    const r = originEl.getBoundingClientRect();
    const ox = r.left + r.width / 2, oy = r.top + r.height / 3;
    for (let i = 0; i < 140; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const v = 6 + Math.random() * 10;
      pieces.push({
        x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 6,
        rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
        color: COLORS[(Math.random() * COLORS.length) | 0], life: 0,
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    pieces = pieces.filter((p) => p.y < innerHeight + 20 && p.life < 260);
    for (const p of pieces) {
      p.vy += 0.28; p.vx *= 0.99; p.vy *= 0.99;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p.life / 260);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    raf = pieces.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, innerWidth, innerHeight);
  }

  // ---- Geschenk öffnen / erneut öffnen ----
  const $ = (id) => document.getElementById(id);
  const gift = $("gift");
  const err = $("error");
  let data = null;

  // Abgelaufen? (Ablaufdatum steht öffentlich im HTML, der Code bleibt verschlüsselt.)
  const exp = window.GIFT_EXPIRES;
  if (exp) {
    const n = new Date();
    const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
    if (today > exp) {
      gift.style.display = "none";
      $("hint").style.display = "none";
      $("expired").classList.add("show");
      return;
    }
  }

  function show(d) {
    gift.classList.add("open");
    $("hint").style.display = "none";
    $("amount").textContent = d.amount || "";
    $("amount").style.display = d.amount ? "" : "none";
    $("code").textContent = d.code;
    if (d.pin) {
      $("pin").textContent = d.pin;
      $("pinWrap").style.display = "";
    }
    if (d.url) $("shop").href = d.url;
    burst(gift);
    setTimeout(() => $("reveal").classList.add("show"), 350);
  }

  gift.addEventListener("click", async () => {
    try {
      if (!data) {
        const key = location.hash.slice(1);
        if (!key) throw new Error("no key");
        data = await decrypt(window.GIFT_PAYLOAD, key);
      }
      err.classList.remove("show");
      // Link (Pfad + Schlüssel) aus der Adresszeile entfernen: es bleibt nur die Domain stehen.
      try { history.replaceState(null, "", "/"); } catch {}
      show(data);
    } catch (e) {
      err.classList.add("show");
    }
  });

  $("replay").addEventListener("click", () => {
    $("reveal").classList.remove("show");
    gift.classList.remove("open");
    $("hint").style.display = "";
    scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  $("copy").addEventListener("click", async (ev) => {
    const btn = ev.currentTarget;
    try {
      await navigator.clipboard.writeText($("code").textContent);
      btn.textContent = "Kopiert ✓";
    } catch {
      const r = document.createRange();
      r.selectNodeContents($("code"));
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
      btn.textContent = "Markiert – jetzt kopieren";
    }
    setTimeout(() => (btn.textContent = "Code kopieren"), 2500);
  });
})();
