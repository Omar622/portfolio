import { clamp, ctx2d, ease, hexA, kit, MONO, OK, palette, region, SANS, type SceneFactory } from './kit'

type Turn = [who: 'a' | 'c', text: string, action?: string]
interface Job { n: string; line: number; turns: Turn[]; at: number[]; end: number }
interface Msg { who: 'a' | 'c'; text?: string; action?: string; born: number }
interface Item extends Msg { dots?: boolean; lines: string[]; bw: number; bh: number }

// Agentii, the product: the operator writes the agent's instructions, then tries it in the preview chat.
// Screens and sample lines follow the repo's console and landing page.
export const agentii: SceneFactory = (cv) => {
    const c = ctx2d(cv);
    const P = palette(cv), BG = P.bg, AC = P.accent, INK = P.ink, SOFT = P.soft;
    const K = kit(c, BG, SOFT, INK);
    const INSTR = [
      "You work for Acme. Be short and kind.",
      "Answer from our help center and docs.",
      "You can look up orders.",
      "You can recommend plans. Team is €40 a month.",
      "You can walk new customers through setup.",
      "You can switch plans and move bookings."
    ];
    const JOBS: Job[] = ([
      { n: "Support", line: 2, turns: [["c", "Where is my order?"], ["a", "Order #4821 left our warehouse today. It arrives on Thursday."]] },
      { n: "Sales", line: 3, turns: [["c", "Which plan fits a team of five?"], ["a", "The Team plan. It is €40 a month for up to 10 people. Want a free trial?"]] },
      { n: "Onboarding", line: 4, turns: [["c", "How do I invite my team?"], ["a", "Open Settings, then Members, and press Invite. Want me to send the invites?"], ["c", "Yes, to sara@acme.co"], ["a", "Invite sent to sara@acme.co", "team.invite"]] },
      { n: "Actions", line: 5, turns: [["c", "Can I move my plan to annual?"], ["a", "Yes. Annual is €480 a year, so you save €96. Want me to switch it now?"], ["c", "Yes please"], ["a", "Plan switched to annual", "billing.update_plan"]] }
    ] as Omit<Job, 'at' | 'end'>[]).map(j => ({ ...j, at: [], end: 0 }));
    JOBS.forEach(j => { let tt = .2; j.at = j.turns.map(([who]) => (tt += who === "a" ? 1.6 : 1.3)); j.end = tt + 3; });
    const FULL = INSTR.join("\n"), TYPE = 5.5;
    let W = 0, H = 0, TR = 0, X0 = 0, span = 0, wy = 0, wh = 0;
    let t = 0, job = 0, jt = 0;

    function layout() { [X0, , span] = region(W, TR); wy = H * .08 + 30; wh = Math.max(260, Math.min(H - wy - H * .08, 560)); }
    function step(dt: number) {
      t += dt;
      if (t < TYPE) return;
      jt += dt;
      if (jt >= JOBS[job].end) { jt = 0; job = (job + 1) % JOBS.length; }
    }

    function instructions(x: number, y: number, w: number, h: number) {
      const typing = t < TYPE, typed = typing ? Math.floor(FULL.length * t / TYPE) : FULL.length;
      K.text("Instructions", x + 14, y + 22, "left", INK, 10.5, 600);
      K.text("Who it works for, how it talks, and what it can and cannot do.", x + 14, y + 37, "left", SOFT, 9.5, 400, w - 28);
      const ax = x + 14, ay = y + 48, aw = w - 28, ah = h - 48 - 30;
      c.beginPath(); c.roundRect(ax, ay, aw, ah, 6); c.fillStyle = hexA(INK, .03); c.fill(); c.strokeStyle = typing ? hexA(AC, .8) : hexA(INK, .2); c.stroke();
      const hi = typing ? -1 : JOBS[job].line;
      let yy = ay + 20, cx = ax + 10, cy = yy;
      FULL.slice(0, typed).split("\n").forEach((ln, i) => {
        c.font = `11px ${SANS}`;
        const wrapped = K.wrap(ln, aw - 24);
        if (i === hi) { c.fillStyle = hexA(AC, .13 + .06 * Math.sin(t * 4)); c.fillRect(ax + 4, yy - 13, aw - 8, wrapped.length * 15 + 4); }
        wrapped.forEach(wl => { K.text(wl, ax + 10, yy, "left", i === hi ? AC : INK, 10.5); cx = ax + 10 + c.measureText(wl).width; cy = yy; yy += 15; });
        if (!wrapped.length) { cx = ax + 10; cy = yy; }
        yy += 5;
      });
      if (typing && Math.floor(t * 3) % 2 === 0) { c.fillStyle = AC; c.fillRect(cx + 1, cy - 10, 1.4, 13); }
      K.text(`${typed.toLocaleString("en")} / 4,000 chars`, ax, ay + ah + 17, "left", SOFT, 9);
      K.text(typing ? "Saving…" : "Saved ✓", ax + aw, ay + ah + 17, "right", typing ? SOFT : OK, 9);
    }

    function preview(x: number, y: number, w: number, h: number, split: boolean) {
      if (split) { c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.stroke(); }
      K.text("Preview", x + 14, y + 20, "left", INK, 10.5, 600);
      K.text("Try your agent as a customer would. Nothing is saved.", x + 14, y + 34, "left", SOFT, 9, 400, w - 90);
      K.text("↺ Reset", x + w - 12, y + 20, "right", t >= TYPE && jt < .5 ? AC : SOFT, 9.5);
      c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(x, y + 44); c.lineTo(x + w, y + 44); c.stroke();

      const j = JOBS[job], live = t >= TYPE;
      const msgs: Msg[] = [{ who: "a", text: "Hi, how can I help?", born: -9 }];
      let typingDots = false, draft = "";
      if (live) j.turns.forEach(([who, text, action], k) => {
        const prev = k ? j.at[k - 1] : 0;
        if (jt >= j.at[k]) msgs.push({ who, text, action, born: j.at[k] });
        else if (jt >= prev) {
          if (who === "a" && jt > prev + .25) typingDots = true;
          if (who === "c") draft = text.slice(0, Math.ceil(text.length * clamp((jt - prev) / (j.at[k] - prev - .25), 0, 1)));
        }
      });

      const mx = x + 12, mw = w - 24, my = y + 56, mh = h - 56 - 46, maxB = Math.min(mw * .82, 300);
      c.font = `11px ${SANS}`;
      const items: Item[] = msgs.map(m => {
        const lines = K.wrap(m.text ?? "", maxB - 22);
        let bw = Math.max(...lines.map(l => c.measureText(l).width)) + 20;
        if (m.action) { bw += 16; c.font = `11px ${MONO}`; bw = Math.max(bw, c.measureText(m.action).width + 22); c.font = `11px ${SANS}`; }
        return { ...m, lines, bw, bh: lines.length * 14 + 12 + (m.action ? 14 : 0) };
      });
      if (typingDots) items.push({ who: "a", dots: true, lines: [], bw: 46, bh: 24, born: -9 });
      const total = items.reduce((s, m) => s + m.bh + 8, 0);
      let yy = my + Math.min(0, mh - total);
      c.save(); c.beginPath(); c.rect(x + 1, my - 6, w - 2, mh + 6); c.clip();
      items.forEach(m => {
        const rise = clamp((jt - m.born) / .3, 0, 1), off = (1 - ease(rise)) * 8, cust = m.who === "c";
        const bx = cust ? mx + mw - m.bw : mx, by = yy + off;
        c.globalAlpha = rise;
        c.beginPath(); c.roundRect(bx, by, m.bw, m.bh, 10); c.fillStyle = cust ? hexA(INK, .12) : hexA(AC, .17); c.fill();
        if (m.dots) [0, 1, 2].forEach(i => { c.beginPath(); c.arc(bx + 14 + i * 9, by + 12, 2.4, 0, 7); c.fillStyle = hexA(AC, .35 + .65 * (.5 + .5 * Math.sin(t * 7 - i * 1.1))); c.fill(); });
        else if (m.action) {
          c.beginPath(); c.arc(bx + 15, by + 13, 6, 0, 7); c.fillStyle = hexA(OK, .2); c.fill(); K.check(bx + 15, by + 13, OK, .8);
          K.text(m.lines[0], bx + 27, by + 17, "left", INK, 10, 500);
          K.label(m.action, bx + 10, by + 32, "left", SOFT, 8.5);
        } else m.lines.forEach((l, i) => K.text(l, bx + 10, by + 17 + i * 14, "left", INK, 10));
        c.globalAlpha = 1;
        yy += m.bh + 8;
      });
      c.restore();

      const cy = y + h - 38;
      c.beginPath(); c.roundRect(x + 12, cy, w - 24, 26, 13); c.fillStyle = hexA(INK, .03); c.fill(); c.strokeStyle = draft ? hexA(AC, .7) : hexA(INK, .2); c.stroke();
      K.text(draft || "Message your agent…", x + 26, cy + 17, "left", draft ? INK : SOFT, 10, 400, w - 80);
      c.beginPath(); c.arc(x + w - 25, cy + 13, 9, 0, 7); c.fillStyle = draft ? AC : hexA(INK, .2); c.fill();
      c.strokeStyle = BG; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + w - 25, cy + 17); c.lineTo(x + w - 25, cy + 9); c.moveTo(x + w - 29, cy + 12.5); c.lineTo(x + w - 25, cy + 8.5); c.lineTo(x + w - 21, cy + 12.5); c.stroke(); c.lineWidth = 1;
    }

    function render() {
      c.fillStyle = BG; c.fillRect(0, 0, W, H);
      K.dots(W, H, hexA(INK, .05));
      K.tabs(JOBS.map(j => j.n), X0, wy - 22, t >= TYPE ? job : -1, AC);
      const top = K.win(X0, wy, span, wh, "", INK, P.raise);
      K.text("agentii", X0 + 46, wy + 16, "left", INK, 11, 600);
      if (span > 380) K.text("Acme · demo@agentii.test · Account · Log out", X0 + span - 12, wy + 16, "right", SOFT, 9.5, 400, span - 140);
      K.text("Your agent", X0 + 14, top + 21, "left", INK, 12, 600);
      c.strokeStyle = hexA(INK, .15); c.beginPath(); c.moveTo(X0, top + 32); c.lineTo(X0 + span, top + 32); c.stroke();
      const body = top + 33, bh = wy + wh - body, split = span >= 480, lw = split ? Math.round(span * (span < 600 ? .47 : .52)) : 0;
      if (split) instructions(X0, body, lw, bh);
      preview(X0 + lw, body, span - lw, bh, split);
    }

    return {
      resize(w, h, tr) { W = w; H = h; TR = tr; layout(); }, step, render,
      stage: () => t < TYPE ? 0 : job + 1,
      done: () => job === JOBS.length - 1 && jt > JOBS[job].end - .1,
      still() { t = TYPE; job = 3; jt = JOBS[3].end - .5; render(); }
    };
};
