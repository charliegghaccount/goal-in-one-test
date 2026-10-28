import { announcementFor, completionTitle } from './celebration';
import { artworkEnabled, setArtworkEnabled } from './background';
import { LevelEditor } from './editor/ui';
import { EditorSession } from './editor/model';
import { ExplorationControls } from './camera-controls';
import { developerPanel } from './developer';
import { loadPhysics, type PhysicsConfig } from './physics';
let activePhysics = loadPhysics();
const developerMode = new URLSearchParams(location.search).has('dev');
const ballArtUrl = new URL('./assets/football.svg', import.meta.url).href;
import './style.css';
import { arenaPolygon, segments, WALL_WIDTH, type Level, type Point } from './levels';
import { FootballSimulation, MAX_PULL, rating, STEP } from './simulation';
import { Renderer, viewBounds } from './render';
import { Audio } from './audio';
import { readProgress, recordLevelBest, bestFor, saveProgress } from './progress';
import { campaign } from './campaign';
import {
  chapterSlots,
  chapterStars,
  chapterCount,
  continueLevel,
  CHAPTER_SIZE,
} from './ui-campaign';
import { menuArtwork } from './ui-art';
let levels = campaign().playable();
const best = (l: Level) => bestFor(progress, l);
const app = document.querySelector<HTMLDivElement>('#app')!;
const audio = new Audio(),
  progress = readProgress();
audio.enabled = progress.sound;
let editorSession: EditorSession | null = null,
  editorUI: LevelEditor | null = null,
  draftTest: Level | null = null,
  exploration: ExplorationControls | null = null;
const escapeText = (v: string) =>
  v.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
let screen: 'home' | 'levels' | 'game' | 'editor' = 'home',
  sim: FootballSimulation,
  renderer: Renderer | null = null;
let pull: Point | null = null,
  dragging = false,
  activePointer: number | null = null,
  aimOrigin: Point | null = null,
  aimScale = 1,
  resultShown = false;
