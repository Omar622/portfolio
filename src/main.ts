import './style.css';
import { SCENES } from './scenes';
import type { Scene } from './scenes/kit';

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T;
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Animation player ----------
// Each scene plays one full story, 1s after its slide is mostly on screen, then stops on its last frame.
// The step chips on the slide follow the scene's stage.
const START_DELAY = 1;
interface Play { wait: number; done: boolean; stage: number | null }
const scenes = new Map<HTMLCanvasElement, Scene>(), play = new Map<HTMLCanvasElement, Play>();
const visible = new Set<Element>(), inFocus = new Set<Element>();
let motionOn = true;
try { motionOn = localStorage.getItem('motion') !== 'off'; } catch { /* storage blocked: keep motion on */ }

const vio = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)), { threshold: .05 });
const fio = new IntersectionObserver(es => es.forEach(e => e.intersectionRatio >= .6 ? inFocus.add(e.target) : inFocus.delete(e.target)), { threshold: [0, .6] });

const slideOf = (cv: HTMLCanvasElement) => cv.closest('.slide') as HTMLElement;

function startScene(cv: HTMLCanvasElement) {
  scenes.set(cv, SCENES[cv.dataset.art!](cv));
  play.set(cv, { wait: START_DELAY, done: false, stage: null });
  const slide = slideOf(cv);
  slide.removeAttribute('data-done');
  $('.replay', slide).hidden = true;
}

function syncSteps(cv: HTMLCanvasElement) {
  const st = play.get(cv)!;
  const idx = reduced() || st.done ? Infinity : st.wait > 0 ? -1 : scenes.get(cv)!.stage();
  if (idx === st.stage) return;
  st.stage = idx;
  $$('.steps span', slideOf(cv)).forEach((el, k) => { el.classList.toggle('on', k === idx); el.classList.toggle('done', k < idx); });
}

function setMotion(on: boolean) {
  motionOn = on;
  try { localStorage.setItem('motion', on ? 'on' : 'off'); } catch { /* storage blocked: the choice lasts this visit */ }
  $$('.art-btn.pause').forEach(b => {
    const l = on ? 'Pause motion' : 'Play motion';
    b.setAttribute('aria-pressed', String(!on)); b.setAttribute('aria-label', l); b.title = l; b.textContent = on ? '❚❚' : '▶';
  });
}

function drawArt(cv: HTMLCanvasElement) {
  // Layout size, not the on-screen rect: during the card zoom the page is drawn scaled down.
  const w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scene = scenes.get(cv);
  if (!scene) return;
  const inner = $('.slide-inner', slideOf(cv)), rect = cv.getBoundingClientRect(), k = rect.width / w;
  const textRight = (inner.getBoundingClientRect().right - rect.left) / k - parseFloat(getComputedStyle(inner).paddingRight);
  scene.resize(w, h, textRight);
  reduced() ? scene.still() : scene.render();
  syncSteps(cv);
}

$$<HTMLCanvasElement>('canvas.art').forEach(cv => { if (SCENES[cv.dataset.art!]) { startScene(cv); vio.observe(cv); fio.observe(cv); } });
$$('.art-btn.pause').forEach(b => b.addEventListener('click', () => setMotion(!motionOn)));
$$('.art-btn.replay').forEach(b => b.addEventListener('click', () => {
  const cv = $<HTMLCanvasElement>('canvas.art', b.closest('.slide')!);
  startScene(cv); play.get(cv)!.wait = .3; drawArt(cv); syncSteps(cv);
  if (!motionOn) setMotion(true);
}));
setMotion(motionOn);

const ro = new ResizeObserver(es => es.forEach(e => drawArt(e.target as HTMLCanvasElement)));
$$<HTMLCanvasElement>('canvas.art').forEach(cv => ro.observe(cv));

