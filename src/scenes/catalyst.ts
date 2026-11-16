import { clamp, ctx2d, ERR, hexA, kit, MONO, OK, palette, region, rng, WARN, type SceneFactory } from './kit'

type Status = 'queued' | 'running' | 'success' | 'failed' | 'canceled'
interface Log { j: number; text: string; bad: boolean }
interface Run {
  id: number; trig: string; st: Status; si: number; stT: number; wait: number; logs: Log[]
  fail: number; cancel: boolean; start: number; dur: number; born: number; end?: number
}
interface Req { m: string; p: string; code: number; t: number }
type YamlLine = [key: string, val: string, job?: number, step?: number]

// Catalyst, the product: a workflow file, its runs in a queue with at most 2 at once, and each run's jobs and logs.
// The YAML is the repo's example workflow; the routes are from its OpenAPI docs.
export const catalyst: SceneFactory = (cv) => {
    const c = ctx2d(cv);
    const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, INK = P.ink, SOFT = P.soft;
    const K = kit(c, BG, SOFT, INK);
    const r = rng(41);
    const JOBS: [string, string[]][] = [["Build", ["Building the project", "Another build step"]], ["Test", ["Running tests"]], ["Deploy", ["Deploying the application"]]];
    const STEPS = JOBS.flatMap(([, s], j) => s.map((_, k) => [j, k] as [number, number]));
    const YAML: YamlLine[] = [
      ["workflow_name: ", '"Example Workflow"'], ["trigger:", ""], ["  cron: ", '"0 0 * * *"'], ["jobs:", ""],
      ["  - name: ", '"Build"', 0], ["    image: ", '"ubuntu:latest"'], ["    steps:", ""],
      ["      - ", 'echo "Building the project"', 0, 0], ["      - ", 'echo "Another build step"', 0, 1],
      ["  - name: ", '"Test"', 1], ["    image: ", '"ubuntu:latest"'], ["    steps:", ""], ["      - ", 'echo "Running tests"', 1, 0],
      ["  - name: ", '"Deploy"', 2], ["    image: ", '"ubuntu:latest"'], ["    steps:", ""], ["      - ", 'echo "Deploying the application"', 2, 0]
    ];
    const MAX = 2, STEP_T = .9, COLS: Record<Status, string> = { queued: WARN, running: AC, success: OK, failed: ERR, canceled: SOFT };
    let W = 0, H = 0, TR = 0, X0 = 0, span = 0, wy = 0, wh = 0;
    let t = 0, acc = 1.6, poll = 0, n = 17, runs: Run[] = [], sel: Run | null = null, api: Req[] = [];

    function layout() { [X0, , span] = region(W, TR); wy = H * .08; wh = Math.max(300, Math.min(H * .84, 620)); }
    const req = (m: string, p: string, code: number) => { api.unshift({ m, p, code, t }); api = api.slice(0, 4); };

    function step(dt: number) {
      t += dt; acc += dt; poll += dt;
      if (acc > 2.3) {
        acc = 0; const id = ++n, force = n % 3 === 0;
        runs.unshift({ id, trig: force ? "force run" : "cron", st: "queued", si: 0, stT: 0, wait: 0, logs: [], fail: r() < .2 ? 2 : -1, cancel: n % 7 === 0, start: 0, dur: 0, born: t });
        if (!sel || (sel.end && t - sel.end > 1.2)) sel = runs[0];
        if (force) req("POST", "/workflows/1/run", 202);
      }
      if (poll > 3.1) { poll = 0; req("GET", "/workflow-results", 200); }
      runs.forEach(rn => {
        if (rn.st === "queued") { rn.wait += dt; if (rn.cancel && rn.wait > 1.2) { rn.st = "canceled"; rn.end = t; req("POST", `/workflow-results/${rn.id}/cancel`, 200); } }
        else if (rn.st === "running") {
          rn.stT += dt; rn.dur = t - rn.start;
          if (rn.stT >= STEP_T) {
            rn.stT = 0; const [j, k] = STEPS[rn.si], bad = rn.si === rn.fail;
            rn.logs.push({ j, text: bad ? "exit status 1" : JOBS[j][1][k], bad });
            if (bad) { rn.st = "failed"; rn.end = t; } else if (++rn.si === STEPS.length) { rn.st = "success"; rn.end = t; }
          }
        }
      });
      const running = runs.filter(rn => rn.st === "running").length;
      runs.filter(rn => rn.st === "queued" && rn.wait >= 1).reverse().slice(0, MAX - running).forEach(rn => { rn.st = "running"; rn.start = t; });
      if (runs.length > 9) runs = runs.slice(0, 9);
      if (sel && sel.st !== "running" && sel.end && sel.st !== "queued" && sel.end === t) req("GET", `/workflow-results/${sel.id}`, 200);
    }

    function yamlPanel(x: number, y: number, w: number, h: number) {
      K.label("example-workflow.yaml", x + 12, y + 17, "left", SOFT, 9);
      c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(x, y + 26); c.lineTo(x + w, y + 26); c.stroke();
      const cur = sel && sel.st === "running" ? STEPS[sel.si] : null, lh = Math.min(17, (h - 40) / YAML.length);
      YAML.forEach(([key, val, j, k], i) => {
        const yy = y + 42 + i * lh, isStep = cur && k !== undefined && j === cur[0] && k === cur[1], isJob = cur && k === undefined && j === cur[0];
        if (isStep) { c.fillStyle = hexA(AC, .16 + .06 * Math.sin(t * 5)); c.fillRect(x + 1, yy - lh + 4, w - 2, lh); }
        K.label(String(i + 1).padStart(2, " "), x + 10, yy, "left", hexA(INK, .25), 9);
        K.label(key, x + 30, yy, "left", key.trim().startsWith("-") && !val.startsWith('"') ? SOFT : DIM, 9);
        c.font = `11px ${MONO}`; const kw = c.measureText(key).width;
        K.label(val, x + 30 + kw, yy, "left", INK, 9, 400, w - 40 - kw);
        if (isJob) K.label("◀", x + w - 12, yy, "right", AC, 9);
      });
    }

    function results(x: number, y: number, w: number, h: number) {
      const running = runs.filter(rn => rn.st === "running").length, queued = runs.filter(rn => rn.st === "queued").length;
      K.text("Workflow results", x + 12, y + 18, "left", INK, 10.5, 600);
      K.label(`${running} running · max ${MAX} · ${queued} queued`, x + w - 12, y + 18, "right", queued ? WARN : SOFT, 8.5);
      const cols = [x + 12, x + 54, x + w * .42, x + w - 12];
      ["#", "trigger", "status", "time"].forEach((hd, i) => K.label(hd, cols[i], y + 36, i === 3 ? "right" : "left", hexA(INK, .35), 8.5));
      const rows = Math.max(3, Math.floor((h - 44) / 18));
      runs.slice(0, rows).forEach((rn, i) => {
        const yy = y + 54 + i * 18, col = COLS[rn.st];
        if (rn === sel) { c.fillStyle = hexA(AC, .08); c.fillRect(x + 4, yy - 12, w - 8, 17); }
        K.label(String(rn.id), cols[0], yy, "left", INK, 9);
        K.label(rn.trig, cols[1], yy, "left", SOFT, 9);
        c.beginPath(); c.arc(cols[2] + 3, yy - 3, 3, 0, 7); c.fillStyle = rn.st === "running" ? hexA(col, .5 + .5 * Math.sin(t * 6)) : col; c.fill();
        K.label(rn.st, cols[2] + 11, yy, "left", col, 9);
        K.label(rn.st === "queued" || rn.st === "canceled" ? "—" : `${rn.dur.toFixed(1)}s`, cols[3], yy, "right", SOFT, 9);
      });
    }

    function detail(x: number, y: number, w: number, h: number) {
      if (!sel) return;
      const s = sel;
      K.text(`Result #${s.id} · Example Workflow`, x + 12, y + 16, "left", INK, 10.5, 600, w - 90);
      K.label(s.st, x + w - 12, y + 16, "right", COLS[s.st], 9, 500);
      let yy = y + 36;
      JOBS.forEach(([name], j) => {
        const first = STEPS.findIndex(st => st[0] === j), last = first + JOBS[j][1].length - 1;
        const failed = s.st === "failed" && s.fail >= first && s.fail <= last;
        const done = !failed && s.si > last, cur = s.st === "running" && s.si >= first && s.si <= last;
        const col = failed ? ERR : done ? OK : cur ? AC : hexA(INK, .3);
        if (done) K.check(x + 18, yy - 4, OK, .8);
        else if (failed) K.label("✗", x + 18, yy, "center", ERR, 10, 500);
        else if (cur) { c.strokeStyle = AC; c.lineWidth = 1.5; c.beginPath(); c.arc(x + 18, yy - 4, 4.5, t * 6, t * 6 + 4.2); c.stroke(); c.lineWidth = 1; }
        else { c.beginPath(); c.arc(x + 18, yy - 4, 4, 0, 7); c.strokeStyle = col; c.stroke(); }
        K.label(name, x + 30, yy, "left", col, 9.5, 500);
        K.label("ubuntu:latest · isolated", x + 90, yy, "left", hexA(INK, .3), 8.5, 400, w - 110);
        yy += 18;
      });
      yy += 4;
      c.beginPath(); c.roundRect(x + 10, yy, w - 20, y + h - yy - 6, 5); c.fillStyle = BG; c.fill();
      const lines = s.logs.flatMap(lg => [{ s: `[${JOBS[lg.j][0]}] $ echo …`, col: SOFT }, { s: `[${JOBS[lg.j][0]}] ${lg.text}`, col: lg.bad ? ERR : INK }]);
      if (s.st === "running") lines.push({ s: "▍", col: hexA(AC, Math.floor(t * 3) % 2 ? .9 : .2) });
      const fitN = Math.max(1, Math.floor((y + h - yy - 14) / 13));
      lines.slice(-fitN).forEach((ln, i) => K.label(ln.s, x + 18, yy + 15 + i * 13, "left", ln.col, 8.5, 400, w - 36));
    }

    function render() {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      K.dots(W, H, hexA(INK, .05));
      const top = K.win(X0, wy, span, wh, "catalyst · localhost:8080", INK, P.raise);
      const apiH = 58, bodyH = wy + wh - top - apiH, split = span >= 480, lw = split ? Math.round(span * .41) : 0;
      if (split) { yamlPanel(X0, top, lw, bodyH); c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(X0 + lw, top); c.lineTo(X0 + lw, top + bodyH); c.stroke(); }
      const rx = X0 + lw, rw = span - lw, resH = Math.min(bodyH * .48, 54 + 7 * 18);
      results(rx, top, rw, resH);
      c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(rx, top + resH); c.lineTo(rx + rw, top + resH); c.stroke();
      detail(rx, top + resH + 4, rw, bodyH - resH - 4);
      const ay = top + bodyH;
      c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(X0, ay); c.lineTo(X0 + span, ay); c.stroke();
      K.label("API", X0 + 12, ay + 16, "left", hexA(INK, .35), 8.5);
      api.slice(0, 3).forEach((q, i) => {
        const a = i === 0 ? clamp(1 - (t - q.t) / 2, .55, 1) : .5;
        K.label(`${q.m.padEnd(4)} ${q.p}`, X0 + 40, ay + 16 + i * 13, "left", hexA(q.m === "POST" ? AC : DIM, a), 8.5, 400, span - 100);
        K.label(String(q.code), X0 + span - 12, ay + 16 + i * 13, "right", hexA(INK, a * .7), 8.5);
      });
    }

    return {
      resize(w, h, tr) { W = w; H = h; TR = tr; layout(); }, step, render,
      stage: () => !sel || t - sel.born < .5 ? 0 : sel.st === "queued" ? 1 : sel.st === "running" ? 2 : 3,
      done: () => t > 24 && !!sel && sel.st !== "running" && sel.st !== "queued",
      still() { for (let i = 0; i < 260; i++) step(.05); render(); }
    };
};
