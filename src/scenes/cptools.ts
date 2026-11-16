import { clamp, ctx2d, ERR, hexA, kit, MONO, OK, palette, region, rng, type SceneFactory } from './kit'

type Line = [text: string, col: string]
interface Input { n: number; a: number[]; test: number; answer: number }
interface TestFile { name: string; born: number }

// Competitive programming toolkit, the product: the Stress-test CLI with its real prompts, a generator built
// on Random-generator, the files it compares, then Tests-Generator writing test files.
export const cptools: SceneFactory = (cv) => {
    const c = ctx2d(cv);
    const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, INK = P.ink, SOFT = P.soft;
    const K = kit(c, BG, SOFT, INK);
    const r = rng(59);
    const SETUP: Line[] = [
      ["Last used data ^_^", SOFT], ["path of the executable test file: ./test", INK], ["path of the executable reference file: ./answer", INK],
      ["path of the executable generator file: ./generator", INK], ["number of test cases: 100", INK],
      ["Enter 1 for use the last used data or enter 0 to use new data.", SOFT], ["1", AC], ["", INK], ["Here we goooooooooooooo", AC], ["", INK]
    ];
    const GEN_SETUP: Line[] = [["path of the executable generator file: ./generator", INK], ["number of test cases: 8", INK], ["", INK]];
    const CODE: Line[] = [
      ['#include "random_generator_lib.h"', DIM], ["", INK], ["int main() {", INK], ["    int n = random32(2, 8);", INK], ["    cout << n << '\\n';", INK],
      ["    for (int i = 0; i < n; i++)", INK], ["        cout << random32(1, 30) << ' ';", INK], ["}", INK]
    ];
    const LINE_T = .2, TEST_T = .34, HOLD = 3.6, FILE_T = .4, NFILES = 8;
    let W = 0, H = 0, TR = 0, X0 = 0, span = 0, wy = 0, wh = 0;
    let t = 0, ph = 0, pt = 0, out: Line[] = [], tests = 0, failAt = 12, inp: Input | null = null, files: TestFile[] = [];

    function layout() { [X0, , span] = region(W, TR); wy = H * .08 + 30; wh = Math.max(300, Math.min(H - wy - H * .08, 580)); }
    function gen(force: boolean): Input {
      const n = 2 + Math.floor(r() * 7), a = Array.from({ length: n }, () => 1 + Math.floor(r() * 30));
      if (force) { const m = Math.max(...a); a[(a.indexOf(m) + 1 + Math.floor(r() * (n - 1))) % n] = m; }
      const s = [...a].sort((p, q) => q - p), answer = s[0] + s[1];
      const distinct = [...new Set(s)], test = distinct[0] + (distinct[1] ?? 0);
      return { n, a, test, answer };
    }
    function reset() { ph = 0; pt = 0; out = []; tests = 0; failAt = 9 + Math.floor(r() * 8); inp = null; files = []; }

    function step(dt: number) {
      t += dt; pt += dt;
      if (ph === 0) { if (pt >= LINE_T) { pt = 0; out.push(SETUP[out.length]); if (out.length === SETUP.length) ph = 1; } }
      else if (ph === 1) {
        if (pt >= TEST_T) {
          pt = 0; tests++; inp = gen(tests === failAt);
          out.push([`test ${tests}:`, SOFT]);
          if (inp.test === inp.answer) out.push(["status: PASSED", OK]);
          else {
            out.push([`status: FAILED in test ${tests}`, ERR], ["you can find full test: stress_test_env/input.txt", SOFT], ["you can find full output: stress_test_env/output.txt", SOFT], ["you can find full refrence output: stress_test_env/answer.txt", SOFT]);
            ph = 2;
          }
        }
      } else if (ph === 2) { if (pt >= HOLD) { ph = 3; pt = 0; out = []; } }
      else if (ph === 3) { if (pt >= LINE_T) { pt = 0; out.push(GEN_SETUP[out.length]); if (out.length === GEN_SETUP.length) ph = 4; } }
      else if (ph === 4) {
        if (pt >= FILE_T) {
          pt = 0; const name = `${100000 + Math.floor(r() * 899999)}.txt`;
          files.push({ name, born: t }); out.push([`Tests/${name}`, DIM]);
          if (files.length === NFILES) { out.push(["", INK], [`${NFILES} test files created`, OK]); ph = 5; }
        }
      } else if (pt >= 2.6) reset();
    }

    function term(x: number, y: number, w: number, h: number, title: string) {
      const top = K.win(x, y, w, h, title, INK, BG);
      const lh = 13, n = Math.max(1, Math.floor((h - 36) / lh)), shown = out.slice(-n);
      shown.forEach(([s, col], i) => K.label(s, x + 12, top + 18 + i * lh, "left", col, 9, s.startsWith("status") ? 500 : 400, w - 24));
      if (ph !== 2 && ph !== 5 && Math.floor(t * 3) % 2 === 0) { const yy = top + 18 + Math.min(shown.length, n - 1) * lh; c.fillStyle = AC; c.fillRect(x + 12, yy - 9, 6, 11); }
    }

    function envPanel(x: number, y: number, w: number, h: number) {
      if (ph >= 3) {
        const top = K.win(x, y, w, h, "Tests/", INK, BG);
        files.forEach((f, i) => {
          const a = clamp((t - f.born) / .35, 0, 1), col2 = i % 2, row = Math.floor(i / 2), fx = x + 14 + col2 * (w / 2), fy = top + 22 + row * 20;
          if (fy > y + h - 8) return;
          c.globalAlpha = a; c.strokeStyle = DIM; c.strokeRect(fx, fy - 10, 9, 12); c.globalAlpha = 1;
          K.label(f.name, fx + 15, fy, "left", hexA(INK, a), 9);
        });
        if (!files.length) K.label("empty", x + 14, top + 22, "left", SOFT, 9);
        return;
      }
      const top = K.win(x, y, w, h, "stress_test_env/", INK, BG);
      const fail = ph === 2, cw = (w - 16) / 3;
      const panes: [string, string[]][] = [["input.txt", inp ? [String(inp.n), inp.a.join(" ")] : []], ["output.txt", inp ? [String(inp.test)] : []], ["answer.txt", inp ? [String(inp.answer)] : []]];
      panes.forEach(([n, lines], k) => {
        const px = x + 8 + k * cw, bad = fail && k === 1;
        K.label(n, px + 4, top + 16, "left", bad ? ERR : SOFT, 8.5);
        c.beginPath(); c.roundRect(px, top + 22, cw - 6, h - 24 - 30, 4); c.fillStyle = bad ? hexA(ERR, .12) : hexA(INK, .03); c.fill(); c.strokeStyle = bad ? ERR : hexA(INK, .15); c.stroke();
        if (k === 0) { c.font = `11px ${MONO}`; K.wrap(lines[1] || "", cw - 18).forEach((l, i) => { if (i === 0) K.label(lines[0] || "", px + 6, top + 38, "left", INK, 9); K.label(l, px + 6, top + 51 + i * 12, "left", INK, 9); }); }
        else K.label(lines[0] || "", px + 6, top + 38, "left", bad ? ERR : INK, 10, 500);
      });
    }

    function codePanel(x: number, y: number, w: number, h: number) {
      const top = K.win(x, y, w, h, "generator.cpp", INK, BG);
      const lh = Math.min(14, (h - 30) / CODE.length);
      CODE.forEach(([s, col], i) => {
        const yy = top + 18 + i * lh, hot = (ph === 1 || ph === 4) && (i === 3 || i === 6) && Math.floor(t * 4) % 2 === 0;
        if (hot) { c.fillStyle = hexA(AC, .1); c.fillRect(x + 1, yy - lh + 3, w - 2, lh); }
        K.label(String(i + 1).padStart(2, " "), x + 8, yy, "left", hexA(INK, .25), 8.5);
        K.label(s, x + 28, yy, "left", s.includes("random32") ? AC : col, 8.5, 400, w - 36);
      });
    }

    function render() {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      K.dots(W, H, hexA(INK, .05));
      const tools = [["Random-generator", "★24"], ["Stress-test", "★7"], ["Tests-Generator", ""]], on = ph >= 3 ? 2 : 1;
      let cx = X0;
      tools.forEach(([n, s], k) => {
        c.font = `11px ${MONO}`; const w = c.measureText(n + (s ? " " + s : "")).width + 18, a = k === on || k === 0;
        c.beginPath(); c.roundRect(cx, wy - 32, w, 20, 10); c.fillStyle = a ? hexA(AC, .16) : BG; c.fill(); c.strokeStyle = a ? AC : hexA(INK, .25); c.stroke();
        K.label(n, cx + 9, wy - 18, "left", a ? INK : SOFT, 9.5); if (s) K.label(s, cx + w - 9, wy - 18, "right", AC, 9.5, 500);
        cx += w + 8;
      });
      const split = span >= 480;
      if (!split) { term(X0, wy, span, wh, ph >= 3 ? "Tests_Generator" : "stress_test"); return; }
      const lw = Math.round(span * .44), gap = 12, eh = Math.round(wh * .42);
      codePanel(X0, wy, lw, wh - eh - gap);
      envPanel(X0, wy + wh - eh, lw, eh);
      term(X0 + lw + gap, wy, span - lw - gap, wh, ph >= 3 ? "Tests_Generator" : "stress_test");
    }

    return {
      resize(w, h, tr) { W = w; H = h; TR = tr; layout(); }, step, render,
      stage: () => Math.min(ph, 3),
      done: () => ph === 5 && pt > 2.5,
      still() { reset(); out = SETUP.slice(); ph = 1; for (let i = 0; i < 40 && ph === 1; i++) { pt = TEST_T; step(0); } render(); }
    };
};
