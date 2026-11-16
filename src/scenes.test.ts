import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SCENES } from './scenes';
import type { SceneCanvas } from './scenes/kit';

// Each slide's art key, background and step count, read from the markup the scenes are paired with.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const slides = [...html.matchAll(/<article class="slide"[\s\S]*?<\/article>/g)].map(([a]) => ({
  art: /data-art="([^"]+)"/.exec(a)![1],
  data: Object.fromEntries([.../<canvas class="art"[^>]*>/.exec(a)![0].matchAll(/data-([a-z]+)="([^"]*)"/g)].map(m => [m[1], m[2]])),
  steps: (a.match(/<span data-i="\d+">/g) ?? []).length,
}));

// A 2D context stub: every call is a no-op that records numbers that are not finite.
function stubCanvas(data: Record<string, string>) {
  const bad: string[] = [];
  const store: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(store, {
    get: (t, k) => k === 'measureText'
      ? (s: string) => ({ width: String(s).length * 6 })
      : k in t ? t[k] : (...args: unknown[]) => { if (args.some(v => typeof v === 'number' && !Number.isFinite(v))) bad.push(String(k)); },
    set: (t, k, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const cv: SceneCanvas = { dataset: { ...data }, getContext: () => ctx };
  return { cv, bad };
}

describe('scenes', () => {
  it('has one scene per slide', () => {
    expect(slides).toHaveLength(13);
    for (const s of slides) expect(SCENES[s.art], s.art).toBeTypeOf('function');
  });

  for (const s of slides) {
    for (const [w, h] of [[1440, 806], [900, 700], [390, 760]]) {
      it(`${s.art} at ${w}x${h} finishes and shows every step`, () => {
        const { cv, bad } = stubCanvas(s.data);
        const scene = SCENES[s.art](cv);
        scene.resize(w, h, w < 1100 ? 360 : 720);
        scene.render();
        const seen = new Set<number>();
        let t = 0, n = 0;
        while (!scene.done() && t < 180) {
          scene.step(0.03); t += 0.03;
          const st = scene.stage();
          // A slide without step chips (Luciq) still plays its stages; there is just nothing to match.
          if (s.steps) expect(Number.isInteger(st) && st >= 0 && st < s.steps, `stage ${st} at ${t.toFixed(2)}s`).toBe(true);
          seen.add(st);
          if (++n % 8 === 0) scene.render();
        }
        expect(scene.done(), 'finished within 180s').toBe(true);
        expect([...Array(s.steps).keys()].filter(i => !seen.has(i)), 'steps never shown').toEqual([]);
        scene.still();
        expect(bad, 'draw calls with non-finite numbers').toEqual([]);
      });
    }
  }
});

// Records every text and box a scene draws, so a test can check nothing lands outside the canvas.
// Text width is estimated from the font size: 0.6em for the mono font, 0.55em for the sans.
function boundsCanvas(data: Record<string, string>) {
  const store: Record<string | symbol, unknown> = { font: '10px mono', textAlign: 'left', textBaseline: 'alphabetic' };
  const boxes: { what: string; x0: number; y0: number; x1: number; y1: number }[] = [];
  let tf = { tx: 0, ty: 0, plain: true };
  const stack: typeof tf[] = [];
  const size = () => parseFloat(/(\d+(\.\d+)?)px/.exec(String(store.font))?.[1] ?? '10');
  const em = () => /Mono|mono/.test(String(store.font)) ? .6 : .55;
  const textW = (s: string) => String(s).length * size() * em();
  const box = (what: string, x: number, y: number, w: number, h: number) => {
    if (tf.plain) boxes.push({ what, x0: x + tf.tx + Math.min(0, w), y0: y + tf.ty + Math.min(0, h), x1: x + tf.tx + Math.max(0, w), y1: y + tf.ty + Math.max(0, h) });
  };
  const calls: Record<string, (...a: number[]) => void> = {
    save: () => { stack.push({ ...tf }); },
    restore: () => { tf = stack.pop() ?? { tx: 0, ty: 0, plain: true }; },
    translate: (x, y) => { tf = { ...tf, tx: tf.tx + x, ty: tf.ty + y }; },
    scale: () => { tf = { ...tf, plain: false }; },
    rotate: () => { tf = { ...tf, plain: false }; },
    setTransform: () => { tf = { tx: 0, ty: 0, plain: true }; },
    fillRect: (x, y, w, h) => box('fillRect', x, y, w, h),
    strokeRect: (x, y, w, h) => box('strokeRect', x, y, w, h),
    roundRect: (x, y, w, h) => box('roundRect', x, y, w, h),
    rect: (x, y, w, h) => box('rect', x, y, w, h),
  };
  const ctx = new Proxy(store, {
    get: (t, k) => {
      if (k === 'measureText') return (s: string) => ({ width: textW(s) });
      if (k === 'fillText') return (s: string, x: number, y: number) => {
        const w = textW(s), sz = size(), al = String(t.textAlign), bl = String(t.textBaseline);
        const left = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x;
        const top = bl === 'middle' ? y - sz / 2 : bl === 'top' || bl === 'hanging' ? y : y - sz * .8;
        box(`text "${s}"`, left, top, w, sz);
      };
      if (typeof k === 'string' && k in calls) return calls[k];
      return k in t ? t[k] : () => {};
    },
    set: (t, k, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
  const cv: SceneCanvas = { dataset: { ...data }, getContext: () => ctx };
  return { cv, boxes };
}

// Phones hide the scenes (style.css), so only the sizes that show them are checked.
describe('scenes stay inside the canvas', () => {
  const SLACK = 2;
  for (const s of slides) {
    for (const [w, h] of [[1440, 806], [900, 700], [768, 635], [753, 540]]) {
      it(`${s.art} at ${w}x${h}`, () => {
        const { cv, boxes } = boundsCanvas(s.data);
        const scene = SCENES[s.art](cv);
        scene.resize(w, h, w < 1100 ? 360 : 720);
        let t = 0;
        while (!scene.done() && t < 180) { scene.step(0.1); t += 0.1; }
        // Only the final frame: mid-run, some scenes slide items in and out across the edge on purpose.
        boxes.length = 0;
        scene.still();
        // Large fills are background washes and shades, sized past the edge on purpose.
        const isWash = (b: typeof boxes[number]) => (b.x1 - b.x0) * (b.y1 - b.y0) > w * h / 4;
        const out = boxes.filter(b => !isWash(b) && (b.x0 < -SLACK || b.y0 < -SLACK || b.x1 > w + SLACK || b.y1 > h + SLACK))
          .map(b => `${b.what} [${b.x0.toFixed(0)},${b.y0.toFixed(0)} → ${b.x1.toFixed(0)},${b.y1.toFixed(0)}]`);
        expect([...new Set(out)].slice(0, 8), 'drawn outside the canvas').toEqual([]);
      });
    }
  }
});
