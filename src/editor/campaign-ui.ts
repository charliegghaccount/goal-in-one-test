import { levelThumbnail } from '../thumbnail';
import { campaign, type Design } from '../campaign';
import type { Draft } from './model';
const esc = (v: unknown) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const thumbnail = (d: Design) => levelThumbnail(d.draft.level, 'campaign-thumb');
export function campaignManager(
  panel: HTMLElement,
  open: (d: Draft) => void,
  onNew: () => void,
  onImport: () => void,
  json: (text: string, importing: boolean, title: string) => void,
) {
  const repo = campaign();
  panel.classList.add('campaign-manager');
  let search = '',
    filter = 'all',
    dragId = '';
  const run = (fn: () => void) => {
    try {
      fn();
      render();
    } catch (e) {
      panel.querySelector<HTMLElement>('.campaign-status')!.textContent = String(e);
    }
  };
  const close = () => panel.parentElement!.remove();
  const render = () => {
    const oldFocus = document.activeElement?.getAttribute('aria-label');
    panel.innerHTML = `<button class="ed-dialog-close" aria-label="Close dialog">×</button><h2>CAMPAIGN MANAGER</h2><p><strong>${repo.data.order.length} playable levels</strong> · Publishing changes this browser only. Export a release to deploy it on other devices.</p><div class="campaign-actions"><button data-top="new">New level</button><button data-top="import-level">Import level</button><button data-top="export">Export entire campaign</button><button data-top="import">Import entire campaign</button><button data-top="backup">Backup everything</button><button data-top="reset">Restore original campaign</button></div><div class="campaign-filter"><label>Find level<input aria-label="Find level" value="${esc(search)}" placeholder="Name or permanent ID"></label><label>Show<select aria-label="Campaign filter">${['all', 'published', 'draft', 'unpublished', 'archived'].map((v) => `<option value="${v}" ${v === filter ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div><p class="campaign-status" role="status">${esc(repo.warning || 'Drag a published card onto another to reorder, or use its position field. Originals remain recoverable templates.')}</p><div class="campaign-cards"></div>`;
    panel.querySelector<HTMLButtonElement>('.ed-dialog-close')!.onclick = close;
    const ordered = [
      ...repo.data.order.map((id) => repo.find(id)!),
      ...repo.data.designs.filter((d) => !repo.data.order.includes(d.id)),
    ];
    panel.querySelector('.campaign-cards')!.innerHTML =
      ordered
        .filter((d) => {
          const status = repo.status(d).toLowerCase();
          return (
            (!search ||
              (d.draft.level.name + ' ' + d.id).toLowerCase().includes(search.toLowerCase())) &&
            (filter === 'all' ||
              (filter === 'published' ? status.startsWith(filter) : status === filter))
          );
        })
        .map((d) => {
          const pos = repo.data.order.indexOf(d.id) + 1,
            status = repo.status(d);
          return `<article class="campaign-card ${d.archived ? 'archived' : ''}" draggable="${pos > 0}" data-design="${esc(d.id)}">${thumbnail(d)}<div class="campaign-card-content"><h3>${pos ? `${pos}. ` : ''}${esc(d.draft.level.name)}</h3><span class="publication-status">${esc(status)}${d.published ? ' · r' + d.published.revision : ''}</span><small>Difficulty ${d.draft.difficulty}/5 · ${esc(new Date(d.draft.modified).toLocaleString('en-GB'))}</small><code>${esc(d.id)}</code>${pos ? `<label>Campaign position<input aria-label="Position for ${esc(d.draft.level.name)}" data-position type="number" min="1" max="${repo.data.order.length}" value="${pos}"></label>` : ''}<div class="campaign-row-actions"><button data-row="edit">Open / Edit</button><button data-row="duplicate">Duplicate</button><button data-row="rename">Rename</button>${d.archived ? '<button data-row="restore">Restore</button>' : `<button data-row="publish">Publish</button>${d.published ? '<button data-row="unpublish">Unpublish</button>' : ''}<button data-row="archive">Archive</button>`}<button data-row="export">Export level</button>${d.history.length ? '<button data-row="history">Version history</button>' : ''}</div></div></article>`;
        })
        .join('') || '<p>No designs match this filter.</p>';
    const find = panel.querySelector<HTMLInputElement>('[aria-label="Find level"]')!;
    find.oninput = () => {
      const start = find.selectionStart;
      search = find.value;
      render();
      const f = panel.querySelector<HTMLInputElement>('[aria-label="Find level"]')!;
      f.focus();
      f.setSelectionRange(start, start);
    };
    panel.querySelector<HTMLSelectElement>('[aria-label="Campaign filter"]')!.onchange = (e) => {
      filter = (e.target as HTMLSelectElement).value;
      render();
    };
    panel.querySelectorAll<HTMLElement>('[data-top]').forEach(
      (b) =>
        (b.onclick = () => {
          if (b.dataset.top === 'new') {
            close();
            onNew();
          }
          if (b.dataset.top === 'import-level') {
            close();
            onImport();
          }
          if (b.dataset.top === 'export' || b.dataset.top === 'backup') {
            close();
            json(
              repo.export(),
              false,
              b.dataset.top === 'backup'
                ? 'Backup drafts and published campaign'
                : 'Export entire campaign',
            );
          }
          if (b.dataset.top === 'import') {
            close();
            json('', true, 'Import entire campaign');
          }
          if (
            b.dataset.top === 'reset' &&
            confirm(
              'Restore the original playable campaign? Local edits will be kept as archived recovery designs. Export a backup first for an exact copy.',
            )
          )
            run(() => repo.reset());
        }),
    );
    panel.querySelectorAll<HTMLElement>('[data-design]').forEach((card) => {
      const id = card.dataset.design!,
        d = repo.find(id)!;
      card.ondragstart = (e) => {
        if ((e.target as HTMLElement).closest('input,button')) {
          e.preventDefault();
          return;
        }
        dragId = id;
        e.dataTransfer!.setData('text/plain', id);
        e.dataTransfer!.effectAllowed = 'move';
      };
      card.ondragover = (e) => {
        if (repo.data.order.includes(id)) {
          e.preventDefault();
          card.classList.add('drop-target');
        }
      };
      card.ondragleave = () => card.classList.remove('drop-target');
      card.ondrop = (e) => {
        e.preventDefault();
        const moving = dragId || e.dataTransfer!.getData('text/plain');
        if (repo.data.order.includes(moving))
          run(() => repo.move(moving, repo.data.order.indexOf(id) + 1));
      };
      const position = card.querySelector<HTMLInputElement>('[data-position]');
      if (position) position.onchange = () => run(() => repo.move(id, +position.value));
      card.querySelectorAll<HTMLElement>('[data-row]').forEach(
        (b) =>
          (b.onclick = () => {
            switch (b.dataset.row) {
              case 'edit':
                close();
                open(structuredClone(d.draft));
                break;
              case 'duplicate':
                run(() => {
                  repo.duplicate(id);
                });
                break;
              case 'rename': {
                const name = prompt('Level name', d.draft.level.name);
                if (name?.trim())
                  run(() => {
                    const draft = structuredClone(d.draft);
                    draft.level.name = name.trim();
                    draft.modified = new Date().toISOString();
                    repo.saveDraft(draft);
                  });
                break;
              }
              case 'publish':
                run(() => {
                  repo.publish(d.draft);
                });
                break;
              case 'unpublish':
                run(() => repo.unpublish(id));
                break;
              case 'archive':
                run(() => repo.archive(id));
                break;
              case 'restore':
                run(() => repo.restore(id));
                break;
              case 'export':
                close();
                json(JSON.stringify(d.draft, null, 2), false, 'Export level');
                break;
              case 'history': {
                const rev = prompt(
                  'Restore a published revision as a new revision: ' +
                    d.history.map((e) => `${e.revision} (${e.date.slice(0, 10)})`).join(', '),
                );
                if (rev) run(() => repo.restoreRevision(id, +rev));
                break;
              }
            }
          }),
      );
    });
    if (oldFocus === 'Campaign filter')
      panel.querySelector<HTMLElement>('[aria-label="Campaign filter"]')?.focus();
  };
  render();
}