let lastFrame = performance.now();
function frame(now: number) {
  const dt = Math.min(.05, (now - lastFrame) / 1000); lastFrame = now;
  if (motionOn && !reduced()) visible.forEach(el => {
    const cv = el as HTMLCanvasElement, s = scenes.get(cv), st = play.get(cv);
    if (!s || !st || !cv.width || st.done || !inFocus.has(cv)) return;
    if (st.wait > 0) { st.wait -= dt; syncSteps(cv); return; }
    s.step(dt); s.render();
    if (s.done()) { st.done = true; const slide = slideOf(cv); slide.dataset.done = ''; $('.replay', slide).hidden = false; }
    syncSteps(cv);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Routing and zoom ----------
type View = 'me' | 'experience' | 'projects';
type Target = View | 'paper';
interface Route { view: Target; slide?: string }
const VIEWS: View[] = ['me', 'experience', 'projects'];
const overview = $('#overview'), paper = $('#paper'), shell = $('#shell'), rail = $('#rail');
let current: Target = 'paper', busy = false, pending: Route | null = null;
// A camera move: slow start, fast middle, long soft landing.
const ZOOM: KeyframeAnimationOptions = { duration: 1100, easing: 'cubic-bezier(.7,0,.16,1)', fill: 'both' };
// Going back is a return trip, so it is quicker.
const ZOOM_OUT: KeyframeAnimationOptions = { ...ZOOM, duration: 600 };

/** The word on the card that a page grows out of. */
function cardAnchor(view: View, slide?: string): HTMLElement {
  const node = $(`.node[data-go="${view}"]`);
  return (slide && $(`[data-slide="${slide}"] .za, .za[data-slide="${slide}"]`, node)) || $('.za', node);
}

/** The heading that word becomes: the slide's title, or the Me page heading. */
function pageTitle(view: View, slide?: string): HTMLElement {
  if (view === 'me') return $('#me-title');
  return (slide && $(`#s-${slide} h2`)) || $(`#view-${view} .slide h2`);
}

/** The slide that fills the view now. */
function currentSlide(view: View): string | undefined {
  if (view === 'me') return undefined;
  const top = $('#view-' + view).getBoundingClientRect().top;
  const slides = $$('.slide', $('#view-' + view));
  const near = slides.reduce((a, b) => Math.abs(b.getBoundingClientRect().top - top) < Math.abs(a.getBoundingClientRect().top - top) ? b : a);
  return near?.id.slice(2);
}

/** Box of the first line of text in `el`, so a wrapped heading or badge does not skew the match. */
function firstLine(el: Element): DOMRect {
  const text = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim());
  const range = document.createRange();
  range.selectNodeContents(text ?? el);
  return range.getClientRects()[0] ?? el.getBoundingClientRect();
}

// The zoom moves two layers on one path. The paper scales up around a word on the card. The page starts
// scaled down so its heading sits exactly on that word, at the same text size. Both scales are linear in
// time with a fixed ratio, so the word and the heading stay locked together while one grows into the other.
function camera(anchor: HTMLElement, title: HTMLElement) {
  const a = firstLine(anchor), t = firstLine(title), pr = paper.getBoundingClientRect();
  const k = parseFloat(getComputedStyle(anchor).fontSize) / parseFloat(getComputedStyle(title).fontSize);
  const ax = a.left, ay = a.top + a.height / 2, tx = t.left, ty = t.top + t.height / 2;
  return {
    paper: `translate(${tx - pr.left - (ax - pr.left) / k}px, ${ty - pr.top - (ay - pr.top) / k}px) scale(${1 / k})`,
    page: `translate(${ax - k * tx}px, ${ay - k * ty}px) scale(${k})`,
  };
}

// The heading shows before the rest of the page, so a copy of it rides on its own layer with the page's motion.
const LOOK = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-wrap', 'white-space',
  'display', 'vertical-align', 'padding', 'border-width', 'border-style', 'border-color', 'border-radius', 'background-color'];
function copyLook(src: Element, dst: HTMLElement) {
  const cs = getComputedStyle(src);
  LOOK.forEach(p => dst.style.setProperty(p, cs.getPropertyValue(p)));
  [...src.children].forEach((c, i) => copyLook(c, dst.children[i] as HTMLElement));
}
function liftTitle(title: HTMLElement): HTMLElement {
  const r = title.getBoundingClientRect(), copy = title.cloneNode(true) as HTMLElement, layer = document.createElement('div');
  copy.removeAttribute('id'); copy.removeAttribute('tabindex');
  copyLook(title, copy);
  Object.assign(copy.style, { position: 'absolute', margin: '0', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` });
  layer.className = 'zoom-title'; layer.append(copy); document.body.append(layer);
  return layer;
}

function settle(anims: Animation[], lift: HTMLElement) {
  anims.forEach(a => a.cancel()); lift.remove();
  shell.classList.remove('opening'); overview.classList.remove('zooming');
  paper.style.transformOrigin = '';
}

function scrollToSlide(view: HTMLElement, slide?: string) {
  const s = slide ? $(`#s-${slide}`, view) : null;
  view.scrollTop = s ? s.getBoundingClientRect().top - view.getBoundingClientRect().top + view.scrollTop : 0;
  paintBar(s ?? $('.slide', view));
  $('h2[tabindex]', s ?? view)?.focus({ preventScroll: true });
}

function showView(name: View, slide?: string) {
  VIEWS.forEach(v => { $('#view-' + v).hidden = v !== name; });
  $$('.tab').forEach(t => t.toggleAttribute('aria-current', false));
  $(`.tab[data-tab="${name}"]`)?.setAttribute('aria-current', 'page');
  buildRail(name, slide);
  const view = $('#view-' + name);
  $$<HTMLCanvasElement>('canvas.art', view).forEach(drawArt);
  scrollToSlide(view, slide);
}

async function zoomIn(view: View, slide?: string) {
  shell.classList.add('opening'); shell.hidden = false; showView(view, slide);
  if (reduced()) { overview.hidden = true; shell.classList.remove('opening'); return; }
  const anchor = cardAnchor(view, slide), title = pageTitle(view, slide);
  const z = camera(anchor, title), lift = liftTitle(title);
  overview.classList.add('zooming'); paper.style.transformOrigin = '0 0';
  const anims = [
    paper.animate([{ transform: 'none' }, { transform: z.paper }], ZOOM),
    lift.animate([{ transform: z.page, opacity: 0 }, { opacity: 1, offset: .14 }, { transform: 'none', opacity: 1 }], ZOOM),
    anchor.animate([{ opacity: 1 }, { opacity: 0, offset: .14 }, { opacity: 0 }], ZOOM),
    shell.animate([{ transform: z.page, opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1, offset: .78 }, { transform: 'none', opacity: 1 }], ZOOM),
  ];
  await anims[3].finished;
  overview.hidden = true;
  settle(anims, lift);
}

async function zoomOut(view: View) {
  const slide = currentSlide(view), anchor = cardAnchor(view, slide), node = anchor.closest<HTMLElement>('.node')!;
  // The card itself is not focusable; focus goes back to the row link, or the card's "Zoom in" link.
  const back = anchor.closest<HTMLElement>('a') ?? $('.open a', node);
  if (reduced()) { shell.hidden = true; overview.hidden = false; back.focus({ preventScroll: true }); return; }
  shell.classList.add('opening'); overview.hidden = false;
  node.scrollIntoView({ block: 'nearest' });
  const title = pageTitle(view, slide), z = camera(anchor, title), lift = liftTitle(title);
  overview.classList.add('zooming'); paper.style.transformOrigin = '0 0';
  const anims = [
    paper.animate([{ transform: z.paper }, { transform: 'none' }], ZOOM_OUT),
    lift.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: .84 }, { transform: z.page, opacity: 0 }], ZOOM_OUT),
    anchor.animate([{ opacity: 0 }, { opacity: 0, offset: .84 }, { opacity: 1 }], ZOOM_OUT),
    shell.animate([{ transform: 'none', opacity: 1 }, { opacity: 1, offset: .15 }, { opacity: 0, offset: .4 }, { transform: z.page, opacity: 0 }], ZOOM_OUT),
  ];
  await anims[3].finished;
  shell.hidden = true;
  settle(anims, lift);
  back.focus({ preventScroll: true });
}

