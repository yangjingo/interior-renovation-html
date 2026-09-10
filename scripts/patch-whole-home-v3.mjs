import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const target = path.resolve(process.argv[2] || path.join(repoRoot, 'example', 'output-html', 'room.html'));
const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error('CODEX_PRIMARY_RUNTIME_NODE_MODULES is required');
const sharp = createRequire(path.join(runtimeModules, 'package.json'))('sharp');
const renderRoot = path.join(repoRoot, 'example', 'output-html', 'room-renders', 'comparisons', 'whole-home-v2');

async function dataUri(file) {
  const bytes = await sharp(file, { failOn: 'error', limitInputPixels: 25_000_000 })
    .rotate()
    .webp({ quality: 88, effort: 4, smartSubsample: true })
    .toBuffer();
  return `data:image/webp;base64,${bytes.toString('base64')}`;
}

function parseBlock(html, id) {
  const pattern = new RegExp(`<script id="${id}" type="application/json">([\\s\\S]*?)<\\/script>`);
  const match = html.match(pattern);
  if (!match) throw new Error(`missing JSON block: ${id}`);
  return { pattern, value: JSON.parse(match[1]) };
}

function replaceBlock(html, id, value) {
  const { pattern } = parseBlock(html, id);
  return html.replace(pattern, `<script id="${id}" type="application/json">${JSON.stringify(value).replaceAll('<', '\\u003c')}</script>`);
}

let html = fs.readFileSync(target, 'utf8');
const assets = parseBlock(html, 'embeddedAssets').value;
assets.floor1FinalHall = await dataUri(path.join(renderRoot, 'floor1-hall.png'));
assets.floor2FinalLounge = await dataUri(path.join(renderRoot, 'floor2-lounge-existing.png'));
assets.floor2OpeningProposed = await dataUri(path.join(renderRoot, 'floor2-lounge-proposed.png'));
html = replaceBlock(html, 'embeddedAssets', assets);

const provenance = parseBlock(html, 'assetProvenance').value;
provenance.assets.floor1FinalHall.origin = 'ImageGen floor-1 hall view, south entrance camera looking north to stair; based on floor-1 plan';
provenance.assets.floor1FinalHall.review_status = 'south entrance, central hall, north stair, west dining/living and east bedroom entry checked';
provenance.assets.floor2FinalLounge.origin = 'ImageGen floor-2 family-lounge existing-opening view based on floor-2 plan';
provenance.assets.floor2FinalLounge.review_status = 'matched north-to-south camera; existing approximately 2.4 m balcony opening';
provenance.assets.floor2OpeningProposed = {
  type: 'plan-specific-final-render', floor_id: 'floor-2',
  origin: 'ImageGen edit of floor2FinalLounge with only the south balcony opening widened',
  review_status: 'same camera and room geometry; conceptual approximately 3.2 m opening; structural and facade approval pending',
};
html = replaceBlock(html, 'assetProvenance', provenance);

html = html.replace('从南侧双门看向北端神龛与楼梯；左侧为客厅和餐厅开口。', '从南侧入户门内看向北端楼梯；左侧见餐厅与客厅，右侧见卧室入口。');

if (!html.includes('data-opening-compare="F2-OPEN-01"')) {
  const sectionStart = html.indexOf('<section id="openings"');
  const modsStart = html.indexOf('<div class="mods">', sectionStart);
  if (sectionStart < 0 || modsStart < 0) throw new Error('openings insertion point not found');
  const comparison = `<div class="opening-effect" data-opening-compare="F2-OPEN-01"><div class="opening-effect-head"><span class="tag proposal">二层 · 同机位对照</span><h3>家庭客厅 → 南阳台门洞</h3><p>效果图只比较门洞宽度，镜头、家具、卧室门和阳台深度保持一致。3.2 m 仅是概念值，须由结构与外立面核查放行。</p></div><div class="opening-effect-grid"><figure class="visual-card" data-asset="floor2FinalLounge" data-lightbox="二层南阳台门洞 · 现状基准" data-visual-kind="final-render"><img alt="二层家庭客厅南阳台门洞现状基准效果"><figcaption><strong>现状基准｜约 2.4 m</strong><span>保留常规双扇推拉门，作为可退回方案。</span></figcaption></figure><figure class="visual-card" data-asset="floor2OpeningProposed" data-lightbox="二层南阳台门洞 · 概念拓宽" data-visual-kind="final-render"><img alt="二层家庭客厅南阳台门洞概念拓宽效果"><figcaption><strong>概念方案｜约 3.2 m</strong><span>只拓宽玻璃门洞；结构、过梁、防水和外立面未核准。</span></figcaption></figure></div></div>`;
  html = `${html.slice(0, modsStart)}${comparison}${html.slice(modsStart)}`;
}

if (!html.includes('.opening-effect{')) {
  const mediaIndex = html.indexOf('@media(max-width:1100px)');
  if (mediaIndex < 0) throw new Error('CSS insertion point not found');
  const css = `.opening-effect{margin:0 0 22px;padding:20px;border:1px solid var(--line);border-radius:22px;background:rgba(255,253,248,.74)}.opening-effect-head{max-width:820px;margin-bottom:14px}.opening-effect-head h3{font:700 25px/1.3 var(--serif);margin:9px 0 6px}.opening-effect-head p{font-size:11px;line-height:1.72;color:var(--muted)}.opening-effect-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.opening-effect-grid .visual-card{cursor:zoom-in}.opening-effect-grid .visual-card img{aspect-ratio:16/9}@media(max-width:700px){.opening-effect-grid{grid-template-columns:1fr}}`;
  html = `${html.slice(0, mediaIndex)}${css}${html.slice(mediaIndex)}`;
}

fs.writeFileSync(target, html);
console.log(JSON.stringify({ target, bytes: Buffer.byteLength(html), assets: Object.keys(assets).length }, null, 2));
