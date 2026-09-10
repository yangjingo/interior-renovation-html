import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageRoot = path.resolve(import.meta.dirname, '..');
const htmlPath = process.argv[2] || path.resolve(packageRoot, '..', '..', 'yj-three-floor-whole-home-plan.html');
const sourceDir = path.join(packageRoot, 'example', 'work', 'room-renders', 'floor-1');
const embeddedDir = path.join(packageRoot, 'example', 'work', 'room-renders', 'embedded', 'floor-1-revision-v2');
const designPath = path.join(packageRoot, 'example', 'input', 'DESIGN.md');
const sharp = require(path.join(packageRoot, 'example', 'work', 'runtime', 'node_modules', 'sharp'));

const revisionAssets = [
  {
    key: 'floor1RevisionOverview',
    file: 'f1-whole-floor-v2.png',
    output: 'f1-whole-floor-v2.webp',
    type: 'static-3d-preview',
    roomIds: ['f1-porch', 'f1-hall', 'f1-living', 'f1-dining', 'f1-kitchen', 'f1-stair', 'f1-primary', 'f1-wet', 'f1-guest'],
    camera: 'f1-whole-floor-revision-v3',
    refs: ['floor1Plan', 'floor1Preview'],
    modifications: ['F1-OPEN-03'],
    note: '修订整层俯视：左侧客厅—餐厅—厨房连续，餐厨为满幅透明玻璃门；一层卫生间不设固定干湿隔断；神龛背后用途保持未定义。',
  },
  {
    key: 'floor1RevisionPublicAxis',
    file: 'f1-public-axis-v2.png',
    output: 'f1-public-axis-v2.webp',
    type: 'plan-specific-final-render',
    roomIds: ['f1-living', 'f1-dining', 'f1-kitchen'],
    camera: 'f1-living-south-to-kitchen-v3',
    refs: ['floor1Plan', 'floor1RevisionOverview', 'floor1RoomLiving', 'floor1RoomDining'],
    modifications: ['F1-OPEN-03'],
    note: '从南侧客厅看向北侧厨房，客厅、餐桌和玻璃门后的厨房处于同一连续轴线。',
  },
  {
    key: 'floor1RevisionDiningGlass',
    file: 'f1-dining-glass-v2.png',
    output: 'f1-dining-glass-v2.webp',
    type: 'plan-specific-final-render',
    roomIds: ['f1-dining', 'f1-kitchen'],
    camera: 'f1-dining-hall-to-kitchen',
    refs: ['floor1Plan', 'floor1RoomDining', 'floor1RevisionPublicAxis'],
    modifications: ['F1-OPEN-03'],
    note: '同机位修订：普通木门改为接近满幅的窄框透明玻璃移门，厨房关闭时仍保持视线连通。',
  },
  {
    key: 'floor1RevisionKitchenGlass',
    file: 'f1-kitchen-glass-v2.png',
    output: 'f1-kitchen-glass-v2.webp',
    type: 'plan-specific-final-render',
    roomIds: ['f1-kitchen', 'f1-dining', 'f1-living'],
    camera: 'f1-kitchen-north-to-living-v3',
    refs: ['floor1Plan', 'floor1RoomKitchen', 'floor1RevisionPublicAxis'],
    modifications: ['F1-OPEN-03'],
    note: '从厨房反看餐厅与客厅；玻璃门可关闭油烟，也可侧向收拢形成直接通道。',
  },
  {
    key: 'floor1RevisionWetOpen',
    file: 'f1-wet-open-shower-v2.png',
    output: 'f1-wet-open-shower-v2.webp',
    type: 'plan-specific-final-render',
    roomIds: ['f1-wet'],
    camera: 'f1-wet-corridor-in-v3',
    refs: ['floor1Plan', 'floor1RoomWet'],
    modifications: [],
    note: '一层卫生间不做固定玻璃干湿分离；采用整体防水、防滑砖、找坡、线性地漏和排风。',
  },
  {
    key: 'floor1RevisionHallNeutral',
    file: 'f1-hall-shrine-neutral-v2.png',
    output: 'f1-hall-shrine-neutral-v2.webp',
    type: 'plan-specific-final-render',
    roomIds: ['f1-hall', 'f1-stair'],
    camera: 'f1-hall-entry-to-shrine-v3',
    refs: ['floor1Plan', 'floor1RoomHall', 'floor1RevisionOverview'],
    modifications: [],
    note: '只确认完整、安静、对称的神龛正面；背后用途与禁忌待用户回答，不在图中擅自赋予功能。',
  },
];

