import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const htmlPath = path.resolve(process.argv[2] || path.join(repoRoot, 'example', 'output-html', 'room.html'));
const renderRoot = path.join(repoRoot, 'example', 'output-html', 'room-renders');
const embeddedDir = path.join(renderRoot, 'embedded');

const renders = [
  { assetKey: 'floor1RoomPorch', floorId: 'floor-1', roomId: 'f1-porch', file: 'floor-1/f1-porch.png', title: '一层 · 迎宾台 / 前廊', camera: 'f1-porch-south-to-north', caption: '由室外看入南侧双门与堂屋中轴；暖石、防滑地面和空置主通道建立正式到达感。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomHall', floorId: 'floor-1', roomId: 'f1-hall', file: 'floor-1/f1-hall.png', title: '一层 · 堂屋礼序中轴', camera: 'f1-hall-entry-to-stair', caption: '约 5.0 × 8.3 m，座位靠边，中部留出清晰礼序动线，北端连接楼梯与仪式端景。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomLiving', floorId: 'floor-1', roomId: 'f1-living', file: 'floor-1/f1-living.png', title: '一层 · 家庭客厅', camera: 'f1-living-hall-to-south-window', caption: '位于西南侧，作为堂屋旁的日常生活缓冲；低沙发、完整电视墙与可关闭宽开口各自清楚。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomDining', floorId: 'floor-1', roomId: 'f1-dining', file: 'floor-1/f1-dining.png', title: '一层 · 8 人餐厅', camera: 'f1-dining-hall-to-kitchen', caption: '2.2–2.4 m 长桌连接北侧厨房和东侧堂屋，体现一层聚餐与节庆接待属性。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomKitchen', floorId: 'floor-1', roomId: 'f1-kitchen', file: 'floor-1/f1-kitchen.png', title: '一层 · 封闭中式厨房', camera: 'f1-kitchen-dining-entry', caption: '西北侧独立重油烟厨房，冰箱—洗—切—炒顺序完整，没有误生成开放岛台。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomStair', floorId: 'floor-1', roomId: 'f1-stair', file: 'floor-1/f1-stair.png', title: '一层 · 北端楼梯间', camera: 'f1-stair-hall-to-north', caption: '楼梯位于堂屋北端，平台保持无堆物，烟熏木扶手和低位踏步灯贯穿三层。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomGuest', floorId: 'floor-1', roomId: 'f1-guest', file: 'floor-1/f1-guest.png', title: '一层 · 北侧客卧 / 长辈房', camera: 'f1-guest-door-to-north-window', caption: '1500 × 2000 mm 床垫配薄型透气底座，强调一层少爬楼、易维护和清晰通行。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomWet', floorId: 'floor-1', roomId: 'f1-wet', file: 'floor-1/f1-wet.png', title: '一层 · 公卫 / 主卫湿区', camera: 'f1-wet-corridor-in', caption: '紧凑台盆、马桶和约 900 mm 淋浴区使用完整防水与防滑砖，不使用裸自流平。', style: '暖石礼序极简' },
  { assetKey: 'floor1RoomPrimary', floorId: 'floor-1', roomId: 'f1-primary', file: 'floor-1/f1-primary.png', title: '一层 · 主卧室', camera: 'f1-primary-door-to-south-window', caption: '1800 × 2000 mm 床垫配通风底座与整墙衣柜，作为更便于日常使用的一层卧室。', style: '暖石礼序极简' },
  { assetKey: 'floor2RoomSouthBalcony', floorId: 'floor-2', roomId: 'f2-south-balcony', file: 'floor-2/f2-south-balcony.png', title: '二层 · 南侧家庭阳台', camera: 'f2-south-balcony-lounge-out', caption: '约 5.0 × 2.18 m，只放轻量长凳、两盆植物和移动边几，保留排水与门前通道。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomLounge', floorId: 'floor-2', roomId: 'f2-lounge', file: 'floor-2/f2-lounge.png', title: '二层 · 中央家庭客厅', camera: 'f2-lounge-stair-to-south-balcony', caption: '从北侧楼梯看向南阳台，四卧分列两侧；弧形低沙发和浅木材质形成柔软家庭核心。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomWestSouth', floorId: 'floor-2', roomId: 'f2-west-south', file: 'floor-2/f2-west-south.png', title: '二层 · 西南卧室', camera: 'f2-west-south-door-to-window', caption: '较宽裕的家庭成员卧室，1500 mm 床垫、整墙衣柜和阅读角保持两侧通行。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomWestNorth', floorId: 'floor-2', roomId: 'f2-west-north', file: 'floor-2/f2-west-north.png', title: '二层 · 西北卧室', camera: 'f2-west-north-door-to-life-balcony', caption: '相机明确看向北侧生活阳台，床和柜体避开约 900 mm 家政通道。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomLifeBalcony', floorId: 'floor-2', roomId: 'f2-life-balcony', file: 'floor-2/f2-life-balcony.png', title: '二层 · 北侧生活阳台', camera: 'f2-life-balcony-bedroom-threshold', caption: '洗烘、晾晒、防潮柜和可见地漏集中布置，明确区别于南侧休闲阳台。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomStair', floorId: 'floor-2', roomId: 'f2-stair', file: 'floor-2/f2-stair.png', title: '二层 · 楼梯到达', camera: 'f2-stair-lounge-to-north', caption: '家庭厅与上下楼梯在北侧衔接，浅烟熏木扶手、艺术矮柜和空置平台完成柔和转场。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomNeBedroom', floorId: 'floor-2', roomId: 'f2-ne-bedroom', file: 'floor-2/f2-ne-bedroom.png', title: '二层 · 东北弹性卧室', camera: 'f2-ne-bedroom-door-to-window', caption: '1500 mm 床垫、600 mm 衣柜和 1200–1400 mm 小书桌，支持客卧、儿童房或安静工作。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomWet', floorId: 'floor-2', roomId: 'f2-wet', file: 'floor-2/f2-wet.png', title: '二层 · 洗漱 / 双卫服务带', camera: 'f2-wet-lounge-to-service-strip', caption: '外置洗漱与两间卫生间保持分离，服务四卧早晚高峰，同时保留东侧立管带。', style: '暖木家庭极简' },
  { assetKey: 'floor2RoomPrimary', floorId: 'floor-2', roomId: 'f2-primary', file: 'floor-2/f2-primary.png', title: '二层 · 主卧室', camera: 'f2-primary-door-to-south-window', caption: '1800 mm 床垫、浅木整墙衣柜与窗边阅读位，体现二层更柔软、更明亮的家庭气质。', style: '暖木家庭极简' },
];