async function swap(name: View, slide?: string) {
  const view = $('#view-' + name);
  showView(name, slide);
  if (!reduced()) await view.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' }).finished;
}

async function go(r: Route) {
  if (busy) { pending = r; return; }
  busy = true;
  try {
    if (r.view === current) { if (current !== 'paper' && r.slide) scrollToSlide($('#view-' + current), r.slide); }
    else if (current === 'paper') await zoomIn(r.view as View, r.slide);
    else if (r.view === 'paper') await zoomOut(current);
    else await swap(r.view, r.slide);
    current = r.view;
  } finally {
    busy = false;
    const next = pending; pending = null;
    if (next) go(next);
  }
}

// #experience opens the first slide; #experience/luciq opens that slide.
function fromHash(): Route {
  const [v, slide] = location.hash.slice(1).split('/');
  return (VIEWS as string[]).includes(v) ? { view: v as View, slide: slide || undefined } : { view: 'paper' };
}
addEventListener('hashchange', () => go(fromHash()));
$$('.node').forEach(n => n.addEventListener('click', e => {
  const row = (e.target as Element).closest<HTMLElement>('[data-slide]');
  location.hash = n.dataset.go! + (row ? '/' + row.dataset.slide : '');
}));
$('#back').addEventListener('click', () => { location.hash = 'paper'; });
addEventListener('keydown', e => { if (e.key === 'Escape' && current !== 'paper') location.hash = 'paper'; });

