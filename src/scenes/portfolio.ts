import { clamp, ctx2d, ease, hexA, kit, OK, palette, region, smooth, type SceneFactory } from './kit'

// This portfolio: the overview page, zooming into a slide, its scene playing, the scene tests at three
// screen sizes, then the Docker image served by nginx.
export const portfolio: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, INK = P.ink, SOFT = P.soft;
  const K = kit(c, BG, SOFT, INK);
  const STAGES = [3.5, 2.5, 5, 4.5, 4.5];
  const END = STAGES.reduce((a, b) => a + b, 0);
  const starts = STAGES.map((_, i) => STAGES.slice(0, i).reduce((a, b) => a + b, 0));
  const CARDS = ["Me & why", "Experience", "Side projects"];
  const SIZES: [string, number][] = [["1440 × 806", 1.6], ["900 × 700", 1.25], ["390 × 760", .55]];
  const SHIP = ["pnpm test && build", "Docker image", "nginx", "200 OK"];

  let W = 0, H = 0, TR = 0, X0 = 0, span = 0, y0 = 0, wh = 0, t = 0;

  function layout() { [X0, , span] = region(W, TR); y0 = H * .1; wh = clamp(H * .7, 260, 460); }
  const stage = () => { let s = 0; starts.forEach((a, i) => { if (t >= a) s = i; }); return s; };
  const local = (i: number) => t - starts[i];

  type Rect = [number, number, number, number];
  const lerp = (a: Rect, b: Rect, k: number): Rect => a.map((v, i) => v + (b[i] - v) * k) as Rect;

  function miniSlide([x, y, w, h]: Rect, play: number, a = 1) {
    c.globalAlpha = a;
    c.beginPath(); c.roundRect(x, y, w, h, 6); c.fillStyle = hexA(AC, .06); c.fill(); c.strokeStyle = hexA(AC, .5); c.stroke();
    const tw = w * .38;
    c.fillStyle = hexA(INK, .8); c.fillRect(x + w * .05, y + h * .12, tw * .7, Math.max(3, h * .06));
    for (let i = 0; i < 4; i++) { c.fillStyle = hexA(SOFT, .45); c.fillRect(x + w * .05, y + h * (.28 + i * .1), tw * (i % 2 ? .8 : 1), Math.max(1.5, h * .025)); }
    for (let i = 0; i < 4; i++) {
      const on = play > 0 && Math.floor(play * 4) === i, done = play > 0 && i < Math.floor(play * 4);
      c.fillStyle = on ? AC : done ? hexA(AC, .45) : hexA(AC, .15);
      c.fillRect(x + w * .05 + i * tw * .26, y + h * .78, tw * .22, Math.max(3, h * .06));
    }
    // The slide's own scene: a packet moving through three nodes.
    const ax = x + w * .5, aw = w * .44, my = y + h * .5;
    c.strokeStyle = hexA(AC, .35); c.beginPath(); c.moveTo(ax, my); c.lineTo(ax + aw, my); c.stroke();
    [0, .5, 1].forEach(f => { c.beginPath(); c.roundRect(ax + aw * f - 6, my - 5, 12, 10, 2); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(AC, .7); c.stroke(); });
    if (play > 0) {
      for (let k = 0; k < 3; k++) {
        const p = (play * 3 + k / 3) % 1;
        c.beginPath(); c.arc(ax + aw * p, my, 2.5, 0, 7); c.fillStyle = AC; c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    K.dots(W, H, hexA(SOFT, .06));
    const top = K.win(X0, y0, span, wh, "omar · portfolio", AC, P.raise);
    const ix = X0 + 16, iw = span - 32, iy = top + 14, ih = wh - (top - y0) - 28;
    const s = stage();

    if (s === 0) {
      K.label("DESIGN DOC · OVERVIEW", ix, iy + 8, "left", SOFT, 9);
      c.fillStyle = hexA(INK, .85); c.fillRect(ix, iy + 20, iw * .45, 10);
      const cw = (iw - 20) / 3, cy = iy + 50, ch = Math.min(ih - 60, 150);
      CARDS.forEach((n, i) => {
        const x = ix + i * (cw + 10), hot = i === 2 && local(0) > 2.2;
        c.beginPath(); c.roundRect(x, cy, cw, ch, 5); c.fillStyle = hot ? hexA(AC, .12) : BG; c.fill(); c.strokeStyle = hot ? AC : hexA(AC, .3); c.stroke();
        K.text(n, x + 8, cy + 20, "left", INK, 10, 600, cw - 16);
        for (let k = 0; k < 4; k++) { c.fillStyle = hexA(SOFT, .3); c.fillRect(x + 8, cy + 34 + k * 12, (cw - 16) * (k % 2 ? .6 : .85), 3); }
        K.label("Zoom in →", x + cw - 8, cy + ch - 10, "right", hot ? AC : DIM, 8.5);
      });
      const tx = ix + 2 * (cw + 10) + cw * .7, ty = cy + ch - 14, k = smooth(.6, 2.2, local(0));
      const px = ix + iw * .3 + (tx - ix - iw * .3) * k, py = iy + ih * .2 + (ty - iy - ih * .2) * k;
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + 9, py + 11); c.lineTo(px + 4, py + 11); c.lineTo(px, py + 15); c.closePath(); c.fillStyle = INK; c.fill();
    } else if (s === 1 || s === 2) {
      const cw = (iw - 20) / 3, from: Rect = [ix + 2 * (cw + 10), iy + 50, cw, Math.min(ih - 60, 150)], to: Rect = [ix, iy, iw, ih];
      const k = s === 1 ? ease(clamp(local(1) / STAGES[1], 0, 1)) : 1;
      miniSlide(lerp(from, to, k), s === 2 ? local(2) / STAGES[2] : 0);
      if (s === 2) K.label("scene plays · step chips follow it", ix + 8, iy + ih - 8, "left", SOFT, 9);
    } else if (s === 3) {
      K.label("VITEST · every scene at 3 screen sizes", ix, iy + 8, "left", SOFT, 9);
      const gap = 12, total = SIZES.reduce((a, [, r]) => a + r, 0), unit = (iw - gap * 2) / total;
      let x = ix;
      SIZES.forEach(([name, ratio], i) => {
        const w = unit * ratio, hh = clamp(w * (ratio < 1 ? 1.95 : .56), 40, ih - 70), y = iy + 24, ok = local(3) > .9 + i * 1.1;
        miniSlide([x, y, w, hh], (local(3) * .4 + i * .2) % 1, .4 + .6 * smooth(i * 1.1, i * 1.1 + .5, local(3)));
        K.label(name, x, y + hh + 16, "left", SOFT, 9);
        if (ok) { K.check(x + w - 8, y + hh + 12, OK); }
        x += w + gap;
      });
      const n = Math.min(3, Math.floor(clamp((local(3) - .9) / 1.1 + 1, 0, 3)));
      K.label(`${n * 12} of 36 passed`, ix, iy + ih - 4, "left", n === 3 ? OK : SOFT, 10, 500);
    } else {
      K.label("SHIP", ix, iy + 8, "left", SOFT, 9);
      const bw = Math.min(150, (iw - 30) / 2), rows = SHIP.length, rh = (ih - 40) / rows;
      SHIP.forEach((n, i) => {
        const y = iy + 26 + i * rh, x = ix + (i % 2) * (iw - bw), on = local(4) > i * .9, last = i === rows - 1;
        const col = last ? OK : AC;
        c.beginPath(); c.roundRect(x, y, bw, Math.min(30, rh - 10), 5); c.fillStyle = on ? hexA(col, .12) : BG; c.fill(); c.strokeStyle = on ? col : hexA(AC, .25); c.stroke();
        K.label(n, x + bw / 2, y + Math.min(30, rh - 10) / 2 + 3.5, "center", on ? (last ? OK : INK) : SOFT, 9.5, 500);
        if (i < rows - 1) {
          const nx = ix + ((i + 1) % 2) * (iw - bw), ny = y + rh, sx = x + bw / 2, sy = y + Math.min(30, rh - 10), ex = nx + bw / 2;
          c.strokeStyle = hexA(AC, on ? .5 : .15); c.setLineDash([3, 4]); c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ny); c.stroke(); c.setLineDash([]);
          const p = clamp((local(4) - i * .9) / .9, 0, 1);
          if (p > 0 && p < 1) { c.beginPath(); c.arc(sx + (ex - sx) * p, sy + (ny - sy) * p, 3, 0, 7); c.fillStyle = AC; c.fill(); }
        }
      });
    }
  }

  return {
    resize(w, h, tr) { W = w; H = h; TR = tr; layout(); },
    step(dt) { t = Math.min(END, t + dt); },
    render,
    stage,
    done: () => t >= END,
    still() { t = END; render(); }
  };
};
