import { readFileSync, writeFileSync } from 'node:fs';
import { parseCampaign } from '../src/campaign';
import { parseDraft, type Draft } from '../src/editor/model';
const file = process.argv[2];
if (!file) throw Error('Usage: npm run campaign:bundle -- /path/to/exported-campaign.json');
const campaign = parseCampaign(readFileSync(file, 'utf8'));
// Ship only the selected playable collection. Unpublished drafts/history stay in the backup.
campaign.designs = campaign.order.map((id) => {
  const d = campaign.designs.find((d) => d.id === id)!;
  const draft = parseDraft(JSON.stringify(d.published!.level)) as Draft;
  draft.designId = d.id;
  draft.draftId = d.draft.draftId;
  draft.difficulty = d.published!.difficulty ?? d.draft.difficulty;
  draft.tags = d.published!.tags ?? d.draft.tags;
  draft.modified = d.published!.date;
  return { ...d, draft, history: [], archived: false };
});
const destination = new URL('../src/data/campaign-release.json', import.meta.url);
writeFileSync(
  destination,
  JSON.stringify({ format: 'goal-in-one-campaign-release', version: 1, campaign }, null, 2) + '\n',
);
console.log(
  `Bundled ${campaign.order.length} approved published levels. Review src/data/campaign-release.json, run tests/build, then commit and deploy. No remote changes were made.`,
);
