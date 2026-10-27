import bundled from './data/campaign-release.json';
import { levels as originals, type Level } from './levels';
import { copyOfficial, parseDraft, savedDrafts, uid, type Draft } from './editor/model';
import { validateLevel } from './editor/validation';
export const CAMPAIGN_KEY = 'goal-in-one:campaign:v1';
export type Edition = {
  revision: number;
  date: string;
  level: Level;
  difficulty?: number;
  tags?: string[];
};
export type Design = {
  id: string;
  builtin?: number;
  draft: Draft;
  published?: Edition;
  history: Edition[];
  archived: boolean;
  wasPublished: boolean;
};
export type CampaignData = {
  format: 'goal-in-one-campaign';
  version: 1;
  order: string[];
  designs: Design[];
};
type Store = Pick<Storage, 'getItem' | 'setItem'>;
const clone = <T>(x: T): T => structuredClone(x);
const now = () => new Date().toISOString();
export const scoreKey = (l: Level) => `${l.campaignId ?? `builtin-${l.id}`}@${l.revision ?? 1}`;
function initial(): CampaignData {
  return {
    format: 'goal-in-one-campaign',
    version: 1,
    order: originals.map((l) => `builtin-${l.id}`),
    designs: originals.map((l) => {
      const draft = copyOfficial(l.id);
      draft.level.name = l.name;
      draft.designId = `builtin-${l.id}`;
      return {
        id: draft.designId,
        builtin: l.id,
        draft,
        published: {
          revision: 1,
          date: now(),
          level: clone(l),
          difficulty: draft.difficulty,
          tags: [],
        },
        history: [],
        archived: false,
        wasPublished: true,
      };
    }),
  };
}
function checkedDraft(raw: unknown): Draft {
  const d = parseDraft(JSON.stringify(raw));
  if (Array.isArray(d)) throw Error('Expected a single design.');
  return d;
}
export function parseCampaign(text: string): CampaignData {
  if (text.length > 20_000_000) throw Error('Campaign exceeds 20 MB.');
  const r = JSON.parse(text);
  if (
    r?.format !== 'goal-in-one-campaign' ||
    r.version !== 1 ||
    !Array.isArray(r.designs) ||
    !Array.isArray(r.order) ||
    r.designs.length > 2000
  )
    throw Error('Unsupported campaign format/version (maximum 2,000 designs).');
  const ids = new Set<string>();
  const designs: Design[] = r.designs.map((d: any) => {
    if (typeof d.id !== 'string' || !d.id || d.id.length > 120 || ids.has(d.id))
      throw Error('Design IDs must be unique nonempty strings.');
    ids.add(d.id);
    const edition = (e: any): Edition => {
      if (!Number.isInteger(e?.revision) || e.revision < 1 || typeof e.date !== 'string')
        throw Error('Invalid published revision.');
      const level = checkedDraft(e.level).level;
      const errors = validateLevel(level).filter((i) => i.severity === 'error');
      if (errors.length) throw Error(`Published ${d.id}: ${errors[0].message}`);
      // Preserve native legacy contours exactly; parseDraft above is the structural check.
      const native = clone(e.level) as Level;
      if (level.boostVersion === 2 && native.boostVersion !== 2) {
        native.boostVersion = 2;
        native.surfaces = level.surfaces;
      }
      if (
        e.difficulty !== undefined &&
        (!Number.isInteger(e.difficulty) || e.difficulty < 1 || e.difficulty > 5)
      )
        throw Error('Published difficulty must be 1–5.');
      if (
        e.tags !== undefined &&
        (!Array.isArray(e.tags) ||
          e.tags.length > 20 ||
          e.tags.some((t: unknown) => typeof t !== 'string' || t.length > 2000))
      )
        throw Error('Invalid published tags.');
      return {
        revision: e.revision,
        date: e.date,
        level: native,
        ...(e.difficulty !== undefined ? { difficulty: e.difficulty } : {}),
        ...(e.tags !== undefined ? { tags: clone(e.tags) } : {}),
      };
    };
    const draft = checkedDraft(d.draft);
    draft.designId = d.id;
    return {
      id: d.id,
      ...(Number.isInteger(d.builtin) && originals.some((l) => l.id === d.builtin)
        ? { builtin: d.builtin }
        : {}),
      draft,
      ...(d.published ? { published: edition(d.published) } : {}),
      history: Array.isArray(d.history) ? d.history.slice(-5).map(edition) : [],
      archived: !!d.archived,
      wasPublished: !!d.wasPublished,
    };
  });
  if (
    new Set(r.order).size !== r.order.length ||
    r.order.some(
      (id: unknown) =>
        typeof id !== 'string' || !designs.some((d) => d.id === id && d.published && !d.archived),
    )
  )
    throw Error('Campaign order contains missing, duplicate or unpublished designs.');
  if (designs.some((d) => d.published && !d.archived && !r.order.includes(d.id)))
    throw Error('A published design is missing from campaign order.');
  return { format: 'goal-in-one-campaign', version: 1, designs, order: [...r.order] };
}
export class CampaignRepository {
  data: CampaignData;
  warning = '';
  constructor(private storage?: Store) {
    this.data = bundled.campaign ? parseCampaign(JSON.stringify(bundled.campaign)) : initial();
    try {
      const text = storage?.getItem(CAMPAIGN_KEY);
      if (text) this.data = parseCampaign(text);
    } catch (e) {
      this.warning =
        'Campaign data could not be read. Originals are available; stored data is retained until you explicitly save or restore. ' +
        String(e);
    }
    // Migrate old independent drafts without overwriting them or the original collection.
    let hasSaved = false;
    try {
      hasSaved = !!storage?.getItem(CAMPAIGN_KEY);
    } catch {}
    if (!hasSaved)
      for (const draft of savedDrafts()) {
        const id = draft.designId ?? `draft-${draft.draftId}`;
        if (!this.data.designs.some((d) => d.id === id))
          this.data.designs.push({
            id,
            draft: { ...draft, designId: id },
            history: [],
            archived: false,
            wasPublished: false,
          });
      }
  }
  private change(fn: (next: CampaignData) => void) {
    const next = clone(this.data);
    fn(next);
    if (next.designs.length > 2000)
      throw Error(
        'Collection including archived recovery designs exceeds the 2,000-design limit. Export backups and use a fresh browser profile for this import.',
      );
    // Persist before exposing the mutation; a quota error cannot report a false publish.
    this.storage?.setItem(CAMPAIGN_KEY, JSON.stringify(next));
    this.data = next;
    this.warning = '';
  }
  playable(): Level[] {
    return this.data.order.map((id, i) => {
      const d = this.data.designs.find((d) => d.id === id)!;
      return {
        ...clone(d.published!.level),
        id: i + 1,
        campaignId: id,
        revision: d.published!.revision,
      };
    });
  }
  find(id: string) {
    return this.data.designs.find((d) => d.id === id);
  }
  status(d: Design) {
    if (d.archived) return 'Archived';
    if (!d.published) return d.wasPublished ? 'Unpublished' : 'Draft';
    const a = clone(d.draft.level),
      b =
        d.builtin && d.published.revision === 1
          ? copyOfficial(d.builtin).level
          : checkedDraft(d.published.level).level;
    if (d.builtin && d.published.revision === 1)
      b.name = originals.find((l) => l.id === d.builtin)!.name;
    for (const l of [a, b]) {
      delete l.campaignId;
      delete l.revision;
      l.id = 1;
    }
    const difficulty =
      d.published.difficulty ??
      (d.builtin ? (originals.find((l) => l.id === d.builtin)?.design?.difficulty ?? 2) : 2);
    return JSON.stringify(a) === JSON.stringify(b) &&
      d.draft.difficulty === difficulty &&
      JSON.stringify(d.draft.tags) === JSON.stringify(d.published.tags ?? [])
      ? 'Published'
      : 'Published · newer draft';
  }
  saveDraft(draft: Draft): string {
    const safe = checkedDraft(draft),
      id = draft.designId ?? `design-${uid()}`;
    safe.designId = id;
    this.change((n) => {
      const old = n.designs.find((d) => d.id === id);
      if (old) old.draft = safe;
      else n.designs.push({ id, draft: safe, history: [], archived: false, wasPublished: false });
    });
    draft.designId = id;
    return id;
  }
  publish(draft: Draft, position?: number): string {
    const safe = checkedDraft(draft),
      errors = validateLevel(safe.level).filter((i) => i.severity === 'error');
    if (errors.length) throw Error(errors.map((i) => i.message).join(' '));
    if (!Number.isInteger(safe.difficulty) || safe.difficulty < 1 || safe.difficulty > 5)
      throw Error('Difficulty must be a whole number from 1 to 5 before publication.');
    if (safe.tags.some((t) => t.length > 2000))
      throw Error('Tags must be at most 2,000 characters before publication.');
    const id = draft.designId ?? `design-${uid()}`;
    safe.designId = id;
    this.change((n) => {
      let d = n.designs.find((d) => d.id === id);
      if (!d) {
        d = { id, draft: safe, history: [], archived: false, wasPublished: false };
        n.designs.push(d);
      }
      const revision =
        Math.max(d.published?.revision ?? 0, ...d.history.map((e) => e.revision), 0) + 1;
      if (d.published) d.history.push(d.published);
      d.history = d.history.slice(-5);
      d.draft = safe;
      d.archived = false;
      d.wasPublished = true;
      const level = clone(safe.level);
      delete level.campaignId;
      delete level.revision;
      d.published = {
        revision,
        date: now(),
        level,
        difficulty: safe.difficulty,
        tags: clone(safe.tags),
      };
      if (n.order.includes(id) && position !== undefined) n.order = n.order.filter((x) => x !== id);
      if (!n.order.includes(id))
        n.order.splice(
          Math.max(0, Math.min(n.order.length, (position ?? n.order.length + 1) - 1)),
          0,
          id,
        );
    });
    draft.designId = id;
    return id;
  }
  move(id: string, position: number) {
    this.change((n) => {
      const i = n.order.indexOf(id);
      if (i < 0) throw Error('Publish this design before ordering it.');
      n.order.splice(i, 1);
      n.order.splice(Math.max(0, Math.min(n.order.length, Math.round(position) - 1)), 0, id);
    });
  }
  unpublish(id: string) {
    this.change((n) => {
      const d = n.designs.find((d) => d.id === id)!;
      if (d.published) {
        d.history.push(d.published);
        d.history = d.history.slice(-5);
        delete d.published;
      }
      n.order = n.order.filter((x) => x !== id);
    });
  }
  archive(id: string) {
    this.change((n) => {
      const d = n.designs.find((d) => d.id === id)!;
      d.archived = true;
      n.order = n.order.filter((x) => x !== id);
    });
  }
  restore(id: string, position?: number) {
    this.change((n) => {
      const d = n.designs.find((d) => d.id === id)!;
      d.archived = false;
      if (d.published && !n.order.includes(id))
        n.order.splice(
          Math.max(0, Math.min(n.order.length, (position ?? n.order.length + 1) - 1)),
          0,
          id,
        );
    });
  }
  duplicate(id: string): Draft {
    const draft = clone(this.find(id)!.draft);
    delete draft.designId;
    draft.draftId = uid();
    draft.level.name += ' — copy';
    draft.modified = now();
    this.saveDraft(draft);
    return draft;
  }
  restoreRevision(id: string, revision: number) {
    const d = this.find(id)!;
    const e = d.history.find((e) => e.revision === revision);
    if (!e) throw Error('Revision not available.');
    const draft = { ...clone(d.draft), level: checkedDraft(e.level).level, modified: now() };
    this.publish(draft);
  }
  reset() {
    const originalsData = initial();
    this.change((n) => {
      // Preserve all local designs/drafts in the collection, but restore the original playable order.
      const extras = n.designs.filter((d) => !d.builtin).map((d) => ({ ...d, archived: true }));
      const edited = n.designs
        .filter(
          (d) => d.builtin && (this.status(d) !== 'Published' || (d.published?.revision ?? 1) > 1),
        )
        .map((d) => {
          const id = `recovered-${uid()}`;
          return {
            ...d,
            id,
            builtin: undefined,
            archived: true,
            draft: {
              ...d.draft,
              designId: id,
              level: { ...d.draft.level, name: d.draft.level.name + ' — before restore' },
            },
          };
        });
      Object.assign(n, originalsData);
      n.designs.push(...extras, ...edited);
    });
  }
  export() {
    return JSON.stringify(this.data, null, 2);
  }
  import(text: string) {
    const incoming = parseCampaign(text);
    this.change((n) => {
      for (const next of incoming.designs) {
        const old = n.designs.find((d) => d.id === next.id);
        if (
          old?.published &&
          next.published &&
          JSON.stringify(old.published.level) !== JSON.stringify(next.published.level)
        ) {
          const highest = Math.max(old.published.revision, ...old.history.map((e) => e.revision));
          next.published.revision = Math.max(next.published.revision, highest + 1);
        }
      }
      // Replacement is explicit, but displaced local work remains archived and recoverable.
      const keep = n.designs.flatMap((d) => {
        const other = incoming.designs.find((x) => x.id === d.id);
        if (!other) return [{ ...d, archived: true }];
        if (JSON.stringify(d) === JSON.stringify(other)) return [];
        // Never lose local work when an imported file reuses a permanent identifier.
        const id = `recovered-${uid()}`;
        return [
          {
            ...d,
            id,
            builtin: undefined,
            archived: true,
            draft: {
              ...d.draft,
              designId: id,
              level: { ...d.draft.level, name: d.draft.level.name + ' — before import' },
            },
          },
        ];
      });
      Object.assign(n, incoming);
      n.designs.push(...keep);
    });
  }
}
let instance: CampaignRepository | undefined;
export function campaign() {
  if (!instance) {
    let storage: Storage | undefined;
    try {
      storage = localStorage;
    } catch {}
    const unavailable = {
      getItem: () => {
        throw Error('Browser storage is unavailable.');
      },
      setItem: () => {
        throw Error('Browser storage is unavailable; download a backup.');
      },
    };
    instance = new CampaignRepository(storage ?? unavailable);
  }
  return instance;
}
