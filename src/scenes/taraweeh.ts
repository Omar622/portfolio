import { ctx2d, hexA, kit, OK, palette, region, rng, type SceneFactory } from './kit'

interface Cut { i: number; at: number; born: number; start: number; exp?: boolean }
interface Exported { n: number; born: number }

// Taraweeh Cutter: waveform, silence detection, cuts, export — in Arabic or English, light or dark.
export const taraweeh: SceneFactory = (cv) => {
    const c = ctx2d(cv);
    const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, INK = P.ink, SOFT = P.soft;
    // The app has a real light theme. These are its own colours, not the slide's.
    const LIGHT = { bg: "#f3ece0", fg: "#2b2233", soft: "rgba(43,34,51,.55)", well: "rgba(0,0,0,.04)" };
    const K = kit(c, BG, SOFT, INK);
    const r = rng(73);
    const N = 2400, amp: number[] = [], gaps: [number, number][] = [];
    for (let i = 0, on = true, left = 120; i < N; i++) {
      if (--left <= 0) { on = !on; left = on ? 140 + Math.floor(r() * 120) : 26 + Math.floor(r() * 14); if (!on) gaps.push([i, i + left]); }
      amp.push(on ? .25 + .75 * Math.abs(Math.sin(i * .21) * Math.sin(i * .037)) * (.6 + .4 * r()) : .03 * r());
    }
    const L = {
      en: { title: "Taraweeh Cutter", analyze: "Analyze", exp: "Export selected", cuts: "cuts", seg: "segment", sil: "silences found" },
      ar: { title: "قصّ التراويح", analyze: "تحليل", exp: "تصدير المحدد", cuts: "المقاطع", seg: "مقطع", sil: "فواصل صامتة" }
    };
    let W = 0, H = 0, TR = 0, X0 = 0, span = 0, wy = 0, wh = 0;
    let t = 0, pos = 0, cuts: Cut[] = [], files: Exported[] = [];

    function layout() { [X0, , span] = region(W, TR); wy = H * .08; wh = Math.min(H * .62, 420); }
    const VIEW = 320, SPEED = 55;

    function step(dt: number) {
      t += dt; pos += dt * SPEED;
      if (pos > N - VIEW) { pos = 0; cuts = []; files = []; }
      const head = pos + VIEW * .7;
      gaps.forEach(([a, b], i) => { const m = (a + b) / 2; if (head > m && !cuts.some(cu => cu.i === i)) { cuts.push({ i, at: m, born: t, start: i ? (gaps[i - 1][0] + gaps[i - 1][1]) / 2 : 0 }); } });
      cuts.forEach(cu => { if (!cu.exp && t - cu.born > 1.2) { cu.exp = true; files.unshift({ n: cuts.indexOf(cu) + 1, born: t }); files = files.slice(0, 4); } });
    }
    const fmt = (s: number) => { s = Math.round(s * 2); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

    function render() {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      const lang = Math.floor(t / 5) % 2 ? "ar" : "en", tx = L[lang], light = Math.floor(t / 7) % 2 === 1;
      const wbg = light ? LIGHT.bg : P.raise, wfg = light ? LIGHT.fg : INK, wsoft = light ? LIGHT.soft : SOFT;
      // The accent is too light to read on the light theme, so the waveform and cuts use its darker step there.
      const mark = light ? DIM : AC;
      c.beginPath(); c.roundRect(X0, wy, span, wh, 10); c.fillStyle = wbg; c.fill(); c.strokeStyle = hexA(wfg, .25); c.stroke();
      c.fillStyle = hexA(wfg, .06); c.fillRect(X0 + 1, wy + 1, span - 2, 28);
      const rtl = lang === "ar";
      K.label(tx.title, rtl ? X0 + span - 14 : X0 + 14, wy + 19, rtl ? "right" : "left", wfg, 11, 500);
      K.pill(lang === "en" ? "EN · ع" : "ع · EN", rtl ? X0 + 70 : X0 + span - 40, wy + 15, DIM, true);
      c.beginPath(); c.arc(rtl ? X0 + 86 : X0 + span - 24, wy + 15, 5, 0, 7); c.fillStyle = light ? DIM : wfg; c.fill();
      if (!light) { c.beginPath(); c.arc((rtl ? X0 + 86 : X0 + span - 24) + 2.5, wy + 13, 4.5, 0, 7); c.fillStyle = wbg; c.fill(); }

      // Waveform
      const ax = X0 + 12, aw = span - 24, ay = wy + 48, ah = Math.min(110, wh * .3), mid = ay + ah / 2, px = aw / VIEW;
      c.fillStyle = light ? LIGHT.well : hexA(INK, .03); c.fillRect(ax, ay, aw, ah);
      gaps.forEach(([a, b]) => { if (b < pos || a > pos + VIEW) return; c.fillStyle = hexA(DIM, .25); c.fillRect(ax + (Math.max(a, pos) - pos) * px, ay, (Math.min(b, pos + VIEW) - Math.max(a, pos)) * px, ah); });
      for (let i = 0; i < VIEW; i++) { const v = amp[Math.floor(pos) + i] || 0, x = ax + i * px; c.fillStyle = hexA(mark, .8); c.fillRect(x, mid - v * ah * .45, Math.max(1, px - .4), v * ah * .9); }
      cuts.forEach(cu => { if (cu.at < pos || cu.at > pos + VIEW) return; const x = ax + (cu.at - pos) * px; c.strokeStyle = mark; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, ay - 4); c.lineTo(x, ay + ah + 4); c.stroke(); c.lineWidth = 1; c.fillStyle = mark; c.beginPath(); c.moveTo(x - 4, ay - 8); c.lineTo(x + 4, ay - 8); c.lineTo(x, ay - 2); c.fill(); });
      const hx = ax + aw * .7; c.strokeStyle = wfg; c.beginPath(); c.moveTo(hx, ay - 2); c.lineTo(hx, ay + ah + 2); c.stroke();
      K.label(`${tx.sil}: ${gaps.filter(([a]) => a < pos + VIEW * .7).length}`, rtl ? ax + aw - 70 : ax, ay + ah + 16, rtl ? "right" : "left", light ? LIGHT.soft : DIM, 8.5);
      K.pill(tx.analyze, ax + aw, ay + ah + 13, light ? LIGHT.fg : DIM);

      // Cuts table
      const ty0 = ay + ah + 40;
      K.label(tx.cuts, rtl ? ax + aw : ax, ty0, rtl ? "right" : "left", wsoft, 9);
      cuts.slice(-4).forEach((cu, k) => {
        const n = cuts.indexOf(cu) + 1, y = ty0 + 16 + k * 18;
        c.fillStyle = k % 2 ? "transparent" : hexA(wfg, .05); c.fillRect(ax, y - 11, aw, 16);
        K.label(`${tx.seg} ${String(n).padStart(2, "0")}`, ax + 6, y, "left", wfg, 9);
        K.label(`${fmt(cu.start)} → ${fmt(cu.at)}`, ax + aw * .4, y, "left", wsoft, 9);
        K.label(cu.exp ? "✓" : "…", ax + aw - 8, y, "right", cu.exp ? OK : wsoft, 10, 500);
      });

      // Export
      const ey = ty0 + 100;
      if (ey + 30 < wy + wh) {
        K.pill(tx.exp, ax + aw, ey - 6, mark, true);
        files.forEach((f, k) => {
          const a = Math.min(1, (t - f.born) / .4), x = ax + k * Math.min(120, aw / 4);
          c.globalAlpha = a; c.fillStyle = hexA(mark, .15); c.fillRect(x, ey + 6, Math.min(112, aw / 4 - 8), 20); c.globalAlpha = 1;
          K.label(`segment-${String(f.n).padStart(2, "0")}.mp3`, x + 6, ey + 20, "left", hexA(light ? LIGHT.fg : AC, a), 8.5);
        });
      }
    }

    return {
      resize(w, h, tr) { W = w; H = h; TR = tr; layout(); }, step, render,
      stage() {
        const head = pos + VIEW * .7;
        if (!cuts.length || gaps.some(([a, b]) => head >= a && head < (a + b) / 2)) return 0;
        return cuts[cuts.length - 1].exp ? 2 : 1;
      },
      done: () => t > 22 && cuts.length > 0 && !!cuts[cuts.length - 1].exp,
      still() { for (let i = 0; i < 160; i++) step(.05); render(); }
    };
};