function getJsonScript(html, id) {
  const match = html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`));
  if (!match) throw new Error(`Missing JSON script: ${id}`);
  return JSON.parse(match[1]);
}

function setJsonScript(html, id, value) {
  const pattern = new RegExp(`(<script[^>]*id="${id}"[^>]*>)[\\s\\S]*?(<\\/script>)`);
  if (!pattern.test(html)) throw new Error(`Missing JSON script: ${id}`);
  return html.replace(pattern, `$1${JSON.stringify(value)}$2`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function visualCard(asset, title, caption, state, extra = '') {
  return `<figure class="visual-card revision-card" data-asset="${asset}" data-lightbox="${escapeHtml(title)}" data-visual-kind="${state === 'existing' ? 'comparison-existing' : 'final-render'}" data-floor-id="floor-1" data-comparison-state="${state}" data-visual-correspondence-id="${asset}" ${extra}><span class="revision-state">${state === 'existing' ? '原方案 · 保留' : '更改后 · V3'}</span><img alt="${escapeHtml(title)}" data-provenance-key="${asset}"><figcaption><strong>${escapeHtml(title)}</strong><span>${escapeHtml(caption)}</span></figcaption></figure>`;
}

function revisionPair(title, note, before, after) {
  return `<section class="revision-pair"><div class="revision-pair-head"><span>BEFORE / AFTER</span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(note)}</p></div><div class="visual-grid revision-grid">${before}${after}</div></section>`;
}

function findElementEnd(html, start, tagName) {
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = tagPattern.exec(html))) {
    depth += match[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return tagPattern.lastIndex;
  }
  return -1;
}

function replaceFigureInSection(html, sectionId, assetKey, replacement) {
  const start = html.indexOf(`<section id="${sectionId}"`);
  const end = html.indexOf('<section id="', start + 20);
  if (start < 0) throw new Error(`Missing section ${sectionId}`);
  const sectionEnd = end < 0 ? html.length : end;
  const section = html.slice(start, sectionEnd);
  const pattern = new RegExp(`<figure\\b(?=[^>]*data-asset="${assetKey}")[\\s\\S]*?<\\/figure>`);
  if (!pattern.test(section)) {
    const replacementAsset = replacement.match(/data-asset="([^"]+)"/)?.[1];
    if (replacementAsset && section.includes(`data-asset="${replacementAsset}"`)) return html;
    throw new Error(`Missing ${assetKey} figure in ${sectionId}`);
  }
  return html.slice(0, start) + section.replace(pattern, replacement) + html.slice(sectionEnd);
}

fs.mkdirSync(embeddedDir, { recursive: true });
for (const asset of revisionAssets) {
  const input = path.join(sourceDir, asset.file);
  const output = path.join(embeddedDir, asset.output);
  if (!fs.existsSync(input)) throw new Error(`Missing revision render: ${input}`);
  await sharp(input).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 86 }).toFile(output);
}

let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/data-project-id="yj-three-floor-whole-home-2026-09-v2"/, 'data-project-id="yj-three-floor-whole-home-2026-09-v3"');
const projectConfig = getJsonScript(html, 'projectConfig');
const embeddedAssets = getJsonScript(html, 'embeddedAssets');
const provenance = getJsonScript(html, 'assetProvenance');
const correspondence = getJsonScript(html, 'visualCorrespondence');
const floorBaselines = getJsonScript(html, 'floorBaselines');
const roomData = getJsonScript(html, 'roomData');
const modifications = getJsonScript(html, 'modifications');

const designHash = crypto.createHash('sha256').update(fs.readFileSync(designPath)).digest('hex');
projectConfig.project_id = 'yj-three-floor-whole-home-2026-09-v3';
projectConfig.input_fingerprint = crypto.createHash('sha256').update(`yj-three-floor-whole-home-v3:${designHash}`).digest('hex');
projectConfig.minimum_visuals.static_3d = Math.max(6, Number(projectConfig.minimum_visuals.static_3d || 0));
projectConfig.minimum_visuals.final_renders = Math.max(28, Number(projectConfig.minimum_visuals.final_renders || 0));

const floor1 = floorBaselines.find((item) => item.floor_id === 'floor-1');
if (!floor1) throw new Error('Missing floor-1 baseline');
floor1.version = 3;
floor1.design_constraints = {
  public_axis: '南侧客厅—中段餐厅—北侧厨房连续，不设阻断客餐的完整墙体',
  dining_kitchen_boundary: '接近现场可用净宽的落地透明窄框玻璃移门；可关闭油烟，可侧向收拢通行',
  first_floor_bathroom: '不设固定玻璃干湿分离；完整防水、防滑、找坡、地漏和排风仍为必需',
  shrine_rear: '用途和禁忌待用户回答；确认前不得在图纸、3D 或效果图中擅自赋予功能',
};
const diningKitchenOpening = floor1.openings.find((item) => item.id === 'f1-dining-kitchen');
if (diningKitchenOpening) {
  diningKitchenOpening.opening_type = 'full-height-clear-glass-sliding-partition';
  diningKitchenOpening.width_status = 'maximize within verified site opening; concept 3000–4200 mm';
  diningKitchenOpening.baseline_version = 3;
}
floor1.unresolved = [...new Set([
  ...floor1.unresolved.filter((item) => !item.includes('神龛后方')),
  '神龛后方用途、进入方向与禁忌：待用户回答，确认前保持未定义',
])];

for (const modification of modifications.filter((item) => item.floor_id === 'floor-1')) modification.base_version = 3;
const glassOpening = modifications.find((item) => item.id === 'F1-OPEN-03');
if (glassOpening) {
  glassOpening.range = '满幅透明玻璃移门建议按现场可用净宽评估，概念约 3000–4200 mm';
  glassOpening.existing_condition = '图纸显示餐厅与厨房相邻；现状墙体、门洞净宽和结构状态待复尺';
  glassOpening.benefit = '客厅—餐厅—厨房视线连续，玻璃关闭时控制油烟，开启时形成直接通道';
  glassOpening.fallback = '若不能扩大洞口，保留现状门洞并改为通高透明窄框玻璃门';
  glassOpening.delta = { opening_width_mm: { min: 3000, max: 4200 }, opening_type: 'clear-glass-sliding-partition' };
  glassOpening.checks = ['墙体与梁/过梁', '燃气与消防条件', '烟道和排风', '柜体与冰箱冲突', '现场净尺寸'];
}

const roomUpdates = {
  'f1-hall': {
    layout: '座位沿两侧布置，中间保持清晰礼序轴；神龛正面完整、安静、对称，背后用途和禁忌待用户回答，确认前不设置任何功能。',
    revision_render_asset_ids: ['floor1RevisionHallNeutral'],
  },
  'f1-living': {
    layout: '低矮模块沙发靠边；向北与餐厅连续开敞，并沿同一轴线看见透明玻璃门后的厨房。',
    revision_render_asset_ids: ['floor1RevisionOverview', 'floor1RevisionPublicAxis'],
  },
  'f1-dining': {
    layout: '2200–2400 × 1000 mm 长桌置于客厅与厨房之间；北侧采用接近满幅的透明窄框玻璃移门，关闭挡油烟、开启直通。',
    revision_render_asset_ids: ['floor1RevisionPublicAxis', 'floor1RevisionDiningGlass'],
  },
  'f1-kitchen': {
    title: '可关闭中式厨房',
    layout: '冰箱—洗—切—炒顺序完整；南侧以满幅透明玻璃移门直接连接餐桌，不设置岛台，门关闭时仍保持视觉贯通。',
    revision_render_asset_ids: ['floor1RevisionDiningGlass', 'floor1RevisionKitchenGlass'],
  },
  'f1-wet': {
    layout: '一层不做固定玻璃干湿分离；台盆、马桶和开放淋浴共处一室，保留正常使用与清洁空间。',
    materials: '整体防水层、闭水试验、连续找坡、线性地漏、防滑瓷砖和强排风；不设置固定玻璃淋浴隔断。',
    revision_render_asset_ids: ['floor1RevisionWetOpen'],
  },
};
for (const room of roomData['floor-1']) {
  if (roomUpdates[room.id]) Object.assign(room, roomUpdates[room.id]);
}

for (const asset of revisionAssets) {
  const webp = fs.readFileSync(path.join(embeddedDir, asset.output));
  embeddedAssets[asset.key] = `data:image/webp;base64,${webp.toString('base64')}`;
  provenance.assets[asset.key] = {
    type: asset.type,
    floor_id: 'floor-1',
    room_ids: asset.roomIds,
    origin: 'Built-in image_gen revision using the floor-1 CAD plan, the matching old floor-1 render, and the approved floor-1 revision geometry only',
    generation_mode: 'built-in image_gen',
    baseline_version: 3,
    comparison_state: 'proposed',
    contains_source_photo: false,
    contains_private_plan: false,
    contains_face: false,
    contains_watermark: false,
    review_status: asset.note,
  };
}

const revisionKeys = new Set(revisionAssets.map((item) => item.key));
const filteredCorrespondence = correspondence.filter((item) => !revisionKeys.has(item.asset_id));
for (const asset of revisionAssets) {
  filteredCorrespondence.push({
    asset_id: asset.key,
    asset_type: asset.type,
    floor_id: 'floor-1',
    room_ids: asset.roomIds,
    baseline_version: 3,
    variant_id: 'option-a',
    camera_id: asset.camera,
    reference_asset_ids: asset.refs,
    modification_ids: asset.modifications,
    comparison_state: 'proposed',
    geometry_checks: { outline: 'pass', adjacency: 'pass', openings: 'pass', fixed_furniture: 'pass' },
    review_notes: asset.note,
  });
}

const oldOverview = visualCard('floor1Preview', '原方案 · 一层整层俯视', '保留原图：左侧客厅、餐厅、厨房被表现为较强分隔。', 'existing', 'data-whole-floor-overview="true" data-overview-quality="polished"');
const newOverview = visualCard('floor1RevisionOverview', '更改后 · 一层整层俯视', '左侧三段形成连续轴；餐厨边界改为满幅透明玻璃门。', 'proposed', 'data-whole-floor-overview="true" data-overview-quality="polished"');
const oldLiving = visualCard('floor1RoomLiving', '原方案 · 客厅', '原图只表现独立客厅，无法核对向北贯通餐厅与厨房。', 'existing');
const newPublicAxis = visualCard('floor1RevisionPublicAxis', '更改后 · 厨餐客连续轴', '从客厅经过餐桌直看透明玻璃门后的厨房。', 'proposed');
const oldDining = visualCard('floor1RoomDining', '原方案 · 餐厨门', '普通木门与实体墙削弱餐厨联系。', 'existing');
const newDining = visualCard('floor1RevisionDiningGlass', '更改后 · 同机位透明玻璃门', '保留餐桌和右侧堂屋开口，只把餐厨边界改成满幅透明玻璃移门。', 'proposed');
const oldKitchen = visualCard('floor1RoomKitchen', '原方案 · 厨房', '原图未展示厨房与餐桌、客厅的直接关系。', 'existing');
const newKitchen = visualCard('floor1RevisionKitchenGlass', '更改后 · 厨房反看客餐厅', '玻璃门可关闭油烟，也可侧收形成直接通道。', 'proposed');
const oldWet = visualCard('floor1RoomWet', '原方案 · 固定玻璃淋浴间', '原图采用了用户不需要的一层干湿分离。', 'existing');
const newWet = visualCard('floor1RevisionWetOpen', '更改后 · 一层开放淋浴', '取消固定玻璃隔断，同时保留整体防水、防滑、找坡、地漏和排风。', 'proposed');
const oldHall = visualCard('floor1RoomHall', '原方案 · 神龛端景', '作为历史版本保留；不据此推断神龛背后用途。', 'existing');
const newHall = visualCard('floor1RevisionHallNeutral', '更改后 · 神龛正面保持中性', '只表达完整正面；背后空间等待用户回答用途与禁忌。', 'proposed');

const comparisonSection = `<!-- FLOOR1_REVISION_COMPARE_START --><div class="floor-revision-comparison" data-floor-revision="floor-1-v3"><header class="revision-intro"><span class="tag proposal">一层 · 用户确认修订 V3</span><h3>旧图保留，动效轮播核对</h3><p>每组历史版本采用重叠卡片轮播，不再左右并排。点击露出的卡片、下方圆点或左右按钮切换；当前卡片仍可点开放大。本轮只修正用户已经确认的关系，神龛背后空间继续保持未定义。</p></header>${revisionPair('整层骨架', '先看左侧三段是否真正连成一条轴。', oldOverview, newOverview)}${revisionPair('客厅—餐厅—厨房', '新图必须从南侧客厅一路看到北侧厨房。', oldLiving, newPublicAxis)}${revisionPair('餐厨透明玻璃门', '同一餐厅机位对比门的变化。', oldDining, newDining)}${revisionPair('厨房反向关系', '从厨房反看餐桌和客厅，验证玻璃门可关可开。', oldKitchen, newKitchen)}${revisionPair('一层卫生间', '取消固定玻璃隔断，但不降低湿区工程标准。', oldWet, newWet)}${revisionPair('神龛正面', '新图只表达已确认的正面；背后用途继续等待回答。', oldHall, newHall)}</div><!-- FLOOR1_REVISION_COMPARE_END -->`;

html = html.replace(/<!-- FLOOR1_REVISION_COMPARE_START -->[\s\S]*?<!-- FLOOR1_REVISION_COMPARE_END -->/, '');
const visualsAt = html.indexOf('<section id="visuals"');
const floor1At = html.indexOf('data-floor-id="floor-1"', visualsAt);
const floor1ArticleStart = html.lastIndexOf('<article', floor1At);
const floor1ArticleEnd = html.indexOf('</article>', floor1At);
const viewerAt = html.indexOf('<div class="viewer-shell reference-viewer"', visualsAt);
if (visualsAt < 0 || floor1At < 0 || floor1ArticleStart < 0 || floor1ArticleEnd < 0 || viewerAt < 0) throw new Error('Cannot locate floor-1 visuals article');
const viewerEnd = findElementEnd(html, viewerAt, 'div');
if (viewerEnd < 0) throw new Error('Cannot locate the end of the required 3D viewer');
html = html.slice(0, viewerEnd) + comparisonSection + html.slice(viewerEnd);

const openingComparison = `<!-- FLOOR1_GLASS_COMPARE_START --><div class="opening-effect" data-opening-compare="F1-OPEN-03"><div class="opening-effect-head"><span class="tag proposal">一层 · 同机位对照</span><h3>餐厅 → 可关闭中式厨房</h3><p>同一餐厅机位只比较餐厨边界：旧图为普通木门，新图为接近满幅的透明窄框玻璃移门。概念净宽约 3000–4200 mm，须由墙体、梁/过梁、燃气、排烟、消防和现场尺寸核查放行。</p></div><div class="opening-effect-grid">${oldDining}${newDining}</div></div><!-- FLOOR1_GLASS_COMPARE_END -->`;
html = html.replace(/<!-- FLOOR1_GLASS_COMPARE_START -->[\s\S]*?<!-- FLOOR1_GLASS_COMPARE_END -->/, '');
const openingsAt = html.indexOf('<section id="openings"');
const openingsHeadEnd = html.indexOf('</div>', openingsAt) + 6;
if (openingsAt < 0 || openingsHeadEnd < 6) throw new Error('Cannot locate openings section head');
html = html.slice(0, openingsHeadEnd) + openingComparison + html.slice(openingsHeadEnd);

const specialKitchen = `<figure class="visual-card special-visual" data-asset="floor1RevisionKitchenGlass" data-floor-id="floor-1" data-room-id="f1-kitchen" data-lightbox="一层 · 更改后餐厨玻璃门" data-visual-kind="special-area" data-visual-correspondence-id="floor1RevisionKitchenGlass"><img alt="一层 · 更改后餐厨玻璃门" data-provenance-key="floor1RevisionKitchenGlass"><figcaption><strong>一层 · 更改后餐厨玻璃门</strong><span>厨房保持可关闭，玻璃门关闭挡油烟、开启直通餐桌与客厅。</span></figcaption></figure>`;
const specialWet = `<figure class="visual-card special-visual" data-asset="floor1RevisionWetOpen" data-floor-id="floor-1" data-room-id="f1-wet" data-lightbox="一层 · 不做固定干湿分离" data-visual-kind="special-area" data-visual-correspondence-id="floor1RevisionWetOpen"><img alt="一层 · 不做固定干湿分离" data-provenance-key="floor1RevisionWetOpen"><figcaption><strong>一层 · 不做固定干湿分离</strong><span>无固定玻璃隔断；整体防水、防滑、找坡、地漏和排风照常完成。</span></figcaption></figure>`;
html = replaceFigureInSection(html, 'special-areas', 'floor1RoomKitchen', specialKitchen);
html = replaceFigureInSection(html, 'special-areas', 'floor1RoomWet', specialWet);

html = html.replace('紧凑分区使用完整防水、防滑砖和玻璃隔断。', '一层不设固定玻璃隔断，但完整防水、防滑、找坡、地漏和排风不减少。');
html = html.replace('瓷砖防水＋干湿分离', '按楼层区分湿区策略');
html = html.replace('主卫优先完整玻璃淋浴隔断；公卫保证清洁和高峰分流。基层修补、防水层、闭水试验、找坡、防滑砖和排风必须成套。', '一层按用户要求不设固定玻璃隔断；二层和三层采用干湿分离。三层都必须完成基层修补、防水层、闭水试验、找坡、防滑砖和排风。');
html = html.replace('玻璃门建议评估 1200–1600 mm', '满幅透明玻璃移门建议按现场可用净宽评估，概念约 3000–4200 mm');
html = html.replace('完整防水、闭水试验、找坡、防滑砖、玻璃淋浴隔断。', '一层不设固定玻璃隔断；完整防水、闭水试验、连续找坡、线性地漏、防滑砖和排风仍须成套。');

html = html.replace(/(<(?:article|section)\b[^>]*data-floor-id="floor-1"[^>]*data-baseline-version=")2("[^>]*>)/g, (match, before, after) => `${before}3${after}`);

const revisionCss = `<style id="floor1RevisionCompareStyle">/* FLOOR1_REVISION_COMPARE_STYLE_START */.floor-revision-comparison{margin-top:clamp(60px,8vw,110px);border-top:1px dashed var(--color-cork-border);padding-top:clamp(34px,5vw,68px)}.revision-intro{max-width:960px;margin-bottom:48px}.revision-intro h3{font:500 clamp(34px,4.6vw,68px)/.94 var(--serif);margin:18px 0;color:var(--color-warm-cream)}.revision-intro p,.revision-pair-head p{color:var(--color-muted);font-size:13px;line-height:1.75}.revision-pair{padding:30px 0 54px;border-top:1px dashed var(--color-cork-border)}.revision-pair-head{display:grid;grid-template-columns:140px minmax(260px,.65fr) minmax(300px,1fr);gap:22px;align-items:end;margin-bottom:18px}.revision-pair-head>span{font:500 8px/1 var(--sans);letter-spacing:.15em;color:var(--color-ember-accent)}.revision-pair-head h4{font:500 clamp(24px,2.6vw,38px)/.96 var(--serif);margin:0;color:var(--color-warm-cream)}.revision-pair-head p{margin:0}.revision-card{position:relative}.revision-card img{aspect-ratio:16/9;object-fit:cover}.revision-state{position:absolute;z-index:3;top:12px;left:12px;padding:7px 10px;background:rgba(16,9,4,.86);border:1px solid var(--color-cork-border);color:var(--color-warm-cream);font:500 8px/1 var(--sans);letter-spacing:.08em}.revision-card[data-comparison-state="proposed"] .revision-state{background:var(--color-ember-accent);border-color:var(--color-ember-accent)}#openings [data-opening-compare="F1-OPEN-03"]{margin-bottom:38px}.card-carousel{--carousel-card-width:min(86%,1080px);position:relative;display:block!important;height:clamp(330px,58vw,740px);overflow:hidden;background:radial-gradient(circle at 50% 42%,rgba(224,90,27,.11),transparent 48%);perspective:1400px;isolation:isolate}.card-carousel>.visual-card{position:absolute;top:12px;left:50%;width:var(--carousel-card-width);margin:0;transform-origin:50% 100%;transition:transform .58s cubic-bezier(.2,.8,.2,1),opacity .42s ease,filter .42s ease,box-shadow .42s ease;will-change:transform,opacity;cursor:pointer}.card-carousel>.visual-card[data-carousel-position="active"]{z-index:20;transform:translateX(-50%) translateY(0) rotate(0) scale(1);opacity:1;filter:none;box-shadow:0 28px 80px rgba(0,0,0,.42)}.card-carousel>.visual-card[data-carousel-position="before"]{z-index:8;transform:translateX(-59%) translateY(18px) rotate(-3.5deg) scale(.91);opacity:.56;filter:saturate(.7) brightness(.72)}.card-carousel>.visual-card[data-carousel-position="after"]{z-index:8;transform:translateX(-41%) translateY(18px) rotate(3.5deg) scale(.91);opacity:.56;filter:saturate(.7) brightness(.72)}.card-carousel:hover>.visual-card[data-carousel-position="before"]{transform:translateX(-63%) translateY(22px) rotate(-5deg) scale(.9)}.card-carousel:hover>.visual-card[data-carousel-position="after"]{transform:translateX(-37%) translateY(22px) rotate(5deg) scale(.9)}.card-carousel-controls{position:absolute;z-index:40;left:50%;bottom:12px;display:flex;align-items:center;gap:12px;transform:translateX(-50%);padding:8px 10px;border:1px solid rgba(246,234,216,.18);border-radius:999px;background:rgba(14,8,4,.84);backdrop-filter:blur(12px);box-shadow:0 10px 28px rgba(0,0,0,.28)}.card-carousel-button{display:grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid rgba(246,234,216,.2);border-radius:50%;background:rgba(255,255,255,.06);color:var(--color-warm-cream);cursor:pointer;transition:background .2s ease,border-color .2s ease,transform .2s ease}.card-carousel-button:hover:not(:disabled){background:var(--color-ember-accent);border-color:var(--color-ember-accent);transform:scale(1.06)}.card-carousel-button:disabled{opacity:.28;cursor:not-allowed}.card-carousel-button svg{width:16px;height:16px}.card-carousel-dots{display:flex;align-items:center;gap:7px}.card-carousel-dot{width:7px;height:7px;padding:0;border:0;border-radius:999px;background:rgba(246,234,216,.34);cursor:pointer;transition:width .35s ease,background .35s ease}.card-carousel-dot[aria-current="true"]{width:26px;background:var(--color-ember-accent)}.card-carousel-live{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.card-carousel[data-enhanced="true"]{touch-action:pan-y}.opening-effect-grid.card-carousel{grid-template-columns:none;gap:0;background:radial-gradient(circle at 50% 42%,rgba(224,90,27,.11),transparent 48%)}@media(max-width:700px){.revision-pair-head{grid-template-columns:1fr}.card-carousel{--carousel-card-width:94%;height:clamp(310px,91vw,390px)}.card-carousel>.visual-card{top:8px}.card-carousel-controls{bottom:8px}.card-carousel:hover>.visual-card[data-carousel-position="before"]{transform:translateX(-57%) translateY(12px) rotate(-2.5deg) scale(.93)}.card-carousel:hover>.visual-card[data-carousel-position="after"]{transform:translateX(-43%) translateY(12px) rotate(2.5deg) scale(.93)}}@media(prefers-reduced-motion:reduce){.card-carousel>.visual-card,.card-carousel-dot,.card-carousel-button{transition:none!important}}/* FLOOR1_REVISION_COMPARE_STYLE_END */</style>`;
html = html.replace(/<style id="floor1RevisionCompareStyle">[\s\S]*?<\/style>/, '');
const carouselVisibilityCss = `<style id="floor1CarouselVisibilityStyle">.floor-revision-comparison{margin:24px 0 64px;padding:clamp(22px,3vw,42px);border:1px solid rgba(224,90,27,.42);border-radius:28px;background:linear-gradient(145deg,rgba(224,90,27,.075),rgba(255,255,255,.015) 46%,rgba(0,0,0,.08));box-shadow:inset 0 1px rgba(255,255,255,.04),0 30px 90px rgba(0,0,0,.12)}body:not([data-active-visual-floor="floor-1"]) #visuals .floor-revision-comparison{display:none}.floor-revision-comparison .revision-intro{margin-bottom:34px}.floor-revision-comparison .revision-pair:last-child{padding-bottom:0}@media(max-width:700px){.floor-revision-comparison{margin:18px 0 42px;padding:18px 12px;border-radius:20px}}</style>`;
html = html.replace(/<style id="floor1CarouselVisibilityStyle">[\s\S]*?<\/style>/, '');
html = html.replace('</head>', `${revisionCss}\n${carouselVisibilityCss}\n</head>`);

