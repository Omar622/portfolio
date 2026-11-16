import { rng, hexA, clamp, MONO, NARROW, ctx2d, palette, OK, WARN, MIN_PX, type SceneFactory } from './kit'

// Internships: each PR goes from learning, to code, to my mentor's review, to fixes, to merged.
export const internships: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  const pal = palette(cv), BG = pal.bg, ACC = pal.accent, DIM = pal.dim, INK = pal.ink, SOFT = pal.soft;
  const CODE = [ACC, DIM, SOFT, INK];
  const rand = rng(31);
  const SKILLS = ['React', 'Django', 'Go', 'Pulumi', 'Docker', 'Gin', 'Gorm', 'Vue 3'];
  interface PR { co: string; title: string; learn: string[]; comments: string[]; merged?: boolean }
  const PRS: PR[] = [
    { co: 'Bld.ai', title: 'React form for course signup', learn: ['React'],
      comments: ['split this into small components', 'nit: clearer state name', 'add a loading state', 'handle the API error'] },
    { co: 'Bld.ai', title: 'Django endpoint for the form', learn: ['Django'],
      comments: ['validate in a serializer', 'add a test for this', 'return 400, not 500'] },
    { co: 'CodeScalers', title: 'Pulumi provider: deploy a VM', learn: ['Go', 'Pulumi'],
      comments: ['wrap the error with context', 'extract a helper', 'add a test for this'] },
    { co: 'CodeScalers', title: 'Tests for the provider', learn: ['Docker'], comments: ['table-driven tests?', 'nit: test name'] },
    { co: 'CodeScalers', title: 'Gin endpoint for dev tooling', learn: ['Gin', 'Gorm'], comments: ['reuse the DB helper'] },
    { co: 'CodeScalers', title: 'Vue 3 page for the tool', learn: ['Vue 3'], comments: [] },
  ];
  const STAGES = ['learning', 'writing code', 'in review', 'fixing', 'approved', 'merged'];
  // Each PR's diff: 8 lines of indented code segments, coloured by token kind.
  const LINES = PRS.map(() => Array.from({ length: 8 }, () => ({
    ind: Math.floor(rand() * 3),
    segs: Array.from({ length: 2 + Math.floor(rand() * 3) }, () => [.08 + rand() * .2, Math.floor(rand() * 4)] as [number, number]),
  })));

  let W = 0, H = 0, TR = 0, X0 = 0, X1 = 0, span = 0, skillY = 0, prY = 0, prH = 0, gridY = 0, cols = 0, codeW = 0;
  let t = 0, pi = 0, pt = 0, learned = new Set<string>(), history: number[] = [], cells: number[] = [], cursor = 0;

  function timing(pr: PR) {
    const n = pr.comments.length, learn = 1.6, code = 1.8, review = n ? .4 + .55 * n : 1.1, fix = n ? .3 + .4 * n : 0, approve = .8, merge = 1.2;
    const s1 = learn, s2 = s1 + code, s3 = s2 + review, s4 = s3 + fix, s5 = s4 + approve;
    return { merge, s1, s2, s3, s4, s5, end: s5 + merge };
  }
  const stageAt = (pr: PR, x: number) => { const k = timing(pr); return x < k.s1 ? 0 : x < k.s2 ? 1 : x < k.s3 ? 2 : x < k.s4 ? 3 : x < k.s5 ? 4 : 5; };

  function layout() {
    X1 = W - (W < NARROW ? 16 : 84);
    X0 = W < NARROW ? 16 : Math.min(Math.max(TR + 32, W * .42), X1 - 400);
    span = X1 - X0;
    skillY = H * .1;
    prY = skillY + 64;
    prH = Math.min(260, H * .36);
    codeW = span * .56;
    gridY = Math.max(H * .7, prY + prH + 56);
    cols = Math.max(12, Math.floor(span * .6 / 13));
    if (cells.length !== cols * 7) { cells = Array(cols * 7).fill(0); cursor = 0; }
  }

  function addMerge(comments: number) {
    for (let k = 0; k < 6; k++) {
      const i = (cursor + Math.floor(rand() * 7)) % cells.length;
      cells[i] = Math.min(4, cells[i] + 1 + Math.floor(rand() * 2));
    }
    cursor = (cursor + 7) % cells.length;
    history.push(comments);
  }

  function step(dt: number) {
    t += dt; pt += dt;
    const pr = PRS[pi], k = timing(pr);
    if (pt > .3) pr.learn.forEach(s => learned.add(s));
    if (pt >= k.s5 && !pr.merged) { pr.merged = true; addMerge(pr.comments.length); }
    if (pt >= k.end) {
      pr.merged = false; pt = 0; pi = (pi + 1) % PRS.length;
      if (pi === 0) { learned = new Set(); history = []; cells.fill(0); cursor = 0; }
    }
  }

  function label(s: string, x: number, y: number, align: CanvasTextAlign = 'left', col = SOFT, size = 10, weight = 400) {
    c.font = `${weight} ${Math.max(MIN_PX, size)}px ${MONO}`; c.textAlign = align; c.fillStyle = col; c.fillText(s, x, y);
  }
  function pill(s: string, right: number, y: number, col: string, filled: boolean) {
    c.font = `${MIN_PX}px ${MONO}`;
    const w = c.measureText(s).width + 14;
    c.beginPath(); c.roundRect(right - w, y - 9, w, 18, 9);
    c.fillStyle = filled ? hexA(col, .2) : BG; c.fill(); c.strokeStyle = col; c.stroke();
    c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, right - w / 2, y + .5); c.textBaseline = 'alphabetic';
    return w;
  }
  function fit(s: string, max: number, min: number) {
    let r = s;
    while (c.measureText(r).width > max && r.length > min) r = r.slice(0, -2);
    return r === s ? r : r + '…';
  }

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    c.fillStyle = hexA(ACC, .06);
    for (let x = 12; x < W; x += 24) for (let y = 12; y < H; y += 24) c.fillRect(x, y, 1.5, 1.5);
    const pr = PRS[pi], k = timing(pr), nc = pr.comments.length, st = stageAt(pr, pt);

    // Skills row: lights up as each PR teaches something new.
    label('LEARNING · what I picked up', X0, skillY - 14, 'left', SOFT, 9.5);
    let sx = X0, sy = skillY;
    SKILLS.forEach(s => {
      c.font = `${MIN_PX}px ${MONO}`;
      const w = c.measureText(s).width + 16;
      if (sx + w > X1) { sx = X0; sy += 24; }
      const on = learned.has(s);
      if (on && pr.learn.includes(s) && st === 0) { c.shadowColor = ACC; c.shadowBlur = 10 + 6 * Math.sin(t * 6); }
      c.beginPath(); c.roundRect(sx, sy - 9, w, 18, 9);
      c.fillStyle = on ? hexA(ACC, .22) : BG; c.fill(); c.strokeStyle = on ? ACC : hexA(ACC, .25); c.stroke(); c.shadowBlur = 0;
      c.fillStyle = on ? INK : hexA(INK, .35); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, sx + w / 2, sy + .5); c.textBaseline = 'alphabetic';
      sx += w + 6;
    });

    // The PR card.
    const y0 = prY, x0 = X0, w0 = span, glow = st === 5 ? Math.max(0, 1 - (pt - k.s5) / k.merge) : 0;
    if (glow) { c.shadowColor = ACC; c.shadowBlur = 20 * glow; }
    c.beginPath(); c.roundRect(x0, y0, w0, prH, 8); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(ACC, .5); c.lineWidth = 1.2; c.stroke(); c.shadowBlur = 0;
    label(`PR #${12 + pi * 7}`, x0 + 12, y0 + 20, 'left', hexA(ACC, .9), 9.5);
    c.font = `500 ${MIN_PX}px ${MONO}`; c.fillStyle = INK; c.textAlign = 'left';
    c.fillText(fit(pr.title, w0 - 230, 8), x0 + 70, y0 + 20);
    const stCol = [SOFT, ACC, WARN, WARN, OK, ACC][st];
    const pw = pill(STAGES[st], x0 + w0 - 12, y0 + 16, stCol, st >= 4);
    label(pr.co, x0 + w0 - 20 - pw, y0 + 20, 'right', SOFT, 9);
    c.strokeStyle = hexA(ACC, .2); c.beginPath(); c.moveTo(x0, y0 + 32); c.lineTo(x0 + w0, y0 + 32); c.stroke();
    const lineY = (i: number) => y0 + 50 + i * ((prH - 64) / 8);

    if (st === 0) {
      label(`reading docs · ${pr.learn.join(', ')}`, x0 + 14, y0 + 54, 'left', ACC, 10);
      for (let i = 1; i < 8; i++) {
        c.fillStyle = hexA(INK, .12);
        c.fillRect(x0 + 14, lineY(i), (codeW - 30) * (.5 + .5 * (i * 37 % 10) / 10) * Math.min(1, pt / .8), 4);
      }
    } else {
      LINES[pi].forEach((ln, i) => {
        const grow = clamp((pt - k.s1 - i * .17) / .3, 0, 1);
        if (!grow) return;
        const ci = pr.comments.findIndex((_, j) => (j * 2 + 1) % 8 === i), y = lineY(i);
        label(String(i + 1).padStart(2, ' '), x0 + 22, y + 4, 'right', hexA(INK, .3), 8.5);
        if (ci >= 0 && st >= 2) {
          const fixed = st >= 4 || (st === 3 && pt > k.s3 + .3 + ci * .4);
          if (st > 2 || pt > k.s2 + .4 + ci * .55) { c.fillStyle = hexA(fixed ? OK : WARN, .1); c.fillRect(x0 + 1, y - 7, codeW, 15); }
        }
        let x = x0 + 30 + ln.ind * 14;
        ln.segs.forEach(([len, kind]) => {
          const w = len * (codeW - 60) * grow;
          c.fillStyle = hexA(CODE[kind], .75); c.fillRect(x, y - 2, w, 5); x += w + 6;
        });
      });
      if (st === 1) {
        const i = Math.min(7, Math.floor((pt - k.s1) / .17));
        if (Math.sin(t * 10) > 0) { c.fillStyle = INK; c.fillRect(x0 + codeW - 6, lineY(i) - 5, 2, 11); }
      }
    }

    // Review comments from my mentor, each turning green once fixed.
    const rx = x0 + codeW + 10, rw = w0 - codeW - 22;
    if (st >= 2) {
      if (!nc) {
        c.globalAlpha = clamp((pt - k.s2 - .2) / .3, 0, 1);
        c.beginPath(); c.roundRect(rx, lineY(1) - 12, rw, 30, 6); c.fillStyle = hexA(OK, .12); c.fill(); c.strokeStyle = OK; c.stroke();
        label('mentor · LGTM, ship it', rx + 10, lineY(1) + 6, 'left', OK, 9.5, 500);
        c.globalAlpha = 1;
      }
      pr.comments.forEach((s, j) => {
        const y = lineY((j * 2 + 1) % 8), a = clamp((pt - k.s2 - .4 - j * .55) / .25, 0, 1);
        if (!a) return;
        const fixed = st >= 4 || (st === 3 && pt > k.s3 + .3 + j * .4), col = fixed ? OK : WARN;
        c.globalAlpha = a;
        c.beginPath(); c.roundRect(rx, y - 11, rw, 22, 5); c.fillStyle = BG; c.fill(); c.fillStyle = hexA(col, .1); c.fill(); c.strokeStyle = hexA(col, .7); c.stroke();
        c.beginPath(); c.moveTo(rx, y); c.lineTo(rx - 8, y); c.strokeStyle = hexA(col, .5); c.stroke();
        c.font = `${MIN_PX}px ${MONO}`; c.textAlign = 'left'; c.fillStyle = fixed ? hexA(INK, .45) : INK;
        c.fillText(fit(s, rw - 30, 4), rx + 8, y + 3.5);
        if (fixed) {
          c.beginPath(); c.moveTo(rx + rw - 16, y); c.lineTo(rx + rw - 12, y + 4); c.lineTo(rx + rw - 6, y - 4);
          c.strokeStyle = OK; c.lineWidth = 1.6; c.stroke(); c.lineWidth = 1;
        }
        c.globalAlpha = 1;
      });
    }
    if (st >= 2) label('review by my mentor', rx, y0 + 46, 'left', SOFT, 8.5);

    // Merged PRs as a contribution grid, plus review comments per PR going down over time.
    label('CONTRIBUTIONS · merged PRs', X0, gridY - 12, 'left', SOFT, 9.5);
    cells.forEach((v, i) => {
      c.fillStyle = v ? hexA(OK, .2 + v * .18) : hexA(ACC, .1);
      c.fillRect(X0 + Math.floor(i / 7) * 13, gridY + i % 7 * 13, 10, 10);
    });
    const cx = X0 + cols * 13 + 22, cw = X1 - cx;
    if (cw > 90) {
      label('review comments per PR', cx, gridY - 12, 'left', SOFT, 9);
      c.strokeStyle = hexA(ACC, .25); c.beginPath(); c.moveTo(cx, gridY + 87); c.lineTo(cx + cw, gridY + 87); c.stroke();
      const dx = cw / (PRS.length - 1);
      c.beginPath();
      history.forEach((v, i) => { const x = cx + i * dx, y = gridY + 87 - v / 4 * 79; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
      c.strokeStyle = DIM; c.lineWidth = 1.6; c.stroke(); c.lineWidth = 1;
      history.forEach((v, i) => {
        const x = cx + i * dx, y = gridY + 87 - v / 4 * 79;
        c.beginPath(); c.arc(x, y, 3, 0, 7); c.fillStyle = v ? DIM : OK; c.fill();
        label(String(v), x, y - 7, 'center', v ? SOFT : OK, 8.5);
      });
    }
  }

  return {
    resize(w, h, tr) { W = w; H = h; TR = tr; layout(); },
    step,
    render,
    stage: () => stageAt(PRS[pi], pt),
    done: () => pi === PRS.length - 1 && pt > timing(PRS[pi]).end - .1,
    still() {
      if (t === 0) {
        const total = PRS.reduce((a, p) => a + timing(p).end, 0);
        for (let i = 0; i < (total - .5) / .05; i++) step(.05);
      }
      render();
    },
  };
}