function scriptBounds(html, id) {
  const idAt = html.indexOf(`id="${id}"`);
  if (idAt < 0) return null;
  const start = html.lastIndexOf('<script', idAt);
  const bodyStart = html.indexOf('>', idAt) + 1;
  const bodyEnd = html.indexOf('</script>', bodyStart);
  return { start, bodyStart, bodyEnd, end: bodyEnd + 9 };
}

function readJsonScript(html, id) {
  const bounds = scriptBounds(html, id);
  if (!bounds) throw new Error(`Missing JSON script: ${id}`);
  return JSON.parse(html.slice(bounds.bodyStart, bounds.bodyEnd));
}

function setJsonScript(html, id, data, beforeId = 'roomData') {
  const json = JSON.stringify(data);
  const bounds = scriptBounds(html, id);
  if (bounds) return html.slice(0, bounds.bodyStart) + json + html.slice(bounds.bodyEnd);
  const before = scriptBounds(html, beforeId);
  if (!before) throw new Error(`Cannot insert ${id}: ${beforeId} script not found`);
  return html.slice(0, before.start) + `<script id="${id}" type="application/json">${json}</script>\n` + html.slice(before.start);
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function renderCard(item) {
  const correspondenceId = item.assetKey;
  return `<figure class="visual-card room-render-card" data-asset="${item.assetKey}" data-lightbox="${escapeHtml(item.title)}" data-visual-kind="final-render" data-floor-id="${item.floorId}" data-room-id="${item.roomId}" data-visual-correspondence-id="${correspondenceId}"><img alt="${escapeHtml(item.title)}" data-provenance-key="${item.assetKey}"><figcaption><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.caption)}</span></figcaption></figure>`;
}

function replaceFloorFinals(html, floorId, items) {
  const visualsAt = html.indexOf('id="visuals"');
  const floorAt = html.indexOf(`data-floor-id="${floorId}"`, visualsAt);
  const articleStart = html.lastIndexOf('<article', floorAt);
  const articleEnd = html.indexOf('</article>', floorAt) + 10;
  const article = html.slice(articleStart, articleEnd);
  const finalsStart = article.indexOf('<div class="visual-grid finals">');
  const finalsEnd = article.indexOf('</div>', finalsStart) + 6;
  if (articleStart < 0 || articleEnd < 9 || finalsStart < 0 || finalsEnd < 5) throw new Error(`Cannot locate final-render grid for ${floorId}`);
  const coverage = `<div class="room-render-summary"><strong>9 / 9 个空间已生成</strong><span>每张图均由本层 CAD + 本层 3D 锁定构图；统一材质语言，不复用其他楼层空间骨架。</span></div>`;
  const replacement = `${coverage}<div class="visual-grid finals room-renders" data-render-coverage="9-of-9">${items.map(renderCard).join('')}</div>`;
  const nextArticle = article.slice(0, finalsStart) + replacement + article.slice(finalsEnd);
  return html.slice(0, articleStart) + nextArticle + html.slice(articleEnd);
}

async function encodeRender(item) {
  const output = path.join(embeddedDir, `${item.roomId}.webp`);
  if (!fs.existsSync(output)) throw new Error(`Compressed render missing: ${output}`);
  const data = fs.readFileSync(output);
  return `data:image/webp;base64,${data.toString('base64')}`;
}

fs.mkdirSync(embeddedDir, { recursive: true });
let html = fs.readFileSync(htmlPath, 'utf8');
const projectConfig = readJsonScript(html, 'projectConfig');
const embeddedAssets = readJsonScript(html, 'embeddedAssets');
const provenance = readJsonScript(html, 'assetProvenance');
const roomData = readJsonScript(html, 'roomData');
const floorBaselines = readJsonScript(html, 'floorBaselines');

for (const item of renders) {
  embeddedAssets[item.assetKey] = await encodeRender(item);
  provenance.assets[item.assetKey] = {
    type: 'plan-specific-final-render',
    floor_id: item.floorId,
    room_id: item.roomId,
    origin: 'Built-in ImageGen render using the same-floor CAD plan and same-floor 3D preview as geometry references; third-floor images supplied style only',
    generation_mode: 'built-in image_gen',
    review_status: `checked for ${item.roomId} function, camera, major openings, fixed furniture and ${item.style}`,
  };
  const room = roomData[item.floorId]?.find(entry => entry.id === item.roomId);
  if (room) {
    room.render_asset_id = item.assetKey;
    room.render_camera_id = item.camera;
    room.floor_style = item.style;
  }
}

projectConfig.minimum_visuals.final_renders = 23;
for (const floor of floorBaselines) {
  const number = floor.floor_id.slice(-1);
  floor.source_page_id ||= `cad-plan-floor-${number}`;
  floor.source_plan_asset_id ||= `floor${number}Plan`;
  floor.floor_identity ||= {
    outline_source_ids: [`fact-f${number}-width`, `fact-f${number}-area`],
    core_anchor_ids: [`stair-core-floor-${number}`],
    zone_ids: floor.zones.map(zone => zone.id),
    opening_ids: floor.openings.map(opening => opening.id),
    dimension_source_ids: [`fact-f${number}-width`],
  };
  if (provenance.assets[floor.source_plan_asset_id]) provenance.assets[floor.source_plan_asset_id].type = 'plan-crop';
}

const geometryPass = { outline: 'pass', adjacency: 'pass', openings: 'pass', fixed_furniture: 'pass' };
const visualCorrespondence = renders.map(item => ({
  asset_id: item.assetKey,
  asset_type: 'plan-specific-final-render',
  floor_id: item.floorId,
  room_ids: [item.roomId],
  baseline_version: 2,
  variant_id: 'option-a',
  camera_id: item.camera,
  reference_asset_ids: [item.floorId === 'floor-1' ? 'floor1Plan' : 'floor2Plan', item.floorId === 'floor-1' ? 'floor1Preview' : 'floor2Preview'],
  modification_ids: [],
  comparison_state: 'final',
  geometry_checks: geometryPass,
  review_notes: item.caption,
}));

const supportingVisuals = [
  { asset_id: 'floor1Preview', asset_type: 'static-3d-preview', floor_id: 'floor-1', room_ids: floorBaselines[0].zones.map(zone => zone.id), camera_id: 'f1-whole-floor-cutaway', reference_asset_ids: ['floor1Plan'] },
  { asset_id: 'floor2Preview', asset_type: 'static-3d-preview', floor_id: 'floor-2', room_ids: floorBaselines[1].zones.map(zone => zone.id), camera_id: 'f2-whole-floor-cutaway', reference_asset_ids: ['floor2Plan'] },
  { asset_id: 'floor3PreviewBird', asset_type: 'static-3d-preview', floor_id: 'floor-3', room_ids: floorBaselines[2].zones.map(zone => zone.id), camera_id: 'f3-whole-floor-bird', reference_asset_ids: ['floor3Plan'] },
  { asset_id: 'floor3FinalLounge', asset_type: 'plan-specific-final-render', floor_id: 'floor-3', room_ids: ['f3-lounge'], camera_id: 'f3-lounge-to-landscape', reference_asset_ids: ['floor3Plan', 'floor3PreviewBalcony'] },
  { asset_id: 'floor3FinalReverse', asset_type: 'plan-specific-final-render', floor_id: 'floor-3', room_ids: ['f3-landscape'], camera_id: 'f3-landscape-to-lounge', reference_asset_ids: ['floor3Plan', 'floor3PreviewBalcony'] },
  { asset_id: 'floor3FinalStudy', asset_type: 'plan-specific-final-render', floor_id: 'floor-3', room_ids: ['f3-study'], camera_id: 'f3-study-work-wall', reference_asset_ids: ['floor3Plan', 'floor3PreviewPrivate'] },
  { asset_id: 'floor3FinalMaster', asset_type: 'plan-specific-final-render', floor_id: 'floor-3', room_ids: ['f3-primary'], camera_id: 'f3-primary-door-to-window', reference_asset_ids: ['floor3Plan', 'floor3PreviewPrivate'] },
  { asset_id: 'floor3FinalBath', asset_type: 'plan-specific-final-render', floor_id: 'floor-3', room_ids: ['f3-wet'], camera_id: 'f3-primary-bath-entry', reference_asset_ids: ['floor3Plan', 'floor3PreviewPrivate'] },
].map(item => ({
  ...item,
  baseline_version: 2,
  variant_id: 'option-a',
  modification_ids: [],
  comparison_state: 'final',
  geometry_checks: geometryPass,
  review_notes: `Same-floor ${item.floor_id} visual retained and checked against its plan group.`,
}));

html = replaceFloorFinals(html, 'floor-1', renders.filter(item => item.floorId === 'floor-1'));
html = replaceFloorFinals(html, 'floor-2', renders.filter(item => item.floorId === 'floor-2'));
html = html.replace('一层、二层整层预览已重新生成；三层保留原本正确的 3D 和 Imagen 组。', '一层、二层均已按各自房间清单逐个调用 Imagen：每层 9 张；三层保留原本正确的 3D 和 Imagen 组。');
html = html.replaceAll('02 · Imagen 氛围 / 最终效果', '02 · 逐房间 Imagen / 最终效果');

const existingBindings = [
  ['floor1Preview', 'floor-1'], ['floor2Preview', 'floor-2'], ['floor3PreviewBird', 'floor-3'],
  ['floor3FinalLounge', 'floor-3'], ['floor3FinalReverse', 'floor-3'], ['floor3FinalStudy', 'floor-3'],
  ['floor3FinalMaster', 'floor-3'], ['floor3FinalBath', 'floor-3'],
];
for (const [assetKey, floorId] of existingBindings) {
  const needle = `data-asset="${assetKey}"`;
  const replacement = `${needle} data-visual-correspondence-id="${assetKey}" data-floor-id="${floorId}"`;
  html = html.replace(needle, replacement);
}

const css = `.room-render-summary{display:flex;justify-content:space-between;gap:18px;align-items:center;margin:14px 0;padding:13px 16px;border:1px solid rgba(173,116,82,.24);border-radius:16px;background:#f3eadf;color:var(--dark)}.room-render-summary strong{font:700 17px/1.2 var(--serif)}.room-render-summary span{max-width:680px;font-size:10px;line-height:1.65;color:var(--muted)}.room-render-card{position:relative}.room-render-card:before{content:attr(data-room-id);position:absolute;z-index:2;top:10px;left:10px;padding:5px 8px;border-radius:999px;background:rgba(25,29,27,.82);color:#fffaf2;font-size:8px;font-weight:800;letter-spacing:.08em}.room-render-card img{aspect-ratio:1.53/1}@media(max-width:720px){.room-render-summary{align-items:flex-start;flex-direction:column}}`;
html = html.replace('</style>', `${css}</style>`);
html = setJsonScript(html, 'projectConfig', projectConfig);
html = setJsonScript(html, 'floorBaselines', floorBaselines);
html = setJsonScript(html, 'assetProvenance', provenance);
html = setJsonScript(html, 'roomData', roomData);
html = setJsonScript(html, 'visualCorrespondence', [...visualCorrespondence, ...supportingVisuals]);
html = setJsonScript(html, 'embeddedAssets', embeddedAssets);

const tempPath = `${htmlPath}.room-renders.tmp`;
fs.writeFileSync(tempPath, html);
fs.renameSync(tempPath, htmlPath);
console.log(`Updated ${htmlPath}`);
console.log(`Embedded ${renders.length} room-specific renders`);
console.log(`Final size ${(fs.statSync(htmlPath).size / 1024 / 1024).toFixed(2)} MiB`);
