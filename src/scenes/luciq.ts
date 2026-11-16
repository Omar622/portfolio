import { rng, hexA, ease, clamp, MONO, NARROW, ctx2d, palette, OK, ERR, type SceneFactory, MIN_PX } from './kit'

// Luciq: a high-load write path that keeps running while the team ships features into it.
// The legacy and new write flows ran side by side for years, each tenant on one of them, and reads had to
// pick the right store. The first feature sunsets the legacy flow and moves its tenants to the new one.
// Now and then an on-call alert or SWAT ticket interrupts the sprint and gets fixed fast.
export const luciq: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  // Me (BE, the new write path I built, the sprint) is the accent. The stats flow I built pulls from the analytics team. Legacy write is dim,
  // readers and other teams are neutral, and alerts use the status colours.
  const pal = palette(cv), BG = pal.bg, AC = pal.accent, DIM = pal.dim, TXT = pal.ink, SOFT = pal.soft;
  const r = rng(11);
  const FEATURES = [
    { title: "Sunset the legacy write flow", sub: "Move the legacy tenants to the new flow and drop the per-tenant read routing. No writes lost." },
    { title: "Statistics from the analytics team", sub: "A new flow: pull stats daily from the analytics team's API." },
    { title: "Cache pattern package", sub: "A reusable cache pattern for the read path." },
    { title: "Mentor new hires and interns", sub: "Onboard 3 engineers until they ship on their own." }
  ];
  const STAGES = [{ name: "pre-planning", d: 2.2 }, { name: "planning", d: 2.4 }, { name: "implement", d: 2.8 }, { name: "review & test", d: 1.8 }, { name: "release", d: 3.0 }];
  const STAGE_TXT = ["breaking it down · blockers · dependencies", "team sync · estimates · deadlines", "building it", "code review · tests · staging", ""];
  type Pt = [number, number];
  interface Path { pts: Pt[]; lens: number[]; total: number }
  interface Packet { pa: Path; p: number; v: number; col: string; kind: string; idx?: number }
  interface Alert { kind: string; text: string; lag: boolean; t: number }
  interface Mentee { name: string; i: number; p: number; born: number }
  interface Places { src: Pt; ingest: Pt; validate: Pt; index: Pt; store: Pt; cache: Pt; legacy: Pt; legacyStore: Pt; stats: Pt; team: Pt; readers: Pt[] }
  const ALERTS: Record<number, Omit<Alert, "t">> = { 1: { kind: "ON-CALL", text: "index lag rising", lag: true }, 3: { kind: "SWAT", text: "a customer reports missing sessions", lag: false } };

  let W = 0, H = 0, TR = 0, X0: number, X1: number, span: number, R: number, cx: number, cy: number, cardX: number, cardW: number, pagerX: number, pagerY: number, my: number, nodeW: number;
  const nodeH = 26;
  let t = 0, fi = 0, si = 0, sT = 0, sprint = 1, alert: Alert | null = null, alertDone = false, pathDim = 0;
  const SPLIT = .5;
  let newShare = SPLIT, legacyA = 1, statsA = 0, cacheA = 0, legacyT = 1, statsT = 0, cacheT = 0;
  let mentees: Mentee[] = [], packets: Packet[] = [], flashes: { x: number; y: number; born: number; col: string }[] = [], texts: [string, number, number, number][] = [], acc = { w: 0, r: 0 }, dayT = 0;
  const TEAM: { role: string; me?: boolean }[] = [{ role: "FE" }, { role: "BE · me", me: true }, { role: "QC" }];
  const ACTIVE = [[.5, 1, .5], [1, 1, 1], [1, 1, 0], [0, .5, 1], [1, 1, 1]];
  let P = {} as Places;

  function layout() {
    X1 = W - (W < NARROW ? 16 : 84);
    X0 = W < NARROW ? 16 : Math.min(Math.max(TR + 32, W * .42), X1 - 400);
    span = X1 - X0;
    R = clamp(span * .1, 46, 60);
    // Full-width art has no text to its left, so the "other teams" pills need the extra room inside the edge.
    cx = X0 + R + (W < NARROW ? 102 : 78); cy = Math.max(H * .2, R + 40);
    cardX = cx + R + 84; cardW = Math.max(150, X1 - cardX);
    pagerX = cardX; pagerY = cy - R + 126;
    my = Math.max(H * .64, cy + R + 220);
    nodeW = Math.min(72, span * .12);
    const at = (f: number) => X0 + span * f;
    P = {
      src: [at(.04), my], ingest: [at(.2), my], validate: [at(.36), my], index: [at(.52), my], store: [at(.68), my],
      cache: [at(.8), my], legacy: [at(.36), my - 74], legacyStore: [at(.68), my - 74], stats: [at(.68), my + 88], team: [at(.88), my + 88],
      readers: [-1, 0, 1].map(k => [at(.95), my + k * 36])
    };
  }

  function cylinder(x: number, y: number, rx: number, hh: number, col: string, a: number) {
    c.globalAlpha = a; c.fillStyle = BG; c.strokeStyle = col; c.lineWidth = 1.3;
    c.beginPath(); c.ellipse(x, y - hh, rx, rx * .27, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - rx, y - hh); c.lineTo(x - rx, y + hh); c.ellipse(x, y + hh, rx, rx * .27, 0, Math.PI, 0, true); c.lineTo(x + rx, y - hh); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(x, y - hh, rx, rx * .27, 0, 0, 7); c.stroke();
    c.globalAlpha = 1;
  }

  function path(pts: Pt[]): Path {
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, lens, total: lens[lens.length - 1] };
  }
  function at(pa: Path, p: number): Pt {
    const d = p * pa.total;
    let i = 1; while (i < pa.lens.length - 1 && pa.lens[i] < d) i++;
    const k = (d - pa.lens[i - 1]) / ((pa.lens[i] - pa.lens[i - 1]) || 1);
    return [pa.pts[i - 1][0] + (pa.pts[i][0] - pa.pts[i - 1][0]) * k, pa.pts[i - 1][1] + (pa.pts[i][1] - pa.pts[i - 1][1]) * k];
  }

  function resetLoop() {
    legacyT = 1; newShare = SPLIT; statsT = 0; cacheT = 0; mentees = [];
  }

  function spawn(dt: number) {
    const lag = alert && alert.lag && alert.t < 2.2;
    acc.w += dt * 70;
    while (acc.w >= 1) {
      acc.w--;
      const useNew = legacyT === 0 || r() < newShare;
      const pts: Pt[] = useNew
        ? [P.src, P.ingest, P.validate, P.index, P.store]
        : [P.src, [P.src[0] + 20, P.legacy[1]], P.legacy, [P.legacyStore[0] - 16, P.legacyStore[1]]];
      const pa = path(pts);
      packets.push({ pa, p: 0, v: 1 / .9, col: useNew ? AC : DIM, kind: "w", idx: useNew ? pa.lens[3] / pa.total : 2 });
    }
    acc.r += dt * 14;
    while (acc.r >= 1) {
      acc.r--;
      const rd = P.readers[Math.floor(r() * 3)];
      const viaCache = cacheA > .5;
      const toLegacy = !viaCache && legacyA > .5 && r() > newShare;
      const pa = path(viaCache ? [rd, P.cache] : [rd, toLegacy ? [P.legacyStore[0] + 16, P.legacyStore[1]] : P.store]);
      packets.push({ pa, p: 0, v: 1 / .7, col: SOFT, kind: viaCache ? "rc" : "r" });
    }
    if (statsA > .5) {
      dayT += dt;
      if (dayT >= 4) { dayT = 0; packets.push({ pa: path([P.team, P.stats, [P.store[0], P.store[1] + 20]]), p: 0, v: 1 / 1.6, col: AC, kind: "b" }); }
    }
    return lag;
  }

  function step(dt: number) {
    t += dt;
    const lag = spawn(dt);
    packets.forEach(k => {
      let v = k.v;
      if (lag && k.kind === "w" && k.p < k.idx! && k.p > k.idx! - .12) v *= .12;
      k.p += dt * v;
      if (k.p >= 1 && k.kind === "rc") {
        if (r() < .8) flashes.push({ x: P.cache[0], y: P.cache[1], born: t, col: OK });
        else packets.push({ pa: path([P.cache, P.store]), p: 0, v: 1 / .5, col: DIM, kind: "r" });
      }
    });
    packets = packets.filter(k => k.p < 1);
    flashes = flashes.filter(f => t - f.born < .4);

    const k = 1 - Math.exp(-dt * 2.5);
    legacyA += (legacyT - legacyA) * k; statsA += (statsT - statsA) * k; cacheA += (cacheT - cacheA) * k;
    pathDim += ((alert || si === 2 || si === 4 ? 0 : 1) - pathDim) * (1 - Math.exp(-dt * 3));

    if (alert) {
      alert.t += dt;
      if (alert.t >= 3.4) { alert = null; alertDone = true; }
      return;
    }
    sT += dt;
    const al = ALERTS[fi];
    if (al && !alertDone && si === 2 && sT >= 1) { alert = { ...al, t: 0 }; return; }

    if (fi === 0 && si === 4) { newShare = SPLIT + (1 - SPLIT) * clamp((sT - .3) / 1.8, 0, 1); if (sT > 2.2) legacyT = 0; }
    if (fi === 1 && si === 4 && sT > .3) statsT = 1;
    if (fi === 2 && si === 4 && sT > .3) cacheT = 1;
    if (fi === 3 && si === 0 && !mentees.length) mentees = ["new hire", "intern", "new hire"].map((name, i) => ({ name, i, p: 0, born: t }));
    if (fi === 3) mentees.forEach(m => {
      if (si === 2 || si === 3) m.p = Math.min(1, m.p + dt * (.22 + m.i * .03));
      if (si === 4) m.p = 1;
    });

    if (sT >= STAGES[si].d) {
      sT = 0; si++;
      if (si === STAGES.length) { si = 0; fi = (fi + 1) % FEATURES.length; sprint++; alertDone = false; if (fi === 0) resetLoop(); }
    }
  }

  function label(text: string, x: number, y: number, align: CanvasTextAlign = "left", col = SOFT, size = 10, weight = 400) {
    c.font = `${weight} ${Math.max(MIN_PX, size)}px ${MONO}`; c.textAlign = align; c.fillStyle = col; c.fillText(text, x, y);
  }
  function wrap(text: string, maxW: number) {
    const lines = [""];
    text.split(" ").forEach(w => { const cand = lines[lines.length - 1] ? lines[lines.length - 1] + " " + w : w; if (c.measureText(cand).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = cand; });
    return lines.slice(0, 2);
  }
  function box(x: number, y: number, text: string, col: string, a = 1, w = nodeW) {
    c.globalAlpha = a;
    c.beginPath(); c.roundRect(x - w / 2, y - nodeH / 2, w, nodeH, 5); c.fillStyle = hexA(BG, .7); c.fill();
    c.strokeStyle = col; c.lineWidth = 1.3; c.stroke();
    c.globalAlpha = 1;
    texts.push([text, x, y, a]);
  }
  function line(pts: Pt[], col: string, a: number, dash?: number[]) {
    c.globalAlpha = a; if (dash) c.setLineDash(dash);
    c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = col; c.lineWidth = 1.2; c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
  }
  function person(x: number, y: number, col: string, a = 1, s = 1) {
    c.globalAlpha = a; c.fillStyle = col;
    c.beginPath(); c.arc(x, y - 4 * s, 3.4 * s, 0, 7); c.fill();
    c.beginPath(); c.arc(x, y + 6 * s, 6 * s, Math.PI, 0); c.fill();
    c.globalAlpha = 1;
  }

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    c.strokeStyle = hexA(AC, .045); c.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, H); c.stroke(); }
    for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(W, y + .5); c.stroke(); }

    // ---- Write path ----
    const lagOn = alert && alert.lag && alert.t < 2.2;
    label("WRITE PATH · session batches · millions of requests / min", X1, my - 110, "right");
    line([P.src, [P.src[0] + 20, P.legacy[1]], P.legacy, [P.legacyStore[0] - 16, P.legacyStore[1]]], DIM, .45 * legacyA);
    line([P.src, P.store], AC, .45);
    if (statsA > .01) { line([P.team, P.stats, [P.store[0], P.store[1] + 20]], AC, .45 * statsA); label("internal API", (P.stats[0] + P.team[0]) / 2, P.stats[1] - 8, "center", hexA(DIM, .8 * statsA), 9); }
    P.readers.forEach(rd => line([rd, cacheA > .5 ? P.cache : [P.store[0] + 18, P.store[1]]], SOFT, .3));
    if (cacheA > .01) line([P.cache, [P.store[0] + 18, P.store[1]]], SOFT, .3 * cacheA);
    if (legacyA > .02) P.readers.forEach(rd => line([rd, [P.legacyStore[0] + 16, P.legacyStore[1]]], SOFT, .3 * legacyA, [2, 4]));

    [0, 1, 2].forEach(i => { c.beginPath(); c.roundRect(P.src[0] - 18 + i * 3, P.src[1] - 20 + i * 4, 30, 22, 3); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(AC, .6); c.stroke(); });
    label("sessions", P.src[0], P.src[1] + 28, "center", SOFT, 9);
    box(...P.ingest, "ingest", AC, 1);
    box(...P.validate, "validate", AC, 1);
    const idxPulse = lagOn ? .5 + .5 * Math.sin(t * 12) : 0;
    if (idxPulse) { c.shadowColor = ERR; c.shadowBlur = 18 * idxPulse; }
    box(...P.index, "index", lagOn ? ERR : AC, 1);
    c.shadowBlur = 0;
    if (legacyA > .02) {
      box(...P.legacy, "legacy write", DIM, legacyA, nodeW + 16);
      if (legacyT === 0) { c.globalAlpha = legacyA; c.beginPath(); c.moveTo(P.legacy[0] - nodeW / 2 - 4, P.legacy[1]); c.lineTo(P.legacy[0] + nodeW / 2 + 4, P.legacy[1]); c.strokeStyle = DIM; c.stroke(); c.globalAlpha = 1; label("sunset", P.legacy[0], P.legacy[1] - 20, "center", hexA(DIM, legacyA), 9); }
    }
    cylinder(...P.store, 22, 14, AC, 1);
    label("indexed store", P.store[0], P.store[1] + 36, "center", SOFT, 9);
    if (legacyA > .02) {
      cylinder(...P.legacyStore, 16, 10, DIM, legacyA);
      label("legacy store", P.legacyStore[0] + 24, P.legacyStore[1] + 4, "left", hexA(DIM, legacyA), 9);
    }
    if (cacheA > .01) box(...P.cache, "cache", OK, cacheA, nodeW - 14);
    P.readers.forEach(([x, y]) => box(x, y, "reader", SOFT, 1, nodeW - 20));
    // At 11px this label is wider than the reader column on tablet widths, so keep its right edge inside the canvas.
    c.font = `${MIN_PX}px ${MONO}`;
    const readW = c.measureText("READ · extract info").width;
    label("READ · extract info", Math.min(P.readers[0][0], W - 6 - readW / 2), P.readers[0][1] - 24, "center", SOFT, 9);
    if (statsA > .01) {
      box(...P.stats, "stats", AC, statsA); box(...P.team, "analytics team", SOFT, statsA, nodeW + 34);
      const kx = P.stats[0] - nodeW / 2 - 16, ky = P.stats[1];
      c.globalAlpha = statsA;
      c.beginPath(); c.arc(kx, ky, 7, 0, 7); c.strokeStyle = hexA(AC, .35); c.stroke();
      c.beginPath(); c.moveTo(kx, ky); c.arc(kx, ky, 7, -Math.PI / 2, -Math.PI / 2 + dayT / 4 * Math.PI * 2); c.closePath(); c.fillStyle = hexA(AC, .6); c.fill();
      c.globalAlpha = 1;
      label("daily pull", kx + 10, P.stats[1] + 30, "left", hexA(AC, .85 * statsA), 9);
    }

    packets.forEach(k => {
      const [x, y] = at(k.pa, k.p);
      const col = lagOn && k.kind === "w" && k.col === AC && Math.abs(k.p - k.idx!) < .12 ? ERR : k.col;
      if (k.kind === "w") {
        const [bx, by] = at(k.pa, Math.max(0, k.p - 14 / k.pa.total));
        c.strokeStyle = hexA(col, .35); c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by); c.lineTo(x, y); c.stroke(); c.lineWidth = 1;
      }
      if (k.kind === "b") { c.fillStyle = BG; c.fillRect(x - 8, y - 6, 16, 12); c.strokeStyle = DIM; c.strokeRect(x - 8, y - 6, 16, 12); c.fillStyle = DIM; c.fillRect(x - 5, y - 2, 10, 1.5); c.fillRect(x - 5, y + 1, 7, 1.5); return; }
      c.fillStyle = col; c.beginPath(); c.arc(x, y, k.kind === "w" ? 2.4 : 2, 0, 7); c.fill();
    });
    flashes.forEach(f => { const a = 1 - (t - f.born) / .4; c.beginPath(); c.arc(f.x - nodeW / 2 - 4, f.y, 3 + 6 * (1 - a), 0, 7); c.strokeStyle = hexA(f.col, a); c.stroke(); });

    texts.forEach(([text, x, y, a]) => {
      c.globalAlpha = a; c.font = `11px ${MONO}`; const w = c.measureText(text).width + 8;
      c.fillStyle = BG; c.fillRect(x - w / 2, y - 7, w, 14);
      c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = TXT; c.fillText(text, x, y + .5);
    });
    c.textBaseline = "alphabetic"; c.globalAlpha = 1; texts = [];

    if (fi === 0 && si === 4 && !alert) {
      label(`tenants on new flow ${Math.round(newShare * 100)}% · writes lost 0`, P.validate[0] - nodeW / 2, my + 58, "left", OK, 10, 500);
    }

    if (pathDim > .02) { c.fillStyle = hexA(BG, .5 * pathDim); c.fillRect(X0 - 30, my - 122, span + 60, 250); }

    // ---- Team sprint ring ----
    const ang = (i: number) => -Math.PI / 2 + i * Math.PI * 2 / STAGES.length;
    const from = si === 0 ? ang(-1) : ang(si - 1);
    let tokAng = from + (ang(si) - from) * ease(Math.min(1, sT / .5));
    c.beginPath(); c.arc(cx, cy, R, 0, 7); c.strokeStyle = hexA(AC, .25); c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.arc(cx, cy, R, ang(0), Math.max(ang(0), tokAng)); c.strokeStyle = hexA(AC, .85); c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
    STAGES.forEach((s, i) => {
      const a = ang(i), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, on = i === si && !alert;
      c.beginPath(); c.arc(x, y, on ? 6 : 4, 0, 7); c.fillStyle = i <= si ? AC : BG; c.fill(); c.strokeStyle = AC; c.stroke();
      const cs = Math.cos(a), sn = Math.sin(a);
      label(s.name, cx + cs * (R + 12), cy + sn * (R + 12) + (sn > .5 ? 12 : sn < -.5 ? -4 : 4), cs > .5 ? "left" : cs < -.5 ? "right" : "center", on ? TXT : SOFT, 10, on ? 500 : 400);
    });
    label(`sprint ${sprint}`, cx, cy - 4, "center", SOFT, 9.5);
    label("FE · BE · QC", cx, cy + 10, "center", TXT, 10, 500);

    let tx = cx + Math.cos(tokAng) * R, ty = cy + Math.sin(tokAng) * R;
    if (alert) {
      const go = ease(Math.min(1, alert.t / .6)), back = alert.t > 2.8 ? ease(Math.min(1, (alert.t - 2.8) / .6)) : 0, m = go - back;
      tx += (pagerX + 10 - tx) * m; ty += (pagerY + 10 - ty) * m;
    }
    c.shadowColor = alert ? ERR : TXT; c.shadowBlur = 8;
    c.beginPath(); c.arc(tx, ty, 4.5, 0, 7); c.fillStyle = alert ? ERR : TXT; c.fill(); c.shadowBlur = 0;

    // Team row: FE, BE (me), QC. They sync at the start of every stage.
    const ty0 = cy + R + 76, gap = Math.min(64, R * 1.2);
    const pos = TEAM.map((_, i) => [cx + (i - 1) * gap, ty0]);
    const sync = alert ? 0 : Math.max(0, 1 - sT / 1.1);
    if (sync > 0) {
      c.globalAlpha = sync;
      c.setLineDash([2, 4]); c.strokeStyle = AC; c.beginPath();
      c.moveTo(pos[0][0], pos[0][1] - 14); c.quadraticCurveTo(cx, ty0 - 44, pos[2][0], pos[2][1] - 14);
      c.moveTo(pos[0][0], pos[0][1] - 14); c.lineTo(pos[1][0], pos[1][1] - 14); c.lineTo(pos[2][0], pos[2][1] - 14); c.stroke(); c.setLineDash([]);
      label(si === 1 ? "team sync · planning" : "sync", cx, ty0 - 40, "center", AC, 9);
      c.globalAlpha = 1;
    }
    TEAM.forEach((m, i) => {
      const [x, y] = pos[i], act = alert ? (m.me ? 1 : .35) : ACTIVE[si][i];
      const col = m.me ? (alert ? ERR : AC) : TXT;
      if (m.me) { c.beginPath(); c.arc(x, y + 1, 14, 0, 7); c.strokeStyle = hexA(col, .7); c.lineWidth = 1.3; c.stroke(); c.lineWidth = 1; }
      person(x, y, col, .35 + .65 * act);
      label(m.role, x, y + 28, "center", m.me ? col : SOFT, 9.5, m.me ? 500 : 400);
      if (act >= 1 && !alert && si === 2) { const k = (t * 1.5 + i * .3) % 1; c.beginPath(); c.arc(x + 10, y - 12 - k * 8, 1.6, 0, 7); c.fillStyle = hexA(col, 1 - k); c.fill(); }
    });

    // Other teams: BE syncs with them in pre-planning (dependencies) and now and then while implementing.
    const OTHERS = ["SDK team", "infra team", "data team"];
    const ox = pos[0][0] - 64, oys = [-26, 0, 26].map(d => ty0 + d);
    label("other teams", ox, oys[0] - 16, "center", SOFT, 8.5);
    const xOn = alert ? 0 : si === 0 ? Math.min(1, sT / .4, (STAGES[0].d - sT) / .4) : si === 2 && sT > 1.4 && sT < 2.6 ? Math.min(1, (sT - 1.4) / .3, (2.6 - sT) / .3) : 0;
    const pick = (fi + (si === 2 ? 1 : 0)) % 3;
    OTHERS.forEach((name, i) => {
      const on = xOn > 0 && i === pick;
      c.font = `11px ${MONO}`; const w = c.measureText(name).width + 12;
      c.globalAlpha = on ? .5 + .5 * xOn : .4;
      c.beginPath(); c.roundRect(ox - w / 2, oys[i] - 8, w, 16, 8); c.fillStyle = BG; c.fill(); c.strokeStyle = on ? TXT : hexA(SOFT, .6); c.stroke();
      c.fillStyle = on ? TXT : hexA(SOFT, .7); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(name, ox, oys[i] + .5); c.textBaseline = "alphabetic";
      c.globalAlpha = 1;
      if (on) {
        c.globalAlpha = xOn; c.setLineDash([3, 4]); c.lineDashOffset = -t * 24; c.strokeStyle = SOFT;
        c.beginPath(); c.moveTo(ox + w / 2, oys[i]); c.quadraticCurveTo(pos[1][0] - 20, ty0 + 44, pos[1][0] - 8, pos[1][1] + 10); c.stroke();
        c.setLineDash([]); c.lineDashOffset = 0; c.globalAlpha = 1;
        label("cross-team sync", ox - w / 2, oys[2] + 26, "left", hexA(SOFT, xOn), 8.5);
      }
    });

    mentees.forEach(m => {
      const a0 = Math.min(1, (t - m.born) / .5);
      const [bx, by] = pos[1], x = bx + (m.i - 1) * 40, y = by + 62;
      line([[bx, by + 34], [x, y - 14]], AC, .35 * a0, [2, 3]);
      c.globalAlpha = a0;
      c.beginPath(); c.arc(x, y + 1, 11, -Math.PI / 2, -Math.PI / 2 + m.p * Math.PI * 2); c.strokeStyle = m.p >= 1 ? OK : DIM; c.lineWidth = 1.6; c.stroke(); c.lineWidth = 1;
      c.globalAlpha = 1;
      person(x, y, m.p >= 1 ? OK : TXT, a0, .75);
      label(m.name, x, y + 24, "center", SOFT, 8.5);
    });

    // ---- Feature card ----
    const f = FEATURES[fi], cardH = 104, cyTop = cy - R - 6;
    c.beginPath(); c.roundRect(cardX, cyTop, cardW, cardH, 6); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(AC, .55); c.stroke();
    label(`FEATURE ${fi + 1}/${FEATURES.length}`, cardX + 12, cyTop + 18, "left", hexA(AC, .85), 9);
    c.font = `500 11px ${MONO}`; c.fillStyle = TXT; c.textAlign = "left";
    wrap(f.title, cardW - 24).forEach((ln, i) => c.fillText(ln, cardX + 12, cyTop + 36 + i * 14));
    c.font = `11px ${MONO}`; c.fillStyle = SOFT;
    wrap(f.sub, cardW - 24).forEach((ln, i) => c.fillText(ln, cardX + 12, cyTop + 66 + i * 13));
    const stTxt = alert ? "paused for an incident" : si === 4 ? ["moving legacy tenants to the new flow", "daily stats pull is live", "reads served from the cache", "they ship on their own now"][fi] : STAGE_TXT[si];
    c.fillStyle = hexA(AC, .15); c.fillRect(cardX + 12, cyTop + cardH - 10, cardW - 24, 3);
    c.fillStyle = alert ? ERR : AC; c.fillRect(cardX + 12, cyTop + cardH - 10, (cardW - 24) * Math.min(1, sT / STAGES[si].d), 3);
    label(stTxt, cardX + 12, cyTop + cardH + 16, "left", alert ? ERR : TXT, 9.5);

    // ---- Pager ----
    const hot = !!alert, pulse = hot && alert!.t < 2.2 ? .5 + .5 * Math.sin(t * 10) : 0;
    c.beginPath(); c.roundRect(pagerX, pagerY, 20, 20, 4); c.fillStyle = BG; c.fill();
    if (pulse) { c.shadowColor = ERR; c.shadowBlur = 14 * pulse; }
    c.strokeStyle = hot ? (alert!.t < 2.2 ? ERR : OK) : hexA(AC, .35); c.lineWidth = 1.3; c.stroke(); c.shadowBlur = 0;
    c.beginPath(); c.arc(pagerX + 10, pagerY + 10, 3, 0, 7); c.fillStyle = hot ? (alert!.t < 2.2 ? ERR : OK) : hexA(AC, .35); c.fill();
    label("on-call · SWAT", pagerX + 28, pagerY + 14, "left", hot ? TXT : SOFT, 9.5);
    if (alert) {
      const msg = alert.t < .9 ? `${alert.kind} · ${alert.text}` : alert.t < 2.2 ? "investigating → hotfix" : "resolved · back to the sprint";
      label(msg, pagerX, pagerY + 38, "left", alert.t < 2.2 ? ERR : OK, 10, 500);
      if (alert.lag && alert.t < 2.2) line([[pagerX + 10, pagerY + 20], [P.index[0], P.index[1] - nodeH / 2]], ERR, .5, [3, 4]);
    }
  }

  return {
    resize(w, h, textRight) { W = w; H = h; TR = textRight; layout(); packets = []; },
    step, render,
    stage: () => si,
    done: () => fi === FEATURES.length - 1 && si === STAGES.length - 1 && sT > STAGES[si].d - .1,
    still() { if (t === 0) { for (let i = 0; i < 600; i++) step(.05); } render(); }
  };
}
