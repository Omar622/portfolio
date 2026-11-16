import { rng, hexA, ease, clamp, smooth, MONO, NARROW, ctx2d, palette, OK, type SceneFactory } from './kit'

// Acksession: one work cycle per client requirement. Each release reshapes a long product workflow.
export const acksession: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  // Me (my bubbles, my work cycle) is the accent; the client, the agents and the UI panel are neutral or dim.
  const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, TXT = P.ink, SOFT = P.soft;
  const r = rng(7);

  // ops: append [labels] | before X [labels] | after X [labels] | change X | ui
  type Labels = string | string[];
  type Op = [string, Labels?, Labels?];
  interface Req { tag: string; need: string; refine: string; answer: string; ack: string; feedback: string; ops: Op[] }
  interface WNode { id: number; col: number; dc: number; row: number; label: string; born: number; ver: number; flash: number; fc: string }
  interface Edge { a: WNode; b: WNode; s: number }
  interface Bubble { who: string; text: string; born: number; y: number | null }
  interface Tool { ang: number; len: number; label: string; born: number }
  const REQS: Req[] = [
    { tag: "multi-carrier rates", need: "Show rates from several carriers. I buy the one I pick.",
      refine: "What makes you pick one carrier over another today?",
      answer: "Price mostly, but some carriers miss delivery dates.", ack: "Got it: cheapest one that arrives on time. On it.", feedback: "Buying works. Can I use my own carrier account?",
      ops: [["append", "rates"], ["append", "buy"]] },
    { tag: "own carrier accounts", need: "Let me connect my own carrier account.",
      refine: "Why your own account? Negotiated rates, or trust?",
      answer: "We negotiated rates. Yours cost us more.", ack: "Clear: your rates, our flow. Working on it.", feedback: "Connected. Now, who pays for the labels?",
      ops: [["before", "rates", "accounts"]] },
    { tag: "billing modes", need: "Bill labels through your app, or straight to my account.",
      refine: "Who reconciles the invoices? What breaks for them now?",
      answer: "Finance. Two invoice sources confuse them.", ack: "So one clear bill per mode. On it.", feedback: "Billing is clear. Now we need numbers.",
      ops: [["after", "buy", ["app-bill", "acct-bill"]]] },
    { tag: "reports", need: "Add reports on spend and delivery times.",
      refine: "What decision will these reports help you make?",
      answer: "Which carrier to drop, and where we overspend.", ack: "Spend and on-time rate per carrier, then. On it.", feedback: "Reports help. Can I take the data out?",
      ops: [["append", "reports"]] },
    { tag: "export", need: "Export shipments and reports.",
      refine: "Where does the data go next? Maybe we sync it there.",
      answer: "Into our accounting sheet, every month.", ack: "A monthly CSV in your format. Working on it.", feedback: "Export works. Rates feel slow at peak.",
      ops: [["append", "export"]] },
    { tag: "parallel rates", need: "Fan out rate calls and buy fast, even at peak.",
      refine: "Where do users wait today? What do they give up on?",
      answer: "Rates load slowly. People leave checkout.", ack: "Then rates must load fast. On it.", feedback: "Much faster. But each carrier acts differently.",
      ops: [["after", "rates", ["ups", "dhl", "fedex"]], ["change", "rates"]] },
    { tag: "one carrier API", need: "Same experience whatever carrier I use. Fill the API gaps.",
      refine: "Which carrier quirk costs you the most time today?",
      answer: "Each one sends tracking in a different format.", ack: "One tracking model for all carriers. On it.", feedback: "Feels like one carrier now. Can it run itself?",
      ops: [["after", "ups", "adapter"]] },
    { tag: "automations", need: "Let me set rules, triggers and automations.",
      refine: "What do you do by hand every day, step by step?",
      answer: "Pick a carrier per order, by weight and country.", ack: "Rules on weight and country, then auto-buy. On it.", feedback: "Rules save us hours. Tell our systems too.",
      ops: [["append", "rules"], ["append", "actions"]] },
    { tag: "events", need: "Send us events when a shipment changes.",
      refine: "Which system needs to know, and what does it do then?",
      answer: "Our store. It emails buyers the tracking link.", ack: "Shipment events straight to your store. On it.", feedback: "Events work. The screens feel crowded.",
      ops: [["append", "webhooks"]] },
    { tag: "UI / UX", need: "Make the UI simpler. Fewer clicks for daily work.",
      refine: "Show me your busiest day. Where do clicks pile up?",
      answer: "Buying labels one by one. Hundreds a day.", ack: "Bulk buy in one click, then. Working on it.", feedback: "Much easier. Next: marketplaces.",
      ops: [["ui"], ["change", "buy"]] },
    { tag: "marketplace listing", need: "List our items on marketplaces from your app.",
      refine: "Why list from here? What is painful about doing it there?",
      answer: "We copy each item by hand to every marketplace.", ack: "List once, publish everywhere. On it.", feedback: "Listing works. Can they hold our stock too?",
      ops: [["append", "listing"], ["append", ["amazon", "ebay"]]] },
    { tag: "marketplace fulfillment", need: "Send stock to marketplace warehouses. They sell it.",
      refine: "Why hand off selling? Is it storage, speed, or reach?",
      answer: "Our warehouse is full, and they ship faster.", ack: "Send stock to them, track it here. On it.", feedback: "Great. I want one place to watch it all.",
      ops: [["append", ["self-ship", "fulfilled"]]] },
    { tag: "realtime dashboard", need: "One realtime dashboard for all marketplace statuses.",
      refine: "What do you do when a status goes wrong?",
      answer: "We find out late, from angry buyers.", ack: "Live statuses, problems on top. On it.", feedback: "Love it. Last thing: billing our customers.",
      ops: [["append", "live"], ["ui"]] },
    { tag: "Stripe billing", need: "Bill our customers through Stripe.",
      refine: "Why Stripe? Are your customers already there?",
      answer: "Yes, and our finance team knows it.", ack: "Stripe it is. Working on it.", feedback: "Stripe is live. More next quarter.",
      ops: [["append", "stripe"]] }
  ];
  const STAGES = [
    { name: "requirement", d: 2.6 }, { name: "refine", d: 6.4 }, { name: "research", d: 1.8 },
    { name: "split on agents", d: 2.0 }, { name: "review & test", d: 1.5 }, { name: "release", d: 1.7 },
    { name: "feedback", d: 2.4 }
  ];
  const TOOLS = ["search", "docs", "api spec", "llm"];
  const TASKS = ["api", "ui", "tests"];
  const CHECKS = ["tests", "review", "staging"];

  let W = 0, H = 0, TR = 0, X0: number, X1: number, span: number, colW: number, nodeW: number, rowGap: number, laneW: number, bw: number, threadY: number, R: number, rcx: number, rcy: number, hasPanel: boolean, px: number, py: number, pw: number, ph: number;
  const nodeH = 26, bh = 50;
  let t = 0, si = -1, sT = 0, reqI = 0, cycleN = 1, steps = 27, uid = 0, lastCol = -1;
  let scroll: number | null = null, focusCol = 0, applied = false, saidAnswer = false, saidAck = false, relTarget: WNode | null = null, toolNext = 0;
  let nodes: WNode[] = [], edges: Edge[] = [], bubbles: Bubble[] = [], tools: Tool[] = [];
  const ui = { v: 0, pv: 0, mix: 1, flash: 0 };
  const dim = { thread: 0, flow: 0, panel: 0 };
  const cur = { x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, k: 1, click: 0, next: 0 };

  function layout() {
    X1 = W - (W < NARROW ? 16 : 84);
    X0 = W < NARROW ? 16 : Math.min(Math.max(TR + 32, W * .42), X1 - 400);
    span = X1 - X0;
    bw = Math.min(320, span * .72);
    threadY = H * .05 + 34;
    R = clamp(Math.min(span * .15, H * .12), 54, 88);
    const ringW = 2 * (R + 76);
    hasPanel = span >= ringW + 190;
    pw = hasPanel ? Math.min(230, span - ringW - 24) : 0;
    ph = Math.min(130, H * .17);
    rcx = X0 + (span - (hasPanel ? pw + 24 : 0)) / 2;
    rcy = Math.max(H * .47, threadY + 3 * (bh + 8) + R + 26);
    px = X1 - pw; py = rcy - ph / 2;
    rowGap = Math.min(38, H * .05);
    laneW = Math.min(Math.max(H * .82, rcy + R + 96), H - rowGap - 20);
    colW = clamp(span / 4, 104, 160);
    nodeW = Math.min(88, colW * .74);
  }

  const addNode = (col: number, row: number, label: string) => { const n: WNode = { id: uid++, col, dc: col, row, label, born: t, ver: 1, flash: 0, fc: OK }; nodes.push(n); return n; };
  const inCol = (k: number) => nodes.filter(n => n.col === k);
  const link = (a: WNode, b: WNode) => edges.push({ a, b, s: r() });
  const findNode = (label: string) => { for (let i = nodes.length - 1; i >= 0; i--) if (nodes[i].label === label) return nodes[i]; return null; };
  const colOf = (label: string) => { const n = findNode(label); return n ? n.col : -1; };
  function addCol(k: number, labels: Labels) {
    labels = ([] as string[]).concat(labels);
    const rows = labels.length === 1 ? [0] : labels.length === 2 ? [-1, 1] : [-1, 0, 1];
    const prev = inCol(k - 1), next = inCol(k);
    edges = edges.filter(e => !(prev.includes(e.a) && next.includes(e.b)));
    nodes.forEach(n => { if (n.col >= k) n.col++; });
    const made = labels.map((l, i) => addNode(k, rows[i], l));
    made.forEach(m => { prev.forEach(p => link(p, m)); next.forEach(q => link(m, q)); });
    lastCol = Math.max(...nodes.map(n => n.col));
    steps += made.length;
    return made;
  }

  function init() {
    ["order", "validate", "address", "label"].forEach((l, i) => addCol(i, l));
    nodes.forEach(n => { n.born = -5; });
    steps = 27; focusCol = lastCol;
  }

  function applyOps(q: Req) {
    let target: WNode | null = null;
    q.ops.forEach(([type, a, b]) => {
      let made: WNode[] = [];
      if (type === "append") made = addCol(lastCol + 1, a!);
      else if (type === "before") { const k = colOf(a as string); made = addCol(k < 0 ? lastCol + 1 : k, b!); }
      else if (type === "after") { const k = colOf(a as string); made = addCol(k < 0 ? lastCol + 1 : k + 1, b!); }
      else if (type === "change") { const n = findNode(a as string); if (n) { n.ver++; n.flash = 1; n.fc = DIM; target = target || n; } }
      else if (type === "ui") { ui.pv = ui.v; ui.v = (ui.v + 1) % 3; ui.mix = 0; ui.flash = 1; }
      made.forEach(n => { n.flash = 1; n.fc = OK; });
      if (made[0] && !target) target = made[0];
    });
    // TS cannot see the assignments inside the forEach above.
    const found = target as WNode | null;
    if (found) focusCol = found.col;
    if (nodes.length > 70) {
      const minCol = Math.min(...nodes.map(n => n.col));
      const gone = new Set(inCol(minCol));
      nodes = nodes.filter(n => !gone.has(n)); edges = edges.filter(e => !gone.has(e.a) && !gone.has(e.b));
    }
    return target;
  }

  function say(who: string, text: string) {
    bubbles.push({ who, text, born: t, y: null });
    if (bubbles.length > 3) bubbles.shift();
  }

  function enter(i: number) {
    const q = REQS[reqI % REQS.length];
    if (i === 0) say("client", q.need);
    if (i === 1) { say("me", q.refine); saidAnswer = saidAck = false; }
    if (i === 5) { applied = false; relTarget = null; }
    if (i === 6) say("client", q.feedback);
  }

  const stageAng = (i: number) => -Math.PI / 2 + i * Math.PI * 2 / 7;
  const stagePos = (i: number, rad = R): [number, number] => [rcx + Math.cos(stageAng(i)) * rad, rcy + Math.sin(stageAng(i)) * rad];
  const nx = (n: WNode) => X0 + n.dc * colW - scroll!;
  const ny = (n: WNode) => laneW + n.row * rowGap;
  // Steps fade out before they reach the text (wide) or the canvas edge, so none is drawn cut in half.
  const fadeX = (x: number) => (W < NARROW ? smooth(nodeW / 2, nodeW * 1.5, x) : smooth(TR - colW * .6, TR + colW * .4, x))
    * (1 - smooth(W - nodeW * 1.5, W - nodeW / 2, x));

  function step(dt: number) {
    t += dt; sT += dt;
    if (si < 0 || sT >= STAGES[si].d) {
      if (si === 6) { reqI++; cycleN++; }
      si = (si + 1) % 7; sT = 0; enter(si);
    }
    if (si === 1 && !saidAnswer && sT >= 2.1) { saidAnswer = true; say("client", REQS[reqI % REQS.length].answer); }
    if (si === 1 && !saidAck && sT >= 4.2) { saidAck = true; say("me", REQS[reqI % REQS.length].ack); }
    if (si === 5 && !applied && sT >= .8) { applied = true; relTarget = applyOps(REQS[reqI % REQS.length]); }
    if (si === 2 && t >= toolNext) {
      tools.push({ ang: stageAng(2) + Math.PI + (r() - .5) * 2.2, len: 28 + r() * 16, label: TOOLS[Math.floor(r() * TOOLS.length)], born: t });
      toolNext = t + .3 + r() * .3;
    }
    tools = tools.filter(o => t - o.born < 1.3);

    const st = focusCol * colW - span * .6;
    scroll = scroll === null ? st : scroll + (st - scroll) * (1 - Math.exp(-dt * 1.6));
    const kc = 1 - Math.exp(-dt * 4);
    nodes.forEach(n => { n.dc += (n.col - n.dc) * kc; n.flash = Math.max(0, n.flash - dt * .4); });

    bubbles.forEach((b, i) => {
      const ty = threadY + i * (bh + 8);
      b.y = b.y === null ? ty + 18 : b.y + (ty - b.y) * (1 - Math.exp(-dt * 6));
    });

    ui.mix = Math.min(1, ui.mix + dt * 1.6); ui.flash = Math.max(0, ui.flash - dt * .7);
    const kd = 1 - Math.exp(-dt * 3);
    dim.thread += ((si === 0 || si === 1 || si === 6 ? 0 : 1) - dim.thread) * kd;
    dim.flow += ((si >= 5 ? 0 : 1) - dim.flow) * kd;
    dim.panel += ((si >= 3 && si <= 5 ? 0 : 1) - dim.panel) * kd;
    if (hasPanel && t >= cur.next) {
      cur.fx = cur.x || px + pw * .5; cur.fy = cur.y || py + ph * .5;
      cur.tx = px + pw * (.3 + r() * .62); cur.ty = py + 26 + r() * (ph - 36);
      cur.k = 0; cur.next = t + 1.8;
    }
    if (cur.k < 1) { cur.k = Math.min(1, cur.k + dt * 1.5); if (cur.k === 1) cur.click = 1; }
    const e = ease(cur.k); cur.x = cur.fx + (cur.tx - cur.fx) * e; cur.y = cur.fy + (cur.ty - cur.fy) * e;
    cur.click = Math.max(0, cur.click - dt * 2.2);
  }

  function wrap(text: string, maxW: number, maxLines = 2) {
    const lines = [""];
    text.split(" ").forEach(w => {
      const cand = lines[lines.length - 1] ? lines[lines.length - 1] + " " + w : w;
      if (c.measureText(cand).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = cand;
    });
    return lines.slice(0, maxLines);
  }
  function label(text: string, x: number, y: number, align: CanvasTextAlign = "right", col = hexA(SOFT, .85)) {
    c.font = `11px ${MONO}`; c.textAlign = align; c.fillStyle = col; c.fillText(text, x, y);
  }
  function hex(x: number, y: number, rad: number, col: string, a: number) {
    c.globalAlpha = a;
    c.beginPath();
    for (let i = 0; i < 6; i++) { const an = Math.PI / 6 + i * Math.PI / 3; c[i ? "lineTo" : "moveTo"](x + Math.cos(an) * rad, y + Math.sin(an) * rad); }
    c.closePath(); c.fillStyle = BG; c.fill(); c.strokeStyle = col; c.lineWidth = 1.5; c.stroke();
    const rot = t * 2.4;
    c.beginPath(); c.arc(x, y, rad * .45, rot, rot + 4.6); c.stroke();
    c.globalAlpha = 1;
  }
  function check(x: number, y: number, col: string) {
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3.5, y + 3.5); c.lineTo(x + 10, y - 4); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
  }
  function dashed(x1: number, y1: number, x2: number, y2: number, col: string, p?: number) {
    c.setLineDash([3, 5]); c.lineDashOffset = -t * 30; c.lineWidth = 1.2;
    c.strokeStyle = col; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.setLineDash([]); c.lineDashOffset = 0;
    if (p !== undefined) { c.beginPath(); c.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 3, 0, 7); c.fillStyle = col; c.fill(); }
  }

  function drawStep(n: WNode, x: number, y: number, a: number) {
    c.globalAlpha = a;
    c.beginPath(); c.roundRect(x - nodeW / 2, y - nodeH / 2, nodeW, nodeH, 5);
    c.fillStyle = BG; c.fill();
    if (n.flash > 0) { c.shadowColor = n.fc; c.shadowBlur = 16 * n.flash; }
    c.strokeStyle = n.flash > .05 ? n.fc : hexA(AC, .75); c.lineWidth = 1.2 + n.flash; c.stroke();
    c.shadowBlur = 0;
    c.font = `11px ${MONO}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = TXT;
    c.fillText(n.label, x, y + .5);
    if (n.ver > 1) {
      c.beginPath(); c.roundRect(x + nodeW / 2 - 16, y - nodeH / 2 - 8, 22, 14, 7); c.fillStyle = DIM; c.fill();
      c.font = `11px ${MONO}`; c.fillStyle = BG; c.fillText("v" + n.ver, x + nodeW / 2 - 5, y - nodeH / 2 - 1);
    }
    c.textBaseline = "alphabetic"; c.globalAlpha = 1;
  }

  function drawUI(v: number, a: number) {
    if (a <= 0) return;
    c.globalAlpha = a;
    const cx = px + 8 + pw * .22, cy = py + 24, cw = pw - 16 - pw * .22, ch = ph - 32;
    c.fillStyle = hexA(DIM, .35); c.strokeStyle = hexA(DIM, .5);
    if (v === 0) {
      for (let i = 0; i < 5; i++) { const y = cy + i * (ch / 5); c.fillRect(cx, y + 3, cw * .3, 5); c.fillRect(cx + cw * .38, y + 3, cw * .25, 5); c.fillRect(cx + cw * .72, y + 3, cw * .2, 5); }
    } else if (v === 1) {
      const gw = (cw - 8) / 2, gh = (ch - 8) / 2;
      for (let i = 0; i < 4; i++) { const x = cx + (i % 2) * (gw + 8), y = cy + Math.floor(i / 2) * (gh + 8); c.strokeRect(x, y, gw, gh); c.fillRect(x + 6, y + gh - 12, gw * (.3 + .15 * i), 5); }
    } else {
      for (let i = 0; i < 3; i++) c.strokeRect(cx, cy + i * 22, cw * .8, 14);
      c.fillStyle = hexA(DIM, .8); c.beginPath(); c.roundRect(cx, cy + 70, 64, 18, 4); c.fill();
    }
    c.globalAlpha = 1;
  }

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    c.strokeStyle = hexA(AC, .05); c.lineWidth = 1;
    for (let x = 0; x < W; x += 24) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, H); c.stroke(); }
    for (let y = 0; y < H; y += 24) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(W, y + .5); c.stroke(); }
    const sa = si < 0 ? 0 : Math.min(1, sT / .3, (STAGES[si].d - sT) / .3);
    const lastBubble = bubbles[bubbles.length - 1];
    const bubbleX = (b: Bubble) => b.who === "client" ? X0 : X1 - bw;

    // Product workflow
    label(`PRODUCT · workflow · ${steps} steps`, X1, laneW - rowGap - 22);
    edges.forEach(e => {
      const x1 = nx(e.a) + nodeW / 2, y1 = ny(e.a), x2 = nx(e.b) - nodeW / 2, y2 = ny(e.b);
      const a = Math.min(fadeX(x1), clamp((t - e.b.born) / .6, 0, 1), clamp((t - e.a.born) / .6, 0, 1));
      if (a <= 0 || x1 > W + 40) return;
      c.globalAlpha = a;
      c.beginPath(); c.moveTo(x1, y1); c.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
      c.strokeStyle = hexA(AC, .4); c.lineWidth = 1.2; c.stroke();
      const p = (t * .32 + e.s) % 1, q = 1 - p, mx = (x1 + x2) / 2;
      const qx = q * q * q * x1 + 3 * q * q * p * mx + 3 * q * p * p * mx + p * p * p * x2;
      const qy = q * q * q * y1 + 3 * q * q * p * y1 + 3 * q * p * p * y2 + p * p * p * y2;
      c.beginPath(); c.arc(qx, qy, 2.2, 0, 7); c.fillStyle = AC; c.fill();
      c.globalAlpha = 1;
    });
    nodes.forEach(n => {
      const x = nx(n); if (x < -nodeW || x > W + nodeW) return;
      const a = Math.min(fadeX(x), clamp((t - n.born) / .6, 0, 1));
      if (a > 0) drawStep(n, x, ny(n), a);
    });

    shade(X0 - 40, laneW - rowGap - 34, span + 80, H, dim.flow);

    // UI panel
    if (hasPanel) {
      label("FRONTEND · UI / UX", X1, py - 10);
      const ax = px + pw * .5;
      const apiNode = nodes.filter(n => n.row === 0).sort((a, b) => Math.abs(nx(a) - ax) - Math.abs(nx(b) - ax))[0];
      if (apiNode) {
        const x1 = nx(apiNode), y1 = ny(apiNode) - nodeH / 2, x2 = ax, y2 = py + ph;
        c.setLineDash([2, 5]); c.strokeStyle = hexA(AC, .3); c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
        [(t * .5) % 1, 1 - (t * .5 + .5) % 1].forEach((p, i) => { c.beginPath(); c.arc(x1 + (x2 - x1) * p, y1 + (y2 - y1) * p, 2, 0, 7); c.fillStyle = i ? DIM : AC; c.fill(); });
        label("API", (x1 + x2) / 2 + 8, (y1 + y2) / 2, "left");
      }
      c.beginPath(); c.roundRect(px, py, pw, ph, 6); c.fillStyle = BG; c.fill();
      if (ui.flash > 0) { c.shadowColor = DIM; c.shadowBlur = 18 * ui.flash; }
      c.strokeStyle = hexA(DIM, .55 + .4 * ui.flash); c.lineWidth = 1.2; c.stroke(); c.shadowBlur = 0;
      c.strokeStyle = hexA(DIM, .3); c.beginPath(); c.moveTo(px, py + 15); c.lineTo(px + pw, py + 15); c.stroke();
      [0, 1, 2].forEach(i => { c.beginPath(); c.arc(px + 9 + i * 9, py + 8, 2.5, 0, 7); c.fillStyle = hexA(DIM, .5); c.fill(); });
      c.fillStyle = hexA(DIM, .18); c.fillRect(px + 8, py + 24, pw * .18, ph - 32);
      drawUI(ui.pv, 1 - ui.mix); drawUI(ui.v, ui.mix);
      if (cur.click > 0) { c.beginPath(); c.arc(cur.x, cur.y, 4 + 14 * (1 - cur.click), 0, 7); c.strokeStyle = hexA(DIM, cur.click); c.stroke(); }
      c.beginPath(); c.moveTo(cur.x, cur.y); c.lineTo(cur.x, cur.y + 14); c.lineTo(cur.x + 4, cur.y + 10); c.lineTo(cur.x + 9, cur.y + 11); c.closePath();
      c.fillStyle = TXT; c.fill(); c.strokeStyle = BG; c.lineWidth = 1; c.stroke();
      shade(px - 8, py - 22, pw + 16, ph + 30, dim.panel);
    }

    // Work cycle ring
    const from = si === 0 ? stageAng(-1) : stageAng(Math.max(0, si - 1));
    const tokAng = si < 0 ? stageAng(0) : from + (stageAng(si) - from) * ease(Math.min(1, sT / .5));
    c.beginPath(); c.arc(rcx, rcy, R, 0, 7); c.strokeStyle = hexA(AC, .22); c.lineWidth = 1.2; c.stroke();
    c.beginPath(); c.arc(rcx, rcy, R, stageAng(0), Math.max(stageAng(0), tokAng)); c.strokeStyle = hexA(AC, .85); c.lineWidth = 2; c.stroke();
    c.lineWidth = 1;
    STAGES.forEach((s, i) => {
      const [x, y] = stagePos(i), on = i === si, done = i < si;
      c.beginPath(); c.arc(x, y, on ? 6 : 4, 0, 7); c.fillStyle = on || done ? AC : BG; c.fill(); c.strokeStyle = AC; c.stroke();
      const cs = Math.cos(stageAng(i)), sn = Math.sin(stageAng(i));
      const lx = rcx + cs * (R + 14), ly = rcy + sn * (R + 14) + (sn > .3 ? 10 : sn < -.3 ? -2 : 4);
      c.font = `${on ? 500 : 400} 11px ${MONO}`; c.textAlign = cs > .3 ? "left" : cs < -.3 ? "right" : "center";
      c.fillStyle = on ? TXT : hexA(SOFT, .7); c.fillText(s.name, lx, ly);
    });
    const tx = rcx + Math.cos(tokAng) * R, ty = rcy + Math.sin(tokAng) * R;
    c.shadowColor = TXT; c.shadowBlur = 8; c.beginPath(); c.arc(tx, ty, 4.5, 0, 7); c.fillStyle = TXT; c.fill(); c.shadowBlur = 0;

    const centerA = si === 2 ? clamp(1 - sT / .3, 0, 1) : si === 3 || si === 4 ? 0 : si === 5 ? clamp(sT / .3, 0, 1) : 1;
    if (centerA > 0) {
      c.globalAlpha = centerA; c.textAlign = "center";
      c.font = `11px ${MONO}`; c.fillStyle = hexA(SOFT, .8); c.fillText(`cycle ${cycleN}`, rcx, rcy - 12);
      c.font = `500 11px ${MONO}`; c.fillStyle = TXT;
      wrap(REQS[reqI % REQS.length].tag, R * 1.5).forEach((ln, i) => c.fillText(ln, rcx, rcy + 6 + i * 14));
      c.globalAlpha = 1;
    }

    if (si === 0 && lastBubble) {
      const [x, y] = stagePos(0);
      dashed(bubbleX(lastBubble) + 30, lastBubble.y! + bh, x, y - 6, hexA(SOFT, .6 * sa), Math.min(1, sT / 1.2));
    }
    if (si === 1 && lastBubble) {
      const [x, y] = stagePos(1);
      const mine = lastBubble.who === "me", age = t - lastBubble.born;
      dashed(x, y, bubbleX(lastBubble) + (mine ? bw - 30 : 30), lastBubble.y! + bh, hexA(mine ? AC : SOFT, .6 * sa), mine ? Math.min(1, age / 1.2) : 1 - Math.min(1, age / 1.2));
    }
    if (si === 2) {
      const [sx, sy] = stagePos(2), [ax, ay] = stagePos(2, R - 30);
      dashed(sx, sy, ax, ay, hexA(DIM, .6 * sa));
      tools.forEach(o => {
        const life = t - o.born, g = life < .25 ? life / .25 : life > 1 ? Math.max(0, (1.3 - life) / .3) : 1;
        const ex = ax + Math.cos(o.ang) * o.len * g, ey = ay + Math.sin(o.ang) * o.len * g;
        c.globalAlpha = g * sa;
        c.setLineDash([2, 3]); c.strokeStyle = DIM; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke(); c.setLineDash([]);
        c.font = `11px ${MONO}`; const w = c.measureText(o.label).width + 10;
        c.beginPath(); c.roundRect(ex - w / 2, ey - 8, w, 16, 8); c.fillStyle = BG; c.fill(); c.strokeStyle = DIM; c.stroke();
        c.fillStyle = DIM; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(o.label, ex, ey + .5); c.textBaseline = "alphabetic";
        c.globalAlpha = 1;
      });
      hex(ax, ay, 12, DIM, sa);
    }
    if (si === 3) {
      const [sx, sy] = stagePos(3);
      TASKS.forEach((task, i) => {
        const an = -Math.PI / 2 + i * Math.PI * 2 / 3, ax = rcx + Math.cos(an) * R * .42, ay = rcy + Math.sin(an) * R * .42;
        dashed(sx, sy, ax, ay, hexA(DIM, .45 * sa));
        hex(ax, ay, 10, DIM, sa);
        const p = clamp(sT / (1.2 + i * .25), 0, 1);
        c.globalAlpha = sa;
        c.beginPath(); c.arc(ax, ay, 15, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.strokeStyle = p >= 1 ? OK : DIM; c.lineWidth = 2; c.stroke(); c.lineWidth = 1;
        c.font = `11px ${MONO}`; c.textAlign = "center"; c.fillStyle = DIM; c.fillText(task, ax, ay + 27);
        c.globalAlpha = 1;
      });
    }
    if (si === 4) {
      c.globalAlpha = sa;
      CHECKS.forEach((name, i) => {
        const y = rcy - 16 + i * 16, x = rcx - 26, okNow = sT > .3 + i * .3;
        c.font = `11px ${MONO}`; c.textAlign = "left"; c.fillStyle = okNow ? TXT : hexA(SOFT, .6); c.fillText(name, x + 16, y + 4);
        if (okNow) check(x, y, OK); else { c.beginPath(); c.arc(x + 5, y, 3, 0, 7); c.strokeStyle = hexA(SOFT, .6); c.stroke(); }
      });
      c.globalAlpha = 1;
    }
    if (si === 5) {
      const [sx, sy] = stagePos(5);
      const tgt = relTarget && nodes.includes(relTarget) ? [nx(relTarget), ny(relTarget) - nodeH / 2] : [X0 + span * .6, laneW - nodeH / 2];
      const p = Math.min(1, sT / .8);
      dashed(sx, sy, tgt[0], tgt[1], hexA(OK, .7 * sa), p);
      label("merged · deployed", sx - 12, sy + 22, "right", hexA(OK, .9 * sa));
    }
    if (si === 6 && lastBubble) {
      const [x, y] = stagePos(6);
      dashed(bubbleX(lastBubble) + 30, lastBubble.y! + bh, x, y, hexA(SOFT, .6 * sa), 1 - Math.min(1, sT / 1.2));
    }

    // Conversation thread
    bubbles.forEach((b, i) => {
      const age = t - b.born, x = bubbleX(b), y = b.y!, client = b.who === "client";
      const col = client ? SOFT : AC;
      c.globalAlpha = Math.min(1, age / .3) * (i === 0 && bubbles.length === 3 ? .5 : 1);
      c.beginPath(); c.roundRect(x, y, bw, bh, 8); c.fillStyle = BG; c.fill(); c.fillStyle = hexA(col, .1); c.fill();
      c.strokeStyle = hexA(col, .6); c.lineWidth = 1; c.stroke();
      c.font = `11px ${MONO}`; c.textAlign = "left"; c.fillStyle = hexA(col, .75); c.fillText(client ? "client" : "me", x + 10, y + 14);
      c.font = `11px ${MONO}`; c.fillStyle = TXT;
      wrap(b.text.slice(0, Math.floor(age * 34)), bw - 20).forEach((ln, k) => c.fillText(ln, x + 10, y + 29 + k * 13));
      c.globalAlpha = 1;
    });
    shade(X0 - 8, threadY - 8, span + 16, 3 * (bh + 8) + 8, dim.thread);
  }
  // Dims a finished part of the picture so the eye goes to the active stage.
  function shade(x: number, y: number, w: number, h: number, k: number) { if (k < .02) return; c.fillStyle = hexA(BG, .55 * k); c.fillRect(x, y, w, h); }

  return {
    resize(w, h, textRight) { W = w; H = h; TR = textRight; layout(); if (!nodes.length) init(); scroll = null; cur.next = 0; },
    step, render,
    stage: () => Math.max(si, 0),
    done: () => cycleN >= 2 && si === 6 && sT > STAGES[6].d - .1,
    still() { if (t === 0) for (let i = 0; i < 1100; i++) step(.05); render(); }
  };
}
