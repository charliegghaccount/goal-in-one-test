import './editor.css';
import { campaign } from '../campaign';
import { campaignManager } from './campaign-ui';
import { frame, resizeHandle } from './transform';
import { movementLine, moverPosition, rotorPose, gatePreview } from '../motion';
import Matter from 'matter-js';
import { Renderer } from '../render';
import { FootballSimulation } from '../simulation';
import { levels, type Level, type Point } from '../levels';
import { inPolygon, polygonError, distanceToEdge } from '../geometry';
import {
  EditorSession,
  blank,
  copyOfficial,
  parseDraft,
  savedDrafts,
  storeDraft,
  syncBoundary,
  repairGoal as snapGoal,
  uid,
  type Draft,
} from './model';
import {
  library,
  add,
  object,
  refs,
  refKey,
  bounds,
  points,
  center,
  translate,
  resize,
  rotate,
  rotation,
  rotatable,
  resizable,
  duplicate,
  remove,
  hit,
  type Ref,
  type Tool,
} from './objects';
import { validateLevel } from './validation';
import { defaultPhysics, type PhysicsConfig } from '../physics';
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const rad = (v: number) => (v * Math.PI) / 180,
  deg = (v: number) => (v * 180) / Math.PI;
export class LevelEditor {
  renderer: Renderer;
  private sim!: FootballSimulation;
  private preview!: Level;
  private abort = new AbortController();
  private raf = 0;
  private dirty = true;
  private selection: Ref[] = [];
  private vertex = -1;
  private vertexMode = false;
  private tool: 'select' | 'pan' | 'polygon' = 'select';
  private placing: Tool | null = null;
  private sketch: Point[] = [];
  private grid = true;
  private snap = true;
  private spacing = 20;
  private collisions = false;
  private coordinates = false;
  private regions = true;
  private settings = false;
  private space = false;
  private previewPlaying = false;
  private previewTime = 0;
  private previewLast = 0;
  private drag: null | {
    type: 'pan' | 'move' | 'vertex' | 'resize' | 'rotate' | 'edge' | 'control';
    last: Point;
    origin: Point;
    doc: Draft;
    refs: Ref[];
    vertex: number;
    handle?: number;
    control?: string;
  } = null;
  constructor(
    private root: HTMLElement,
    public session: EditorSession,
    private test: (l: Level) => void,
    private exit: () => void,
    private config: PhysicsConfig = defaultPhysics,
  ) {
    root.innerHTML = `<main class="level-editor"><header class="editor-top"><div><strong>LEVEL STUDIO</strong><span class="edit-badge">EDIT MODE</span><span id="editor-title" class="editor-draft-title"></span></div><nav aria-label="Editor toolbar">${['Campaign', 'New', 'Save Draft', 'Publish to Game', 'Load', 'Undo', 'Redo', 'Test Level', 'Export', 'Import', 'Backup All', 'Exit'].map((t) => `<button data-command="${t}">${t}</button>`).join('')}</nav></header><div class="editor-columns"><aside class="object-library" aria-label="Object library"><h2>OBJECT LIBRARY</h2><p>Drag onto the canvas, or choose an item and click to place.</p>${library.map(([heading, items]) => `<h3>${heading}</h3><div class="library-group">${items.map(([id, name]) => `<button draggable="${id !== 'polygon'}" data-tool="${id}" title="${name}">${name}</button>`).join('')}</div>`).join('')}</aside><section class="editor-workspace"><div class="editor-tools"><button data-command="Select" aria-pressed="true">Select (V)</button><button data-command="Pan">Pan (H)</button><button data-command="Boundary">Arena vertices</button><button data-command="Finish polygon" hidden>Finish polygon</button><button data-command="Fit">Fit arena</button><button data-command="Zoom out" aria-label="Editor zoom out">−</button><button data-command="Zoom in" aria-label="Editor zoom in">+</button><button data-command="Settings">Level settings</button><button data-command="Preview">▶ Play preview</button></div><div class="editor-toggles"><label><input type="checkbox" id="ed-grid" checked> Grid</label><label><input type="checkbox" id="ed-snap" checked> Snap</label><label>Step <input type="number" id="ed-spacing" aria-label="Grid spacing" min="1" max="200" value="20"></label><label><input type="checkbox" id="ed-collisions"> Collisions</label><label><input type="checkbox" id="ed-coordinates"> Coordinates</label><label><input type="checkbox" id="ed-regions" checked> Camera views</label></div><canvas id="editor-canvas" tabindex="0" aria-label="Level editing canvas"></canvas><div class="editor-status" role="status" id="editor-status">Select, drag and resize. Space or middle-drag pans; wheel zooms.</div><div class="editor-validation" id="editor-validation" aria-live="polite"></div></section><aside class="editor-properties" aria-label="Properties"><h2>PROPERTIES</h2><label>Object <select id="ed-object" aria-label="Select object"></select></label><div id="ed-inspector"></div></aside></div></main>`;
    this.renderer = new Renderer(root.querySelector('#editor-canvas')!);
    this.renderer.camera.editorWorkspace = true;
    this.bind();
    this.rebuild();
    const workspace = session.workspace;
    if (workspace) {
      this.selection = workspace.selection.filter((r) => object(session.doc.level, r));
      this.vertex = workspace.vertex;
      this.vertexMode = workspace.vertexMode;
      this.settings = workspace.settings;
      this.grid = workspace.grid;
      this.snap = workspace.snap;
      this.spacing = workspace.spacing;
      this.collisions = workspace.collisions;
      this.coordinates = workspace.coordinates;
      this.regions = workspace.regions;
      for (const [id, value] of [
        ['ed-grid', this.grid],
        ['ed-snap', this.snap],
        ['ed-collisions', this.collisions],
        ['ed-coordinates', this.coordinates],
        ['ed-regions', this.regions],
      ] as [string, boolean][])
        (this.$('#' + id) as HTMLInputElement).checked = value;
      (this.$('#ed-spacing') as HTMLInputElement).value = String(this.spacing);
      this.renderer.resize(this.sim.level);
      this.renderer.camera.restoreWorkspace(workspace.view, workspace.zoom);
      this.rebuild();
    }
    this.inspect();
    this.loop();
  }
  private $(s: string) {
    return this.root.querySelector<HTMLElement>(s)!;
  }
  private listen(
    el: EventTarget,
    type: string,
    fn: EventListenerOrEventListenerObject,
    options: AddEventListenerOptions = {},
  ) {
    el.addEventListener(type, fn, { ...options, signal: this.abort.signal });
  }
  private status(text: string) {
    this.$('#editor-status').textContent = text;
  }
  destroy() {
    this.session.workspace = {
      view: { ...this.renderer.camera.view },
      zoom: this.renderer.camera.userZoom,
      selection: structuredClone(this.selection),
      vertex: this.vertex,
      vertexMode: this.vertexMode,
      settings: this.settings,
      grid: this.grid,
      snap: this.snap,
      spacing: this.spacing,
      collisions: this.collisions,
      coordinates: this.coordinates,
      regions: this.regions,
    };
    this.abort.abort();
    cancelAnimationFrame(this.raf);
    this.sim?.destroy();
    this.session.commit();
  }
  private loop = () => {
    if (this.abort.signal.aborted) return;
    const r = this.renderer.canvas.getBoundingClientRect();
    const clock = performance.now();
    if (this.previewPlaying) {
      this.previewTime += Math.min(0.05, (clock - (this.previewLast || clock)) / 1000);
      this.applyPreview(this.previewTime);
      this.dirty = true;
    }
    this.previewLast = clock;
    if (this.dirty || r.width !== this.renderer.width || r.height !== this.renderer.height) {
      this.renderer.render(this.sim, this.previewTime * 1000, null, false, !this.previewPlaying);
      this.overlay();
      this.dirty = false;
    }
    this.raf = requestAnimationFrame(this.loop);
  };
  private applyPreview(t: number) {
    this.sim.time = t;
    for (const { body, definition: m } of this.sim.movers)
      Matter.Body.setPosition(
        body,
        m.path ? moverPosition(m, t) : t ? moverPosition(m, t) : { x: m.x, y: m.y },
      );
    for (const { body, def } of this.sim.mechanics.rotors) {
      const pose = rotorPose(def, t);
      Matter.Body.setPosition(body, pose.position);
      Matter.Body.setAngle(body, pose.angle);
    }
    for (const { body, def } of this.sim.mechanics.gates)
      Matter.Body.setPosition(body, gatePreview(def, t));
  }
  private pausePreview() {
    this.previewPlaying = false;
    this.previewTime = 0;
    this.applyPreview(0);
    this.dirty = true;
    this.root.querySelector('[data-command="Preview"]')!.textContent = '▶ Play preview';
  }
  private controls(r: Ref) {
    const l = this.session.doc.level,
      o = object(l, r),
      s = this.renderer.scale;
    const out: { id: string; p: Point; color: string }[] = [];
    if (r.kind === 'mover') {
      const line = movementLine(o);
      out.push(
        { id: 'path.start', p: line.start, color: '#ad37d1' },
        { id: 'path.end', p: line.end, color: '#ad37d1' },
      );
    }
    if (r.kind === 'spring') {
      const a = rad(o.angle),
        len = (65 + o.strength * 2) / s;
      out.push({
        id: 'spring',
        p: { x: o.x + o.w / 2 + Math.cos(a) * len, y: o.y - 6 - Math.sin(a) * len },
        color: '#bc2aa2',
      });
    }
    if (r.kind === 'gate')
      out.push({ id: 'gate', p: { x: o.x + o.offset.x, y: o.y + o.offset.y }, color: '#14a28b' });
    if (r.kind === 'rotor' && o.pivot) out.push({ id: 'pivot', p: o.pivot, color: '#bb4e23' });
    return out;
  }
  private rebuild() {
    this.$('#editor-title').textContent =
      this.session.doc.level.name +
      ' · ' +
      (this.session.doc.designId && campaign().find(this.session.doc.designId)
        ? campaign().status({
            ...campaign().find(this.session.doc.designId)!,
            draft: this.session.doc,
          })
        : 'Draft');
    const l = structuredClone(this.session.doc.level);
    l.obstacles = l.obstacles.filter((o) => !polygonError(o.points));
    // Editing may temporarily contain invalid values; never feed zero/NaN bodies to Matter.
    for (const k of ['gates', 'breakables', 'rotors'] as const)
      if (l.mechanics?.[k])
        l.mechanics[k] = l.mechanics[k]!.filter(
          (o) => o.w >= 1 && o.h >= 1 && Number.isFinite(o.x + o.y),
        ) as any;
    l.movers = l.movers.filter((o) => o.w >= 1 && o.h >= 1 && Number.isFinite(o.x + o.y));
    this.sim?.destroy();
    if (this.preview) Object.assign(this.preview, l);
    else this.preview = l;
    try {
      this.sim = new FootballSimulation(this.preview, this.config);
      this.applyPreview(0);
    } catch {
      this.sim = new FootballSimulation(blank().level);
      this.status('Invalid preview geometry. Fix the highlighted validation errors.');
    }
    const issues = validateLevel(this.session.doc.level),
      errors = issues.filter((i) => i.severity === 'error');
    this.$('#editor-validation').innerHTML = issues.length
      ? `<details ${errors.length ? 'open' : ''}><summary>${errors.length ? `${errors.length} error(s) — fix before Test / Export` : 'Ready to test · validation notes'}</summary>${issues.map((i) => `<p class="${i.severity}">${esc(i.message)}</p>`).join('')}</details>`
      : 'Ready to test';
    for (const label of ['Test Level', 'Export', 'Publish to Game'])
      this.root.querySelector<HTMLButtonElement>(`[data-command="${label}"]`)!.disabled =
        errors.length > 0;
    for (const label of ['Undo', 'Redo'])
      this.root.querySelector<HTMLButtonElement>(`[data-command="${label}"]`)!.disabled =
        label === 'Undo' ? !this.session.canUndo : !this.session.canRedo;
    const selected = this.selection.at(-1),
      select = this.$('#ed-object') as HTMLSelectElement;
    select.innerHTML =
      '<option value="">Choose an object</option><option value="boundary:0">Arena boundary</option>' +
      refs(this.session.doc.level)
        .map(
          (r) =>
            `<option value="${refKey(r)}">${r.kind} ${r.index + 1}${object(this.session.doc.level, r)?.id ? ' · ' + esc(object(this.session.doc.level, r).id) : ''}</option>`,
        )
        .join('');
    select.value = selected ? refKey(selected) : '';
    this.dirty = true;
  }
  private changed(inspect = true) {
    this.rebuild();
    if (inspect) this.inspect();
  }
  private number(label: string, key: string, value: number, step = 'any') {
    const ranges: Record<string, [number, number, number]> = {
      period: [0.5, 30, 0.1],
      movementSpeed: [5, 250, 5],
      strength: [1, 24, 0.5],
      speedDegrees: [0, 170, 1],
      openDuration: [0.1, 10, 0.1],
      closeDuration: [0.1, 10, 0.1],
      amplitudeDegrees: [0, 180, 1],
    };
    if (key === 'strength' && this.selection.at(-1)?.kind === 'wind')
      ranges.strength = [0.1, 5, 0.1];
    const range = ranges[key],
      slider = range
        ? `<input class="mechanic-slider" type="range" min="${range[0]}" max="${range[1]}" step="${range[2]}" value="${value}" data-preview-field="${key}" aria-label="${label} slider">`
        : '';
    return `<label>${label}<input type="number" step="${step}" data-field="${key}" value="${Number.isFinite(value) ? Math.round(value * 10000) / 10000 : 0}" aria-label="${label}"></label>${slider}`;
  }
  private text(label: string, key: string, value: unknown) {
    return `<label>${label}<input data-field="${key}" value="${esc(value)}" aria-label="${label}"></label>`;
  }
  private select(label: string, key: string, value: string, options: [string, string][]) {
    return `<label>${label}<select data-field="${key}" aria-label="${label}">${options.map(([id, name]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(name)}</option>`).join('')}</select></label>`;
  }
  private inspect() {
    const l = this.session.doc.level,
      r = this.selection.at(-1),
      box = this.$('#ed-inspector'),
      n = this.number.bind(this),
      text = this.text.bind(this),
      sel = this.select.bind(this);
    if (this.settings) {
      const p = l.boundary ?? l.outline,
        w = Math.max(...p.map((p) => p.x)) - Math.min(...p.map((p) => p.x)),
        h = Math.max(...p.map((p) => p.y)) - Math.min(...p.map((p) => p.y));
      box.innerHTML = `<h3>Level settings</h3>${text('Level name', 'level.name', l.name)}${n('Draft level number', 'level.id', l.id, '1')}${text('Description', 'level.tip', l.tip)}${n('Difficulty (1–5)', 'difficulty', this.session.doc.difficulty, '1')}${text('Tags (comma separated)', 'tags', this.session.doc.tags.join(', '))}${n('Par', 'level.par', l.par, '1')}${n('Three-star shots', 'level.starShots.0', l.starShots[0], '1')}${n('Two-star shots', 'level.starShots.1', l.starShots[1], '1')}${n('Arena width', 'arenaWidth', w)}${n('Arena height', 'arenaHeight', h)}<small>Size changes reshape the outer frame; objects stay where you placed them.</small>${sel(
        'Camera mode',
        'level.camera.mode',
        l.camera?.mode ?? 'fixed',
        [
          ['fixed', 'Fixed'],
          ['follow-x', 'Follow horizontal'],
          ['follow-xy', 'Follow both axes'],
        ],
      )}${n('Viewport width', 'level.camera.viewWidth', l.camera?.viewWidth ?? 990)}${n('Viewport height', 'level.camera.viewHeight', l.camera?.viewHeight ?? 560)}${n('Initial focus X', 'level.camera.initial.x', l.camera?.initial?.x ?? l.start.x)}${n('Initial focus Y', 'level.camera.initial.y', l.camera?.initial?.y ?? l.start.y)}<small>Draft ID: ${esc(this.session.doc.draftId)}</small>`;
    } else if (!r) {
      box.innerHTML =
        '<p>Select an object on the canvas, or choose it from the list. Shift-click for multiple selection.</p><p>Drag a library item into the arena. Use Arena vertices to reshape its frame.</p><button data-command="Settings">Level settings</button>';
    } else if (this.selection.length > 1) {
      box.innerHTML = `<h3>${this.selection.length} objects selected</h3><p>Drag to move together.</p><button data-command="Duplicate">Duplicate</button><button data-command="Delete">Delete</button>`;
    } else {
      const o = object(l, r),
        b = frame(l, r),
        c = center(l, r);
      if (!o) {
        this.selection = [];
        this.inspect();
        return;
      }
      let html = `<h3>${esc(r.kind)} ${r.index + 1}</h3>`;
      if (r.kind === 'boundary')
        html +=
          '<p>Drag orange corners or square edge midpoints. A midpoint moves both connected endpoints. Keep a vertical segment on the right for the net.</p>';
      else {
        html +=
          n(
            r.kind === 'goal' ? 'Goal X (entrance)' : 'X',
            'x',
            r.kind === 'obstacle' || (r.kind === 'rotor' && o.pivot) ? c.x : o.x,
          ) +
          n(
            r.kind === 'goal' ? 'Goal Y (bottom)' : 'Y',
            'y',
            r.kind === 'obstacle' || (r.kind === 'rotor' && o.pivot) ? c.y : o.y,
          );
        if (resizable(r)) html += n('Width', 'w', r.kind === 'obstacle' ? b.w : (o.w ?? 36));
        if (resizable(r) && !['surface', 'spring', 'ice'].includes(r.kind))
          html += n('Height', 'h', r.kind === 'obstacle' ? b.h : (o.h ?? 36));
        if (rotatable(r)) html += n('Rotation (degrees)', 'rotation', deg(rotation(l, r)));
      }
      if (r.kind === 'obstacle' || r.kind === 'boundary') {
        html += `<button data-command="Vertices">${this.vertexMode ? 'Move / resize shape' : 'Edit vertices'}</button><label>Vertex <select id="ed-vertex" aria-label="Selected vertex">${o.points.map((p: Point, i: number) => `<option value="${i}" ${i === this.vertex ? 'selected' : ''}>${i + 1}: ${Math.round(p.x)}, ${Math.round(p.y)}</option>`).join('')}</select></label>`;
        const v = o.points[Math.max(0, this.vertex)];
        if (v) html += n('Vertex X', 'vertex.x', v.x) + n('Vertex Y', 'vertex.y', v.y);
        html +=
          '<button data-command="Insert vertex">Add vertex after</button><button data-command="Remove vertex">Remove vertex</button>';
        if (r.kind === 'boundary') {
          const a = o.points[Math.max(0, this.vertex)],
            b = o.points[(Math.max(0, this.vertex) + 1) % o.points.length];
          html += `<h4>Edge after selected vertex</h4>${n('Edge length', 'edgeLength', Math.hypot(b.x - a.x, b.y - a.y))}<button data-command="Align horizontal">Make horizontal</button><button data-command="Align vertical">Make vertical</button><small>Length holds the first endpoint fixed; alignment changes the next endpoint.</small>`;
        }
      }
      if (r.kind === 'surface') {
        html += sel('Surface type', 'kind', o.kind, [
          ['forward', 'Forward'],
          ['backward', 'Backward'],
          ['delete', 'Red reset'],
        ]);
        if (o.kind !== 'delete')
          html += n(
            'Boost acceleration',
            'acceleration',
            o.acceleration ?? this.config.boostAcceleration,
            0.01 as any,
          );
      }
      if (r.kind === 'spring')
        html +=
          n('Launch direction (degrees)', 'angle', o.angle) +
          n('Launch strength', 'strength', o.strength);
      if (r.kind === 'wind')
        html +=
          n('Wind direction (degrees)', 'angle', o.angle) +
          n('Wind strength', 'strength', o.strength);
      if (r.kind === 'mover') {
        const line = movementLine(o),
          distance = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
        html += `<h4>Movement line</h4><p>Drag purple A/B endpoints on the canvas. Pausing restores editable positions.</p>${sel(
          'Travel axis',
          'axis',
          o.path ? 'path' : (o.axis ?? 'y'),
          [
            ['path', 'Custom two-point path'],
            ['x', 'Horizontal (legacy)'],
            ['y', 'Vertical (legacy)'],
          ],
        )}`;
        if (o.path)
          html +=
            n('Path start X', 'path.start.x', line.start.x) +
            n('Path start Y', 'path.start.y', line.start.y) +
            n('Path end X', 'path.end.x', line.end.x) +
            n('Path end Y', 'path.end.y', line.end.y);
        else html += n('Travel distance', 'travel', o.travel);
        html +=
          n('Period (seconds)', 'period', o.period) +
          n('One-way duration (seconds)', 'legDuration', o.period / 2) +
          n('Mean speed (units/second)', 'movementSpeed', (distance * 2) / o.period) +
          sel('Loop behaviour', 'loop', o.loop ?? 'ping-pong', [
            ['ping-pong', 'Smooth out and back'],
            ['once', 'Once, then hold'],
          ]) +
          n('Starting phase (cycles)', 'phase', o.phase ?? 0) +
          `<small>Distance ${Math.round(distance)} units. Smooth cosine easing; peak speed is π/2 times mean speed.</small>`;
      }
      if (r.kind === 'rotor') {
        html +=
          sel('Motion', 'motion', o.amplitude !== undefined ? 'swing' : 'rotate', [
            ['rotate', 'Continuous rotation'],
            ['swing', 'Swing'],
          ]) +
          n('Rotation speed (degrees/second)', 'speedDegrees', Math.abs(deg(o.speed))) +
          sel('Rotation direction', 'rotationDirection', o.speed < 0 ? 'ccw' : 'cw', [
            ['cw', 'Clockwise'],
            ['ccw', 'Counterclockwise'],
          ]);
        if (o.amplitude !== undefined)
          html +=
            n('Swing range (degrees)', 'amplitudeDegrees', deg(o.amplitude)) +
            n('Swing period (seconds)', 'period', o.period ?? 5);
        html += sel('Pivot', 'pivotMode', o.pivot ? 'offset' : 'centre', [
          ['centre', 'Object centre'],
          ['offset', 'Custom pivot'],
        ]);
        if (o.pivot)
          html += n('Pivot X', 'pivot.x', o.pivot.x) + n('Pivot Y', 'pivot.y', o.pivot.y);
      }
      if (r.kind === 'breakable')
        html += text('Object ID', 'id', o.id) + n('Impact threshold', 'threshold', o.threshold);
      if (r.kind === 'gate')
        html +=
          text('Gate ID', 'id', o.id) +
          n('Opening offset X', 'offset.x', o.offset.x) +
          n('Opening offset Y', 'offset.y', o.offset.y) +
          n('Opening duration (seconds)', 'openDuration', o.openDuration ?? 0.7) +
          n('Closing duration (seconds)', 'closeDuration', o.closeDuration ?? 0.7) +
          '<small>Drag the teal open-position endpoint. Gates begin closed; link a switch. Preview loops the configured motion.</small>';
      if (r.kind === 'switch')
        html +=
          text('Switch ID', 'id', o.id) +
          sel('Linked gate', 'gateId', o.gateId, [
            ['', 'Choose a gate'],
            ...(l.mechanics?.gates ?? []).map((g) => [g.id, g.id] as [string, string]),
          ]) +
          sel('Switch mode', 'mode', o.mode, [
            ['toggle', 'Toggle'],
            ['timed', 'Timed'],
          ]) +
          (o.mode === 'timed' ? n('Timer (seconds)', 'duration', o.duration ?? 8) : '');
      if (r.kind === 'ice')
        html += n('Friction coefficient', 'friction', o.friction, 0.00001 as any);
      if (r.kind === 'goal')
        html +=
          n('Roof length', 'roof', o.roof) +
          '<small>Drag anywhere inside the arena. Near a valid right wall, the net attaches and opens that wall. Invalid overlaps are highlighted.</small>';
      if (r.kind === 'region')
        html +=
          text('Region label', 'label', o.label) +
          '<button data-command="Initial view">Use as initial camera view</button><small>Region size uses the level viewport settings.</small>';
      html +=
        '<div class="inspector-actions">' +
        (!['spawn', 'goal', 'boundary'].includes(r.kind)
          ? '<button data-command="Duplicate">Duplicate (Ctrl+D)</button><button data-command="Delete">Delete</button>'
          : '') +
        '</div>';
      box.innerHTML = html;
    }
    box.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-field]').forEach((el) => {
      this.listen(el, 'focus', () => {
        this.pausePreview();
        this.session.begin();
      });
      this.listen(el, 'input', () => {
        if (
          el instanceof HTMLInputElement &&
          el.type === 'number' &&
          (!el.value || !Number.isFinite(el.valueAsNumber))
        )
          return;
        this.session.begin();
        this.property(
          el.dataset.field!,
          el instanceof HTMLInputElement && el.type === 'number' ? el.valueAsNumber : el.value,
        );
        this.changed(false);
      });
      this.listen(el, 'change', () => {
        this.session.commit();
        this.changed();
      });
    });
    box.querySelectorAll<HTMLInputElement>('[data-preview-field]').forEach((el) => {
      this.listen(el, 'input', () => {
        this.session.begin();
        this.property(el.dataset.previewField!, el.valueAsNumber);
        const n = box.querySelector<HTMLInputElement>(`[data-field="${el.dataset.previewField}"]`);
        if (n) n.value = el.value;
        this.changed(false);
      });
      this.listen(el, 'change', () => {
        this.session.commit();
        this.changed();
      });
    });
    const vert = box.querySelector<HTMLSelectElement>('#ed-vertex');
    if (vert)
      this.listen(vert, 'change', () => {
        this.vertex = +vert.value;
        this.vertexMode = true;
        this.inspect();
        this.dirty = true;
      });
  }
  private property(key: string, value: any) {
    const l = this.session.doc.level,
      r = this.selection.at(-1),
      o = r ? object(l, r) : null;
    if (key === 'arenaWidth' || key === 'arenaHeight') {
      const axis = key === 'arenaWidth' ? 'x' : 'y',
        p = l.boundary!,
        min = Math.min(...p.map((p) => p[axis])),
        span = Math.max(...p.map((p) => p[axis])) - min;
      for (const v of p) v[axis] = min + ((v[axis] - min) * Math.max(100, value)) / span;
      syncBoundary(l);
      snapGoal(l, { x: Math.max(...p.map((p) => p.x)), y: l.goal.y });
      return;
    }
    if (key.startsWith('level.') || key === 'difficulty' || key === 'tags') {
      if (key === 'tags') {
        this.session.doc.tags = String(value)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        return;
      }
      const path = key.split('.');
      let node: any = this.session.doc;
      for (const k of path.slice(0, -1)) node = node[k] ??= k === 'initial' ? { ...l.start } : {};
      node[path.at(-1)!] = value;
      return;
    }
    if (!r || !o) return;
    if (key === 'acceleration') l.boostVersion = 2;
    if (key === 'x' || key === 'y') {
      const prev = r.kind === 'obstacle' || (r.kind === 'rotor' && o.pivot) ? center(l, r) : o;
      translate(l, r, key === 'x' ? value - prev.x : 0, key === 'y' ? value - prev.y : 0);
      return;
    }
    if (key === 'w' || key === 'h') {
      const b = frame(l, r);
      resize(l, r, key === 'w' ? value : (o.w ?? b.w), key === 'h' ? value : (o.h ?? b.h));
      return;
    }
    if (key === 'rotation') {
      rotate(l, r, rad(value));
      return;
    }
    if (key === 'edgeLength' && r.kind === 'boundary') {
      const p = o.points,
        a = p[Math.max(0, this.vertex)],
        b = p[(Math.max(0, this.vertex) + 1) % p.length],
        length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const distance = Math.max(8, value);
      b.x = a.x + ((b.x - a.x) * distance) / length;
      b.y = a.y + ((b.y - a.y) * distance) / length;
      syncBoundary(l);
      snapGoal(l, l.goal);
      return;
    }
    if (key === 'axis' && r.kind === 'mover') {
      if (value === 'path') {
        o.path = movementLine(o);
        o.x = o.path.start.x;
        o.y = o.path.start.y;
      } else {
        delete o.path;
        o.axis = value;
        delete o.loop;
        delete o.phase;
      }
      return;
    }
    if (key === 'legDuration') {
      o.period = Math.max(0.5, value * 2);
      return;
    }
    if (key === 'movementSpeed') {
      const line = movementLine(o);
      o.period = Math.max(
        0.5,
        (2 * Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y)) / Math.max(1, value),
      );
      return;
    }
    if (key === 'speedDegrees') {
      o.speed = rad(value) * (o.speed < 0 ? -1 : 1);
      return;
    }
    if (key === 'rotationDirection') {
      o.speed = Math.abs(o.speed) * (value === 'ccw' ? -1 : 1);
      return;
    }
    if (key === 'motion') {
      if (value === 'swing') {
        o.amplitude = 0.65;
        o.period = 5;
      } else {
        delete o.amplitude;
        delete o.period;
      }
      return;
    }
    if (key === 'pivotMode') {
      if (value === 'offset') o.pivot = { x: o.x, y: o.y - o.h / 2 };
      else delete o.pivot;
      return;
    }
    if (key === 'amplitudeDegrees') {
      o.amplitude = rad(value);
      return;
    }
    if (key.startsWith('vertex.')) {
      o.points[Math.max(0, this.vertex)][key.split('.')[1]] = value;
      if (r.kind === 'boundary') {
        syncBoundary(l);
        snapGoal(l, l.goal);
      }
      return;
    }
    if (key === 'id' && r.kind === 'gate') {
      const old = o.id;
      for (const s of l.mechanics?.switches ?? []) if (s.gateId === old) s.gateId = value;
    }
    const path = key.split('.');
    let node = o;
    for (const k of path.slice(0, -1)) node = node[k] ??= {};
    node[path.at(-1)!] = value;
    if (r.kind === 'mover' && key.startsWith('path.')) {
      o.x = o.path.start.x;
      o.y = o.path.start.y;
    }
  }
  private bind() {
    this.listen(this.root, 'click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-command],[data-tool]');
      if (target?.dataset.command) this.command(target.dataset.command);
      if (target?.dataset.tool) {
        const tool = target.dataset.tool as Tool;
        if (tool === 'polygon') {
          this.tool = 'polygon';
          this.sketch = [];
          this.placing = null;
          this.status('Polygon: click vertices, then Finish polygon or Enter. Escape cancels.');
        } else {
          this.placing = tool;
          this.tool = 'select';
          this.status('Click the canvas to place ' + target.textContent + '.');
        }
        this.refreshTools();
      }
    });
    this.root.querySelectorAll<HTMLElement>('[draggable="true"]').forEach((el) =>
      this.listen(el, 'dragstart', (e) => {
        (e as DragEvent).dataTransfer!.setData('application/x-goal-object', el.dataset.tool!);
        (e as DragEvent).dataTransfer!.effectAllowed = 'copy';
      }),
    );
    const canvas = this.renderer.canvas;
    this.listen(canvas, 'dragover', (e) => {
      e.preventDefault();
    });
    this.listen(canvas, 'drop', (e) => {
      e.preventDefault();
      const event = e as DragEvent,
        t = event.dataTransfer?.getData('application/x-goal-object') as Tool;
      if (library.some(([, items]) => items.some(([id]) => id === t)))
        this.place(t, this.world(event.clientX, event.clientY));
    });
    this.listen(canvas, 'pointerdown', (e) => this.down(e as PointerEvent));
    this.listen(canvas, 'pointermove', (e) => this.move(e as PointerEvent));
    this.listen(canvas, 'pointerup', () => this.up());
    this.listen(canvas, 'pointercancel', () => this.up());
    this.listen(canvas, 'lostpointercapture', () => this.up());
    this.listen(
      canvas,
      'wheel',
      (e) => {
        e.preventDefault();
        const w = e as WheelEvent,
          r = canvas.getBoundingClientRect();
        this.renderer.camera.zoomBy(Math.exp(-w.deltaY * 0.0015), {
          x: w.clientX - r.left,
          y: w.clientY - r.top,
        });
        this.dirty = true;
      },
      { passive: false },
    );
    this.listen(window, 'keydown', (e) => this.key(e as KeyboardEvent));
    this.listen(window, 'keyup', (e) => {
      if ((e as KeyboardEvent).code === 'Space') this.space = false;
    });
    this.listen(window, 'blur', () => {
      this.space = false;
      this.up();
    });
    for (const [id, fn] of [
      ['ed-grid', (v: boolean) => (this.grid = v)],
      ['ed-snap', (v: boolean) => (this.snap = v)],
      ['ed-collisions', (v: boolean) => (this.collisions = v)],
      ['ed-coordinates', (v: boolean) => (this.coordinates = v)],
      ['ed-regions', (v: boolean) => (this.regions = v)],
    ] as const)
      this.listen(this.$('#' + id), 'change', (e) => {
        fn((e.target as HTMLInputElement).checked);
        this.dirty = true;
      });
    this.listen(this.$('#ed-spacing'), 'change', (e) => {
      this.spacing = Math.max(1, Math.min(200, +(e.target as HTMLInputElement).value || 20));
      this.dirty = true;
    });
    this.listen(this.$('#ed-object'), 'change', (e) => {
      this.pausePreview();
      const v = (e.target as HTMLSelectElement).value;
      this.selection = v ? [{ kind: v.split(':')[0] as Ref['kind'], index: +v.split(':')[1] }] : [];
      this.settings = false;
      this.vertexMode = v.startsWith('boundary');
      this.vertex = 0;
      this.inspect();
      this.dirty = true;
    });
  }
  private refreshTools() {
    for (const name of ['Select', 'Pan'])
      this.root
        .querySelector(`[data-command="${name}"]`)
        ?.setAttribute(
          'aria-pressed',
          String(this.tool === (name === 'Select' ? 'select' : 'pan')),
        );
    this.root.querySelector<HTMLElement>('[data-command="Finish polygon"]')!.hidden =
      this.tool !== 'polygon';
    this.renderer.canvas.style.cursor =
      this.tool === 'pan'
        ? 'grab'
        : this.tool === 'polygon' || this.placing
          ? 'crosshair'
          : 'default';
    this.dirty = true;
  }
  private world(x: number, y: number) {
    return this.renderer.toWorld(x, y);
  }
  private snapped(p: Point) {
    return this.snap
      ? {
          x: Math.round(p.x / this.spacing) * this.spacing,
          y: Math.round(p.y / this.spacing) * this.spacing,
        }
      : p;
  }
  private place(t: Tool, p: Point) {
    this.pausePreview();
    this.session.change(() => {
      this.selection = add(this.session.doc.level, t, this.snapped(p));
    });
    this.placing = null;
    this.settings = false;
    this.vertexMode = false;
    this.changed();
    this.status('Placed ' + t + '. Drag to move, or use Properties.');
    this.refreshTools();
  }
  private down(e: PointerEvent) {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    this.renderer.canvas.focus({ preventScroll: true });
    this.renderer.canvas.setPointerCapture(e.pointerId);
    const animated = this.previewPlaying
      ? [
          ...this.sim.movers.map((m, i) => ({
            body: m.body,
            ref: { kind: 'mover' as const, index: i },
          })),
          ...this.sim.mechanics.rotors.map((m, i) => ({
            body: m.body,
            ref: { kind: 'rotor' as const, index: i },
          })),
          ...this.sim.mechanics.gates.map((m, i) => ({
            body: m.body,
            ref: { kind: 'gate' as const, index: i },
          })),
        ].find((m) => Matter.Query.point([m.body], this.world(e.clientX, e.clientY)).length)
      : undefined;
    this.pausePreview();
    if (animated) {
      this.selection = [animated.ref];
      this.vertexMode = false;
      this.settings = false;
      this.inspect();
      this.status('Preview paused. Selected object is back at its editable initial position.');
      return;
    }
    const p = this.world(e.clientX, e.clientY),
      l = this.session.doc.level;
    if (this.tool === 'pan' || this.space || e.button === 1) {
      this.drag = {
        type: 'pan',
        last: { x: e.clientX, y: e.clientY },
        origin: p,
        doc: structuredClone(this.session.doc),
        refs: [],
        vertex: -1,
      };
      return;
    }
    if (this.placing) {
      this.place(this.placing, p);
      return;
    }
    if (this.tool === 'polygon') {
      const v = this.snapped(p);
      if (
        !this.sketch.length ||
        Math.hypot(v.x - this.sketch.at(-1)!.x, v.y - this.sketch.at(-1)!.y) > 1
      )
        this.sketch.push(v);
      this.dirty = true;
      return;
    }
    const primary = this.selection.at(-1),
      radius = 10 / this.renderer.scale;
    let type: 'move' | 'vertex' | 'resize' | 'rotate' | 'edge' | 'control' = 'move',
      v = -1,
      handle = -1,
      control = '';
    if (primary) {
      const b = bounds(l, primary),
        poly = points(l, primary),
        c = center(l, primary);
      if (this.vertexMode && (primary.kind === 'boundary' || primary.kind === 'obstacle')) {
        v = poly.findIndex((a) => Math.hypot(a.x - p.x, a.y - p.y) < radius);
        if (v < 0 && primary.kind === 'boundary') {
          const edge = poly.findIndex(
            (a, i) =>
              Math.hypot(
                (a.x + poly[(i + 1) % poly.length].x) / 2 - p.x,
                (a.y + poly[(i + 1) % poly.length].y) / 2 - p.y,
              ) < radius,
          );
          if (edge >= 0) {
            type = 'edge';
            this.vertex = edge;
          }
        }
        if (v >= 0) {
          type = 'vertex';
          this.vertex = v;
        }
      } else if (this.selection.length === 1) {
        if (
          rotatable(primary) &&
          Math.hypot(p.x - c.x, p.y - (b.y - 32 / this.renderer.scale)) < radius
        )
          type = 'rotate';
        else if (
          resizable(primary) &&
          (handle = frame(l, primary).handles.findIndex(
            (q) => Math.hypot(q.x - p.x, q.y - p.y) < radius,
          )) >= 0
        )
          type = 'resize';
        const visual = this.controls(primary).find(
          (q) => Math.hypot(q.p.x - p.x, q.p.y - p.y) < radius,
        );
        if (visual) {
          type = 'control';
          control = visual.id;
        }
      }
    }
    if (type === 'move') {
      const selected =
        primary && primary.kind === 'region' && inPolygon(p, points(l, primary))
          ? primary
          : hit(l, p);
      if (!selected) {
        this.selection = [];
        this.settings = false;
        this.inspect();
        this.dirty = true;
        return;
      }
      const exists = this.selection.some((r) => refKey(r) === refKey(selected));
      if (e.shiftKey) {
        this.selection = exists
          ? this.selection.filter((r) => refKey(r) !== refKey(selected))
          : [...this.selection, selected];
      } else if (!exists) this.selection = [selected];
      this.settings = false;
      this.vertexMode = this.selection.at(-1)?.kind === 'boundary';
    }
    this.session.begin();
    this.drag = {
      type,
      last: p,
      origin: this.snapped(p),
      doc: structuredClone(this.session.doc),
      refs: structuredClone(this.selection),
      vertex: this.vertex,
      handle,
      control,
    };
    this.inspect();
    this.dirty = true;
  }
  private move(e: PointerEvent) {
    if (!this.drag) {
      const r = this.selection.at(-1);
      let cursor =
        this.tool === 'pan'
          ? 'grab'
          : this.placing || this.tool === 'polygon'
            ? 'crosshair'
            : 'default';
      if (r && this.selection.length === 1 && !this.vertexMode) {
        const p = this.world(e.clientX, e.clientY),
          f = frame(this.session.doc.level, r),
          h = f.handles.findIndex(
            (q) => Math.hypot(p.x - q.x, p.y - q.y) < 10 / this.renderer.scale,
          );
        if (h >= 0 && resizable(r))
          cursor = [
            'nwse-resize',
            'ns-resize',
            'nesw-resize',
            'ew-resize',
            'ew-resize',
            'nesw-resize',
            'ns-resize',
            'nwse-resize',
          ][h];
      }
      this.renderer.canvas.style.cursor = cursor;
      return;
    }
    if (this.drag.type === 'pan') {
      this.renderer.camera.panBy(e.clientX - this.drag.last.x, e.clientY - this.drag.last.y);
      this.drag.last = { x: e.clientX, y: e.clientY };
      this.dirty = true;
      return;
    }
    const p = this.snapped(this.world(e.clientX, e.clientY)),
      d = this.drag;
    this.session.doc = structuredClone(d.doc);
    const l = this.session.doc.level,
      r = d.refs.at(-1);
    if (!r) return;
    if (d.type === 'move')
      for (const ref of d.refs) translate(l, ref, p.x - d.origin.x, p.y - d.origin.y);
    if (d.type === 'vertex') {
      const o = object(l, r);
      o.points[d.vertex] = { ...p };
      if (r.kind === 'boundary') {
        syncBoundary(l);
        snapGoal(l, l.goal);
      }
    }
    if (d.type === 'edge') {
      const poly = object(l, r).points as Point[];
      for (const i of [d.vertex, (d.vertex + 1) % poly.length]) {
        poly[i].x += p.x - d.origin.x;
        poly[i].y += p.y - d.origin.y;
      }
      syncBoundary(l);
      snapGoal(l, l.goal);
    }
    if (d.type === 'control') {
      const o = object(l, r);
      if (d.control === 'spring') {
        o.angle = (deg(Math.atan2(o.y - 6 - p.y, p.x - o.x - o.w / 2)) + 360) % 360;
      }
      if (d.control === 'gate') {
        o.offset = { x: p.x - o.x, y: p.y - o.y };
      }
      if (d.control === 'pivot') o.pivot = { ...p };
      if (d.control?.startsWith('path.')) {
        o.path ??= movementLine(o);
        o.path[d.control.split('.')[1]] = { ...p };
        o.x = o.path.start.x;
        o.y = o.path.start.y;
      }
    }
    if (d.type === 'resize')
      resizeHandle(l, r, d.handle!, p, { aspect: e.shiftKey, centre: e.altKey });
    if (d.type === 'rotate') {
      const c = center(l, r);
      let a = Math.atan2(p.y - c.y, p.x - c.x) + Math.PI / 2;
      if (this.snap) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
      rotate(l, r, a);
    }
    this.changed(false);
  }
  private up() {
    if (!this.drag) return;
    const pan = this.drag.type === 'pan';
    this.drag = null;
    if (!pan) {
      this.session.commit();
      this.changed();
    }
  }
  private overlay() {
    const c = this.renderer.ctx,
      cam = this.renderer.camera,
      l = this.session.doc.level,
      s = cam.scale;
    c.save();
    c.translate(cam.offsetX, cam.offsetY);
    c.scale(s, s);
    if (this.grid) {
      const step = Math.max(this.spacing, Math.ceil(14 / (s * this.spacing)) * this.spacing);
      c.strokeStyle = '#16485c28';
      c.lineWidth = 1 / s;
      c.beginPath();
      for (let x = Math.floor(cam.view.x / step) * step; x < cam.view.x + cam.view.w; x += step) {
        c.moveTo(x, cam.view.y);
        c.lineTo(x, cam.view.y + cam.view.h);
      }
      for (let y = Math.floor(cam.view.y / step) * step; y < cam.view.y + cam.view.h; y += step) {
        c.moveTo(cam.view.x, y);
        c.lineTo(cam.view.x + cam.view.w, y);
      }
      c.stroke();
    }
    const path = (p: Point[], close = true) => {
      c.beginPath();
      p.forEach((v, i) => (i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)));
      if (close) c.closePath();
    };
    if (this.collisions) {
      for (const body of Matter.Composite.allBodies(this.sim.engine.world))
        for (const part of body.parts.length > 1 ? body.parts.slice(1) : [body]) {
          path(part.vertices);
          c.strokeStyle = body.isSensor ? '#1876fccc' : '#ff6935cc';
          c.lineWidth = 1.5 / s;
          c.stroke();
        }
    }
    if (this.regions)
      for (const r of refs(l).filter((r) => r.kind === 'region')) {
        path(points(l, r));
        c.strokeStyle = '#842de1';
        c.setLineDash([8 / s, 5 / s]);
        c.lineWidth = 2 / s;
        c.stroke();
        c.setLineDash([]);
      }
    // The actual mouth is always visible in edit mode, including its direction.
    const g = l.goal;
    c.strokeStyle = '#00a83a';
    c.lineWidth = 3 / s;
    c.setLineDash([5 / s, 5 / s]);
    c.beginPath();
    c.moveTo(g.x, g.y - g.h + 8);
    c.lineTo(g.x, g.y - 8);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#075d2f';
    c.font = `bold ${12 / s}px sans-serif`;
    c.fillText('GOAL →', g.x - 60 / s, g.y - g.h / 2);
    if (this.coordinates) {
      c.fillStyle = '#173b4d';
      c.font = `${11 / s}px monospace`;
      for (const r of refs(l)) {
        const p = center(l, r);
        c.fillText(`${Math.round(p.x)},${Math.round(p.y)}`, p.x + 8 / s, p.y - 15 / s);
      }
    }
    for (const o of l.obstacles)
      if (polygonError(o.points)) {
        path(o.points);
        c.strokeStyle = '#ee263d';
        c.lineWidth = 3 / s;
        c.stroke();
      }
    for (const r of this.selection) {
      const b = bounds(l, r),
        p = points(l, r);
      path(p);
      c.strokeStyle = r.kind === 'boundary' ? '#eb7d12' : '#097aff';
      c.lineWidth = 2 / s;
      c.stroke();
      const handle = (x: number, y: number, color = '#097aff') => {
        c.fillStyle = '#fff';
        c.strokeStyle = color;
        c.lineWidth = 2 / s;
        c.beginPath();
        c.arc(x, y, 6 / s, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      };
      if (this.selection.length === 1) {
        const o = object(l, r);
        for (const h of this.controls(r)) {
          const from =
            r.kind === 'spring'
              ? { x: o.x + o.w / 2, y: o.y - 6 }
              : r.kind === 'mover'
                ? movementLine(o).start
                : center(l, r);
          c.strokeStyle = h.color;
          c.lineWidth = 2 / s;
          c.beginPath();
          c.moveTo(from.x, from.y);
          c.lineTo(h.p.x, h.p.y);
          c.stroke();
          handle(h.p.x, h.p.y, h.color);
          c.fillStyle = h.color;
          c.font = `bold ${12 / s}px sans-serif`;
          c.fillText(
            h.id === 'spring'
              ? `${Math.round(o.angle)}°`
              : h.id === 'path.start'
                ? 'A · START'
                : h.id === 'path.end'
                  ? 'B · END'
                  : h.id === 'gate'
                    ? 'OPEN'
                    : 'PIVOT',
            h.p.x + 9 / s,
            h.p.y - 9 / s,
          );
          if (h.id === 'spring') {
            const a = rad(o.angle);
            c.beginPath();
            c.moveTo(h.p.x - (15 / s) * Math.cos(a - 0.45), h.p.y + (15 / s) * Math.sin(a - 0.45));
            c.lineTo(h.p.x, h.p.y);
            c.lineTo(h.p.x - (15 / s) * Math.cos(a + 0.45), h.p.y + (15 / s) * Math.sin(a + 0.45));
            c.stroke();
          }
          if (h.id === 'gate') {
            c.globalAlpha = 0.25;
            c.fillStyle = h.color;
            c.fillRect(h.p.x - o.w / 2, h.p.y - o.h / 2, o.w, o.h);
            c.globalAlpha = 1;
          }
        }
      }
      if (this.vertexMode && (r.kind === 'obstacle' || r.kind === 'boundary')) {
        p.forEach((v, i) => handle(v.x, v.y, i === this.vertex ? '#f04437' : '#e08a16'));
        if (r.kind === 'boundary')
          p.forEach((v, i) => {
            const n = p[(i + 1) % p.length];
            c.fillStyle = '#ffb657';
            c.fillRect((v.x + n.x) / 2 - 5 / s, (v.y + n.y) / 2 - 5 / s, 10 / s, 10 / s);
            c.strokeRect((v.x + n.x) / 2 - 5 / s, (v.y + n.y) / 2 - 5 / s, 10 / s, 10 / s);
          });
      } else if (this.selection.length === 1) {
        if (resizable(r)) for (const p of frame(l, r).handles) handle(p.x, p.y);
        if (rotatable(r)) {
          const x = b.x + b.w / 2,
            y = b.y - 32 / s;
          c.beginPath();
          c.moveTo(x, b.y);
          c.lineTo(x, y);
          c.stroke();
          handle(x, y, '#8356cc');
        }
      }
    }
    if (this.sketch.length) {
      path(this.sketch, false);
      c.strokeStyle = '#e47316';
      c.lineWidth = 3 / s;
      c.stroke();
      for (const p of this.sketch) {
        c.fillStyle = '#fff';
        c.beginPath();
        c.arc(p.x, p.y, 5 / s, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
    this.renderer.canvas.dataset.selection = this.selection.map(refKey).join(',');
    this.renderer.canvas.dataset.mode = this.tool;
    this.renderer.canvas.dataset.draftId = this.session.doc.draftId;
  }
  private command(name: string) {
    const l = this.session.doc.level,
      r = this.selection.at(-1);
    if (name === 'Preview') {
      this.previewPlaying = !this.previewPlaying;
      this.previewLast = performance.now();
      if (!this.previewPlaying) this.pausePreview();
      this.root.querySelector('[data-command="Preview"]')!.textContent = this.previewPlaying
        ? 'Ⅱ Pause preview'
        : '▶ Play preview';
      this.status(
        this.previewPlaying
          ? 'Motion preview only — no football simulation. Select or drag to pause.'
          : 'Preview paused; objects are editable.',
      );
      return;
    }
    if (name === 'Campaign') {
      try {
        this.session.commit();
        if (!campaign().warning) campaign().saveDraft(this.session.doc);
        this.rebuild();
      } catch (e) {
        this.status('Could not save current design: ' + String(e));
        return;
      }
      this.dialog('Campaign Manager', '', (panel) =>
        campaignManager(
          panel,
          (d) => {
            this.session.replace(d);
            this.selection = [];
            this.settings = true;
            this.changed();
            this.renderer.camera.fit();
          },
          () => this.command('New'),
          () => this.command('Import'),
          (value, importing, title) => this.jsonDialog(value, importing, title),
        ),
      );
      return;
    }
    if (name === 'Publish to Game') {
      this.session.commit();
      const repo = campaign(),
        position = this.session.doc.designId
          ? repo.data.order.indexOf(this.session.doc.designId) + 1
          : 0;
      this.dialog(
        'Publish to Game',
        `<p>Validate and publish this design to the playable campaign on <strong>this browser only</strong>. A new revision starts a fresh best score; older results remain stored. Export the campaign to promote it to a release.</p><label>Campaign position<input id="publish-position" aria-label="Publish position" type="number" min="1" max="${repo.data.order.length + 1}" value="${position || repo.data.order.length + 1}"></label><button id="confirm-publish">Save &amp; Publish</button><p id="publish-status" role="status"></p>`,
        (panel) => {
          panel.querySelector<HTMLButtonElement>('#confirm-publish')!.onclick = () => {
            try {
              repo.publish(
                this.session.doc,
                +panel.querySelector<HTMLInputElement>('#publish-position')!.value,
              );
              this.session.recover();
              panel.parentElement!.remove();
              this.rebuild();
              this.status('Published locally. Exit → Level Select to play the new revision.');
            } catch (e) {
              panel.querySelector('#publish-status')!.textContent = String(e);
            }
          };
        },
      );
      return;
    }
    if (name === 'Exit') {
      this.exit();
      return;
    }
    if (name === 'New') {
      this.dialog(
        'New level',
        `<p>Choose an empty frame. Undo can restore the current design.</p>${['rectangle', 'wide', 'tall', 'stepped', 'sloping floor', 'sloping ceiling', 'multi-platform', 'long scrolling', 'multi-section exploration'].map((t) => `<button data-template="${t}">${t}</button>`).join('')}`,
        (panel) =>
          panel.querySelectorAll<HTMLElement>('[data-template]').forEach(
            (b) =>
              (b.onclick = () => {
                this.session.replace(blank(b.dataset.template));
                this.selection = [];
                this.settings = true;
                this.changed();
                this.renderer.camera.fit();
                panel.parentElement!.remove();
              }),
          ),
      );
      return;
    }
    if (name === 'Load') {
      this.load();
      return;
    }
    if (name === 'Save Draft' || name === 'Save') {
      this.session.doc.modified = new Date().toISOString();
      try {
        campaign().saveDraft(this.session.doc);
        this.rebuild();
        this.session.recover();
        this.status(
          'Saved “' + l.name + '” on this browser. Use Export / Backup All for a permanent copy.',
        );
      } catch (error) {
        this.status(
          'Could not save: ' +
            (error instanceof Error ? error.message : 'browser storage is unavailable') +
            '. Your design remains open; use Backup All.',
        );
      }
      return;
    }
    if (name === 'Export' || name === 'Backup All') {
      if (name === 'Backup All') {
        try {
          campaign().saveDraft(this.session.doc);
        } catch (e) {
          this.status(
            'Storage could not save. The download still includes your open draft. ' + String(e),
          );
        }
      }
      if (name === 'Export' && validateLevel(l).some((i) => i.severity === 'error')) {
        this.status(
          'Fix validation errors before exporting a playable level. Backup All can preserve unfinished drafts.',
        );
        return;
      }
      const backup = structuredClone(campaign().data),
        doc = structuredClone(this.session.doc);
      doc.designId ??= `draft-${doc.draftId}`;
      const existing = backup.designs.find((d) => d.id === doc.designId);
      if (existing) existing.draft = doc;
      else
        backup.designs.push({
          id: doc.designId,
          draft: doc,
          history: [],
          archived: false,
          wasPublished: false,
        });
      const value = name === 'Export' ? this.session.doc : backup;
      this.jsonDialog(
        JSON.stringify(value, null, 2),
        false,
        name === 'Export' ? 'Export level' : 'Backup drafts and published campaign',
      );
      return;
    }
    if (name === 'Import') {
      this.jsonDialog('', true, 'Import level or backup');
      return;
    }
    if (name === 'Undo' || name === 'Redo') {
      this.session[name === 'Undo' ? 'undo' : 'redo']();
      this.selection = [];
      this.vertex = -1;
      this.changed();
      return;
    }
    if (name === 'Test Level') {
      if (validateLevel(l).some((i) => i.severity === 'error')) return;
      this.session.commit();
      this.test(structuredClone(l));
      return;
    }
    if (name === 'Select' || name === 'Pan') {
      this.tool = name === 'Pan' ? 'pan' : 'select';
      this.placing = null;
      this.sketch = [];
      this.status(
        name === 'Pan'
          ? 'Pan mode: drag to explore; objects stay fixed. Press V to select.'
          : 'Select mode: move objects or drag their handles. Shift-click selects a group.',
      );
      this.refreshTools();
      return;
    }
    if (name === 'Boundary') {
      this.selection = [{ kind: 'boundary', index: 0 }];
      this.settings = false;
      this.vertexMode = true;
      this.vertex = 0;
      this.tool = 'select';
      this.inspect();
      this.refreshTools();
      return;
    }
    if (name === 'Settings') {
      this.settings = true;
      this.inspect();
      return;
    }
    if (name === 'Fit') {
      this.renderer.camera.fit();
      this.dirty = true;
      return;
    }
    if (name === 'Zoom in' || name === 'Zoom out') {
      this.renderer.camera.zoomBy(name === 'Zoom in' ? 1.2 : 1 / 1.2);
      this.dirty = true;
      return;
    }
    if (name === 'Finish polygon') {
      const p = this.sketch,
        err = polygonError(p);
      if (err) {
        this.status('Polygon ' + err + '. Move/add points or Escape to cancel.');
        return;
      }
      this.session.change(() => {
        l.obstacles.push({ id: 'polygon-' + uid().slice(0, 8), points: structuredClone(p) });
        this.selection = [{ kind: 'obstacle', index: l.obstacles.length - 1 }];
      });
      this.sketch = [];
      this.tool = 'select';
      this.vertexMode = true;
      this.settings = false;
      this.changed();
      this.status('Polygon added. Drag vertices or choose Move / resize shape.');
      this.refreshTools();
      return;
    }
    if (name === 'Duplicate') {
      this.session.change(() => {
        this.selection = duplicate(l, this.selection);
      });
      this.changed();
      return;
    }
    if (name === 'Delete') {
      this.session.change(() => remove(l, this.selection));
      this.selection = [];
      this.changed();
      return;
    }
    if (!r) return;
    if (name === 'Align horizontal' || name === 'Align vertical') {
      this.session.change(() => {
        const p = object(l, r).points as Point[],
          a = p[Math.max(0, this.vertex)],
          b = p[(Math.max(0, this.vertex) + 1) % p.length];
        if (name === 'Align horizontal') b.y = a.y;
        else b.x = a.x;
        syncBoundary(l);
        snapGoal(l, l.goal);
      });
      this.changed();
      return;
    }
    if (name === 'Vertices') {
      this.vertexMode = !this.vertexMode;
      this.vertex = Math.max(0, this.vertex);
      this.inspect();
      this.dirty = true;
      return;
    }
    if (name === 'Insert vertex' || name === 'Remove vertex') {
      const p = object(l, r).points as Point[],
        index = Math.max(0, this.vertex);
      if (name === 'Remove vertex' && p.length <= 3) {
        this.status('A polygon needs at least three vertices.');
        return;
      }
      this.session.change(() => {
        if (name === 'Insert vertex') {
          const a = p[index],
            b = p[(index + 1) % p.length];
          p.splice(index + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          this.vertex = index + 1;
        } else {
          p.splice(index, 1);
          this.vertex = Math.min(index, p.length - 1);
        }
        if (r.kind === 'boundary') {
          syncBoundary(l);
          snapGoal(l, l.goal);
        }
      });
      this.vertexMode = true;
      this.changed();
      return;
    }
    if (name === 'Initial view') {
      const o = object(l, r);
      this.session.change(() => {
        l.camera!.initial = {
          x: o.x + l.camera!.viewWidth * 0.35,
          y: o.y + l.camera!.viewHeight * 0.7,
        };
      });
      this.status('This region is now the initial camera view.');
    }
  }
  private key(e: KeyboardEvent) {
    if (
      this.root.querySelector('[role="dialog"]') ||
      (e.target as HTMLElement).matches('input,textarea,select')
    )
      return;
    if (e.code === 'Space') {
      e.preventDefault();
      this.space = true;
    }
    const cmd = e.ctrlKey || e.metaKey;
    if (cmd && ['z', 'y', 's', 'd'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      this.command(
        e.key.toLowerCase() === 'z'
          ? e.shiftKey
            ? 'Redo'
            : 'Undo'
          : e.key.toLowerCase() === 'y'
            ? 'Redo'
            : e.key.toLowerCase() === 's'
              ? 'Save'
              : 'Duplicate',
      );
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      this.command('Delete');
    } else if (e.key === 'Escape') {
      if (this.drag && this.drag.type !== 'pan') {
        this.session.doc = structuredClone(this.drag.doc);
        this.drag = null;
        this.session.commit();
        this.changed();
        this.status('Manipulation cancelled.');
      }
      this.sketch = [];
      this.placing = null;
      this.tool = 'select';
      this.refreshTools();
    } else if (e.key === 'Enter' && this.tool === 'polygon') this.command('Finish polygon');
    else if (e.key.toLowerCase() === 'h') this.command('Pan');
    else if (e.key.toLowerCase() === 'v') this.command('Select');
    else if (e.key.toLowerCase() === 'f') this.command('Fit');
  }
  private dialog(title: string, html: string, bind: (panel: HTMLElement) => void) {
    const overlay = document.createElement('div');
    overlay.className = 'editor-dialog-backdrop';
    overlay.innerHTML = `<section class="editor-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button class="ed-dialog-close" aria-label="Close dialog">×</button><h2>${esc(title)}</h2>${html}</section>`;
    this.root.append(overlay);
    const panel = overlay.firstElementChild as HTMLElement;
    panel.querySelector<HTMLButtonElement>('.ed-dialog-close')!.onclick = () => overlay.remove();
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        overlay.remove();
      }
      if (e.key === 'Tab') {
        const focus = [...panel.querySelectorAll<HTMLElement>('button,input,select,textarea')];
        if (e.shiftKey && document.activeElement === focus[0]) {
          e.preventDefault();
          focus.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === focus.at(-1)) {
          e.preventDefault();
          focus[0]?.focus();
        }
      }
    });
    bind(panel);
    panel.querySelector<HTMLElement>('textarea,input,select,button')?.focus();
  }
  private load() {
    const saved = [
      ...campaign()
        .data.designs.filter(
          (d) =>
            !d.builtin || campaign().status(d) !== 'Published' || (d.published?.revision ?? 1) > 1,
        )
        .map((d) => d.draft),
      ...savedDrafts(),
    ];
    const uniqueSaved = saved.filter(
      (d, i) => saved.findIndex((x) => x.draftId === d.draftId) === i,
    );
    this.dialog(
      'Open draft or official copy',
      `<h3>Saved drafts</h3>${uniqueSaved.length ? uniqueSaved.map((d) => `<button class="saved-draft" data-load="${esc(d.draftId)}"><strong>${esc(d.level.name)}</strong><small>${esc(new Date(d.modified).toLocaleString('en-GB'))}</small></button>`).join('') : '<p>No saved drafts yet. Save your design first.</p>'}<h3>Copy an official level</h3><label>Official level <select id="ed-official">${levels.map((l) => `<option value="${l.id}">${l.id} · ${esc(l.name)}</option>`).join('')}</select></label><button id="ed-copy-official">Open editable copy</button>`,
      (panel) => {
        const open = (d: Draft) => {
          this.session.replace(d);
          this.selection = [];
          this.vertexMode = false;
          this.settings = true;
          this.changed();
          this.renderer.camera.fit();
          panel.parentElement!.remove();
          this.status('Opened an editable draft. Official definitions and scores are untouched.');
        };
        panel
          .querySelectorAll<HTMLElement>('[data-load]')
          .forEach(
            (b) => (b.onclick = () => open(saved.find((d) => d.draftId === b.dataset.load)!)),
          );
        panel.querySelector<HTMLButtonElement>('#ed-copy-official')!.onclick = () =>
          open(copyOfficial(+panel.querySelector<HTMLSelectElement>('#ed-official')!.value));
      },
    );
  }
  private jsonDialog(value: string, importing: boolean, title: string) {
    this.dialog(
      title,
      `<p>${importing ? 'Paste a level/draft/backup JSON, or select a file. Individual imports create a new draft copy. Campaign imports explicitly replace the active order and published editions.' : title === 'Export level' ? 'Native level data is inside the versioned draft envelope. Keep a downloaded copy outside browser storage.' : 'This portable campaign contains ordering, published revisions, history and editable drafts. Download it for backup or import it in another browser. Publishing locally does not update GitHub.'}</p><textarea aria-label="Level JSON" id="ed-json" spellcheck="false">${esc(value)}</textarea>${importing ? '<input type="file" accept=".json,application/json" id="ed-file" aria-label="Import JSON file"><button id="ed-apply-import">Import JSON</button>' : '<button id="ed-download">Download JSON</button><button id="ed-copy-json">Copy JSON</button>'}<p id="ed-json-status" role="status"></p>`,
      (panel) => {
        const box = panel.querySelector<HTMLTextAreaElement>('#ed-json')!,
          status = panel.querySelector<HTMLElement>('#ed-json-status')!;
        if (importing) {
          box.addEventListener('paste', (e) => {
            const text = e.clipboardData?.getData('text/plain');
            if (text && text.length > 10000) {
              e.preventDefault();
              box.value = text;
              status.textContent = 'JSON pasted. Choose Import JSON to validate it.';
            }
          });
          panel.querySelector<HTMLInputElement>('#ed-file')!.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              if (file.size > 20_000_000) {
                status.textContent = 'File exceeds the 20 MB campaign import limit.';
                return;
              }
              box.value = await file.text();
            }
          };
          panel.querySelector<HTMLButtonElement>('#ed-apply-import')!.onclick = () => {
            try {
              if (JSON.parse(box.value)?.format === 'goal-in-one-campaign') {
                if (
                  !confirm(
                    'Replace the active campaign with this file? Displaced designs remain archived. Export a backup first for exact recovery.',
                  )
                )
                  return;
                campaign().import(box.value);
                panel.parentElement!.remove();
                this.status('Campaign imported. Open Campaign to organise it; Exit to play.');
                return;
              }
              const d = parseDraft(box.value);
              if (Array.isArray(d)) {
                for (const draft of d) {
                  draft.draftId = uid();
                  delete draft.designId;
                  storeDraft(draft);
                  campaign().saveDraft(draft);
                }
                status.textContent = `Imported ${d.length} draft copies. Open them from Load.`;
                return;
              }
              d.draftId = uid();
              delete d.designId;
              this.session.replace(d);
              this.selection = [];
              this.settings = true;
              this.changed();
              this.renderer.camera.fit();
              panel.parentElement!.remove();
              this.status('Imported a new editable copy. Check validation before testing.');
            } catch (e) {
              status.textContent = e instanceof Error ? e.message : 'Invalid JSON.';
            }
          };
        } else {
          panel.querySelector<HTMLButtonElement>('#ed-download')!.onclick = () => {
            const blob = new Blob([box.value], { type: 'application/json' }),
              url = URL.createObjectURL(blob),
              link = document.createElement('a');
            link.href = url;
            link.download =
              title === 'Export level'
                ? `goal-in-one-${this.session.doc.level.id}.json`
                : 'goal-in-one-campaign.json';
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = 'JSON download created.';
          };
          panel.querySelector<HTMLButtonElement>('#ed-copy-json')!.onclick = async () => {
            try {
              await navigator.clipboard.writeText(box.value);
              status.textContent = 'Copied.';
            } catch {
              box.select();
              status.textContent = 'Select and copy the JSON from this box.';
            }
          };
        }
      },
    );
  }
}