// ---------- Slide rail ----------
// On a slide the header takes that slide's colours, so it reads as part of the page, not a frame around it.
// It re-maps the landing tokens the header is built from. The Me page keeps the landing colours.
const bar = $('.topbar'), counter = $('#counter');
const BAR_TOKENS: [string, string][] = [['--paper', '--s-bg'], ['--surface', '--s-raise'], ['--grid', '--s-raise'], ['--grid-major', '--s-raise'],
  ['--ink', '--s-ink'], ['--ink-soft', '--s-soft'], ['--line', '--s-soft'], ['--accent', '--s-accent'], ['--accent-ink', '--s-bg']];
function paintBar(slide: HTMLElement | null) {
  BAR_TOKENS.forEach(([to, from]) => slide ? bar.style.setProperty(to, slide.style.getPropertyValue(from)) : bar.style.removeProperty(to));
  slide ? bar.style.setProperty('--bar-line', `color-mix(in srgb, ${slide.style.getPropertyValue('--s-ink')} 18%, transparent)`) : bar.style.removeProperty('--bar-line');
}

let railIO: IntersectionObserver | null = null;
function buildRail(name: View, slide?: string) {
  railIO?.disconnect();
  const view = $('#view-' + name), slides = $$('.slide', view);
  rail.hidden = !slides.length;
  rail.replaceChildren(...slides.map((s, i) => {
    const li = document.createElement('li'), b = document.createElement('button'), dot = document.createElement('span'), txt = document.createElement('span');
    b.type = 'button'; b.setAttribute('aria-label', s.dataset.rail!);
    dot.className = 'dot'; txt.className = 'txt'; txt.textContent = s.dataset.rail!;
    b.append(dot, txt); li.append(b);
    b.addEventListener('click', () => {
      slides[i].scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      $('h2', slides[i])?.focus({ preventScroll: true });
    });
    return li;
  }));
  const btns = $$('button', rail);
  counter.hidden = !slides.length;
  const mark = (i: number) => {
    btns.forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    paintBar(slides[i] ?? null);
    counter.textContent = `${i + 1} / ${slides.length}`;
  };
  mark(Math.max(0, slides.findIndex(s => s.id === `s-${slide}`)));
  railIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) mark(slides.indexOf(e.target as HTMLElement)); }), { root: view, threshold: .55 });
  slides.forEach(s => railIO!.observe(s));
}

// ---------- Copy email ----------
// The email address and the "Email me" links copy the address on click. The links still open the mail app,
// so readers without one still get the address.
$$('.copy-email').forEach(b => b.addEventListener('click', async () => {
  const label = b.textContent;
  try { await navigator.clipboard.writeText(b.dataset.email!); b.textContent = b.matches('a') ? 'Address copied' : 'Copied'; }
  catch { b.textContent = b.dataset.email!; }
  setTimeout(() => { b.textContent = label; }, 1800);
}));

// ---------- Start ----------
const start = fromHash();
if (start.view !== 'paper') { overview.hidden = true; shell.hidden = false; showView(start.view, start.slide); current = start.view; }
