import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const htmlPath = process.argv[2] || path.resolve(packageRoot, '..', '..', 'yj-three-floor-whole-home-plan.html');
const refinedPreviewPath = path.resolve(packageRoot, 'example', 'work', 'room-renders', 'embedded', 'floor3PreviewBird-refined.webp');

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

function visual(asset, floor, room, title, caption) {
  return `<figure class="visual-card special-visual" data-asset="${asset}" data-floor-id="${floor}" data-room-id="${room}" data-lightbox="${title}" data-visual-kind="special-area" data-visual-correspondence-id="${asset}"><img alt="${title}" data-provenance-key="${asset}"><figcaption><strong>${title}</strong><span>${caption}</span></figcaption></figure>`;
}

let html = fs.readFileSync(htmlPath, 'utf8');
const embeddedAssets = getJsonScript(html, 'embeddedAssets');
const provenance = getJsonScript(html, 'assetProvenance');
const correspondence = getJsonScript(html, 'visualCorrespondence');

const refinedPreview = fs.readFileSync(refinedPreviewPath);
embeddedAssets.floor3PreviewBird = `data:image/webp;base64,${refinedPreview.toString('base64')}`;
provenance.assets.floor3PreviewBird = {
  ...(provenance.assets.floor3PreviewBird || {}),
  type: 'static-3d-preview',
  origin: 'Built-in ImageGen; floor-3 CAD and floor-3 coarse model control geometry; floor-1/floor-2 overviews control presentation quality only',
  reuse_scope: 'floor-3 only',
  contains_source_photo: false,
  contains_private_plan: false,
  contains_face: false,
  contains_watermark: false,
};

const birdRecord = correspondence.find(item => item.asset_id === 'floor3PreviewBird');
if (birdRecord) {
  birdRecord.camera_id = 'f3-whole-floor-refined-bird';
  birdRecord.reference_asset_ids = ['floor3Plan'];
  birdRecord.review_notes = 'Polished furnished whole-floor dollhouse view generated from the floor-3 plan and floor-3 geometry; floor-1/floor-2 references supplied presentation quality only.';
}

const kitchen = visual('floor1RoomKitchen', 'floor-1', 'f1-kitchen', '一层 · 封闭中式厨房', '先锁定烟道、燃气、冰箱和灶位；玻璃门借光，但厨房仍可关闭。');
const balconies = [
  visual('floor2RoomSouthBalcony', 'floor-2', 'f2-south-balcony', '二层 · 南侧家庭阳台', '休闲使用，保留门前通道、排水和栏杆复核位置。'),
  visual('floor2RoomLifeBalcony', 'floor-2', 'f2-life-balcony', '二层 · 北侧生活阳台', '洗烘、晾晒、防潮收纳和地漏集中，和休闲阳台分工。'),
  visual('floor3FinalReverse', 'floor-3', 'f3-landscape', '三层 · 景观阳台', '室内外色调连续，但防水、找坡、地漏和门槛系统保持独立。'),
].join('');
const wetAreas = [
  visual('floor1RoomWet', 'floor-1', 'f1-wet', '一层 · 公卫 / 主卫湿区', '紧凑分区使用完整防水、防滑砖和玻璃隔断。'),
  visual('floor2RoomWet', 'floor-2', 'f2-wet', '二层 · 双卫服务带', '外置洗漱与两间卫生间分流四卧早晚高峰。'),
  visual('floor3FinalBath', 'floor-3', 'f3-wet', '三层 · 主卫', '水泥纹理只作为表面语言，湿区仍采用防滑砖与完整防水体系。'),
].join('');

const specialSection = `<section id="special-areas" class="panel" role="tabpanel"><div class="section-head"><div class="eyebrow">Kitchen · balconies · wet zones</div><h2>最容易返工的区域，图文成套</h2><p>每个重点区域都直接展示对应楼层的实图，不再要求用户去 05 页面自行寻找。</p></div><div class="special-area-stack"><article class="card special-area-block" data-special-area="kitchen"><div class="special-copy"><span class="tag">一层厨房</span><h3>油烟可关闭</h3><p>双饰面柜＋国产石英石＋耐污瓷砖是实用平替；先锁定烟道、燃气、冰箱和灶位，再定门洞。玻璃门借光，但必须满足当地燃气及消防要求。</p></div><div class="special-visual-grid single">${kitchen}</div></article><article class="card special-area-block dark" data-special-area="balcony"><div class="special-copy"><span class="tag">三层阳台系统</span><h3>视觉连续，物理系统独立</h3><p>休闲阳台、生活阳台与景观阳台分开表达。室内外可以同色，但都必须独立复核防水、找坡、地漏、伸缩缝、门槛防倒灌和栏杆。</p></div><div class="special-visual-grid">${balconies}</div></article><article class="card special-area-block" data-special-area="wet-area"><div class="special-copy"><span class="tag">六个卫生间</span><h3>瓷砖防水＋干湿分离</h3><p>主卫优先完整玻璃淋浴隔断；公卫保证清洁和高峰分流。基层修补、防水层、闭水试验、找坡、防滑砖和排风必须成套。</p></div><div class="special-visual-grid">${wetAreas}</div></article></div><div class="card" style="margin-top:14px"><strong>贯穿三层的固定核心</strong><p class="small">楼梯位置、东侧湿区服务带和 4.8 / 5.0 / 4.2 m 立面分跨作为共同核心；竖向立管、梁柱、层高与准确门窗高度仍待现场和专业图纸核实。</p></div></section>`;