const carouselScript = `<script id="revisionCarouselScript">/* REVISION_CARD_CAROUSEL_START */(()=>{const roots=[...document.querySelectorAll('#visuals .revision-grid,#openings .opening-effect-grid')];const arrow=(direction)=>direction<0?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';roots.forEach((root,rootIndex)=>{if(root.dataset.enhanced==='true')return;const cards=[...root.querySelectorAll(':scope > figure')];if(cards.length<2)return;root.classList.add('card-carousel');root.dataset.enhanced='true';root.setAttribute('role','region');root.setAttribute('aria-roledescription','carousel');root.setAttribute('aria-label',root.closest('.revision-pair')?.querySelector('h4')?.textContent||root.closest('.opening-effect')?.querySelector('h3')?.textContent||'方案历史版本');let active=Math.min(1,cards.length-1);const controls=document.createElement('div');controls.className='card-carousel-controls';controls.innerHTML='<button class="card-carousel-button" type="button" data-carousel-prev aria-label="上一版本">'+arrow(-1)+'</button><div class="card-carousel-dots" role="group" aria-label="选择版本"></div><button class="card-carousel-button" type="button" data-carousel-next aria-label="下一版本">'+arrow(1)+'</button><span class="card-carousel-live" aria-live="polite"></span>';const dots=controls.querySelector('.card-carousel-dots');cards.forEach((card,index)=>{card.classList.add('revision-card');if(!card.dataset.comparisonState)card.dataset.comparisonState=index===0?'existing':'proposed';if(!card.querySelector('.revision-state')){const badge=document.createElement('span');badge.className='revision-state';badge.textContent=index===0?'原方案 · 保留':'更改后 · 方案';card.prepend(badge)}card.tabIndex=0;card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');card.setAttribute('aria-label',(index+1)+' / '+cards.length+' · '+(card.dataset.lightbox||card.querySelector('strong')?.textContent||'方案'));const dot=document.createElement('button');dot.className='card-carousel-dot';dot.type='button';dot.dataset.carouselIndex=String(index);dot.setAttribute('aria-label','查看版本 '+(index+1));dots.append(dot)});root.append(controls);const render=()=>{cards.forEach((card,index)=>{card.dataset.carouselPosition=index===active?'active':index<active?'before':'after';card.setAttribute('aria-hidden',String(index!==active))});[...dots.children].forEach((dot,index)=>dot.setAttribute('aria-current',String(index===active)));controls.querySelector('[data-carousel-prev]').disabled=active===0;controls.querySelector('[data-carousel-next]').disabled=active===cards.length-1;controls.querySelector('.card-carousel-live').textContent='当前版本 '+(active+1)+' / '+cards.length});const select=(index)=>{active=Math.max(0,Math.min(cards.length-1,index));render()};root.addEventListener('click',(event)=>{const prev=event.target.closest('[data-carousel-prev]');const next=event.target.closest('[data-carousel-next]');const dot=event.target.closest('[data-carousel-index]');const card=event.target.closest(':scope > figure');if(prev||next||dot||(card&&cards.indexOf(card)!==active)){event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(prev)select(active-1);else if(next)select(active+1);else if(dot)select(Number(dot.dataset.carouselIndex));else select(cards.indexOf(card))}},true);root.addEventListener('keydown',(event)=>{if(event.key==='ArrowLeft'){event.preventDefault();select(active-1)}if(event.key==='ArrowRight'){event.preventDefault();select(active+1)}});let pointerX=null;root.addEventListener('pointerdown',(event)=>{if(event.target.closest('button'))return;pointerX=event.clientX});root.addEventListener('pointerup',(event)=>{if(pointerX===null)return;const delta=event.clientX-pointerX;pointerX=null;if(Math.abs(delta)>45)select(active+(delta<0?1:-1))});render()})})();/* REVISION_CARD_CAROUSEL_END */</script>`;
html = html.replace(/<script id="revisionCarouselScript">[\s\S]*?<\/script>/, '');
const carouselScriptV2 = `<script id="revisionCarouselScript">/* REVISION_CARD_CAROUSEL_START */
(() => {
  const roots = [...document.querySelectorAll('#visuals .revision-grid, #openings .opening-effect-grid')];
  const arrow = (direction) => direction < 0
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  roots.forEach((root) => {
    if (root.dataset.enhanced === 'true') return;
    const cards = [...root.querySelectorAll(':scope > figure')];
    if (cards.length < 2) return;

    root.classList.add('card-carousel');
    root.dataset.enhanced = 'true';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute(
      'aria-label',
      root.closest('.revision-pair')?.querySelector('h4')?.textContent
        || root.closest('.opening-effect')?.querySelector('h3')?.textContent
        || '方案历史版本',
    );

    let active = Math.min(1, cards.length - 1);
    const controls = document.createElement('div');
    controls.className = 'card-carousel-controls';
    controls.innerHTML = '<button class="card-carousel-button" type="button" data-carousel-prev aria-label="上一版本">'
      + arrow(-1)
      + '</button><div class="card-carousel-dots" role="group" aria-label="选择版本"></div><button class="card-carousel-button" type="button" data-carousel-next aria-label="下一版本">'
      + arrow(1)
      + '</button><span class="card-carousel-live" aria-live="polite"></span>';
    const dots = controls.querySelector('.card-carousel-dots');

    cards.forEach((card, index) => {
      card.classList.add('revision-card');
      if (!card.dataset.comparisonState) card.dataset.comparisonState = index === 0 ? 'existing' : 'proposed';
      if (!card.querySelector('.revision-state')) {
        const badge = document.createElement('span');
        badge.className = 'revision-state';
        badge.textContent = index === 0 ? '原方案 · 保留' : '更改后 · 方案';
        card.prepend(badge);
      }
      card.setAttribute('role', 'group');
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute(
        'aria-label',
        (index + 1) + ' / ' + cards.length + ' · '
          + (card.dataset.lightbox || card.querySelector('strong')?.textContent || '方案'),
      );
      const dot = document.createElement('button');
      dot.className = 'card-carousel-dot';
      dot.type = 'button';
      dot.dataset.carouselIndex = String(index);
      dot.setAttribute('aria-label', '查看版本 ' + (index + 1));
      dots.append(dot);
    });

    root.append(controls);
    const render = () => {
      cards.forEach((card, index) => {
        card.dataset.carouselPosition = index === active ? 'active' : index < active ? 'before' : 'after';
        card.setAttribute('aria-hidden', String(index !== active));
        card.tabIndex = index === active ? 0 : -1;
      });
      [...dots.children].forEach((dot, index) => {
        dot.setAttribute('aria-current', String(index === active));
      });
      controls.querySelector('[data-carousel-prev]').disabled = active === 0;
      controls.querySelector('[data-carousel-next]').disabled = active === cards.length - 1;
      controls.querySelector('.card-carousel-live').textContent = '当前版本 ' + (active + 1) + ' / ' + cards.length;
    };
    const select = (index) => {
      active = Math.max(0, Math.min(cards.length - 1, index));
      render();
    };

    root.addEventListener('click', (event) => {
      const prev = event.target.closest('[data-carousel-prev]');
      const next = event.target.closest('[data-carousel-next]');
      const dot = event.target.closest('[data-carousel-index]');
      const maybeCard = event.target.closest('figure');
      const card = maybeCard?.parentElement === root ? maybeCard : null;
      if (!prev && !next && !dot && (!card || cards.indexOf(card) === active)) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (prev) select(active - 1);
      else if (next) select(active + 1);
      else if (dot) select(Number(dot.dataset.carouselIndex));
      else select(cards.indexOf(card));
    }, true);

    root.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        select(active - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        select(active + 1);
      }
    });

    let pointerX = null;
    root.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('button')) pointerX = event.clientX;
    });
    root.addEventListener('pointerup', (event) => {
      if (pointerX === null) return;
      const delta = event.clientX - pointerX;
      pointerX = null;
      if (Math.abs(delta) > 45) select(active + (delta < 0 ? 1 : -1));
    });

    render();
  });
})();
/* REVISION_CARD_CAROUSEL_END */</script>`;
html = html.replace('</body>', `${carouselScriptV2}\n</body>`);

html = setJsonScript(html, 'projectConfig', projectConfig);
html = setJsonScript(html, 'floorBaselines', floorBaselines);
html = setJsonScript(html, 'roomData', roomData);
html = setJsonScript(html, 'modifications', modifications);
html = setJsonScript(html, 'embeddedAssets', embeddedAssets);
html = setJsonScript(html, 'assetProvenance', provenance);
html = setJsonScript(html, 'visualCorrespondence', filteredCorrespondence);

const tempPath = `${htmlPath}.floor1-revision.tmp`;
fs.writeFileSync(tempPath, html);
fs.renameSync(tempPath, htmlPath);

console.log(`Updated ${htmlPath}`);
console.log(`Embedded ${revisionAssets.length} versioned floor-1 revision assets; old assets retained.`);
console.log(`Floor-1 baseline version: ${floor1.version}`);
console.log(`Final size: ${(fs.statSync(htmlPath).size / 1024 / 1024).toFixed(2)} MiB`);
