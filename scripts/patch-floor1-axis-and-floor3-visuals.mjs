import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const target = path.resolve(process.argv[2] || path.join(repoRoot, 'example', 'output-html', 'room.html'));
let html = fs.readFileSync(target, 'utf8');

function readJsonScript(id, fallback = null) {
  const pattern = new RegExp(`<script([^>]*\\bid=["']${id}["'][^>]*)>([\\s\\S]*?)<\\/script>`, 'i');
  const match = html.match(pattern);
  if (!match) return fallback;
  return JSON.parse(match[2]);
}

function writeJsonScript(id, value) {
  const pattern = new RegExp(`(<script[^>]*\\bid=["']${id}["'][^>]*>)[\\s\\S]*?(<\\/script>)`, 'i');
  if (!pattern.test(html)) throw new Error(`Missing JSON script: ${id}`);
  html = html.replace(pattern, `$1${JSON.stringify(value)}$2`);
}

const removedAssets = ['floor3PreviewBalcony', 'floor3PreviewPrivate'];
for (const assetId of removedAssets) {
  const figurePattern = new RegExp(`<figure\\b[^>]*data-asset=["']${assetId}["'][^>]*>[\\s\\S]*?<\\/figure>`, 'g');
  html = html.replace(figurePattern, '');
}

const projectConfig = readJsonScript('projectConfig', {});
projectConfig.minimum_visuals = projectConfig.minimum_visuals || {};
projectConfig.minimum_visuals.static_3d = 4;
writeJsonScript('projectConfig', projectConfig);

const embeddedAssets = readJsonScript('embeddedAssets', {});
for (const assetId of removedAssets) delete embeddedAssets[assetId];
writeJsonScript('embeddedAssets', embeddedAssets);

const assetProvenance = readJsonScript('assetProvenance', {});
assetProvenance.assets = assetProvenance.assets || {};
for (const assetId of removedAssets) delete assetProvenance.assets[assetId];
writeJsonScript('assetProvenance', assetProvenance);

const correspondence = readJsonScript('visualCorrespondence', []);
writeJsonScript(
  'visualCorrespondence',
  correspondence.filter((item) => !removedAssets.includes(item.asset_id)),
);

const floorBaselines = readJsonScript('floorBaselines', []);
const floor1 = floorBaselines.find((floor) => floor.floor_id === 'floor-1');
if (!floor1) throw new Error('Missing floor-1 baseline');
floor1.visualization_boundary_rules = [
  {
    between: ['f1-living', 'f1-dining'],
    treatment: 'fully-open',
    basis: 'user-confirmed public-axis relationship',
  },
  {
    between: ['f1-dining', 'f1-kitchen'],
    treatment: 'full-width-clear-glass-sliding-partition',
    basis: 'user-confirmed smoke-control relationship; structure unverified',
  },
];
writeJsonScript('floorBaselines', floorBaselines);

const releaseId = 'yj-home-2026-09-04-v5-spatial-cleanup';
const reviewConfig = readJsonScript('reviewConfig', null);
if (reviewConfig) {
  reviewConfig.release_id = releaseId;
  writeJsonScript('reviewConfig', reviewConfig);
}

const releaseManifest = readJsonScript('releaseManifest', null);
if (releaseManifest) {
  releaseManifest.release_id = releaseId;
  releaseManifest.embedded_asset_count = Object.keys(embeddedAssets).length;
  writeJsonScript('releaseManifest', releaseManifest);
}

html = html.replace(
  '一层独立模型 · 南侧入户门廊—堂屋—北侧楼梯中轴；西侧厨餐客，东侧双卧双卫。',
  '一层独立模型 · 西侧客厅—餐厅完全开放，餐厨以满幅透明玻璃移门相连；东侧双卧双卫。',
);
html = html.replace(
  "'floor-1':'南侧入户门廊—堂屋—北侧楼梯中轴；西侧厨餐客，东侧双卧双卫。'",
  "'floor-1':'西侧客厅—餐厅完全开放，餐厨以满幅透明玻璃移门相连；东侧双卧双卫。'",
);

