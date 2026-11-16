// Shared helpers for the canvas scenes.

/** What a scene needs from its canvas. A real <canvas> fits, and so does a test stub. */
export interface SceneCanvas {
  dataset: DOMStringMap
  getContext(id: '2d'): CanvasRenderingContext2D | null
}

/** One animated background. It plays one story: `done()` turns true at its end. */
export interface Scene {
  resize(w: number, h: number, textRight: number): void
  step(dt: number): void
  render(): void
  still(): void
  /** Index of the step chip on the slide that matches what is on screen now. */
  stage(): number
  done(): boolean
}

export type SceneFactory = (cv: SceneCanvas) => Scene

/** Status colours. Same meaning in every scene, and no slide hue sits near them. */
export const OK = '#75df8f', WARN = '#edd55e', ERR = '#fd7273'

/**
 * A slide's colours, read from its canvas. Every slide has the same lightness and chroma; only the hue moves.
 * `accent` marks the subject (me, or the product's key element), `dim` is a quieter step of the same hue,
 * `raise` is a panel one step above `bg`, and `ink` / `soft` are neutrals tinted toward the hue.
 */
export interface Palette { bg: string; raise: string; accent: string; dim: string; ink: string; soft: string }
export function palette(cv: SceneCanvas): Palette {
  const d = cv.dataset
  return {
    bg: d.bg ?? '#000000', raise: d.raise ?? '#202020', accent: d.accent ?? '#ffffff',
    dim: d.dim ?? '#999999', ink: d.ink ?? '#ffffff', soft: d.soft ?? '#cccccc',
  }
}

export const MONO = "'IBM Plex Mono', ui-monospace, monospace"
export const SANS = "'IBM Plex Sans', system-ui, sans-serif"
/** Below this canvas width the art takes the full width. */
export const NARROW = 1100
/** Smallest text a scene draws, so labels stay readable on a laptop. */
export const MIN_PX = 11

export function rng(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
export const hexA = (hex: string, a: number): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`
}
export const ease = (x: number): number => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v))
export const smooth = (a: number, b: number, x: number): number => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k) }

export function ctx2d(cv: SceneCanvas): CanvasRenderingContext2D {
  const c = cv.getContext('2d')
  if (!c) throw new Error('2D canvas is not available')
  return c
}

/** The art area right of the slide text: [left, right, width]. */
export function region(W: number, TR: number): [number, number, number] {
  const X1 = W - (W < NARROW ? 16 : 84)
  const X0 = W < NARROW ? 16 : Math.min(Math.max(TR + 32, W * .42), X1 - 400)
  return [X0, X1, X1 - X0]
}

export type Kit = ReturnType<typeof kit>
type Align = CanvasTextAlign

/** Drawing helpers for the project scenes. */
export function kit(c: CanvasRenderingContext2D, BG: string, SOFT: string, TXT: string) {
  const k = {
    label(text: string, x: number, y: number, align: Align = 'left', col = SOFT, size = 10, weight = 400, maxW = 0) {
      c.font = `${weight} ${Math.max(MIN_PX, size)}px ${MONO}`; c.textAlign = align; c.fillStyle = col; c.fillText(maxW ? k.fit(text, maxW) : text, x, y)
    },
    text(text: string, x: number, y: number, align: Align = 'left', col = TXT, size = 10, weight = 400, maxW = 0) {
      c.font = `${weight} ${Math.max(MIN_PX, size)}px ${SANS}`; c.textAlign = align; c.fillStyle = col; c.fillText(maxW ? k.fit(text, maxW) : text, x, y)
    },
    fit(text: string, maxW: number): string {
      let s = text
      while (c.measureText(s).width > maxW && s.length > 3) s = s.slice(0, -2)
      return s === text ? s : s + '…'
    },
    wrap(text: string, maxW: number): string[] {
      const out: string[] = []; let line = ''
      for (const w of text.split(' ')) {
        const s = line ? line + ' ' + w : w
        if (line && c.measureText(s).width > maxW) { out.push(line); line = w } else line = s
      }
      if (line) out.push(line)
      return out
    },
    pill(text: string, xRight: number, y: number, col: string, filled = false): number {
      c.font = `11px ${MONO}`; const w = c.measureText(text).width + 14
      c.beginPath(); c.roundRect(xRight - w, y - 9, w, 18, 9); c.fillStyle = filled ? hexA(col, .2) : BG; c.fill(); c.strokeStyle = col; c.stroke()
      c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, xRight - w / 2, y + .5); c.textBaseline = 'alphabetic'
      return w
    },
    tabs(names: string[], x: number, y: number, on: number, col: string) {
      names.forEach((n, i) => {
        c.font = `500 11px ${SANS}`; const w = c.measureText(n).width + 24, a = i === on
        c.beginPath(); c.roundRect(x, y - 10, w, 20, 10); c.fillStyle = a ? hexA(col, .2) : BG; c.fill(); c.strokeStyle = a ? col : hexA(col, .3); c.stroke()
        c.beginPath(); c.arc(x + 10, y, 2.5, 0, 7); c.fillStyle = a ? col : hexA(col, .4); c.fill()
        k.text(n, x + 16, y + 3.5, 'left', a ? TXT : SOFT, 10, 500)
        x += w + 6
      })
    },
    win(x: number, y: number, w: number, h: number, title: string, col: string, wbg = BG): number {
      c.beginPath(); c.roundRect(x, y, w, h, 9); c.fillStyle = wbg; c.fill(); c.strokeStyle = hexA(col, .45); c.stroke()
      c.save(); c.beginPath(); c.roundRect(x, y, w, h, 9); c.clip(); c.fillStyle = hexA(col, .08); c.fillRect(x, y, w, 24); c.restore()
      c.strokeStyle = hexA(col, .25); c.beginPath(); c.moveTo(x, y + 24); c.lineTo(x + w, y + 24); c.stroke()
      ;[0, 1, 2].forEach(i => { c.beginPath(); c.arc(x + 12 + i * 9, y + 12, 2.6, 0, 7); c.fillStyle = hexA(col, .45); c.fill() })
      if (title) k.label(title, x + 44, y + 16, 'left', SOFT, 9, 400, w - 56)
      return y + 24
    },
    check(x: number, y: number, col: string, s = 1) {
      c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x - 4 * s, y); c.lineTo(x - 1 * s, y + 3 * s); c.lineTo(x + 4.5 * s, y - 3.5 * s); c.stroke(); c.lineWidth = 1
    },
    lock(x: number, y: number, col: string, s = 1) {
      c.strokeStyle = col; c.lineWidth = 1.4 * s; c.beginPath(); c.arc(x, y - 2 * s, 3.4 * s, Math.PI, 0); c.stroke(); c.lineWidth = 1
      c.fillStyle = col; c.beginPath(); c.roundRect(x - 5 * s, y - 2 * s, 10 * s, 8 * s, 1.5 * s); c.fill()
    },
    dots(W: number, H: number, col: string) {
      c.fillStyle = col
      for (let x = 12; x < W; x += 24) for (let y = 12; y < H; y += 24) c.fillRect(x, y, 1.5, 1.5)
    }
  }
  return k
}
