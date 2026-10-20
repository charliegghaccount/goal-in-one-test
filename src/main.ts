import './style.css';
import { levels, type Level, type Point } from './levels';
import { GolfSimulation, MAX_PULL, rating, STEP } from './simulation';
import { Renderer } from './render';
import { Audio } from './audio';
import { readProgress, recordBest, saveProgress } from './progress';

const app = document.querySelector<HTMLDivElement>('#app')!;
const audio = new Audio();
const progress = readProgress();
audio.enabled = progress.sound;
let screen: 'home' | 'levels' | 'game' = 'home';
let sim: GolfSimulation,
  renderer: Renderer | null = null;
let pull: Point | null = null,
  dragging = false,
  activePointer: number | null = null,
  completeShown = false;
let last = performance.now(),
  accumulator = 0,
  currentId = 1,
  precise = false,
  aimAngle = 45,
  aimPower = 65;
let storageOK = true;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const icons: Record<string, string> = {
  flag: '<path d="M6 21V3m0 1c5-3 8 4 14 1v9c-6 3-9-4-14-1"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  sound: '<path d="m11 4-5 4H3v8h3l5 4zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-5 4H3v8h3l5 4zm5 5 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5.7-1.5 1.5-1.5 2M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7"/>',
  mountain: '<path d="m2 20 7-13 4 7 3-5 6 11H2zm4-7 3 1 2-2"/>',
  star: '<path d="m12 2 3 6.3 7 .9-5.1 4.9 1.3 6.9-6.2-3.3L5.8 21l1.3-6.9L2 9.2l7-.9z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
};
function icon(name: string, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.flag}</svg>`;
}
function stars(n: number) {
  return `<span class="stars" aria-label="${n} out of 3 stars">${[1, 2, 3].map((i) => icon('star', i <= n ? 'earned' : '')).join('')}</span>`;
}
function button(action: string, label: string, i: string, cls = '') {
  return `<button type="button" data-action="${action}" class="${cls}" title="${label}" aria-label="${label}">${icon(i)}</button>`;
}
function header() {
  return `<header class="topbar"><button class="brand" data-action="home" aria-label="Goal In One home"><span class="brand-mark">${icon('flag')}</span><span>GOAL<span class="brand-in">IN</span>ONE<span class="brand-dot">.</span></span></button><span class="nav-tag">A LITTLE GOLF CLUB. A BIG ADVENTURE.</span><nav aria-label="Main navigation">${screen !== 'home' ? button('levels', 'Choose a level', 'grid', 'icon-button') : '<button class="text-button" data-action="levels">The courses</button>'}<span class="nav-divider"></span>${button('sound', progress.sound ? 'Mute sound' : 'Enable sound', progress.sound ? 'sound' : 'mute', 'icon-button sound-button')}${button('help', 'How to play', 'help', 'icon-button')}</nav></header>`;
}
function persist() {
  storageOK = saveProgress(progress);
}
function cleanup() {
  dragging = false;
  pull = null;
  activePointer = null;
  renderer = null;
  sim?.destroy();
  document.querySelector('.modal-backdrop')?.remove();
  accumulator = 0;
}
const menuLevel: Level = {
  id: 0,
  name: 'Welcome',
  subtitle: '',
  tip: '',
  par: 1,
  theme: 'meadow',
  start: { x: 210, y: 458 },
  cup: { x: 950, y: 450 },
  terrain: [
    { x: 60, y: 470, w: 355, h: 245 },
    { x: 835, y: 450, w: 445, h: 270 },
  ],
  water: [{ x: 415, w: 420, y: 655 }],
};
function home() {
  cleanup();
  screen = 'home';
  const completed = Object.keys(progress.best).length;
  const next = levels.find((l) => !progress.best[l.id])?.id ?? 1;
  app.innerHTML = `${header()}<main class="home"><section class="hero-copy"><div class="eyebrow"><span class="tiny-line"></span> SMALL GAME. GREAT ESCAPE.</div><h1>A little swing.<br>A big <em>adventure.</em></h1><p>Leave the world behind. Find your way through ten playful golf puzzles, one satisfying shot at a time.</p><div class="hero-actions"><button class="primary" data-action="play" data-id="${next}">${completed ? 'Keep exploring' : 'Let’s play'} ${icon('arrow')}</button><button class="secondary" data-action="levels">Explore the courses ${icon('grid')}</button></div><div class="hero-note"><span class="little-ball"></span> Easy to pick up. Hard to putt down.</div>${completed ? `<div class="home-progress">${completed} / 10 flags found <span>·</span> ${totalStars()} stars collected</div>` : ''}</section><section class="hero-art" aria-label="Illustrated golf course with grassy islands and a flag"><div class="art-label"><span class="live-dot"></span> FRESH AIR, ZERO DRESS CODE</div><canvas id="scene" aria-hidden="true"></canvas><div class="art-caption"><span>Take the scenic route.</span><svg width="68" height="36" viewBox="0 0 68 36" aria-hidden="true"><path d="M2 3q25 32 60 16m-9-7 11 7-8 10" fill="none" stroke="currentColor" stroke-width="1.5"/></svg></div><div class="course-stamp">10<span>little<br>adventures</span>${icon('flag')}</div></section><section class="feature-strip" aria-label="Game features"><div>${icon('mountain')}<p><strong>Small worlds. Big possibilities.</strong><span>10 handcrafted courses to make your own.</span></p></div><div>${icon('mouse')}<p><strong>Just drag, aim & let go.</strong><span>A little physics. A little finesse. All you.</span></p></div><div>${icon('star')}<p><strong>Chase your perfect round.</strong><span>Collect stars. Come back for one more.</span></p></div></section></main><footer class="site-footer"><span>MADE FOR THE JOY OF THE GAME</span><span>NO DOWNLOADS. NO RUSH. JUST PLAY. ${icon('flag')}</span></footer>`;
  sim = new GolfSimulation(menuLevel);
  renderer = new Renderer(document.querySelector('#scene')!);
  bind();
}
function totalStars() {
  return levels.reduce(
    (sum, l) => sum + (progress.best[l.id] ? rating(progress.best[l.id], l.par) : 0),
    0,
  );
}
function levelSelect() {
  cleanup();
  screen = 'levels';
  app.innerHTML = `${header()}<main class="select-page"><div class="section-heading"><div><div class="eyebrow">THE LITTLE GOLF CLUB</div><h1>Find your <em>fairway.</em></h1><p>Ten little escapes. Pick a course and make it yours.</p></div><div class="progress-card">${icon('star')}<strong>${totalStars()}<span> / 30</span></strong><span>STARS COLLECTED</span></div></div><div class="level-grid">${levels.map((l) => `<button class="level-card theme-${l.theme}" data-action="play" data-id="${l.id}" aria-label="Play level ${l.id}: ${l.name}, par ${l.par}${progress.best[l.id] ? `, best ${progress.best[l.id]} shots` : ''}"><div class="level-art"><span class="level-number">${String(l.id).padStart(2, '0')}</span>${miniCourse(l)}${progress.best[l.id] ? `<span class="completed-mark">${icon('check')}</span>` : ''}</div><div class="level-card-copy"><div><h2>${l.name}</h2><span>PAR ${l.par} <b>·</b> ${progress.best[l.id] ? `BEST ${progress.best[l.id]}` : 'NEW ADVENTURE'}</span></div>${stars(progress.best[l.id] ? rating(progress.best[l.id], l.par) : 0)}</div></button>`).join('')}</div><p class="selection-note">All courses are open. Your best rounds are saved on this browser.${!storageOK ? ' Browser storage is unavailable; progress lasts for this visit.' : ''}</p></main>`;
  bind();
}
function miniCourse(l: Level) {
  return `<svg viewBox="0 0 1280 720" aria-hidden="true" class="mini-course"><circle cx="1050" cy="130" r="66" fill="#fff6cf"/><path d="M0 450Q230 210 480 450Q790 160 1280 430V720H0" fill="#a8c6a5" opacity=".6"/>${(l.water ?? []).map((w) => `<rect x="${w.x}" y="${w.y}" width="${w.w}" height="${720 - w.y}" fill="#7fbfc3"/>`).join('')}${l.terrain.map((t) => `<g transform="rotate(${((t.angle ?? 0) * 180) / Math.PI} ${t.x + t.w / 2} ${t.y + t.h / 2})"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="4" fill="${t.kind === 'stone' ? '#849c8c' : '#d0b380'}"/>${t.kind !== 'stone' ? `<rect x="${t.x}" y="${t.y}" width="${t.w}" height="15" fill="#77a864"/>` : ''}</g>`).join('')}${(l.pads ?? []).map((p) => `<rect x="${p.x}" y="${p.y - 8}" width="${p.w}" height="17" rx="7" fill="#ee9267"/>`).join('')}${(l.movers ?? []).map((m) => `<rect x="${m.x - m.w / 2}" y="${m.y - m.h / 2}" width="${m.w}" height="${m.h}" rx="5" fill="#bb925e"/>`).join('')}<path d="M${l.cup.x} ${l.cup.y}v-140" stroke="#fff9df" stroke-width="8"/><path d="M${l.cup.x} ${l.cup.y - 140}l65 26-65 20z" fill="#ed8c61"/><circle cx="${l.start.x}" cy="${l.start.y}" r="16" fill="#fffcf0"/></svg>`;
}
function play(id: number) {
  cleanup();
  screen = 'game';
  currentId = Math.max(1, Math.min(10, id));
  completeShown = false;
  precise = false;
  sim = new GolfSimulation(levels[currentId - 1]);
  const l = sim.level;
  app.innerHTML = `${header()}<main class="game-page"><div class="game-heading"><div class="course-title"><button class="back-button" data-action="levels" aria-label="Back to courses">${icon('back')}</button><div><div class="eyebrow">${l.theme === 'meadow' ? 'THE MEADOW' : l.theme === 'sunset' ? 'GOLDEN HOUR' : 'THE HIGHLANDS'} <span>/</span> COURSE ${String(l.id).padStart(2, '0')}</div><h1>${l.name}</h1></div></div><div class="round-stats"><div><span>SHOTS</span><strong id="shots" aria-live="polite">0</strong></div><div><span>PAR</span><strong>${l.par}</strong></div>${button('restart', 'Restart level (R)', 'restart', 'icon-button restart-button')}</div></div><div class="game-stage"><canvas id="scene" tabindex="0" aria-label="Golf course. Drag backwards from the ball to shoot. Keyboard: arrows to aim and set power, Space to shoot, R to restart." aria-describedby="course-tip"></canvas><div class="stage-topline"><span class="course-pill">${icon('flag')} ${String(l.id).padStart(2, '0')} <span>/ 10</span></span><span class="status-pill" id="status">Your shot. Make it a good one.</span><button class="stage-help" data-action="help" aria-label="Show controls">${icon('mouse')}</button></div><div class="stage-bottomline"><span>${icon('compass')} ${l.subtitle}</span><span id="power-label">DRAG BACK TO AIM</span></div></div><div class="game-underbar"><p id="course-tip">${icon('help')} ${l.tip}</p><button class="text-button precise-toggle" data-action="precise" aria-expanded="false">${icon('compass')} Precise aim</button></div><div id="precise-controls" class="precise-controls" hidden><label>Direction <input type="range" min="-30" max="210" value="45" id="angle" /><output id="angle-value">45°</output></label><label>Power <input type="range" min="5" max="100" value="65" id="power" /><output id="power-value">65%</output></label><button class="primary small" data-action="shoot" id="shoot-button">Take the shot ${icon('arrow')}</button></div><div class="course-pagination"><div class="pagination-label">YOUR LITTLE ADVENTURE</div><nav aria-label="Courses">${levels.map((x) => `<button data-action="play" data-id="${x.id}" aria-label="Level ${x.id}" ${x.id === l.id ? 'aria-current="step"' : ''} class="${progress.best[x.id] ? 'done' : ''}">${x.id === l.id ? String(x.id).padStart(2, '0') : progress.best[x.id] ? icon('check') : String(x.id).padStart(2, '0')}</button>`).join('')}</nav><span class="save-note">${icon(storageOK ? 'check' : 'help')} ${storageOK ? 'Progress saved locally' : 'Session-only progress'}</span></div></main>`;
  renderer = new Renderer(document.querySelector('#scene')!);
  bind();
  bindCanvas();
  const angle = document.querySelector<HTMLInputElement>('#angle')!,
    power = document.querySelector<HTMLInputElement>('#power')!;
  angle.value = String(aimAngle);
  power.value = String(aimPower);
  syncAim();
  angle.addEventListener('input', () => {
    aimAngle = +angle.value;
    syncAim();
  });
  power.addEventListener('input', () => {
    aimPower = +power.value;
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
  const a = document.querySelector('#angle-value'),
    p = document.querySelector('#power-value');
  if (a) a.textContent = `${aimAngle}°`;
  if (p) p.textContent = `${aimPower}%`;
  const ai = document.querySelector<HTMLInputElement>('#angle'),
    pi = document.querySelector<HTMLInputElement>('#power');
  if (ai) ai.value = String(aimAngle);
  if (pi) pi.value = String(aimPower);
}
function bindCanvas() {
  const canvas = renderer!.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || sim.phase !== 'ready' || document.querySelector('.modal-backdrop'))
      return;
    const pos = renderer!.toWorld(e.clientX, e.clientY);
    const hitRadius = Math.max(35, 25 / renderer!.scale);
    if (Math.hypot(pos.x - sim.ball.position.x, pos.y - sim.ball.position.y) > hitRadius) return;
    e.preventDefault();
    audio.unlock();
    canvas.focus({ preventScroll: true });
    dragging = true;
    activePointer = e.pointerId;
    pull = { x: 0, y: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || activePointer !== e.pointerId) return;
    const p = renderer!.toWorld(e.clientX, e.clientY);
    pull = { x: p.x - sim.ball.position.x, y: p.y - sim.ball.position.y };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging || activePointer !== e.pointerId) return;
    const shot = pull;
    cancelDrag();
    if (shot) sim.shoot(shot);
  });
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
}
function cancelDrag() {
  dragging = false;
  activePointer = null;
  pull = null;
}
function bind() {
  app.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((el) =>
    el.addEventListener('click', () => {
      audio.unlock();
      audio.play('ui');
      const action = el.dataset.action;
      if (action === 'home') home();
      if (action === 'levels') levelSelect();
      if (action === 'play') play(Number(el.dataset.id));
      if (action === 'restart') play(currentId);
      if (action === 'next') play(currentId + 1);
      if (action === 'sound') {
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
      if (action === 'help') help();
      if (action === 'precise') {
        precise = !precise;
        document.querySelector<HTMLElement>('#precise-controls')!.hidden = !precise;
        el.setAttribute('aria-expanded', String(precise));
      }
      if (action === 'shoot') {
        cancelDrag();
        sim.shoot(getAim());
      }
    }),
  );
}
function modal(content: string, label: string) {
  cancelDrag();
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${label}" tabindex="-1">${content}</section>`;
  app.append(overlay);
  const previous = document.activeElement as HTMLElement | null;
  const close = () => {
    overlay.remove();
    previous?.focus();
  };
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && label === 'How to play') close();
    if (e.key === 'Tab') {
      const elements = [...overlay.querySelectorAll<HTMLElement>('button, a, input')];
      const first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        last?.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first?.focus();
        e.preventDefault();
      }
    }
  });
  (overlay.querySelector('button') as HTMLButtonElement)?.focus();
  return overlay;
}
function help() {
  if (document.querySelector('.modal-backdrop')) return;
  const overlay = modal(
    `<button class="modal-close icon-button" data-close aria-label="Close instructions">${icon('close')}</button><div class="modal-emblem">${icon('mouse')}</div><div class="eyebrow">A LITTLE PHYSICS. A LITTLE FINESSE.</div><h2>Find your swing.</h2><p>Click or touch the ball, drag backwards to aim, then release. A longer pull means a stronger shot.</p><div class="help-diagram"><span class="drag-dot"></span><span class="drag-line"></span><span class="little-ball"></span><span class="aim-dots">· · · · ·</span>${icon('flag')}</div><div class="help-rows"><p><strong>Take your time</strong><span>Wait for the ball to stop before your next shot.</span></p><p><strong>Find the flag</strong><span>Drop into the cup. Earn 3 stars at par or better.</span></p><p><strong>Make a splash?</strong><span>Return to your last shot location. Every attempt counts.</span></p><p><strong>Prefer the keyboard?</strong><span>↑ ↓ set angle · ← → set power · Space shoots<br>R restarts · L opens courses · Esc cancels aiming</span></p></div><button class="primary" data-close>Got it. Let’s golf. ${icon('arrow')}</button>`,
    'How to play',
  );
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
function complete() {
  completeShown = true;
  const l = sim.level,
    n = rating(sim.shots, l.par),
    prior = progress.best[l.id];
  recordBest(progress, l.id, sim.shots);
  persist();
  const allDone = Object.keys(progress.best).length === 10;
  const overlay = modal(
    `<div class="completion-kicker">${icon('flag')} FLAG FOUND ${String(l.id).padStart(2, '0')} / 10</div><div class="completion-stars">${stars(n)}</div><h2>${l.id === 10 ? 'What a little adventure.' : sim.shots === 1 ? 'A hole in one!' : n === 3 ? 'Beautifully played.' : 'That’s the spirit.'}</h2><p>${l.id === 10 ? `${allDone ? 'Every flag found.' : 'The final flag is yours.'} There’s always another perfect round to chase.` : ['A little swing, a very satisfying finish.', 'One more flag. One more reason to smile.', 'The scenic route still gets you there.'][3 - n]}</p><div class="completion-stats"><div><span>YOUR SHOTS</span><strong>${sim.shots}</strong></div><div><span>COURSE PAR</span><strong>${l.par}</strong></div><div><span>PERSONAL BEST</span><strong>${progress.best[l.id]}</strong></div></div>${!prior || sim.shots < prior ? '<div class="personal-best">A NEW PERSONAL BEST. NICELY DONE.</div>' : '<div class="personal-best">ANOTHER ROUND IN THE MEMORY BANK.</div>'}<div class="completion-actions"><button class="primary" data-action="${l.id === 10 ? 'levels' : 'next'}">${l.id === 10 ? 'Explore the courses' : 'Next little adventure'} ${icon('arrow')}</button><div><button class="secondary" data-action="restart">${icon('restart')} Play again</button><button class="text-button" data-action="levels">All courses</button></div></div>${!storageOK ? '<small>Progress could not be saved. Browser storage may be disabled.</small>' : ''}`,
    'Level complete',
  );
  overlay.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((b) =>
    b.addEventListener('click', () => {
      audio.unlock();
      if (b.dataset.action === 'next') play(currentId + 1);
      else if (b.dataset.action === 'restart') play(currentId);
      else levelSelect();
    }),
  );
}
window.addEventListener('keydown', (e) => {
  if (
    screen !== 'game' ||
    document.querySelector('.modal-backdrop') ||
    (e.target as HTMLElement).matches('input, button')
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
      sim.shoot(getAim());
    }
    syncAim();
  }
  if (e.key.toLowerCase() === 'r') play(currentId);
  if (e.key.toLowerCase() === 'l') levelSelect();
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
    if (screen === 'game' && !document.hidden && !document.querySelector('.modal-backdrop')) {
      accumulator += dt * 1000;
      while (accumulator >= STEP) {
        sim.step();
        accumulator -= STEP;
      }
      for (const event of sim.events.splice(0)) {
        if (!reducedMotion) renderer.effect(event);
        audio.play(event.type);
      }
      const shots = document.querySelector('#shots');
      if (shots && shots.textContent !== String(sim.shots)) shots.textContent = String(sim.shots);
      const status = document.querySelector('#status');
      const message =
        sim.phase === 'ready'
          ? 'Your shot. Make it a good one.'
          : sim.phase === 'respawning'
            ? 'Back to dry land…'
            : sim.phase === 'sinking' || sim.phase === 'won'
              ? 'Right where it belongs.'
              : 'A little patience. Let it roll.';
      if (status && status.textContent !== message) status.textContent = message;
      const power = document.querySelector('#power-label');
      if (power)
        power.textContent = pull
          ? `POWER ${Math.min(100, Math.round((Math.hypot(pull.x, pull.y) / MAX_PULL) * 100))}%`
          : sim.phase === 'ready'
            ? 'DRAG BACK TO AIM'
            : 'BALL IN MOTION';
      const shoot = document.querySelector<HTMLButtonElement>('#shoot-button');
      if (shoot) shoot.disabled = sim.phase !== 'ready';
      if (sim.phase === 'won' && !completeShown) complete();
    }
    renderer.render(
      sim,
      dt,
      pull ?? (precise && sim.phase === 'ready' ? getAim() : null),
      screen === 'home',
      reducedMotion,
    );
  }
  requestAnimationFrame(frame);
}
home();
requestAnimationFrame(frame);