const oldActiveZones = "const activeZones=floor.zones.filter(zone=>!removed.has(zone.id)).concat(activeVariant.zone_deltas?.add||[]);";
const newActiveZones = "const rawActiveZones=floor.zones.filter(zone=>!removed.has(zone.id)).concat(activeVariant.zone_deltas?.add||[]);const activeZones=rawActiveZones.map(zone=>{if(floor.floor_id==='floor-1'&&zone.id==='f1-dining')return{...zone,bounds:{...zone.bounds,depth:3.3}};return zone;});";
if (html.includes(oldActiveZones)) html = html.replace(oldActiveZones, newActiveZones);

if (!html.includes('function edgeConnects(edge,first,second)')) {
  const insertionPoint = '    function labelSprite(text,x,z,parent)';
  const helpers = `    function edgeConnects(edge,first,second){const ids=new Set(edge.owners.map(zone=>zone.id));return ids.size===2&&ids.has(first)&&ids.has(second);}\n    function addFullWidthGlassPartition(edge,parent,overall){const length=edge.end-edge.start;if(length<.1)return;const panelCount=4,panelLength=length/panelCount;for(let i=0;i<panelCount;i++){const start=edge.start+i*panelLength,end=start+panelLength;const x=edge.axis==='h'?(start+end)/2-overall.width/2:edge.line-overall.width/2;const z=edge.axis==='h'?edge.line-overall.depth/2:(start+end)/2-overall.depth/2;box(edge.axis==='h'?panelLength-.045:.025,2.25,edge.axis==='h'?.025:panelLength-.045,x,1.245,z,material.glass,parent);const framePosition=start-overall.width/2;box(.025,2.32,.045,framePosition,1.28,z,material.metal,parent);}const endPosition=edge.end-overall.width/2;box(.025,2.32,.045,endPosition,1.28,edge.line-overall.depth/2,material.metal,parent);}\n`;
  if (!html.includes(insertionPoint)) throw new Error('Three.js helper insertion point not found');
  html = html.replace(insertionPoint, `${helpers}${insertionPoint}`);
}

html = html.replace('\n+    function addFullWidthGlassPartition', '\n    function addFullWidthGlassPartition');

const oldWallLoop = "if(edge.owners.length===1&&exteriorOwners.length){if(!edge.owners[0].id.includes('porch'))addRailing(edge,rails,overall);continue;}const height=edge.owners.length===1?2.2:1.45;";
const newWallLoop = "if(edge.owners.length===1&&exteriorOwners.length){if(!edge.owners[0].id.includes('porch'))addRailing(edge,rails,overall);continue;}if(floor.floor_id==='floor-1'&&edgeConnects(edge,'f1-living','f1-dining'))continue;if(floor.floor_id==='floor-1'&&edgeConnects(edge,'f1-dining','f1-kitchen')){addFullWidthGlassPartition(edge,walls,overall);continue;}const height=edge.owners.length===1?2.2:1.45;";
if (html.includes(oldWallLoop)) html = html.replace(oldWallLoop, newWallLoop);

if (!html.includes("edgeConnects(edge,'f1-living','f1-dining')")) {
  throw new Error('Floor-1 public-axis rule was not installed');
}

if (removedAssets.some((assetId) => html.includes(`data-asset="${assetId}"`))) {
  throw new Error('A rough floor-3 preview is still visible');
}

fs.writeFileSync(target, html);
console.log(JSON.stringify({
  target,
  release_id: releaseId,
  removed_assets: removedAssets,
  embedded_asset_count: Object.keys(embeddedAssets).length,
  floor1_relationships: floor1.visualization_boundary_rules,
  bytes: Buffer.byteLength(html),
}, null, 2));
