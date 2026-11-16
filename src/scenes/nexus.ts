import { clamp, ctx2d, ease, ERR, hexA, kit, OK, palette, region, SANS, type SceneFactory, MIN_PX } from './kit'

// Nexus, the product: a student watches lessons and enrolls to unlock paid ones; the instructor uploads a lesson and reads the stats.
export const nexus: SceneFactory = (cv) => {
    const c = ctx2d(cv);
    const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, INK = P.ink, SOFT = P.soft;
    const K = kit(c, BG, SOFT, INK);
    const COURSES: [string, number][] = [["Go basics", 1], ["SQL", .7], ["System design", .3], ["DSA", .1]];
    const LESSONS: [string, string][] = [["Intro", "04:10"], ["Load balancers", "07:25"], ["Caching", "06:40"], ["Queues", "05:55"], ["Sharding", "08:05"], ["Case study", "11:30"]];
    const STUDENT = 15, LOOP = 25, BASE_VIEWS = [412, 377, 341, 296, 188, 151];
    let W = 0, H = 0, TR = 0, X0 = 0, span = 0, wy = 0, wh = 0;
    let t = 0;

    function layout() { [X0, , span] = region(W, TR); wy = H * .08 + 30; wh = Math.max(300, Math.min(H - wy - H * .08, 560)); }
    function step(dt: number) { t = (t + dt) % LOOP; }

    function cursor(x: number, y: number, press: number) {
      c.fillStyle = INK; c.strokeStyle = BG; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 13); c.lineTo(x + 3.5, y + 10); c.lineTo(x + 6.5, y + 15); c.lineTo(x + 8.5, y + 14); c.lineTo(x + 5.5, y + 9); c.lineTo(x + 10, y + 9); c.closePath(); c.fill(); c.stroke();
      if (press) { c.beginPath(); c.arc(x, y, 9 * press, 0, 7); c.strokeStyle = hexA(AC, 1 - press); c.stroke(); }
    }

    // A lesson video as a course player shows it: the instructor's slides, their webcam in the corner,
    // captions, and the usual controls. Bullets and captions move with the playback position.
    const SLIDES: Record<number, [string, string[]]> = {
      2: ["Caching", ["Cache-aside: read the cache, then the DB", "Give every key a TTL", "Invalidate on write"]],
      3: ["Queues", ["Producers push, consumers pull", "Retry with backoff", "Park poison messages in a dead-letter queue"]],
      4: ["Sharding", ["Split the data by a shard key", "Pick a key that spreads evenly", "Rebalance without downtime"]],
    };
    function video(x: number, y: number, w: number, h: number, lesson: number, p: number, playing: boolean) {
      const [title, bullets] = SLIDES[lesson];
      c.save(); c.beginPath(); c.roundRect(x, y, w, h, 7); c.clip();
      c.fillStyle = hexA(INK, .05); c.fillRect(x, y, w, h);
      // the shared slide
      const sx = x + 14, sy = y + 12, sw = w * .72, sh = h - 54;
      c.beginPath(); c.roundRect(sx, sy, sw, sh, 4); c.fillStyle = P.raise; c.fill();
      c.fillStyle = AC; c.fillRect(sx, sy, 3, sh);
      const fs = Math.max(9, Math.min(15, sw / 22));
      K.text(title, sx + 14, sy + 12 + fs, "left", INK, fs + 3, 600, sw - 28);
      bullets.forEach((b, i) => {
        if (p < i / bullets.length) return;
        const a = clamp((p - i / bullets.length) * bullets.length * 4, 0, 1), by = sy + 24 + fs * 2.2 + i * fs * 1.7;
        if (by > sy + sh - 6) return;
        c.globalAlpha = a;
        c.beginPath(); c.arc(sx + 18, by - fs * .32, 2, 0, 7); c.fillStyle = AC; c.fill();
        K.text(b, sx + 26, by, "left", SOFT, fs - 2, 400, sw - 40);
        c.globalAlpha = 1;
      });
      // the instructor's webcam
      const cw = Math.min(w * .22, 110), ch = cw * .75, cx = x + w - cw - 12, cy = sy;
      c.beginPath(); c.roundRect(cx, cy, cw, ch, 5); c.fillStyle = hexA(DIM, .35); c.fill();
      const hx = cx + cw / 2, nod = playing ? Math.sin(t * 3) * 1.2 : 0;
      c.fillStyle = hexA(INK, .75);
      c.beginPath(); c.arc(hx, cy + ch * .42 + nod, ch * .17, 0, 7); c.fill();
      c.beginPath(); c.ellipse(hx, cy + ch + 2, ch * .36, ch * .32, 0, Math.PI, 0); c.fill();
      if (playing) [0, 1, 2].forEach(i => {
        const bh = 3 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 7;
        c.fillStyle = OK; c.fillRect(cx + 6 + i * 4, cy + ch - 5 - bh, 2.5, bh);
      });
      K.label("Instructor", cx + cw / 2, cy + ch + 12, "center", SOFT, 8);
      // captions, on the line being taught now
      const line = bullets[Math.min(bullets.length - 1, Math.floor(p * bullets.length))];
      if (playing && p > .02) {
        c.font = `${Math.max(MIN_PX, fs - 3)}px ${SANS}`;
        const cap = `“${line}.”`, tw = Math.min(c.measureText(cap).width + 16, w - 28);
        c.beginPath(); c.roundRect(x + w / 2 - tw / 2, y + h - 52, tw, 18, 3); c.fillStyle = hexA(BG, .85); c.fill();
        K.text(cap, x + w / 2, y + h - 39, "center", INK, Math.max(MIN_PX, fs - 3), 400, w - 40);
      }
      // controls
      const by = y + h - 16;
      c.fillStyle = hexA(BG, .85); c.fillRect(x, y + h - 30, w, 30);
      c.fillStyle = INK;
      if (playing) { c.fillRect(x + 12, by - 5, 3, 10); c.fillRect(x + 18, by - 5, 3, 10); }
      else { c.beginPath(); c.moveTo(x + 12, by - 5); c.lineTo(x + 12, by + 5); c.lineTo(x + 21, by); c.fill(); }
      const tx = x + 32, tw = w - 170;
      c.fillStyle = hexA(INK, .18); c.fillRect(tx, by - 1.5, tw, 3);
      c.fillStyle = hexA(INK, .35); c.fillRect(tx, by - 1.5, tw * Math.min(1, p + .18), 3);
      c.fillStyle = AC; c.fillRect(tx, by - 1.5, tw * p, 3);
      c.beginPath(); c.arc(tx + tw * p, by, 4.5, 0, 7); c.fill();
      const [mm, ss] = LESSONS[lesson][1].split(":").map(Number), tot = mm * 60 + ss, el = Math.floor(tot * p);
      K.label(`${String(Math.floor(el / 60)).padStart(2, "0")}:${String(el % 60).padStart(2, "0")} / ${LESSONS[lesson][1]}`, tx + tw + 10, by + 3, "left", SOFT, 8);
      K.label("CC", x + w - 40, by + 3, "center", INK, 8, 500);
      c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath();
      const fx = x + w - 20, fy = by;
      c.moveTo(fx - 5, fy - 2); c.lineTo(fx - 5, fy - 5); c.lineTo(fx - 2, fy - 5);
      c.moveTo(fx + 2, fy - 5); c.lineTo(fx + 5, fy - 5); c.lineTo(fx + 5, fy - 2);
      c.moveTo(fx + 5, fy + 2); c.lineTo(fx + 5, fy + 5); c.lineTo(fx + 2, fy + 5);
      c.moveTo(fx - 2, fy + 5); c.lineTo(fx - 5, fy + 5); c.lineTo(fx - 5, fy + 2);
      c.stroke(); c.lineWidth = 1;
      c.restore();
      c.beginPath(); c.roundRect(x, y, w, h, 7); c.strokeStyle = hexA(INK, .2); c.stroke();
    }

    function student(x: number, y: number, w: number, h: number) {
      const s = t;
      const cur = s < 4 ? 2 : s < 8 ? 3 : 4, enrolled = s >= 10.5, locked = s >= 8 && s < 10.5;
      const p = cur === 2 ? s / 4 : cur === 3 ? (s - 4) / 4 : locked ? 0 : (s - 10.5) / 4.5;
      const split = w >= 560, lw = split ? Math.round(w * .27) : 0;
      if (split) {
        K.text("My courses", x + 14, y + 22, "left", SOFT, 9.5, 600);
        COURSES.forEach(([n, pr], i) => {
          const yy = y + 44 + i * 40, on = i === 2;
          if (on) { c.fillStyle = hexA(AC, .1); c.fillRect(x + 6, yy - 14, lw - 12, 34); }
          K.text(n, x + 14, yy, "left", on ? INK : SOFT, 10, on ? 600 : 400, lw - 28);
          const pp = on ? Math.min(1, pr + (cur - 2 + p) / 6) : pr;
          c.fillStyle = hexA(INK, .12); c.fillRect(x + 14, yy + 8, lw - 28, 4); c.fillStyle = pp >= 1 ? OK : AC; c.fillRect(x + 14, yy + 8, (lw - 28) * pp, 4);
        });
        c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(x + lw, y); c.lineTo(x + lw, y + h); c.stroke();
      }
      const mx = x + lw + 14, mw = w - lw - 28;
      K.text("System design", mx, y + 24, "left", INK, 13, 600);
      K.text(`lesson ${cur + 1} of 6 · ${LESSONS[cur][0]}`, mx + mw, y + 24, "right", SOFT, 9.5, 400, mw - 130);
      const ph = Math.min(h * .5, mw * .5625), py = y + 36;
      video(mx, py, mw, ph, cur, clamp(p, 0, 1), !locked);
      if (locked) {
        c.beginPath(); c.roundRect(mx, py, mw, ph, 7); c.fillStyle = hexA(BG, .9); c.fill();
        K.lock(mx + mw / 2, py + ph * .3, AC, 1.6);
        K.text("This lesson is for enrolled students", mx + mw / 2, py + ph * .3 + 30, "center", INK, 10.5, 500, mw - 20);
        const press = s > 9.8 && s < 10.3 ? (s - 9.8) / .5 : 0, bx2 = mx + mw / 2 - 52, by2 = py + ph * .3 + 42;
        c.beginPath(); c.roundRect(bx2, by2, 104, 26, 13); c.fillStyle = press ? hexA(AC, .5) : AC; c.fill();
        K.text(s > 10.1 ? "Enrolled ✓" : "Enroll · $19", mx + mw / 2, by2 + 17, "center", BG, 10, 600);
      }
      // lessons
      const ly = py + ph + 22, rows = Math.max(2, Math.min(6, Math.floor((y + h - ly) / 24)));
      LESSONS.slice(0, rows).forEach(([n, d], i) => {
        const yy = ly + i * 24, paid = i >= 4, isCur = i === cur && !locked, done = i < cur;
        if (isCur) { c.fillStyle = hexA(AC, .1); c.fillRect(mx - 6, yy - 15, mw + 12, 22); }
        K.label(String(i + 1), mx, yy, "left", SOFT, 9);
        K.text(n, mx + 22, yy, "left", isCur ? INK : paid && !enrolled ? hexA(INK, .45) : INK, 10, isCur ? 600 : 400);
        if (done) K.check(mx + mw - 6, yy - 4, OK, .8);
        else if (isCur) { c.fillStyle = AC; c.beginPath(); c.moveTo(mx + mw - 10, yy - 9); c.lineTo(mx + mw - 10, yy + 1); c.lineTo(mx + mw - 2, yy - 4); c.fill(); }
        else if (paid && !enrolled) K.lock(mx + mw - 6, yy - 4, DIM, .9);
        else K.label(d, mx + mw, yy, "right", SOFT, 8.5);
      });
      // the student's pointer
      const rowY = ly + 4 * 24 - 4;
      if (s > 7 && s < 8.4) { const k = ease(clamp((s - 7) / .8, 0, 1)); cursor(mx + mw * .7 - 40 * (1 - k), rowY + 40 * (1 - k), s > 7.9 ? clamp((s - 7.9) / .5, 0, 1) : 0); }
      if (locked && s > 9) { const k = ease(clamp((s - 9) / .8, 0, 1)), tx = mx + mw / 2 + 20, ty = py + ph * .3 + 56; cursor(tx + 50 * (1 - k), ty + 40 * (1 - k), s > 9.8 ? clamp((s - 9.8) / .5, 0, 1) : 0); }
    }

    function instructor(x: number, y: number, w: number, h: number) {
      const s = t - STUDENT, up = clamp(s / 5, 0, 1), published = s >= 6;
      const mx = x + 14, mw = w - 28;
      K.text("System design · instructor", mx, y + 24, "left", INK, 13, 600, mw);
      // upload card
      const cy = y + 40, ch = 74;
      c.beginPath(); c.roundRect(mx, cy, mw, ch, 7); c.fillStyle = hexA(INK, .04); c.fill(); c.setLineDash(published ? [] : [4, 4]); c.strokeStyle = hexA(INK, .3); c.stroke(); c.setLineDash([]);
      K.text("Upload lesson", mx + 12, cy + 20, "left", SOFT, 9.5, 600);
      c.strokeStyle = DIM; c.strokeRect(mx + 12, cy + 30, 14, 18); c.fillStyle = DIM; c.beginPath(); c.moveTo(mx + 17, cy + 35); c.lineTo(mx + 22, cy + 39); c.lineTo(mx + 17, cy + 43); c.fill();
      K.text("lesson-07.mp4 · Consistent hashing", mx + 36, cy + 40, "left", INK, 10, 500, mw - 150);
      const st = published ? "Published ✓" : up < 1 ? `Uploading ${Math.round(up * 100)}%` : "Processing…";
      K.text(st, mx + mw - 12, cy + 40, "right", published ? OK : up < 1 ? AC : DIM, 9.5, 500);
      c.fillStyle = hexA(INK, .12); c.fillRect(mx + 36, cy + 52, mw - 48, 4); c.fillStyle = published ? OK : AC; c.fillRect(mx + 36, cy + 52, (mw - 48) * up, 4);
      // stats tiles
      const ty = cy + ch + 16, tw = (mw - 16) / 3, grow = clamp(s / 10, 0, 1);
      const tiles: [string, string, string][] = [["Students", (1284 + Math.floor(grow * 23)).toLocaleString("en"), INK], ["Completion", `${64 + Math.floor(grow * 2)}%`, AC], ["Blocked requests", String(37 + Math.floor(grow * 5)), ERR]];
      tiles.forEach(([n, v, col], i) => {
        const tx = mx + i * (tw + 8);
        c.beginPath(); c.roundRect(tx, ty, tw, 52, 7); c.fillStyle = hexA(INK, .04); c.fill(); c.strokeStyle = hexA(INK, .15); c.stroke();
        K.text(n, tx + 10, ty + 18, "left", SOFT, 9, 400, tw - 16);
        K.text(v, tx + 10, ty + 41, "left", col, 16, 600);
      });
      // views per lesson
      const vy = ty + 72, vh = Math.min(y + h - vy - 30, 150);
      if (vh < 40) return;
      K.text("Views per lesson", mx, vy, "left", SOFT, 9.5, 600);
      const n = published ? 7 : 6, bw0 = mw / 7, max = 460;
      for (let i = 0; i < n; i++) {
        const v = i < 6 ? BASE_VIEWS[i] + grow * 20 : 30 * clamp((s - 6) / 4, 0, 1) + 4, bh0 = (vh - 16) * v / max, bx = mx + i * bw0 + 6;
        c.fillStyle = i === 6 ? INK : i >= 4 ? DIM : AC; c.fillRect(bx, vy + vh - bh0, bw0 - 12, bh0);
        K.label(String(i + 1), bx + (bw0 - 12) / 2, vy + vh + 14, "center", SOFT, 8.5);
      }
      K.label("5 and 6 are paid", mx + mw, vy, "right", DIM, 8.5);
    }

    function render() {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      K.dots(W, H, hexA(INK, .05));
      const isS = t < STUDENT;
      K.tabs(["Student", "Instructor"], X0, wy - 22, isS ? 0 : 1, AC);
      const top = K.win(X0, wy, span, wh, "nexus · learn", INK, P.raise);
      (isS ? student : instructor)(X0, top, span, wy + wh - top);
    }

    return {
      resize(w, h, tr) { W = w; H = h; TR = tr; layout(); }, step, render,
      stage: () => t < 8 ? 0 : t < 10.1 ? 1 : t < STUDENT ? 2 : t < STUDENT + 6 ? 3 : 4,
      done: () => t > LOOP - .15,
      still() { t = 12.5; render(); }
    };
};
