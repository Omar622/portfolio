import { clamp, ctx2d, hexA, kit, OK, ERR, palette, region, SANS, smooth, type SceneFactory } from './kit'

// Focal Point: a user finds a workspace, picks a slot that does not overlap a booking,
// pays with PayPal (confirmed by webhook), then chats with the owner.
export const focal: SceneFactory = (cv) => {
  const c = ctx2d(cv);
  const P = palette(cv), BG = P.bg, AC = P.accent, DIM = P.dim, INK = P.ink, SOFT = P.soft;
  const K = kit(c, BG, SOFT, INK);
  const STAGES = [4, 5, 4.5, 4.5];
  const END = STAGES.reduce((a, b) => a + b, 0);
  const starts = STAGES.map((_, i) => STAGES.slice(0, i).reduce((a, b) => a + b, 0));
  const SPACES = [["Desk · Olaya", "4.8", "35 SAR / h"], ["Meeting room · Malqa", "4.6", "120 SAR / h"], ["Private office · Nakheel", "4.9", "60 SAR / h"]];
  const HOURS = ["09", "10", "11", "12", "13", "14", "15"];
  const BOOKED = [1, 2, 5];
  const CHAT: [boolean, string][] = [[false, "Hi, is there parking?"], [true, "Yes, free for guests."], [false, "Great, see you at 12."]];

  let W = 0, H = 0, TR = 0, X0 = 0, span = 0, y0 = 0, wh = 0, t = 0;
  function layout() { [X0, , span] = region(W, TR); y0 = H * .1; wh = clamp(H * .7, 280, 460); }
  const stage = () => { let s = 0; starts.forEach((a, i) => { if (t >= a) s = i; }); return s; };
  const local = (i: number) => t - starts[i];

  function render() {
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    K.dots(W, H, hexA(SOFT, .06));
    const top = K.win(X0, y0, span, wh, "focalspoint.com", AC, P.raise);
    const ix = X0 + 16, iw = span - 32, iy = top + 16, ih = wh - (top - y0) - 30;
    const s = stage();
    K.tabs(["Find", "Book", "Pay", "Chat"], ix, iy + 4, s, AC);
    const by = iy + 30, bh = ih - 30;

    if (s === 0) {
      const q = "workspace near me".slice(0, Math.floor(clamp(local(0) / 1.4, 0, 1) * 17));
      c.beginPath(); c.roundRect(ix, by, iw, 26, 13); c.fillStyle = BG; c.fill(); c.strokeStyle = hexA(AC, .4); c.stroke();
      K.label(q + (local(0) < 1.6 && Math.floor(t * 3) % 2 ? "|" : ""), ix + 14, by + 17, "left", INK, 10);
      const rh = Math.min(48, (bh - 40) / 3);
      SPACES.forEach(([name, rate, price], i) => {
        const y = by + 38 + i * (rh + 6), a = smooth(1.4 + i * .3, 1.8 + i * .3, local(0)), pick = i === 2 && local(0) > 3;
        c.globalAlpha = a;
        c.beginPath(); c.roundRect(ix, y, iw, rh, 6); c.fillStyle = pick ? hexA(AC, .14) : BG; c.fill(); c.strokeStyle = pick ? AC : hexA(AC, .25); c.stroke();
        c.fillStyle = hexA(AC, .25); c.fillRect(ix + 8, y + 8, rh - 16, rh - 16);
        K.text(name, ix + rh + 4, y + rh / 2 - 2, "left", INK, 10.5, 600, iw - rh - 100);
        K.label(`★ ${rate}`, ix + rh + 4, y + rh / 2 + 12, "left", SOFT, 9);
        K.label(price, ix + iw - 10, y + rh / 2 + 4, "right", pick ? AC : SOFT, 9.5, 500);
        c.globalAlpha = 1;
      });
    } else if (s === 1) {
      K.text("Private office · Nakheel", ix, by + 10, "left", INK, 11, 600, iw);
      K.label("availability · today", ix, by + 28, "left", SOFT, 9);
      const n = HOURS.length, cw = iw / n, cy = by + 40, ch = Math.min(70, bh - 110);
      const pickA = 3, pickB = local(1) < 2.4 ? 5 : 4, clash = local(1) > 1.2 && local(1) < 2.4;
      HOURS.forEach((h, i) => {
        const x = ix + i * cw, booked = BOOKED.includes(i), sel = local(1) > 1 && i >= pickA && i <= pickB;
        c.beginPath(); c.roundRect(x + 2, cy, cw - 4, ch, 4);
        c.fillStyle = booked ? hexA(DIM, .35) : sel ? hexA(clash && booked ? ERR : AC, .25) : BG; c.fill();
        c.strokeStyle = sel && booked && clash ? ERR : sel ? AC : hexA(AC, .25); c.stroke();
        K.label(h, x + cw / 2, cy + ch + 14, "center", SOFT, 9);
        if (booked) K.label("booked", x + cw / 2, cy + ch / 2 + 3, "center", SOFT, 8);
      });
      const msg = local(1) < 1 ? "pick a time" : clash ? "12:00 – 16:00 · overlaps a booking" : "12:00 – 15:00 · free";
      K.label(msg, ix, cy + ch + 40, "left", clash ? ERR : local(1) < 1 ? SOFT : OK, 10, 500);
    } else if (s === 2) {
      const rows: [string, string][] = [["12:00 – 15:00 · 3 h", "180 SAR"], ["VAT 15%", "27 SAR"], ["Total", "207 SAR"]];
      rows.forEach(([a, b], i) => {
        const y = by + 12 + i * 22;
        K.label(a, ix, y, "left", i === 2 ? INK : SOFT, 10, i === 2 ? 600 : 400);
        K.label(b, ix + iw, y, "right", i === 2 ? INK : SOFT, 10, i === 2 ? 600 : 400);
      });
      const steps = ["Pay with PayPal", "PayPal webhook → API", "Booking confirmed"];
      steps.forEach((n, i) => {
        const y = by + 88 + i * 38, on = local(2) > .6 + i * 1.1, last = i === steps.length - 1, col = last ? OK : AC;
        c.beginPath(); c.roundRect(ix, y, iw, 28, 6); c.fillStyle = on ? hexA(col, .14) : BG; c.fill(); c.strokeStyle = on ? col : hexA(AC, .2); c.stroke();
        K.label(n, ix + 12, y + 18, "left", on ? (last ? OK : INK) : SOFT, 10, 500);
        if (on && last) K.check(ix + iw - 16, y + 14, OK);
      });
    } else {
      K.text("Owner · Private office", ix, by + 10, "left", INK, 11, 600, iw);
      CHAT.forEach(([mine, text], i) => {
        const a = smooth(.4 + i * 1.1, .8 + i * 1.1, local(3));
        if (a <= 0) return;
        c.font = `11px ${SANS}`;
        const w = Math.min(iw * .7, c.measureText(text).width + 22), y = by + 28 + i * 40, x = mine ? ix + iw - w : ix;
        c.globalAlpha = a;
        c.beginPath(); c.roundRect(x, y, w, 28, 10); c.fillStyle = mine ? hexA(AC, .22) : hexA(INK, .08); c.fill();
        K.text(text, x + 11, y + 18, "left", INK, 10, 400, w - 18);
        if (!mine && local(3) > 1.6 + i * 1.1) K.label("✓✓ read", x + w + 6, y + 18, "left", OK, 8.5);
        c.globalAlpha = 1;
      });
      K.label("real-time chat · push notification sent", ix, by + bh - 6, "left", SOFT, 9);
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
