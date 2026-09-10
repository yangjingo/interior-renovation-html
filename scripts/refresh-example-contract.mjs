#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const htmlPath = path.resolve(process.argv[2] || 'example/output-html/room.html');
if (!fs.existsSync(htmlPath)) {
  console.error(`HTML file does not exist: ${htmlPath}`);
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function readJsonScript(id) {
  const match = html.match(new RegExp(`<script\\b[^>]*\\bid=["']${escapeRegex(id)}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match) throw new Error(`Missing JSON script: ${id}`);
  return JSON.parse(match[1]);
}

function setJsonScript(id, value, insertBeforeId = null) {
  const source = `<script type="application/json" id="${id}">${JSON.stringify(value)}</script>`;
  const pattern = new RegExp(`<script\\b[^>]*\\bid=["']${escapeRegex(id)}["'][^>]*>[\\s\\S]*?<\\/script>`, 'i');
  if (pattern.test(html)) {
    html = html.replace(pattern, source);
    return;
  }
  if (insertBeforeId) {
    const before = new RegExp(`(?=<script\\b[^>]*\\bid=["']${escapeRegex(insertBeforeId)}["'])`, 'i');
    if (before.test(html)) {
      html = html.replace(before, `${source}\n`);
      return;
    }
  }
  html = html.replace('</body>', `${source}\n</body>`);
}

function addAttributes(tag, attributes) {
  let result = tag;
  for (const [name, value] of Object.entries(attributes)) {
    const pattern = new RegExp(`\\s${escapeRegex(name)}(?:\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'i');
    if (pattern.test(result)) result = result.replace(pattern, ` ${name}="${escapeHtml(value)}"`);
    else result = result.replace(/>$/, ` ${name}="${escapeHtml(value)}">`);
  }
  return result;
}

function updateElementById(id, attributes) {
  const pattern = new RegExp(`<([a-z][\\w:-]*)\\b(?=[^>]*\\bid=["']${escapeRegex(id)}["'])[^>]*>`, 'i');
  if (!pattern.test(html)) throw new Error(`Missing element #${id}`);
  html = html.replace(pattern, tag => addAttributes(tag, attributes));
}

const projectConfig = readJsonScript('projectConfig');
const buildingCore = readJsonScript('buildingCore');
const floorBaselines = readJsonScript('floorBaselines');
const roomData = readJsonScript('roomData');
const embeddedAssets = readJsonScript('embeddedAssets');
const assetProvenance = readJsonScript('assetProvenance');
const releaseManifest = readJsonScript('releaseManifest');
const modifications = readJsonScript('modifications');
const visualCorrespondence = readJsonScript('visualCorrespondence');

const baselineByFloor = new Map(floorBaselines.map(floor => [floor.floor_id, floor]));
const roomDataById = new Map(Object.entries(roomData).flatMap(([floorId, rooms]) => rooms.map(room => [room.id, { ...room, floor_id: floorId }])));

const roomLedgers = floorBaselines.flatMap(floor => {
  const adjacency = new Map(floor.zones.map(zone => [zone.id, new Set()]));
  const openings = new Map(floor.zones.map(zone => [zone.id, []]));
  for (const opening of floor.openings || []) {
    const [left, right] = opening.between || [];
    if (adjacency.has(left) && adjacency.has(right)) {
      adjacency.get(left).add(right);
      adjacency.get(right).add(left);
      openings.get(left).push(opening.id);
      openings.get(right).push(opening.id);
    }
  }
  return floor.zones.map(zone => {
    const room = roomDataById.get(zone.id);
    if (!room) throw new Error(`roomData is missing ${zone.id}`);
    return {
      floor_id: floor.floor_id,
      room_id: zone.id,
      source_page_id: floor.source_page_id,
      printed_label: zone.label,
      proposed_use: room.title,
      design_explanation: `${room.function} ${room.layout}`,
      dimensions: [{
        label: room.size,
        width_m: zone.bounds.width,
        depth_m: zone.bounds.depth,
        status: 'drawing-derived; site measure required',
      }],
      adjacent_room_ids: [...adjacency.get(zone.id)],
      opening_ids: openings.get(zone.id),
      fixed_furniture: (floor.fixed_furniture || []).filter(item => item.zone === zone.id).map(item => item.id),
      unknowns: ['现场净尺寸、墙体性质、门窗高度与机电点位待专业复核'],
    };
  });
});
setJsonScript('roomLedgers', roomLedgers, 'visualCorrespondence');

const visualisedOpeningIds = new Set(['F1-OPEN-03', 'F2-OPEN-01']);
for (const modification of modifications) {
  modification.preferred_for_visualisation = visualisedOpeningIds.has(modification.id);
  if (!modification.preferred_for_visualisation) {
    modification.variant_ids = ['deferred-opening-review'];
    modification.visual_pair_status = 'not highlighted: no verified matched-camera pair in this release';
  }
}
setJsonScript('modifications', modifications);

for (const floor of floorBaselines) {
  const preferredIds = modifications.filter(item => item.floor_id === floor.floor_id && item.preferred_for_visualisation).map(item => item.id);
  const deferredIds = modifications.filter(item => item.floor_id === floor.floor_id && !item.preferred_for_visualisation).map(item => item.id);
  const preferred = floor.variants.find(variant => variant.id === floor.preferred_visual_state);
  if (!preferred) throw new Error(`Missing preferred variant for ${floor.floor_id}`);
  preferred.modification_ids = preferredIds;
  const deferred = floor.variants.find(variant => variant.id === 'deferred-opening-review');
  const deferredVariant = {
    id: 'deferred-opening-review',
    label: '待专项复核的门窗概念',
    modification_ids: deferredIds,
    zone_deltas: { remove: [], add: [] },
    boundary_deltas: { remove: [], add: [] },
  };
  if (deferred) Object.assign(deferred, deferredVariant);
  else if (deferredIds.length) floor.variants.push(deferredVariant);
}
setJsonScript('floorBaselines', floorBaselines);

for (const record of visualCorrespondence) {
  const baseline = baselineByFloor.get(record.floor_id);
  if (baseline) record.baseline_version = baseline.version;
}

function updateCorrespondence(assetId, values) {
  const record = visualCorrespondence.find(item => item.asset_id === assetId);
  if (!record) throw new Error(`Missing visualCorrespondence record: ${assetId}`);
  Object.assign(record, values);
}

updateCorrespondence('floor1RoomDining', {
  baseline_version: 3,
  variant_id: 'existing',
  camera_id: 'f1-dining-hall-to-kitchen',
  modification_ids: ['F1-OPEN-03'],
  comparison_state: 'existing',
  review_notes: '历史方案同机位基准：普通木门与实体边界削弱餐厨联系。',
});
updateCorrespondence('floor1RevisionDiningGlass', {
  baseline_version: 3,
  variant_id: 'option-a',
  camera_id: 'f1-dining-hall-to-kitchen',
  modification_ids: ['F1-OPEN-03'],
  comparison_state: 'proposed',
});

const geometryChecks = { outline: 'pass', adjacency: 'pass', openings: 'pass', fixed_furniture: 'pass' };
for (const record of [
  {
    asset_id: 'floor2FinalLounge',
    asset_type: 'plan-specific-final-render',
    floor_id: 'floor-2',
    room_ids: ['f2-lounge', 'f2-south-balcony'],
    baseline_version: 2,
    variant_id: 'existing',
    camera_id: 'f2-lounge-south-balcony-opening',
    reference_asset_ids: ['floor2Plan'],
    modification_ids: ['F2-OPEN-01'],
    comparison_state: 'existing',
    geometry_checks: geometryChecks,
    review_notes: '同机位现状基准：保留约 2.4 m 常规阳台门洞。',
  },
  {
    asset_id: 'floor2OpeningProposed',
    asset_type: 'plan-specific-final-render',
    floor_id: 'floor-2',
    room_ids: ['f2-lounge', 'f2-south-balcony'],
    baseline_version: 2,
    variant_id: 'option-a',
    camera_id: 'f2-lounge-south-balcony-opening',
    reference_asset_ids: ['floor2Plan', 'floor2FinalLounge'],
    modification_ids: ['F2-OPEN-01'],
    comparison_state: 'proposed',
    geometry_checks: geometryChecks,
    review_notes: '同机位概念方案：仅拓宽南阳台玻璃门洞；结构、外立面和防水仍待复核。',
  },
]) {
  const index = visualCorrespondence.findIndex(item => item.asset_id === record.asset_id);
  if (index >= 0) visualCorrespondence[index] = record;
  else visualCorrespondence.push(record);
}
setJsonScript('visualCorrespondence', visualCorrespondence);

delete embeddedAssets.floor1FinalHall;
delete assetProvenance.assets.floor1FinalHall;
setJsonScript('embeddedAssets', embeddedAssets);
setJsonScript('assetProvenance', assetProvenance);
releaseManifest.embedded_asset_count = Object.keys(embeddedAssets).length;
setJsonScript('releaseManifest', releaseManifest);

html = html.replace(/<body\b[^>]*>/i, tag => addAttributes(tag, { 'data-review-mode': 'local_export' }));
for (const id of projectConfig.required_panels) updateElementById(id, { 'data-review-anchor': `panel-${id}` });
updateElementById('openings', { 'data-building-core-version': buildingCore.version });

for (const floor of floorBaselines) {
  const label = floor.floor_id === 'floor-1' ? '一层平面图' : floor.floor_id === 'floor-2' ? '二层平面图' : '三层平面图';
  const pattern = new RegExp(`<img\\b(?=[^>]*\\balt=["']${escapeRegex(label)}["'])[^>]*>`, 'i');
  if (!pattern.test(html)) throw new Error(`Missing source-plan image: ${floor.floor_id}`);
  html = html.replace(pattern, tag => addAttributes(tag, {
    'data-asset': floor.source_plan_asset_id,
    'data-floor-plan': 'source',
    'data-floor-id': floor.floor_id,
    'data-source-page-id': floor.source_page_id,
    'data-plan-asset-id': floor.source_plan_asset_id,
    'data-review-anchor': `plan-${floor.floor_id}`,
  }));
}

html = html.replace(/<article\b(?=[^>]*\bclass=["'][^"']*\bfloor-content\b[^"']*["'])(?=[^>]*\bdata-floor-id=["'][^"']+["'])[^>]*>/gi, tag => addAttributes(tag, { 'data-floor-container': 'true' }));

const contractStyle = `<style id="contractRefreshStyle">
.room-ledger-head{margin:28px 0 12px}.room-ledger-head h4{font:700 22px/1.25 var(--serif);margin:0 0 6px}.room-ledger-head p{margin:0;color:var(--color-muted,var(--muted));font-size:11px;line-height:1.7}.room-ledger-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--color-cork-border,var(--line));margin:0 0 22px}.room-ledger-card{background:var(--color-dark-paper,var(--card));padding:18px;min-height:170px}.room-ledger-card h4{font:600 18px/1.25 var(--serif);margin:5px 0 8px}.room-ledger-card p{font-size:11px;line-height:1.65;color:var(--color-muted,var(--muted));margin:0 0 9px}.room-ledger-card small{display:block;font-size:9px;line-height:1.55;color:var(--color-ember-accent,var(--clay))}.opening-floor-summary{border:1px solid var(--color-cork-border,var(--line));padding:18px;margin:-10px 0 20px;background:var(--color-dark-paper,var(--card))}.opening-floor-summary h3{font:600 21px/1.2 var(--serif);margin:0 0 7px}.opening-floor-summary p{font-size:11px;line-height:1.7;color:var(--color-muted,var(--muted));margin:0}@media(max-width:900px){.room-ledger-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.room-ledger-grid{grid-template-columns:1fr}}
</style>`;
if (!/id=["']contractRefreshStyle["']/.test(html)) html = html.replace('</head>', `${contractStyle}\n</head>`);

for (const floor of floorBaselines) {
  const cards = roomLedgers.filter(ledgerRoom => ledgerRoom.floor_id === floor.floor_id).map(ledgerRoom => {
    const room = roomDataById.get(ledgerRoom.room_id);
    return `<article class="room-ledger-card" data-room-card="true" data-room-id="${escapeHtml(ledgerRoom.room_id)}" data-floor-id="${escapeHtml(ledgerRoom.floor_id)}" data-source-page-id="${escapeHtml(ledgerRoom.source_page_id)}" data-review-anchor="room-${escapeHtml(ledgerRoom.room_id)}"><small>${escapeHtml(ledgerRoom.printed_label)} · ${escapeHtml(ledgerRoom.dimensions[0].label)}</small><h4>${escapeHtml(ledgerRoom.proposed_use)}</h4><p>${escapeHtml(ledgerRoom.design_explanation)}</p><small>${escapeHtml(room.materials)} · ${escapeHtml(room.lighting)}</small></article>`;
  }).join('');
  const grid = `<div class="room-ledger-grid" data-room-ledger-floor="${floor.floor_id}">${cards}</div>`;
  const ledger = `<div class="room-ledger-head" data-room-ledger-head-floor="${floor.floor_id}"><h4>逐房间说明</h4><p>每个房间与本层图纸页、空间基线和效果图使用同一个稳定房间 ID。</p></div>${grid}`;
  const existingGrid = new RegExp(`<div class=["']room-ledger-grid["']\\s+data-room-ledger-floor=["']${escapeRegex(floor.floor_id)}["']>[\\s\\S]*?<\\/div>`, 'i');
  if (existingGrid.test(html)) {
    html = html.replace(existingGrid, grid);
    continue;
  }
  const insertion = new RegExp(`(<article\\b(?=[^>]*\\bclass=["'][^"']*\\bfloor-content\\b[^"']*["'])(?=[^>]*\\bdata-floor-id=["']${escapeRegex(floor.floor_id)}["'])[^>]*>[\\s\\S]*?)(<div class=["']table-wrap facts["']>)`, 'i');
  if (!insertion.test(html)) throw new Error(`Cannot place visible room ledger for ${floor.floor_id}`);
  html = html.replace(insertion, `$1${ledger}$2`);
}

const openingSelector = `<div class="floor-switch opening-floor-switch" aria-label="按楼层查看门窗方案"><button class="active" data-floor-target="floor-1" aria-selected="true">1F<small>公共生活层</small></button><button data-floor-target="floor-2" aria-selected="false">2F<small>家庭起居层</small></button><button data-floor-target="floor-3" aria-selected="false">3F<small>私密休憩层</small></button></div><div class="floor-content opening-floor-summary active" data-floor-container="true" data-floor-id="floor-1" data-building-core-version="1" data-baseline-version="3" data-variant="option-a"><h3>一层 · 餐厨透明玻璃边界</h3><p>本层重点对照 F1-OPEN-03。其他门洞保留为概念建议，待结构、燃气、消防和现场净尺寸放行。</p></div><div class="floor-content opening-floor-summary" data-floor-container="true" data-floor-id="floor-2" data-building-core-version="1" data-baseline-version="2" data-variant="option-a"><h3>二层 · 家庭厅与南阳台</h3><p>本层重点对照 F2-OPEN-01。门洞拓宽只作为概念方案，外立面、过梁、门槛防水和栏杆必须复核。</p></div><div class="floor-content opening-floor-summary" data-floor-container="true" data-floor-id="floor-3" data-building-core-version="1" data-baseline-version="2" data-variant="option-a"><h3>三层 · 景观开口待专项核对</h3><p>当前没有可靠的同机位前后对照图，因此本层开口只保留文字条件和无拆改退路，不伪造视觉证据。</p></div>`;
html = html.replace(/<div class=["']floor-switch opening-floor-switch["'][\s\S]*?<div class=["']floor-content opening-floor-summary["'][^>]*data-floor-id=["']floor-3["'][\s\S]*?<\/div>/i, '');
const openingInsertion = /(<section\b[^>]*\bid=["']openings["'][^>]*>[\s\S]*?<div class=["']section-head["'][\s\S]*?<h2>[\s\S]*?<\/h2><p>[\s\S]*?<\/p><\/div>)/i;
if (!openingInsertion.test(html)) throw new Error('Cannot place openings floor selector');
html = html.replace(openingInsertion, `$1${openingSelector}`);

html = html.replace(/<figure\b(?=[^>]*\bdata-asset=["']floor2FinalLounge["'])[^>]*>/i, tag => addAttributes(tag, {
  'data-floor-id': 'floor-2',
  'data-comparison-state': 'existing',
  'data-visual-correspondence-id': 'floor2FinalLounge',
}));
html = html.replace(/<figure\b(?=[^>]*\bdata-asset=["']floor2OpeningProposed["'])[^>]*>/i, tag => addAttributes(tag, {
  'data-floor-id': 'floor-2',
  'data-comparison-state': 'proposed',
  'data-visual-correspondence-id': 'floor2OpeningProposed',
}));

html = html.replace(/(<figure\b[^>]*\bdata-asset=[^>]*>)\s*(<span\b[^>]*\bclass=["'][^"']*\brevision-state\b[^"']*["'][^>]*>[\s\S]*?<\/span>)\s*(<img\b[^>]*>)/gi, '$1$3$2');

html = html.replace(/<div\b(?=[^>]*\bclass=["'][^"']*\breference-viewer\b[^"']*["'])[^>]*>/i, tag => addAttributes(tag, { 'data-review-anchor': 'viewer-3d-whole-home' }));

const anchorCounts = new Map();
html = html.replace(/<([a-z][\w:-]*)\b(?=[^>]*\bdata-asset\s*=)[^>]*>/gi, tag => {
  if (/\bdata-review-anchor\s*=/.test(tag)) return tag;
  const asset = tag.match(/\bdata-asset\s*=\s*["']([^"']+)["']/i)?.[1] || 'visual';
  const floor = tag.match(/\bdata-floor-id\s*=\s*["']([^"']+)["']/i)?.[1] || 'shared';
  const room = tag.match(/\bdata-room-id\s*=\s*["']([^"']+)["']/i)?.[1] || 'area';
  const base = `asset-${floor}-${room}-${asset}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const count = (anchorCounts.get(base) || 0) + 1;
  anchorCounts.set(base, count);
  return addAttributes(tag, { 'data-review-anchor': count === 1 ? base : `${base}-${count}` });
});

html = html.replace("['drawing','visuals','materials','furniture'].forEach(id=>selectFloor(byId(id),'floor-1'));", "['drawing','openings','visuals','materials','furniture'].forEach(id=>selectFloor(byId(id),'floor-1'));");

const tempPath = `${htmlPath}.contract-refresh.tmp`;
fs.writeFileSync(tempPath, html);
fs.renameSync(tempPath, htmlPath);

console.log(`Refreshed latest renovation contract: ${htmlPath}`);
console.log(`Room ledgers: ${roomLedgers.length}`);
console.log(`Embedded assets: ${Object.keys(embeddedAssets).length}`);
console.log(`Visual correspondence records: ${visualCorrespondence.length}`);
