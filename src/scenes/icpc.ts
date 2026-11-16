import { rng, hexA, clamp, MONO, NARROW, ctx2d, palette, OK, WARN, ERR, type SceneFactory, MIN_PX } from './kit'

// ICPC era: contests with balloons, algorithms behind each attempt, and the community I trained.
export const icpc: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  // Me, my team and the people I trained are the accent; the algorithm being run is dim. Verdicts are status:
  // OK = OK, ERR = ERR, WARN = WARN, always next to their label.
  const pal = palette(cv), BG = pal.bg, ACC = pal.accent, DIM = pal.dim, TXT = pal.ink, SOFT = pal.soft;
  // Exception: real ICPC balloons are multicoloured, one colour per problem.
  const BALLOON = ["#ff6b6b", "#ffd84a", "#7ee08a", "#86b6ff", "#ff9ad0", "#c7a6ff", "#ffb36b", "#7ef0c4", "#ffffff", "#9ec1ff", "#ffe36b", "#ff8f6b"];
  // Exception: medal colours are the real bronze and gold.
  const BRONZE = "#d08a4b", GOLD_MEDAL = "#ffd84a";
  const LETTERS = "ABCDEFGHIJKL".split("");
  interface Contest { name: string; hours: number; result: string[]; medal: string; tries: [string, string][] }
  interface Graph { nodes: [number, number][]; adj: number[][]; dist: number[]; path: number[]; tgt: number; max: number; key?: string }
  interface Balloon { p: string; born: number; x: number; sway: number }
  const CONTESTS: Contest[] = [
    { name: "ECPC 2022", hours: 5, result: ["Bronze medal", "top of 250+ Egyptian teams"], medal: BRONZE,
      tries: [["A", "AC"], ["C", "WA"], ["C", "AC"], ["F", "AC"], ["B", "TLE"], ["B", "AC"], ["H", "AC"], ["E", "WA"]] },
    { name: "IEEEXtreme 16.0", hours: 24, result: ["5th in Egypt · 86th worldwide", "1st at Mansoura University"], medal: GOLD_MEDAL,
      tries: [["A", "AC"], ["D", "AC"], ["G", "WA"], ["G", "AC"], ["B", "AC"], ["J", "TLE"], ["J", "AC"], ["K", "AC"]] },
    { name: "ACPC", hours: 5, result: ["Regional finalist", "4 years in a row, 25+ countries"], medal: SOFT,
      tries: [["B", "AC"], ["A", "WA"], ["A", "AC"], ["E", "AC"], ["D", "TLE"], ["I", "AC"], ["D", "WA"], ["D", "AC"]] }
  ];
  const ALGO = ["BFS · shortest path", "DP · table fill", "Dijkstra", "DP · knapsack", "graph · components", "DP · intervals", "BFS · grid", "DP · bitmask"];
  const TRY = 1.25, RUN = 10.4, RES = 3.4;

  let W = 0, H = 0, TR = 0, X0: number, X1: number, span: number, topY: number, midY: number, midH: number, botY: number;
  let t = 0, ci = 0, ct = 0, solved = new Set<string>(), tried = new Set<string>(), log: [string, string, string][] = [], balloons: Balloon[] = [], done = -1;
  let graph: Graph | null = null, trained = 0, ripples: { born: number }[] = [], sessT = 0;

  function layout() {
    X1 = W - (W < NARROW ? 16 : 84);
    X0 = W < NARROW ? 16 : Math.min(Math.max(TR + 32, W * .42), X1 - 400);
    span = X1 - X0;
    topY = H * .07; midY = topY + 128; midH = Math.min(200, H * .26); botY = Math.max(H * .74, midY + midH + 60);
    graph = null;
  }

  function makeGraph(seed: number): Graph {
    const rr = rng(seed), gw = span * .62, nodes: [number, number][] = [];
    for (let i = 0; i < 26; i++) nodes.push([X0 + 10 + rr() * (gw - 20), midY + 18 + rr() * (midH - 36)]);
    nodes.sort((a, b) => a[0] - b[0]);
    const adj = nodes.map((): number[] => []);
    nodes.forEach((p, i) => {
      nodes.map((q, j) => [Math.hypot(q[0] - p[0], q[1] - p[1]), j]).sort((a, b) => a[0] - b[0]).slice(1, 4)
        .forEach(([, j]) => { if (!adj[i].includes(j)) { adj[i].push(j); adj[j].push(i); } });
    });
    const dist = nodes.map(() => -1), par = nodes.map(() => -1), q = [0]; dist[0] = 0;
    while (q.length) { const u = q.shift()!; adj[u].forEach(v => { if (dist[v] < 0) { dist[v] = dist[u] + 1; par[v] = u; q.push(v); } }); }
    let tgt = nodes.length - 1; while (dist[tgt] < 0) tgt--;
    const path: number[] = []; for (let v = tgt; v >= 0; v = par[v]) path.push(v);
    return { nodes, adj, dist, path, tgt, max: dist[tgt] };
  }

  function step(dt: number) {
    t += dt; ct += dt;
    const C = CONTESTS[ci];
    const k = Math.floor(ct / TRY);
    if (ct < RUN && k < C.tries.length && k !== done) {
      const tp = ct - k * TRY;
      if (tp >= .85) {
        done = k;
        const [p, v] = C.tries[k];
        tried.add(p);
        const clock = fmt(C.hours * 3600 * (ct / RUN));
        log.unshift([clock, p, v]); if (log.length > 5) log.pop();
        if (v === "AC" && !solved.has(p)) { solved.add(p); balloons.push({ p, born: t, x: 0, sway: Math.random() * 6 }); }
      }
    }
    if (ct >= RUN + RES) { ct = 0; ci = (ci + 1) % CONTESTS.length; solved = new Set(); tried = new Set(); log = []; balloons = []; done = -1; if (ci === 0) trained = 0; }

    sessT += dt;
    if (sessT > 2.2) { sessT = 0; ripples.push({ born: t }); trained = Math.min(300, trained + 28); }
    ripples = ripples.filter(rp => t - rp.born < 1.6);
  }

  const fmt = (s: number) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = s % 60; return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`; };
  function label(text: string, x: number, y: number, align: CanvasTextAlign = "left", col = SOFT, size = 10, weight = 400) {
    c.font = `${weight} ${Math.max(MIN_PX, size)}px ${MONO}`; c.textAlign = align; c.fillStyle = col; c.fillText(text, x, y);
  }
  function person(x: number, y: number, col: string) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y - 5, 3.6, 0, 7); c.fill(); c.beginPath(); c.arc(x, y + 7, 6.5, Math.PI, 0); c.fill();
  }

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    const C = CONTESTS[ci], running = ct < RUN;

    // ---- Contest header ----
    c.beginPath(); c.roundRect(X0, topY, span, 104, 8); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(ACC, .45); c.stroke();
    label("CONTEST", X0 + 12, topY + 18, "left", hexA(ACC, .8), 9);
    label(C.name, X0 + 12, topY + 38, "left", TXT, 13, 500);
    const left = C.hours * 3600 * Math.max(0, 1 - ct / RUN);
    label(running ? fmt(left) : "0:00:00", X0 + 12, topY + 62, "left", running && left < 3600 && C.hours === 5 ? WARN : ACC, 16, 500);
    if (running && left < 3600 && C.hours === 5) label("scoreboard frozen", X0 + 104, topY + 61, "left", WARN, 8.5);
    [0, 1, 2].forEach(i => person(X0 + 150 + i * 24, topY + 32, i === 1 ? ACC : hexA(TXT, .7)));
    label("team of 3 · me", X0 + 174, topY + 54, "center", SOFT, 8.5);
    const pw = Math.min(26, (span - 24) / 12 - 4);
    LETTERS.forEach((L, i) => {
      const x = X0 + 12 + i * (pw + 4), y = topY + 74, s = solved.has(L), tr = tried.has(L);
      c.beginPath(); c.roundRect(x, y, pw, 20, 3); c.fillStyle = s ? hexA(OK, .25) : tr ? hexA(ERR, .18) : hexA(TXT, .05); c.fill();
      c.strokeStyle = s ? OK : tr ? ERR : hexA(TXT, .2); c.stroke();
      label(L, x + pw / 2, y + 14, "center", s ? OK : tr ? ERR : SOFT, 9.5, 500);
    });
    label(`solved ${solved.size}`, X0 + span - 12, topY + 22, "right", OK, 10, 500);

    // Balloons float above the team.
    balloons.forEach((b, i) => {
      const age = t - b.born, rise = Math.min(1, age / 1.2);
      const bx = X0 + span - 30 - i * 22 + Math.sin(t * 1.5 + b.sway) * 3, by = topY + 70 - rise * 22;
      c.strokeStyle = hexA(TXT, .35); c.beginPath(); c.moveTo(bx, by + 9); c.quadraticCurveTo(bx - 3, by + 18, bx, by + 26); c.stroke();
      c.fillStyle = BALLOON[LETTERS.indexOf(b.p)]; c.beginPath(); c.ellipse(bx, by, 7, 9, 0, 0, 7); c.fill();
      label(b.p, bx, by + 3, "center", BG, 8.5, 500);
    });

    // ---- Thinking: an algorithm per attempt ----
    const k = Math.min(C.tries.length - 1, Math.floor(ct / TRY)), tp = ct - k * TRY;
    const gw = span * .62;
    label(`THINKING · ${ALGO[(k + ci * 3) % ALGO.length]}`, X0, midY - 8, "left", SOFT, 9.5);
    c.beginPath(); c.roundRect(X0, midY, gw, midH, 6); c.strokeStyle = hexA(DIM, .25); c.stroke();
    if (running) {
      const [p, v] = C.tries[k], prog = clamp(tp / .8, 0, 1), judged = tp >= .85;
      const vc = v === "AC" ? OK : v === "WA" ? ERR : WARN;
      if ((k + ci) % 2 === 0) {
        if (!graph || graph.key !== `${ci}-${k}`) { graph = makeGraph(ci * 100 + k + 1); graph.key = `${ci}-${k}`; }
        const g = graph, reach = prog * (v === "TLE" ? g.max * .6 : g.max);
        g.adj.forEach((ns, i) => ns.forEach(j => { if (j < i) return; const lit = g.dist[i] <= reach && g.dist[j] <= reach; c.strokeStyle = lit ? hexA(DIM, .5) : hexA(TXT, .08); c.beginPath(); c.moveTo(...g.nodes[i]); c.lineTo(...g.nodes[j]); c.stroke(); }));
        if (judged && v !== "TLE") { c.strokeStyle = vc; c.lineWidth = 2.4; c.beginPath(); g.path.forEach((n, i) => i ? c.lineTo(...g.nodes[n]) : c.moveTo(...g.nodes[n])); c.stroke(); c.lineWidth = 1; }
        g.nodes.forEach(([x, y], i) => { const lit = g.dist[i] >= 0 && g.dist[i] <= reach; c.beginPath(); c.arc(x, y, i === 0 || i === g.tgt ? 5 : 3, 0, 7); c.fillStyle = i === 0 || i === g.tgt ? ACC : lit ? DIM : hexA(TXT, .2); c.fill(); });
      } else {
        const rows = 6, cols = 10, cw = (gw - 40) / cols, ch = (midH - 40) / rows, fill = prog * (rows + cols - 1) * (v === "TLE" ? .6 : 1);
        for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
          const x = X0 + 20 + j * cw, y = midY + 20 + i * ch, on = i + j < fill, last = i === rows - 1 && j === cols - 1;
          c.fillStyle = last && judged && v !== "TLE" ? hexA(vc, .7) : on ? hexA(DIM, .12 + .3 * ((i * 7 + j * 3) % 5) / 5) : hexA(TXT, .04);
          c.fillRect(x + 1, y + 1, cw - 2, ch - 2);
        }
      }
      if (judged) {
        const a = clamp((tp - .85) / .15, 0, 1);
        c.globalAlpha = a;
        c.font = `800 22px ${MONO}`; c.textAlign = "right"; c.fillStyle = vc; c.fillText(v, X0 + gw - 14, midY + 32);
        label(`problem ${p}`, X0 + gw - 14, midY + 48, "right", vc, 9);
        c.globalAlpha = 1;
      } else label(`problem ${p} · submitting…`, X0 + gw - 14, midY + 22, "right", SOFT, 9);
    } else {
      const a = clamp((ct - RUN) / .4, 0, 1);
      c.globalAlpha = a;
      const mx = X0 + 56, my = midY + midH / 2;
      c.beginPath(); c.moveTo(mx - 14, my - 50); c.lineTo(mx, my - 22); c.lineTo(mx + 14, my - 50); c.strokeStyle = hexA(C.medal, .8); c.lineWidth = 3; c.stroke(); c.lineWidth = 1;
      c.shadowColor = C.medal; c.shadowBlur = 18; c.beginPath(); c.arc(mx, my, 22, 0, 7); c.fillStyle = C.medal; c.fill(); c.shadowBlur = 0;
      c.beginPath(); c.arc(mx, my, 15, 0, 7); c.strokeStyle = hexA(BG, .6); c.stroke();
      label("scoreboard unfrozen", X0 + 96, my - 26, "left", SOFT, 9);
      label(C.result[0], X0 + 96, my - 4, "left", TXT, 13, 500);
      label(C.result[1], X0 + 96, my + 16, "left", C.medal, 10);
      c.globalAlpha = 1;
    }

    // Submission log
    const lx = X0 + gw + 14;
    label("SUBMISSIONS", lx, midY - 8, "left", SOFT, 9.5);
    log.forEach(([clk, p, v], i) => {
      const y = midY + 16 + i * 20, vc = v === "AC" ? OK : v === "WA" ? ERR : WARN;
      c.globalAlpha = 1 - i * .15;
      label(clk, lx, y, "left", SOFT, 9);
      label(p, lx + 62, y, "left", TXT, 9.5, 500);
      label(v, lx + 78, y, "left", vc, 9.5, 500);
      c.globalAlpha = 1;
    });

    // ---- Community ----
    label("TECHNICAL HEAD · ICPC Mansoura community", X0, botY - 12, "left", SOFT, 9.5);
    const gap = Math.min(13, (span - 170) / 30), meX = X0 + 10, meY = botY + gap * 5;
    person(meX, meY, ACC); label("me", meX, meY + 24, "center", ACC, 8.5);
    ripples.forEach(rp => { const a = (t - rp.born) / 1.6; c.beginPath(); c.arc(meX, meY, 10 + a * span * .5, -1.1, 1.1); c.strokeStyle = hexA(ACC, .35 * (1 - a)); c.stroke(); });
    for (let i = 0; i < 300; i++) {
      const col = Math.floor(i / 10), row = i % 10, x = X0 + 36 + col * gap, y = botY + row * gap;
      const org = col < 4, lit = org || i - 40 < trained * 260 / 300;
      c.beginPath(); c.arc(x, y, org ? 3 : 2.4, 0, 7);
      c.fillStyle = org ? DIM : lit ? hexA(ACC, .75) : hexA(TXT, .1); c.fill();
    }
    const ex = X0 + 36 + 30 * gap + 10;
    label("40+ organizers", ex, botY + 20, "left", DIM, 9.5, 500);
    label(`${trained >= 300 ? "300+" : trained} trainees`, ex, botY + 38, "left", ACC, 9.5, 500);
    label("2021 – 2022", ex, botY + 56, "left", SOFT, 9);
  }

  return {
    resize(w, h, textRight) { W = w; H = h; TR = textRight; layout(); },
    step, render,
    stage: () => ci,
    done: () => ci === CONTESTS.length - 1 && ct > RUN + RES - .1,
    still() { if (t === 0) { for (let i = 0; i < (RUN + .5) / .05; i++) step(.05); } render(); }
  };
}