let roundSerial = 0;
let last = performance.now(),
  accumulator = 0,
  currentId = 1,
  levelPage = 0,
  precise = false,
  aimAngle = 35,
  aimPower = 75,
  storageOK = saveProgress(progress);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const paths: Record<string, string> = {
  ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4.7 3.4-1.8 5.5H9.1l-1.8-5.5zM12 3v4M3.5 9l3.8 1.4M6.5 19l2.6-3.1m8.4 3.1-2.6-3.1M20.5 9l-3.8 1.4"/>',
  net: '<path d="M3 20V5h18v15zM3 10h18M3 15h18M9 5v15m6-15v15"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  sound: '<path d="m11 4-5 4H3v8h3l5 4zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-5 4H3v8h3l5 4zm5 5 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5.7-1.5 1.5-1.5 2M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  star: '<path d="m12 2 3 6.3 7 .9-5.1 4.9 1.3 6.9-6.2-3.3L5.8 21l1.3-6.9L2 9.2l7-.9z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  aim: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  zoom: '<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  settings:
    '<path d="m9 3-1 3-3 1v4l-2 1 2 3v3l3 1 1 2h5l1-2 3-1v-3l2-3-2-1V7l-3-1-1-3z"/><circle cx="11.5" cy="12" r="3"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7"/>',
};
let iconSerial = 0;
function icon(name: string, cls = '') {
  const id = `gold-${iconSerial++}`;
  const gold = name === 'star' && cls.includes('earned');
  return `<svg class="icon ${cls}" data-icon="${name}" viewBox="0 0 24 24" fill="${name === 'star' ? (gold ? `url(#${id})` : '#493627') : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${gold ? `<defs><linearGradient id="${id}" x2="0.25" y2="1"><stop stop-color="#fff8a5"/><stop offset=".4" stop-color="#ffe34b"/><stop offset=".45" stop-color="#ffd023"/><stop offset="1" stop-color="#f39a0b"/></linearGradient></defs>` : ''}${paths[name] || paths.ball}${gold ? '<path d="m12 3-3 6-6 1 5 4-2 6 6-4V3" fill="#fffbd1" stroke="none" opacity=".32"/>' : ''}</svg>`;
}
function stars(n: number) {
  return `<span class="stars" aria-label="${n} out of 3 stars">${[1, 2, 3].map((i) => icon('star', i <= n ? 'earned' : '')).join('')}</span>`;
}
function button(action: string, label: string, i: string, cls = 'icon-button') {
  return `<button type="button" data-action="${action}" class="${cls}" title="${label}" aria-label="${label}">${icon(i)}</button>`;
}
function header() {
  if (screen === 'game') return '';
  return `<header class="screen-utilities" aria-label="Game controls">${button('levels', 'LEVELS', 'grid')}${button('sound', progress.sound ? 'Mute sound' : 'Enable sound', progress.sound ? 'sound' : 'mute', 'icon-button sound-button')}${button('settings', 'Settings', 'settings')}${button('help', 'How to play', 'help')}</header>`;
}
function markScreen() {
  app.dataset.screen = screen;
}
function persist() {
  storageOK = saveProgress(progress);
}
function cancelDrag() {
  dragging = false;
  activePointer = null;
  pull = null;
  aimOrigin = null;
}
function cleanup() {
  cancelDrag();
  audio.stopVoice();
  exploration?.destroy();
  exploration = null;
  editorUI?.destroy();
  editorUI = null;
  renderer = null;
  sim?.destroy();
  document.querySelector('.modal-backdrop')?.remove();
  accumulator = 0;
}
function totalStars() {
  return levels.reduce((s, l) => s + (best(l) ? rating(best(l)!, l) : 0), 0);
}
function home() {
  cleanup();
  screen = 'home';
  markScreen();
  levels = campaign().playable();
  const completed = levels.filter((l) => best(l)).length,
    next = continueLevel(levels, progress);
  app.innerHTML = `${header()}<main class="home park-home"><canvas class="menu-art" aria-hidden="true"></canvas><section class="hero-copy"><h1 class="wood-logo grass-trim" aria-label="Goal In One"><span class="logo-goal">G<img src="${ballArtUrl}" alt=""/>AL</span><span class="logo-in-one">IN ONE</span></h1><div class="hero-actions"><button class="primary play-button grass-trim" data-action="play" data-id="${next ?? 1}" ${next === null ? 'disabled' : ''}>${icon('play')} PLAY</button><button class="secondary" data-action="levels">${icon('grid')} LEVEL SELECT</button><button class="secondary" data-action="settings">${icon('settings')} SETTINGS</button></div><p class="home-progress">${completed ? `${completed} / ${levels.length} GOALS · ${totalStars()} STARS` : 'DRAG BACK. LET GO. GOAL.'}</p></section></main>`;
  menuArtwork(document.querySelector('.menu-art')!);
  bind();
}
function levelSelect() {
  cleanup();
  screen = 'levels';
  markScreen();
  levels = campaign().playable();
  levelPage = Math.max(0, Math.min(levelPage, chapterCount(levels) - 1));
  const next = continueLevel(levels, progress);
  app.innerHTML = `${header()}<main class="select-page"><div class="chapter-heading">${button('home', 'Goal In One home', 'back')}<div class="chapter-sign wood-panel grass-trim"><h1>GRASS PARKS</h1><p>CHAPTER ${levelPage + 1} <span>· ${levelPage * 25 + 1}–${levelPage * 25 + 25}</span></p></div><nav class="chapter-navigation" aria-label="Chapter navigation"><button class="icon-button" data-action="previous-page" aria-label="Previous chapter" ${levelPage === 0 ? 'disabled' : ''}>${icon('back')}</button><div class="chapter-total wood-pill" aria-label="Chapter stars"><strong>${chapterStars(levels, progress, levelPage)}</strong><span>/ 75</span>${icon('star', 'earned')}</div><button class="icon-button" data-action="next-page" aria-label="Next chapter" ${levelPage + 1 >= chapterCount(levels) ? 'disabled' : ''}>${icon('arrow')}</button></nav></div><div class="level-grid" aria-label="Chapter ${levelPage + 1} levels">${chapterSlots(
    levels,
    levelPage,
  )
    .map(({ number, level: l, longHole }) => {
      const done = l ? best(l) : undefined,
        earned = l && done ? rating(done, l) : 0;
      return `<button class="level-card ${!l ? 'level-locked' : done ? 'level-done' : 'level-open'} ${number === next ? 'level-current' : ''} ${longHole ? 'long-hole' : ''}" ${l ? `data-action="play" data-id="${l.id}"` : 'disabled'} aria-label="${l ? `Play level ${number}: ${escapeText(l.name)}, unlimited kicks, par ${l.par}` : `Level ${number} locked: coming soon`}"><span class="level-number">${number}</span>${stars(earned)}${!l ? `<span class="level-lock">${icon('lock')}</span>` : ''}${done ? '<span class="completed-mark sr-only">Completed</span>' : ''}${longHole ? '<span class="long-hole-label">LONG HOLE</span>' : ''}</button>`;
    })
    .join(
      '',
    )}</div><p class="selection-note">${levelPage * 25 >= levels.length ? 'New arenas coming soon.' : 'All existing arenas remain open.'} <span>Stars save on this browser.${!storageOK ? ' Storage unavailable: this session only.' : ''}</span></p></main>`;
  bind();
}
function openEditor() {
  if (!developerMode) return;
  cleanup();
  screen = 'editor';
  markScreen();
  draftTest = null;
  editorSession ??= new EditorSession();
  editorUI = new LevelEditor(app, editorSession, (level) => play(1, level), home, activePhysics);
}
function syncCameraControls() {
  const camera = renderer?.camera;
  if (!camera) return;
  const overview = document.querySelector('[data-action="overview"]');
  if (overview) {
    overview.setAttribute(
      'aria-label',
      camera.overview ? 'Return to play' : 'Arena overview (pauses play)',
    );
    overview.setAttribute('aria-pressed', String(camera.overview));
  }
  const explore = document.querySelector('[data-action="explore"]');
  explore?.setAttribute('aria-pressed', String(!!exploration?.explore));
  if (explore)
    explore.setAttribute(
      'title',
      exploration?.explore ? 'Kick mode (stop panning)' : 'Explore / pan camera',
    );
  const back = document.querySelector<HTMLElement>('[data-action="return-ball"]');
  if (back) back.hidden = !camera.manual && !camera.returning;
  renderer!.canvas.dataset.exploring = String(!!exploration?.explore);
  renderer!.canvas.style.cursor = exploration?.explore ? 'grab' : 'crosshair';
}
function play(id: number, draft?: Level) {
  if (!draft && !levels.length) {
    levelSelect();
    return;
  }
  cleanup();
  screen = 'game';
  markScreen();
  draftTest = draft ? structuredClone(draft) : null;
  currentId = Math.max(1, Math.min(levels.length, id));
  if (!draft) levelPage = Math.floor((currentId - 1) / CHAPTER_SIZE);
  resultShown = false;
  roundSerial++;
  precise = false;
  sim = new FootballSimulation(draftTest ?? levels[currentId - 1], activePhysics);
  const l = sim.level;
  app.innerHTML = `<main class="game-page"><div class="game-heading"><div class="course-title wood-pill">${button('levels', 'LEVELS', 'back', 'back-button')}<div class="hud-level">LEVEL <strong>${l.id}</strong></div><h1 class="sr-only">${escapeText(l.name)}</h1><span class="eyebrow sr-only">${draftTest ? 'TEST MODE · DRAFT · SCORES NOT SAVED' : 'FOOTBALL PHYSICS'}</span></div><div class="round-stats"><div class="hud-scoreboard wood-pill"><span>SHOTS: <b id="shots" aria-live="polite">0</b></span><span>PAR: <strong>${l.par}</strong></span></div><div class="hud-actions">${button('sound', progress.sound ? 'Mute sound' : 'Enable sound', progress.sound ? 'sound' : 'mute', 'icon-button sound-button')}${button('restart', 'Retry level (R)', 'restart')}${button('pause', 'Pause game (P)', 'pause')}</div></div></div><div class="game-stage"><canvas id="scene" tabindex="0" aria-label="Football puzzle. Drag backwards anywhere and release to kick into the net, even while moving." aria-describedby="level-tip"></canvas><span id="status" class="sr-only" aria-live="polite">YOUR KICK. YOUR ANGLE.</span><div class="stage-bottomline"><span id="power-label">DRAG ANYWHERE TO KICK</span></div></div><div class="game-underbar"><p id="level-tip">${draftTest ? 'TEST MODE · ' : ''}${escapeText(l.tip)}</p><nav class="camera-dock" aria-label="Camera and game tools"><details class="camera-tools"><summary aria-label="Camera tools" title="Camera tools">${icon('zoom')}</summary><div class="camera-popover wood-panel">${button('overview', 'Arena overview (pauses play)', 'zoom')}${button('explore', 'Explore / pan camera', 'mouse', 'icon-button camera-control')}<button class="icon-button camera-control" data-action="return-ball" aria-label="Return to Ball" hidden>◎</button>${button('zoom-out', 'Zoom out', 'minus', 'icon-button camera-control')}${button('zoom-in', 'Zoom in', 'plus', 'icon-button camera-control')}${button('precise', 'Precise aim', 'aim', 'icon-button precise-toggle')}${button('help', 'Show controls', 'help')}</div></details>${button('settings', 'Settings', 'settings')}${draftTest ? '<button class="secondary return-editor" data-action="editor">Return to editor</button>' : ''}</nav></div><div id="precise-controls" class="precise-controls wood-panel" hidden><label>Angle <input type="range" min="-30" max="210" value="35" id="angle"/><output id="angle-value">35°</output></label><label>Power <input type="range" min="5" max="100" value="75" id="power"/><output id="power-value">75%</output></label><button class="primary small" data-action="shoot" id="shoot-button">KICK ${icon('arrow')}</button></div><div class="game-footer sr-only"><div class="star-targets">3 STARS ≤ ${l.starShots[0]} KICKS · 2 STARS ≤ ${l.starShots[1]} · UNLIMITED KICKS</div></div></main>`;
  // Keep tools in the compact HUD, leaving the full remaining viewport to the camera.
  const dock = document.querySelector('.camera-dock')!;
  document.querySelector('.hud-actions')!.append(dock);
  dock.querySelector('.return-editor')?.remove();
  document.querySelector('.game-underbar')!.classList.add('sr-only');
  renderer = new Renderer(document.querySelector('#scene')!);
  if (l.camera) document.querySelector('.game-page')!.classList.add('vnext-game');
  if (draftTest) {
    document.querySelector('.game-page')!.classList.add('draft-test');
    const back = document.querySelector<HTMLButtonElement>('.back-button')!;
    back.dataset.action = 'editor';
    back.setAttribute('aria-label', 'Return to editor');
  }
  const bounds =
    l.camera && l.camera.mode !== 'fixed'
      ? { w: l.camera.viewWidth, h: l.camera.viewHeight }
      : viewBounds(l);
  renderer.canvas.style.aspectRatio = String(bounds.w / bounds.h);
  bind();
  exploration = new ExplorationControls(renderer, cancelDrag, syncCameraControls);
  bindCanvas();
  syncCameraControls();
  syncAim();
  document.querySelector<HTMLInputElement>('#angle')!.addEventListener('input', (e) => {
    aimAngle = +(e.target as HTMLInputElement).value;
    syncAim();
  });
  document.querySelector<HTMLInputElement>('#power')!.addEventListener('input', (e) => {
    aimPower = +(e.target as HTMLInputElement).value;
    syncAim();
  });
}
function getAim(): Point {
  const a = (aimAngle * Math.PI) / 180;
  return {
    x: (-Math.cos(a) * MAX_PULL * aimPower) / 100,
    y: (Math.sin(a) * MAX_PULL * aimPower) / 100,
  };
}
function syncAim() {
  for (const [id, v] of [
    ['angle', aimAngle],
    ['power', aimPower],
  ] as const) {
    const el = document.querySelector<HTMLInputElement>('#' + id),
      out = document.querySelector('#' + id + '-value');
    if (el) el.value = String(v);
    if (out) out.textContent = String(v) + (id === 'angle' ? '°' : '%');
  }
}
function kick(p: Point) {
  return renderer?.camera.overview || exploration?.explore ? false : sim.shoot(p);
}
function bindCanvas() {
  const canvas = renderer!.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (
      e.button !== 0 ||
      !sim.canKick ||
      renderer!.camera.overview ||
      document.querySelector('.modal-backdrop')
    )
      return;
    e.preventDefault();
    document.querySelector<HTMLDetailsElement>('.camera-tools')?.removeAttribute('open');
    audio.unlock();
    canvas.focus({ preventScroll: true });
    dragging = true;
    activePointer = e.pointerId;
    aimOrigin = { x: e.clientX, y: e.clientY };
    aimScale = renderer!.scale / renderer!.camera.userZoom;
    pull = { x: 0, y: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== activePointer || !aimOrigin) return;
    // Screen-space displacement keeps a stationary finger's power steady while the world scrolls.
    pull = { x: (e.clientX - aimOrigin.x) / aimScale, y: (e.clientY - aimOrigin.y) / aimScale };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging || e.pointerId !== activePointer) return;
    const shot = pull;
    cancelDrag();
    if (shot) kick(shot);
  });
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
}
function bind() {
  app
    .querySelectorAll<HTMLButtonElement>('[data-action]')
    .forEach((el) => el.addEventListener('click', () => action(el.dataset.action!, el)));
}
function action(a: string, el?: HTMLButtonElement) {
  audio.unlock();
  audio.play('ui');
  if (a === 'next-page') {
    levelPage++;
    levelSelect();
  }
  if (a === 'previous-page') {
    levelPage--;
    levelSelect();
  }
  if (a === 'home') home();
  if (a === 'levels') {
    if (draftTest && screen === 'game') openEditor();
    else levelSelect();
  }
  if (a === 'editor') openEditor();
  if (a === 'explore') exploration?.toggle();
  if (a === 'return-ball') exploration?.returnToBall();
  if (a === 'zoom-in') exploration?.zoom(1.2);
  if (a === 'zoom-out') exploration?.zoom(1 / 1.2);
  if (a === 'play') play(Number(el?.dataset.id));
  if (a === 'restart') play(currentId, draftTest ?? undefined);
  if (a === 'next') play(currentId + 1);
  if (a === 'sound') {
    progress.sound = !progress.sound;
    audio.enabled = progress.sound;
    if (progress.sound) audio.unlock();
    persist();
    app.querySelectorAll('.sound-button').forEach((b) => {
      b.innerHTML = icon(progress.sound ? 'sound' : 'mute');
      b.setAttribute('aria-label', progress.sound ? 'Mute sound' : 'Enable sound');
      b.setAttribute('title', progress.sound ? 'Mute sound' : 'Enable sound');
    });
  }
  if (a === 'help') help();
  if (a === 'background') {
    setArtworkEnabled(!artworkEnabled());
    document.querySelector('.modal-backdrop')?.remove();
    settings();
  }
  if (a === 'settings') settings();
  if (a === 'developer') {
    document.querySelector('.modal-backdrop')?.remove();
    developerPanel(
      activePhysics,
      (c) => {
        activePhysics = c;
        sim?.updateConfig(c);
      },
      play,
      () => {
        levelPage = 0;
        levelSelect();
      },
    );
  }
  if (a === 'pause') pause();
  if (a === 'overview' && renderer) {
    cancelDrag();
    renderer.camera.setOverview(!renderer.camera.overview);
    accumulator = 0;
    if (el) {
      el.setAttribute(
        'aria-label',
        renderer.camera.overview ? 'Return to play' : 'Arena overview (pauses play)',
      );
      el.setAttribute('aria-pressed', String(renderer.camera.overview));
    }
  }
  if (a === 'precise') {
    precise = !precise;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = !precise;
    el?.setAttribute('aria-expanded', String(precise));
  }
  if (a === 'shoot') {
    cancelDrag();
    kick(getAim());
  }
}
function modal(content: string, label: string, closable = false, cls = '') {
  cancelDrag();
  accumulator = 0;
  const previous = document.activeElement as HTMLElement | null,
    overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.innerHTML = `<section class="modal ${cls}" role="dialog" aria-modal="true" aria-label="${label}">${content}</section>`;
  app.append(overlay);
  const close = () => {
    overlay.remove();
    accumulator = 0;
    last = performance.now();
    previous?.focus();
  };
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  overlay
    .querySelectorAll<HTMLButtonElement>('[data-action]')
    .forEach((b) => b.addEventListener('click', () => action(b.dataset.action!, b)));
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && closable) {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab') {
      const els = [...overlay.querySelectorAll<HTMLButtonElement>('button')],
        first = els[0],
        end = els.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        end?.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  overlay.querySelector('button')?.focus();
  return overlay;
}
function help() {
  if (document.querySelector('.modal-backdrop')) return;
  modal(
    `<button class="modal-close icon-button" data-close aria-label="Close instructions">${icon('close')}</button><div class="modal-emblem">${icon('ball')}</div><div class="eyebrow">THE BEAUTIFUL GAME. A DIFFERENT ANGLE.</div><h2>FIND THE NET.</h2><p>Drag anywhere in the arena to set direction and power. Release to add a kick, at rest or in mid-air.</p><div class="help-rows"><p><strong>Aim & cancel</strong><span>Pull farther for more power. Return to the ball’s dead zone or press Escape to cancel.</span></p><p><strong>Kick any time</strong><span>Drag anywhere in the arena, even while the ball moves. Each kick adds to its existing momentum.</span></p><p><strong>Score properly</strong><span>The whole ball must cross the open left side of the net. Hitting its back or crossbar alone is not a goal.</span></p><p><strong>Unlimited kicks</strong><span>Par is a score target. You can always keep playing. The red strip resets position and keeps every shot already taken.</span></p><p><strong>Keyboard</strong><span>↑ ↓ angle · ← → power · Space kick<br>R retry · P pause · L levels<br>Use ✥ Explore to drag the camera without kicking, ◎ Return to Ball to follow again, + / − or the mouse wheel to zoom, and the map button for an overview.</span></p></div><button class="primary" data-close>LET’S KICK IT ${icon('arrow')}</button>`,
    'How to play',
    true,
  );
}
function settings() {
  modal(
    `<button class="modal-close icon-button" data-close aria-label="Close settings">${icon('close')}</button><div class="modal-emblem">${icon('aim')}</div><h2>YOUR GAME.</h2><p>Grass arenas · mouse, touch or keyboard.<br>Unlimited kicks. Correct your shot in mid-air.</p><div class="completion-actions"><button class="secondary sound-button" data-action="sound">${icon(progress.sound ? 'sound' : 'mute')}</button><p>Sound preference saves on this browser.</p>${developerMode ? '<button class="secondary" data-action="developer">DEVELOPER PHYSICS</button><button class="secondary" data-action="editor">LEVEL EDITOR</button><button class="secondary" data-action="background">BACKGROUND: ' + (artworkEnabled() ? 'ARTWORK' : 'PLAIN') + '</button>' : ''}<button class="primary" data-close>BACK TO GAME</button></div>`,
    'Settings',
    true,
  );
}
function pause() {
  if (screen !== 'game' || document.querySelector('.modal-backdrop')) return;
  modal(
    `<div class="modal-emblem">${icon('pause')}</div><div class="eyebrow">TAKE A BREATHER</div><h2>HALF TIME.</h2><p>Your ball and the obstacles are paused.</p><div class="completion-actions"><button class="primary" data-close>RESUME ${icon('play')}</button><button class="secondary" data-action="restart">${icon('restart')} RETRY LEVEL</button><button class="text-button" data-action="levels">ALL LEVELS</button></div>`,
    'Game paused',
    true,
  );
}
function result() {
  resultShown = true;
  app.dataset.celebration = sim.shots === 1 ? 'one-shot' : 'standard';
  app.dataset.announcement = announcementFor(sim.shots, sim.level) ?? 'none';
  const l = sim.level,
    n = rating(sim.shots, l),
    prior = best(l);
  if (!draftTest) {
    recordLevelBest(progress, l, sim.shots);
    persist();
  }
  const sparkles = reducedMotion
    ? ''
    : `<div class="celebration-sparkles" aria-hidden="true">${Array.from({ length: sim.shots === 1 ? 18 : 8 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--delay:${(i % 5) * 0.07}s;--turn:${i * 47}deg"></i>`).join('')}</div>`;
  modal(
    `${sparkles}<div class="completion-level wood-pill">${draftTest ? 'TEST LEVEL' : 'LEVEL'} <strong>${l.id}</strong></div><div class="completion-kicker">${draftTest ? 'DRAFT · SCORES NOT SAVED' : 'LEVEL COMPLETE'}</div><h2>${completionTitle(sim.shots, l)}</h2><div class="completion-stars">${stars(n)}</div><div class="completion-stats wood-pill"><span>SHOTS: <strong>${sim.shots}</strong></span><span>PAR: <strong>${l.par}</strong></span></div><div class="completion-actions"><button class="secondary" data-action="restart">${icon('restart')}${draftTest ? 'RETRY TEST' : 'REPLAY'}</button><button class="primary" data-action="${draftTest ? 'editor' : l.id === levels.length ? 'levels' : 'next'}">${icon(draftTest ? 'back' : 'play')}${draftTest ? 'RETURN TO EDITOR' : l.id === levels.length ? 'ALL LEVELS' : 'NEXT LEVEL'}</button></div>${draftTest ? '' : `<button class="icon-button completion-back" data-action="levels" aria-label="BACK TO LEVELS" title="Back to levels">${icon('back')}</button><p class="personal-best">${!prior || sim.shots < prior ? 'NEW PERSONAL BEST' : `BEST: ${best(l)} KICKS`}${!storageOK ? ' · SESSION ONLY' : ''}</p>`}`,
    draftTest ? 'Draft goal scored' : 'Goal scored',
    false,
    `completion-panel grass-trim ${sim.shots === 1 ? 'one-shot' : ''}`,
  );
}
window.addEventListener('keydown', (e) => {
  if (
    screen !== 'game' ||
    document.querySelector('.modal-backdrop') ||
    (e.target as HTMLElement).matches('input,button')
  )
    return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
    audio.unlock();
    precise = true;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = false;
    document.querySelector('.precise-toggle')?.setAttribute('aria-expanded', 'true');
    if (e.key === 'ArrowUp') aimAngle = Math.min(210, aimAngle + 2);
    if (e.key === 'ArrowDown') aimAngle = Math.max(-30, aimAngle - 2);
    if (e.key === 'ArrowLeft') aimPower = Math.max(5, aimPower - 2);
    if (e.key === 'ArrowRight') aimPower = Math.min(100, aimPower + 2);
    if (e.key === ' ' && !e.repeat) {
      cancelDrag();
      kick(getAim());
    }
    syncAim();
  }
  const k = e.key.toLowerCase();
  if (k === 'r') play(currentId, draftTest ?? undefined);
  if (k === 'l') {
    if (draftTest) openEditor();
    else levelSelect();
  }
  if (k === 'p') pause();
  if (e.key === 'Escape') {
    cancelDrag();
    precise = false;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = true;
  }
});
window.addEventListener('blur', cancelDrag);
document.addEventListener('visibilitychange', () => {
  last = performance.now();
  accumulator = 0;
  cancelDrag();
});
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (renderer && sim) {
    const modalOpen = !!document.querySelector('.modal-backdrop');
    if (screen === 'game' && !document.hidden && !modalOpen && !renderer.camera.overview) {
      accumulator += dt * 1000;
      while (accumulator >= STEP) {
        sim.step();
        accumulator -= STEP;
      }
      for (const e of sim.events.splice(0)) {
        if (!reducedMotion) renderer.effect(e);
        if (e.type === 'win') audio.celebrate(sim.shots, roundSerial, sim.level);
        else audio.play(e.type);
      }
      syncCameraControls();
      document.querySelector('#shots')!.textContent = String(sim.shots);
      const status = document.querySelector('#status')!;
      status.textContent =
        sim.phase === 'scoring' || sim.phase === 'won'
          ? 'THAT’S A GOAL!'
          : exploration?.explore
            ? 'EXPLORE · DRAG TO PAN · RETURN TO BALL TO FOLLOW'
            : dragging
              ? 'RELEASE TO ADD A KICK'
              : sim.phase === 'moving'
                ? 'KICK AGAIN ANY TIME'
                : 'DRAG ANYWHERE TO KICK';
      document.querySelector('#power-label')!.textContent = pull
        ? `KICK POWER ${Math.min(100, Math.round((Math.hypot(pull.x, pull.y) / MAX_PULL) * 100))}% · ESC TO CANCEL`
        : sim.canKick
          ? 'DRAG ANYWHERE · UNLIMITED KICKS'
          : 'GOAL!';
      const shoot = document.querySelector<HTMLButtonElement>('#shoot-button');
      if (shoot) shoot.disabled = !sim.canKick;
      if (sim.phase === 'won' && !resultShown) result();
    }
    syncCameraControls();
    renderer.render(
      sim,
      modalOpen || renderer.camera.overview ? 0 : dt,
      pull ?? (precise && sim.canKick ? getAim() : null),
      screen === 'home',
      reducedMotion,
      dragging || modalOpen,
    );
  }
  requestAnimationFrame(frame);
}
if (developerMode && new URLSearchParams(location.search).has('editor')) openEditor();
else home();
requestAnimationFrame(frame);
