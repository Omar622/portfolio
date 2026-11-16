import { rng, hexA, ease, clamp, MONO, NARROW, ctx2d, palette, OK, WARN, ERR, type SceneFactory, MIN_PX } from './kit'

// AtenTEC: design sessions with the solution architect drive internal photo services
// (upload, compress on a Go worker pool, moderation, storage) and a NestJS-to-Go rewrite.
export const atentec: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  // Me and the Go services I built are the accent. The architect and the old NestJS services are neutral.
  // Moderation verdicts, reports and CPU/MEM use the status colours.
  const pal = palette(cv), BG = pal.bg, RAISE = pal.raise, AC = pal.accent, DIM = pal.dim, TXT = pal.ink, SOFT = pal.soft;
  const r = rng(23);
  const TOPICS = [
    { arch: "Photos are huge. Compress them before storage.", me: "A Go worker pool. Each photo on its own goroutine.", d: 7.5, design: [["upload"], ["compress", "new"], ["storage"]] },
    { arch: "Some uploaded photos are not safe to show.", me: "A background job. It flags them and reports some.", d: 7.5, design: [["storage"], ["moderate", "new"], ["report"]] },
    { arch: "The old Nest services eat CPU and memory.", me: "I'll profile them, then rewrite them in Go.", d: 13, design: [["NestJS", "old"], ["profile"], ["Go", "new"]] },
    { arch: "Stress test it before we release.", me: "Load tests are running. Then we ship.", d: 7.5, design: [["load"], ["services"], ["metrics"]] }
  ];
  type Pt = [number, number];
  interface Tile { x: number; y: number; st: number; size: number; tint: number; hue: number; lane: number; proc: number; procT: number; wait: number; gone?: boolean }
  interface ModItem { x: number; y: number; hue: number; size: number; tint: number; st: number; at?: boolean; scan: number; verdict?: string; report?: boolean }
  interface Mark { kind: string; x: number; y: number; tx: number; ty: number; col: string; done?: boolean }
  const SERVICES = ["stats", "storage", "export"];
  const LANES = 4;

  let W = 0, H = 0, TR = 0, X0: number, X1: number, span: number, ty: number, bx: number, bw: number, bpx: number, bpw: number, py0: number, up: Pt, poolX: number, poolW: number, filt: Pt, store: Pt, cy0: number, cw: number, mount: Pt[] = [];
  let t = 0, ti = 0, tt = 0, pipeA = 0, filterA = 0, stored = 0, acc = 0, flagged = 0, reported = 0, rep: Pt = [0, 0], modBusy: ModItem | null = null, flagPulse = 0, repPulse = 0;
  let mq: ModItem[] = [], marks: Mark[] = [];
  let tiles: Tile[] = [], queue: Tile[] = [], lanes: (Tile | null)[] = new Array(LANES).fill(null);
  const flames = SERVICES.map(() => [0, 1, 2].map(() => [0, 1, 2, 3].map(() => .15 + r() * .35)));

  function layout() {
    X1 = W - (W < NARROW ? 16 : 84);
    X0 = W < NARROW ? 16 : Math.min(Math.max(TR + 32, W * .42), X1 - 400);
    span = X1 - X0;
    ty = H * .07;
    bx = X0 + 112; bw = Math.min(230, span * .38);
    bpx = bx + bw + 16; bpw = X1 - bpx;
    py0 = Math.max(H * .47, ty + 210);
    up = [X0 + span * .07, py0];
    poolW = Math.min(140, span * .24); poolX = X0 + span * .36;
    store = [X0 + span * .86, py0]; filt = [X0 + span * .62, py0 + 92]; rep = [X0 + span * .36, py0 + 92];
    cy0 = Math.min(Math.max(H * .7, py0 + 150), H - 112);
    cw = (span - 28) / 3;
    mount = [];
    let y = H * .9;
    for (let x = 0; x <= W; x += 14) { y += (r() - .5) * 16; y = clamp(y, H * .84, H * .95); mount.push([x, y]); }
  }

  const laneY = (i: number) => py0 - 30 + i * 20;
  const slotX = (p: number) => poolX - poolW / 2 + 16 + p * (poolW - 32);

  function cardState(i: number) {
    const s = ti > 2 ? 99 : ti === 2 ? tt - 3.2 - i * 3 : -1;
    const k = clamp((s - 1.6) / 1, 0, 1);
    return { prof: s >= 0 && s < 1.2, flip: clamp((s - 1) / .6, 0, 1), go: s >= 1.3, cpu: .82 - .52 * ease(k), mem: .76 - .52 * ease(k), done: s >= 2.6 };
  }

  function step(dt: number) {
    t += dt; tt += dt;
    if (tt >= TOPICS[ti].d) { tt = 0; ti = (ti + 1) % TOPICS.length; }
    const pipeT = ti > 0 || tt > 4.2 ? 1 : pipeA > .5 ? 1 : 0;
    const filterT = ti > 1 || (ti === 1 && tt > 4.2) ? 1 : 0;
    const k = 1 - Math.exp(-dt * 2.5);
    pipeA += (pipeT - pipeA) * k; filterA += (filterT - filterA) * k;
    const stress = ti === 3 && tt > 3.2;

    if (pipeA > .5) {
      acc += dt * (stress ? 5.4 : 2.4);
      while (acc >= 1) { acc--; tiles.push({ x: up[0] - 60, y: py0, st: 0, size: 1, tint: 0, hue: r(), lane: -1, proc: 0, procT: .8 + r() * .5, wait: 0 }); }
    }
    lanes.forEach((l, i) => { if (!l && queue.length) { const tl = queue.shift()!; tl.lane = i; tl.st = 2; tl.proc = 0; lanes[i] = tl; } });

    tiles.forEach(tl => {
      let tx: number, ty2: number;
      if (tl.st === 0) [tx, ty2] = up;
      else if (tl.st === 1) { const q = queue.indexOf(tl); tx = poolX - poolW / 2 - 16 - q * 20; ty2 = py0; }
      else if (tl.st === 2) { tx = slotX(tl.proc); ty2 = laneY(tl.lane); }
      else if (tl.st === 3) [tx, ty2] = store;
      else [tx, ty2] = store;
      const dx = tx - tl.x, dy = ty2 - tl.y, d = Math.hypot(dx, dy), sp = 260 * dt;
      if (d > sp) { tl.x += dx / d * sp; tl.y += dy / d * sp; } else { tl.x = tx; tl.y = ty2; }
      const arrived = d <= sp;
      if (tl.st === 0 && arrived) { tl.st = 1; queue.push(tl); }
      else if (tl.st === 2 && arrived) {
        tl.proc = Math.min(1, tl.proc + dt / tl.procT); tl.size = 1 - .3 * tl.proc;
        if (tl.proc >= 1) { lanes[tl.lane] = null; tl.st = 3; }
      } else if (tl.st === 3 && arrived) {
        tl.gone = true; stored++;
        if (filterA > .5) mq.push({ x: store[0], y: store[1] + 16, hue: tl.hue, size: .7, tint: 0, st: 0, scan: 0 });
      }
    });
    tiles = tiles.filter(tl => !tl.gone);

    // Background moderation: stored photos are scanned one by one, off the upload path.
    mq.forEach((m, i) => {
      const tx = filt[0] + 50 + Math.min(i, 7) * 15, ty2 = filt[1], dx = tx - m.x, dy = ty2 - m.y, d = Math.hypot(dx, dy), sp = 110 * dt;
      if (d > sp) { m.x += dx / d * sp; m.y += dy / d * sp; } else { m.x = tx; m.y = ty2; m.at = true; }
    });
    if (!modBusy && mq.length && mq[0].at) { modBusy = mq.shift()!; modBusy.scan = 0; }
    if (modBusy) {
      const m = modBusy; m.x += (filt[0] - m.x) * Math.min(1, dt * 8); m.y = filt[1];
      m.scan += dt / .22;
      if (m.scan >= 1 && !m.verdict) { const v = r(); m.verdict = v < .7 ? "ok" : v < .88 ? "warn" : "hide"; m.tint = 1; m.report = m.verdict !== "ok" && r() < .5; }
      if (m.scan >= 1.9) {
        if (m.verdict !== "ok") marks.push({ kind: "flag", x: filt[0], y: filt[1] - 12, tx: store[0], ty: store[1] + 18, col: m.verdict === "warn" ? WARN : ERR });
        if (m.report) marks.push({ kind: "doc", x: filt[0] - 36, y: filt[1], tx: rep[0] + 36, ty: rep[1], col: ERR });
        modBusy = null;
      }
    }
    marks.forEach(k => {
      const dx = k.tx - k.x, dy = k.ty - k.y, d = Math.hypot(dx, dy), sp = 150 * dt;
      if (d > sp) { k.x += dx / d * sp; k.y += dy / d * sp; } else { k.done = true; if (k.kind === "flag") { flagged++; flagPulse = 1; } else { reported++; repPulse = 1; } }
    });
    marks = marks.filter(k => !k.done);
    flagPulse = Math.max(0, flagPulse - dt * 1.5); repPulse = Math.max(0, repPulse - dt * 1.5);
    if (filterA < .3) { mq = []; modBusy = null; marks = []; }
  }

  function label(text: string, x: number, y: number, align: CanvasTextAlign = "left", col = SOFT, size = 10, weight = 400) {
    c.font = `${weight} ${Math.max(MIN_PX, size)}px ${MONO}`; c.textAlign = align; c.fillStyle = col; c.fillText(text, x, y);
  }
  function wrap(text: string, maxW: number) {
    const lines = [""];
    text.split(" ").forEach(w => { const cand = lines[lines.length - 1] ? lines[lines.length - 1] + " " + w : w; if (c.measureText(cand).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = cand; });
    return lines.slice(0, 2);
  }
  function person(x: number, y: number, col: string) {
    c.fillStyle = col;
    c.beginPath(); c.arc(x, y - 5, 4, 0, 7); c.fill();
    c.beginPath(); c.arc(x, y + 8, 7.5, Math.PI, 0); c.fill();
  }
  function box(x: number, y: number, w: number, h: number, text: string, col: string, a = 1) {
    c.globalAlpha = a;
    c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 5); c.fillStyle = BG; c.fill(); c.strokeStyle = col; c.lineWidth = 1.3; c.stroke();
    c.font = `11px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = TXT; c.fillText(text, x, y + .5); c.textBaseline = "alphabetic";
    c.globalAlpha = 1;
  }
  function bubble(x: number, y: number, text: string, col: string, born: number, who: string) {
    const age = tt - born; if (age < 0) return;
    c.globalAlpha = Math.min(1, age / .3);
    c.beginPath(); c.roundRect(x, y, bw, 46, 8); c.fillStyle = BG; c.fill(); c.fillStyle = hexA(col, .1); c.fill(); c.strokeStyle = hexA(col, .6); c.stroke();
    label(who, x + 10, y + 13, "left", hexA(col, .8), 8.5);
    c.font = `11px ${MONO}`; c.fillStyle = TXT;
    wrap(text.slice(0, Math.floor(age * 36)), bw - 20).forEach((ln, i) => c.fillText(ln, x + 10, y + 27 + i * 12));
    c.globalAlpha = 1;
  }
  function tile(tl: { x: number; y: number; size: number; hue: number; tint: number; verdict?: string }) {
    const w = 18 * tl.size, h = 13 * tl.size, x = tl.x - w / 2, y = tl.y - h / 2;
    const v = tl.tint > .5 ? tl.verdict : null;
    c.fillStyle = v === "hide" ? RAISE : hexA(tl.hue > .5 ? SOFT : DIM, .6 + .35 * tl.hue); c.fillRect(x, y, w, h);
    if (v !== "hide") {
      c.fillStyle = hexA(TXT, .55);
      c.beginPath(); c.moveTo(x + 2, y + h - 2); c.lineTo(x + w * .4, y + h * .35); c.lineTo(x + w * .65, y + h - 2); c.fill();
      c.beginPath(); c.arc(x + w * .75, y + h * .3, 1.6 * tl.size, 0, 7); c.fill();
    }
    if (v === "warn") { c.fillStyle = hexA(BG, .62); c.fillRect(x, y, w, h); }
    c.strokeStyle = v === "warn" ? WARN : v === "hide" ? ERR : hexA(BG, .7); c.lineWidth = v && v !== "ok" ? 1.4 : 1; c.strokeRect(x, y, w, h); c.lineWidth = 1;
    if (v === "warn") { c.font = `bold ${Math.round(9 * tl.size + 2)}px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = WARN; c.fillText("!", x + w / 2, y + h / 2 + .5); c.textBaseline = "alphabetic"; }
    if (v === "hide") { c.beginPath(); c.moveTo(x + 2, y + h - 2); c.lineTo(x + w - 2, y + 2); c.strokeStyle = ERR; c.lineWidth = 1.4; c.stroke(); c.lineWidth = 1; }
    if (v === "ok") { c.beginPath(); c.arc(x + w, y, 2.6, 0, 7); c.fillStyle = OK; c.fill(); }
  }

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    // El Tor dusk, very faint.
    c.globalAlpha = .28;
    c.fillStyle = hexA(DIM, .55); c.beginPath(); c.arc(X1 - 40, H * .86, 26, 0, 7); c.fill();
    c.fillStyle = RAISE; c.beginPath(); c.moveTo(0, H); mount.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(W, H); c.fill();
    c.globalAlpha = 1;

    const T = TOPICS[ti];
    // ---- Design session ----
    label("DESIGN · with the solution architect", X0, ty - 8, "left", SOFT, 9.5);
    person(X0 + 26, ty + 34, SOFT); label("architect", X0 + 26, ty + 62, "center", SOFT, 8.5);
    person(X0 + 76, ty + 34, AC); label("me", X0 + 76, ty + 62, "center", AC, 8.5);
    const talk = tt < 3.4 ? (tt < 1.8 ? 0 : 1) : -1;
    if (talk >= 0) { c.beginPath(); c.arc(X0 + (talk ? 76 : 26), ty + 30, 15, 0, 7); c.strokeStyle = hexA(talk ? AC : SOFT, .5 + .3 * Math.sin(t * 6)); c.stroke(); }
    bubble(bx, ty, T.arch, SOFT, .2, "architect");
    bubble(bx, ty + 54, T.me, AC, 1.8, "me");
    if (bpw >= 150) {
      const bph = 100;
      c.beginPath(); c.roundRect(bpx, ty, bpw, bph, 6); c.fillStyle = hexA(SOFT, .06); c.fill(); c.strokeStyle = hexA(SOFT, .4); c.stroke();
      c.save(); c.beginPath(); c.roundRect(bpx, ty, bpw, bph, 6); c.clip();
      c.strokeStyle = hexA(SOFT, .08);
      for (let x = bpx; x < bpx + bpw; x += 12) { c.beginPath(); c.moveTo(x, ty); c.lineTo(x, ty + bph); c.stroke(); }
      for (let y = ty; y < ty + bph; y += 12) { c.beginPath(); c.moveTo(bpx, y); c.lineTo(bpx + bpw, y); c.stroke(); }
      c.restore();
      label("blueprint", bpx + 8, ty + 14, "left", hexA(SOFT, .8), 8.5);
      const n = T.design.length, gap = 10, w = Math.min(72, (bpw - 20 - gap * (n - 1)) / n), y = ty + 56;
      T.design.forEach(([name, tag], i) => {
        const a = clamp((tt - 1 - i * .6) / .4, 0, 1); if (!a) return;
        const x = bpx + 10 + w / 2 + i * (w + gap), col = tag === "new" ? AC : SOFT;
        c.globalAlpha = a; c.setLineDash([4, 3]);
        c.beginPath(); c.roundRect(x - w / 2, y - 12, w, 24, 4); c.strokeStyle = col; c.stroke(); c.setLineDash([]);
        c.font = `11px ${MONO}`; c.textAlign = "center"; c.fillStyle = TXT; c.fillText(name, x, y + 3);
        if (i) { c.beginPath(); c.moveTo(x - w / 2 - gap + 2, y); c.lineTo(x - w / 2 - 3, y); c.strokeStyle = SOFT; c.stroke(); }
        c.globalAlpha = 1;
      });
    }

    // ---- Photo services ----
    label("PHOTO SERVICES · internal microservices", X0, py0 - 62, "left", SOFT, 9.5);
    c.globalAlpha = .35 + .65 * pipeA;
    c.strokeStyle = hexA(AC, .35); c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(up[0] - 60, py0); c.lineTo(store[0], py0); c.stroke();
    box(up[0], py0, 58, 26, "upload", AC, .35 + .65 * pipeA);
    c.globalAlpha = .35 + .65 * pipeA;
    c.beginPath(); c.roundRect(poolX - poolW / 2, py0 - 44, poolW, 88, 6); c.fillStyle = BG; c.fill(); c.strokeStyle = AC; c.stroke();
    for (let i = 0; i < LANES; i++) { c.strokeStyle = hexA(AC, .25); c.strokeRect(poolX - poolW / 2 + 8, laneY(i) - 8, poolW - 16, 16); }
    label("compress · Go worker pool", poolX, py0 - 50, "center", TXT, 9.5);
    label(`${LANES} goroutines`, poolX, py0 + 58, "center", hexA(AC, .8), 9);
    c.globalAlpha = 1;
    c.globalAlpha = .35 + .65 * pipeA;
    const [sx, sy] = store;
    c.beginPath(); c.arc(sx - 12, sy + 2, 11, Math.PI * .5, Math.PI * 1.5); c.arc(sx, sy - 8, 14, Math.PI, 0); c.arc(sx + 14, sy + 2, 11, Math.PI * 1.5, Math.PI * .5); c.closePath();
    c.fillStyle = BG; c.fill(); c.strokeStyle = AC; c.lineWidth = 1.3; c.stroke();
    label("cloud storage", sx, sy + 30, "center", SOFT, 9);
    label(`stored ${stored}`, sx, sy + 43, "center", hexA(AC, .8), 9);
    if (filterA > .02) { if (flagPulse) { c.shadowColor = WARN; c.shadowBlur = 12 * flagPulse; } label(`flagged ${flagged}`, sx + 30, sy - 22, "left", hexA(WARN, .9 * filterA), 9); c.shadowBlur = 0; }
    c.globalAlpha = 1;
    tiles.forEach(tile);

    if (filterA > .02) {
      c.globalAlpha = filterA;
      label("MODERATION · background job · async", filt[0] - 36, filt[1] - 24, "left", SOFT, 9);
      c.setLineDash([3, 5]); c.lineDashOffset = -t * 20; c.strokeStyle = hexA(AC, .4);
      c.beginPath(); c.moveTo(store[0], store[1] + 16); c.quadraticCurveTo(store[0], filt[1], filt[0] + 40, filt[1]); c.stroke();
      c.strokeStyle = hexA(ERR, .4); c.beginPath(); c.moveTo(filt[0] - 36, filt[1]); c.lineTo(rep[0] + 36, rep[1]); c.stroke();
      c.setLineDash([]); c.lineDashOffset = 0;
      c.globalAlpha = 1;
      box(filt[0], filt[1], 72, 26, "moderate", AC, filterA);
      if (modBusy && modBusy.scan < 1) {
        const sxl = filt[0] - 30 + modBusy.scan * 60;
        c.strokeStyle = hexA(AC, .9); c.beginPath(); c.moveTo(sxl, filt[1] - 12); c.lineTo(sxl, filt[1] + 12); c.stroke();
      }
      c.globalAlpha = filterA;
      [["ok", OK], ["warn", WARN], ["hide", ERR]].forEach(([n, col], i) => {
        const lx = filt[0] - 40 + i * 38;
        c.beginPath(); c.arc(lx - 7, filt[1] + 27, 2.6, 0, 7); c.fillStyle = col; c.fill();
        label(n, lx - 2, filt[1] + 30, "left", col, 8.5);
      });
      if (repPulse) { c.shadowColor = ERR; c.shadowBlur = 14 * repPulse; }
      c.beginPath(); c.roundRect(rep[0] - 36, rep[1] - 13, 72, 26, 5); c.fillStyle = BG; c.fill(); c.strokeStyle = ERR; c.lineWidth = 1.3; c.stroke(); c.shadowBlur = 0;
      label("reports", rep[0], rep[1] + 4, "center", TXT, 10);
      label(`${reported} sent for review`, rep[0], rep[1] + 28, "center", hexA(ERR, .9), 8.5);
      if (mq.length > 4) label(`backlog ${mq.length}`, filt[0] + 50, filt[1] + 24, "left", SOFT, 8.5);
      c.globalAlpha = 1;
      mq.slice(0, 8).forEach(tile);
      if (modBusy) tile(modBusy);
      marks.forEach(k => {
        if (k.kind === "flag") {
          c.strokeStyle = k.col; c.lineWidth = 1.4; c.beginPath(); c.moveTo(k.x, k.y + 6); c.lineTo(k.x, k.y - 6); c.stroke(); c.lineWidth = 1;
          c.fillStyle = k.col; c.beginPath(); c.moveTo(k.x, k.y - 6); c.lineTo(k.x + 8, k.y - 3); c.lineTo(k.x, k.y); c.fill();
        } else {
          c.fillStyle = TXT; c.fillRect(k.x - 5, k.y - 6, 10, 12); c.fillStyle = ERR; c.fillRect(k.x - 3, k.y - 3, 6, 1.5); c.fillRect(k.x - 3, k.y, 6, 1.5); c.fillRect(k.x - 3, k.y + 3, 4, 1.5);
        }
      });
    }
    if (ti === 3 && tt > 3.2) label("stress test · load ×2 · stable", X1, py0 - 62, "right", OK, 9.5, 500);

    // ---- NestJS → Go rewrite ----
    label("REWRITE · NestJS → Go · profiled first", X0, cy0 - 10, "left", SOFT, 9.5);
    SERVICES.forEach((name, i) => {
      const s = cardState(i), x = X0 + i * (cw + 14), y = cy0, h = 96;
      c.beginPath(); c.roundRect(x, y, cw, h, 6); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(s.go ? AC : SOFT, .55); c.lineWidth = 1.2; c.stroke();
      label(name, x + 10, y + 19, "left", TXT, 11, 500);
      const flipW = Math.abs(Math.cos(s.flip * Math.PI)), tech = s.go ? "Go" : "NestJS", tc = s.go ? AC : SOFT;
      c.font = `11px ${MONO}`; const bwid = c.measureText(tech).width + 12;
      c.save(); c.translate(x + cw - 10 - bwid / 2, y + 15); c.scale(Math.max(.05, flipW), 1);
      c.beginPath(); c.roundRect(-bwid / 2, -8, bwid, 16, 8); c.fillStyle = hexA(tc, .18); c.fill(); c.strokeStyle = tc; c.stroke();
      c.fillStyle = tc; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(tech, 0, .5); c.textBaseline = "alphabetic";
      c.restore();
      ([["CPU", s.cpu], ["MEM", s.mem]] as [string, number][]).forEach(([n, v], k) => {
        const yy = y + 38 + k * 16, bx0 = x + 44, bwd = cw - 56;
        label(n, x + 10, yy + 4, "left", SOFT, 9);
        c.fillStyle = hexA(TXT, .1); c.fillRect(bx0, yy - 3, bwd, 6);
        c.fillStyle = v > .5 ? ERR : OK; c.fillRect(bx0, yy - 3, bwd * v, 6);
      });
      if (s.prof) {
        label("profiling…", x + 10, y + 86, "left", SOFT, 9);
        flames[i].forEach((row, ri) => { let fx = x + 80; row.forEach((fw, fi2) => { const ww = fw * (cw - 92) * .5; c.fillStyle = `hsla(${20 + fi2 * 12}, 90%, ${60 - ri * 8}%, .8)`; c.fillRect(fx, y + 90 - ri * 6, ww - 1, 5); fx += ww; }); });
      } else if (s.done) label("CPU ↓ · MEM ↓", x + 10, y + 86, "left", OK, 9, 500);
      else if (ti === 2 && s.flip > 0) label("rewriting in Go…", x + 10, y + 86, "left", AC, 9);
    });
  }

  return {
    resize(w, h, textRight) { W = w; H = h; TR = textRight; layout(); tiles.forEach(tl => { tl.x = up[0]; tl.y = py0; }); },
    step, render,
    stage: () => ti,
    done: () => ti === TOPICS.length - 1 && tt > TOPICS[ti].d - .1,
    still() { if (t === 0) { for (let i = 0; i < 700; i++) step(.05); } render(); }
  };
}