const specialPattern = /<section id="special-areas"[\s\S]*?(?=\s*<section id="visuals")/;
if (!specialPattern.test(html)) throw new Error('Special-area section not found');
html = html.replace(specialPattern, `${specialSection}\n\n    `);

const css = `/* SPECIAL_AREA_VISUALS_START */.special-area-stack{display:grid;gap:16px}.special-area-block{display:grid;grid-template-columns:minmax(220px,.45fr) minmax(0,1.55fr);gap:20px;align-items:start}.special-copy h3{font:700 24px/1.3 var(--serif);margin:10px 0 7px}.special-copy p{font-size:11px;line-height:1.75;color:var(--muted)}.special-area-block.dark .special-copy p{color:rgba(255,250,242,.72)}.special-visual-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}.special-visual-grid.single{grid-template-columns:minmax(0,1fr)}.special-visual{background:#fffaf2}.special-area-block.dark .special-visual{background:#f5efe5;color:var(--ink)}.special-visual img{aspect-ratio:4/3;object-fit:cover}.special-visual figcaption{padding:10px 11px}.special-visual figcaption strong{font-size:11px}.special-visual figcaption span{font-size:9px}@media(max-width:1000px){.special-area-block{grid-template-columns:1fr}}@media(max-width:700px){.special-visual-grid{grid-template-columns:1fr}}/* SPECIAL_AREA_VISUALS_END */`;
const cssPattern = /\/\* SPECIAL_AREA_VISUALS_START \*\/[\s\S]*?\/\* SPECIAL_AREA_VISUALS_END \*\//;
html = cssPattern.test(html) ? html.replace(cssPattern, css) : html.replace('</style>', `${css}</style>`);

html = html.replaceAll('三层 3D 预览 · 总体鸟瞰', '三层 3D 精装预览 · 整体鸟瞰');
html = html.replaceAll('景观阳台、家庭厅、书房/游戏房、两卧与湿区的总体关系。', '依据三层图纸独立生成；完整呈现三类阳台、家庭厅、书房/游戏房、两卧、楼梯与湿区。');
for (const [asset, floor] of [['floor1Preview', 'floor-1'], ['floor2Preview', 'floor-2'], ['floor3PreviewBird', 'floor-3']]) {
  const figurePattern = new RegExp(`(<figure\\b(?=[^>]*data-asset="${asset}")[^>]*)(>)`);
  html = html.replace(figurePattern, (match, start, end) => start.includes('data-whole-floor-overview=')
    ? match
    : `${start} data-whole-floor-overview="true" data-overview-quality="polished"${start.includes('data-floor-id=') ? '' : ` data-floor-id="${floor}"`}${end}`);
}

const oldRenderLoop = `function resize(){const width=stage.clientWidth,height=Math.max(500,Math.min(720,innerHeight*.7));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}\n    addEventListener('resize',resize,{passive:true});resize();showFloor(document.body.dataset.activeVisualFloor||'floor-1');applyLighting();\n    function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera);}loop();`;
const safeRenderLoop = `function resize(){const width=stage.clientWidth;if(width<1)return;const height=Math.max(500,Math.min(720,innerHeight*.7));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}\n    addEventListener('resize',resize,{passive:true});new ResizeObserver(()=>resize()).observe(stage);resize();showFloor(document.body.dataset.activeVisualFloor||'floor-1');applyLighting();\n    function loop(){requestAnimationFrame(loop);if(stage.clientWidth<1||stage.offsetParent===null)return;controls.update();renderer.render(scene,camera);}loop();`;
html = html.replace(oldRenderLoop, safeRenderLoop);

html = setJsonScript(html, 'embeddedAssets', embeddedAssets);
html = setJsonScript(html, 'assetProvenance', provenance);
html = setJsonScript(html, 'visualCorrespondence', correspondence);

const tempPath = `${htmlPath}.special-areas.tmp`;
fs.writeFileSync(tempPath, html);
fs.renameSync(tempPath, htmlPath);
console.log(`Updated ${htmlPath}`);
console.log('Added 7 special-area visuals and replaced the floor-3 whole-floor preview.');
