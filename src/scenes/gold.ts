import { clamp, ctx2d, ERR, hexA, kit, OK, palette, region, WARN, type SceneFactory } from './kit';

// Gold investment, the product: an InstaPay deposit, two reviewers racing to approve it, the wallet credited,
// then the same account buying from two devices at once. Each race lets exactly one through, as the backend does:
// the approval only moves a PENDING row (one reviewer wins) and the wallet can never go below zero.
export const gold: SceneFactory = (cv) => {
  const c = ctx2d(cv), P = palette(cv);
  const K = kit(c, P.bg, P.soft, P.ink);
  const AC = P.accent, INK = P.ink, SOFT = P.soft;
  const T = { submit: 4.2, clickA: 7.2, clickB: 7.32, credit: 11, buy: 15.6, buyB: 15.7, end: 26 };
  const STAGE_AT = [0, 5.5, 11, 14.5];
  const DEPOSIT = 10000, PRICE = 6100, KEY = 'IPN-48213-77';
  const PRICES: [string, number][] = [['24K', 6100], ['21K', 5340], ['18K', 4575]];
  let W = 0, H = 0, TR = 0, X0 = 0, span = 0, t = 0;

  const money = (n: number) => `${Math.round(n).toLocaleString('en')} EGP`;
  function balance() {
    if (t < T.credit) return 0;
    if (t < T.buy + .3) return DEPOSIT * clamp((t - T.credit) / 1.2, 0, 1);
    return DEPOSIT - PRICE;
  }
  const flash = (at: number) => t > at && t < at + .35 ? 1 - (t - at) / .35 : 0;

  function phone(x: number, y: number, w: number, h: number, alone: boolean) {
    const top = K.win(x, y, w, h, 'gold-investment · app', AC, P.raise);
    let yy = top + 22;
    K.text('Wallet', x + 14, yy, 'left', SOFT, 9.5);
    K.text(money(balance()), x + 14, yy + 24, 'left', INK, 18, 600);
    yy += 44;
    PRICES.forEach(([k, p], i) => {
      const live = p + Math.round(Math.sin(t * 1.3 + i) * 6);
      K.label(k, x + 14 + i * (w - 28) / 3, yy, 'left', AC, 9, 500);
      K.label(`${live.toLocaleString('en')}/g`, x + 14 + i * (w - 28) / 3, yy + 13, 'left', SOFT, 8.5);
    });
    yy += 30;
    c.strokeStyle = hexA(INK, .12); c.beginPath(); c.moveTo(x + 10, yy); c.lineTo(x + w - 10, yy); c.stroke();
    yy += 22;

    if (t < T.submit + .6) {
      K.text('Deposit', x + 14, yy, 'left', INK, 11, 600);
      const field = (label: string, value: string, fy: number, on = false) => {
        K.text(label, x + 14, fy, 'left', SOFT, 8.5);
        c.beginPath(); c.roundRect(x + 14, fy + 5, w - 28, 22, 5); c.strokeStyle = hexA(on ? AC : INK, on ? .8 : .2); c.stroke();
        K.text(value, x + 22, fy + 20, 'left', INK, 9.5, 400, w - 44);
      };
      field('Amount', t > .6 ? money(DEPOSIT) : '', yy + 18);
      field('Pay with', t > 1.3 ? 'InstaPay  ✓' : '', yy + 56, t > 1.3 && t < 2);
      field('InstaPay payment key', KEY.slice(0, Math.floor(clamp((t - 2) / 1.6, 0, 1) * KEY.length)), yy + 94, t > 2 && t < 3.6);
      const by = yy + 132, press = flash(T.submit);
      c.beginPath(); c.roundRect(x + 14, by, w - 28, 26, 6); c.fillStyle = press ? hexA(AC, .6) : AC; c.fill();
      K.text('Submit for review', x + w / 2, by + 17, 'center', P.bg, 10, 600);
      return;
    }
    if (t < T.credit) {
      K.text('Deposit · InstaPay', x + 14, yy, 'left', INK, 11, 600);
      K.text(money(DEPOSIT), x + 14, yy + 20, 'left', SOFT, 9.5);
      K.pill('PENDING REVIEW', x + w - 14, yy - 4, WARN, true);
      K.text('A reviewer checks the transfer.', x + 14, yy + 44, 'left', SOFT, 9, 400, w - 28);
      return;
    }
    if (t < T.buy - 1.6) {
      c.beginPath(); c.roundRect(x + 10, yy - 14, w - 20, 44, 7); c.fillStyle = hexA(OK, .12); c.fill();
      K.check(x + 24, yy + 4, OK);
      K.text('Deposit approved', x + 36, yy + 2, 'left', INK, 10, 600);
      K.text(`+${money(DEPOSIT)} to your wallet`, x + 36, yy + 18, 'left', SOFT, 9, 400, w - 50);
      return;
    }
    K.text('Buy gold', x + 14, yy, 'left', INK, 11, 600);
    K.tabs(['24K', '21K', '18K'], x + 14, yy + 22, 0, AC);
    K.text('1,000 mg  =  6,100 EGP', x + 14, yy + 52, 'left', INK, 10);
    K.text('live price + margin', x + 14, yy + 66, 'left', SOFT, 8.5);
    const by = yy + 80, press = Math.max(flash(T.buy), flash(T.buyB));
    c.beginPath(); c.roundRect(x + 14, by, w - 28, 26, 6); c.fillStyle = press ? hexA(AC, .55) : AC; c.fill();
    K.text('Buy', x + w / 2, by + 17, 'center', P.bg, 10, 600);
    if (t > T.buy + .3) {
      K.check(x + 22, by + 58, OK);
      K.text('Bought 1,000 mg of 24K', x + 34, by + 62, 'left', INK, 9.5, 400, w - 46);
    }
    // On narrow screens there is no second device, so the phone tells the second buy's outcome itself.
    if (alone && t > T.buyB + .4) {
      K.label('✗', x + 22, by + 84, 'center', ERR, 10, 500);
      K.text('Second buy rejected: not enough balance', x + 34, by + 84, 'left', SOFT, 9, 400, w - 46);
    }
  }

  function reviewer(x: number, y: number, w: number, h: number) {
    const top = K.win(x, y, w, h, 'payment review · admin', AC, P.raise);
    K.text('Pending transactions', x + 14, top + 20, 'left', INK, 10.5, 600);
    if (t < T.submit + .4) { K.text('Nothing to review.', x + 14, top + 44, 'left', SOFT, 9); return; }
    const ry = top + 32, done = t > T.clickA + .3;
    c.beginPath(); c.roundRect(x + 10, ry, w - 20, 66, 6); c.fillStyle = hexA(INK, .04); c.fill();
    K.label('#812', x + 18, ry + 18, 'left', INK, 9, 500);
    K.text('deposit · 10,000 EGP', x + 54, ry + 18, 'left', SOFT, 9, 400, w - 160);
    K.pill(done ? 'SUCCESS' : 'PENDING', x + w - 18, ry + 14, done ? OK : WARN, true);
    K.text('InstaPay · IPN-48213-77', x + 18, ry + 34, 'left', SOFT, 8.5, 400, w - 36);
    const bw = 76, bx = x + (w - bw) / 2, by = ry + 40, press = Math.max(flash(T.clickA), flash(T.clickB));
    c.beginPath(); c.roundRect(bx, by, bw, 20, 5); c.fillStyle = press ? hexA(AC, .55) : hexA(AC, done ? .25 : 1); c.fill();
    K.text('Approve', bx + bw / 2, by + 14, 'center', P.bg, 9, 600);
    // Two reviewers reach the same button from opposite sides, a moment apart.
    ([['A', T.clickA, -1], ['B', T.clickB, 1]] as [string, number, number][]).forEach(([who, at, side]) => {
      if (t < at - 1.2 || t > T.credit) return;
      const k = clamp((t - (at - 1.2)) / 1.1, 0, 1);
      const cx = bx + bw / 2 + side * 10 + (1 - k) * side * (w / 2 - 30), cy = by + 12;
      c.beginPath(); c.arc(cx, cy, 4, 0, 7); c.fillStyle = INK; c.fill();
      K.label(`reviewer ${who}`, x + (side < 0 ? 18 : w - 18), ry + 86, side < 0 ? 'left' : 'right', SOFT, 8.5);
    });
    if (done) K.label('A: approved ✓', x + 18, ry + 100, 'left', OK, 8.5);
    if (t > T.clickB + .3 && t < T.credit) K.label('B: already processed ✗', x + w - 18, ry + 100, 'right', ERR, 8.5);
  }

  // The same account on a second device: it gets the push notification, then taps Buy at the same moment as the phone.
  function device(x: number, y: number, w: number, h: number) {
    const top = K.win(x, y, w, h, 'gold-investment · second device · same account', AC, P.raise);
    let yy = top + 22;
    K.text('Wallet', x + 14, yy, 'left', SOFT, 9.5);
    K.text(money(balance()), x + 14, yy + 24, 'left', INK, 16, 600);
    yy += 46;
    if (t > T.credit && t < T.credit + 3.2) {
      const a = clamp(Math.min((t - T.credit) / .3, (T.credit + 3.2 - t) / .3), 0, 1);
      c.globalAlpha = a;
      c.beginPath(); c.roundRect(x + 10, yy - 14, w - 20, 40, 7); c.fillStyle = hexA(INK, .07); c.fill();
      c.fillStyle = OK; c.fillRect(x + 10, yy - 14, 3, 40);
      K.text('Gold Investment · now', x + 22, yy + 1, 'left', SOFT, 8.5);
      K.text('Deposit approved: +10,000 EGP', x + 22, yy + 16, 'left', INK, 9.5, 500, w - 40);
      c.globalAlpha = 1;
      return;
    }
    if (t < T.buy - 1.6) { K.text(t < T.credit ? 'Signed in on two devices.' : 'Up to date.', x + 14, yy + 4, 'left', SOFT, 9); return; }
    K.text('Buy 24K · 1,000 mg · 6,100 EGP', x + 14, yy, 'left', INK, 9.5, 500, w - 28);
    const by = yy + 12, bw = Math.min(140, w - 28), press = flash(T.buyB);
    c.beginPath(); c.roundRect(x + 14, by, bw, 24, 6); c.fillStyle = press ? hexA(AC, .55) : AC; c.fill();
    K.text('Buy', x + 14 + bw / 2, by + 16, 'center', P.bg, 10, 600);
    if (t > T.buy - .4 && t < T.buyB + 1.6) K.text('tapped at the same moment as the phone', x + 24 + bw, by + 16, 'left', WARN, 8.5, 400, w - bw - 40);
    if (t > T.buyB + .4) {
      c.beginPath(); c.roundRect(x + 10, by + 34, w - 20, 40, 7); c.fillStyle = hexA(ERR, .1); c.fill();
      K.label('✗', x + 22, by + 58, 'center', ERR, 11, 500);
      K.text('Not enough balance', x + 34, by + 51, 'left', INK, 9.5, 500, w - 46);
      K.text('Only one of the two buys went through.', x + 34, by + 66, 'left', SOFT, 8.5, 400, w - 46);
    }
  }

  function render() {
    c.fillStyle = P.bg; c.fillRect(0, 0, W, H);
    K.dots(W, H, hexA(INK, .05));
    const y0 = H * .08 + 26, h = Math.max(320, Math.min(H - y0 - H * .08, 540));
    if (span >= 480) {
      const pw = Math.min(250, span * .44), rx = X0 + pw + 14, rw = span - pw - 14, rh = Math.min(176, h * .4);
      phone(X0, y0, pw, h, false);
      reviewer(rx, y0, rw, rh);
      device(rx, y0 + rh + 12, rw, h - rh - 12);
    } else {
      const ph = Math.min(h * .62, 330);
      phone(X0, y0, span, ph, true);
      reviewer(X0, y0 + ph + 12, span, h - ph - 12);
    }
  }

  return {
    resize(w, h, tr) { W = w; H = h; TR = tr; [X0, , span] = region(W, TR); },
    step(dt) { t += dt; },
    render,
    stage: () => STAGE_AT.filter(s => t >= s).length - 1,
    done: () => t > T.end - .1,
    still() { t = T.buyB + 1; render(); },
  };
};
