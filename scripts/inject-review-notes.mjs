import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const htmlPath = process.argv[2] || path.resolve(packageRoot, '..', '..', 'yj-three-floor-whole-home-plan.html');

function getJsonScript(html, id, fallback = null) {
  const match = html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`));
  if (!match) return fallback;
  return JSON.parse(match[1]);
}

function setJsonScript(html, id, value) {
  const block = `<script id="${id}" type="application/json">${JSON.stringify(value)}</script>`;
  const pattern = new RegExp(`<script[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/script>`);
  if (pattern.test(html)) return html.replace(pattern, block);
  return html.replace('</body>', `${block}\n</body>`);
}

let html = fs.readFileSync(htmlPath, 'utf8');
const preservedNotes = getJsonScript(html, 'reviewNotes', []);

html = html
  .replace(/<!-- REVIEW_NOTES_WIDGET_START -->[\s\S]*?<!-- REVIEW_NOTES_WIDGET_END -->/, '')
  .replace(/<style id="reviewNotesStyle">[\s\S]*?<\/style>/, '')
  .replace(/<script id="reviewNotesScript">[\s\S]*?<\/script>/, '')
  .replace(/<script[^>]*id="reviewConfig"[^>]*>[\s\S]*?<\/script>/, '')
  .replace(/<script[^>]*id="reviewNotes"[^>]*>[\s\S]*?<\/script>/, '')
  .replace(/<script[^>]*id="releaseManifest"[^>]*>[\s\S]*?<\/script>/, '');

const projectConfig = getJsonScript(html, 'projectConfig');
if (!projectConfig) throw new Error('Missing projectConfig');
projectConfig.features = { ...projectConfig.features, review_notes: true };
html = setJsonScript(html, 'projectConfig', projectConfig);

const floorBaselines = getJsonScript(html, 'floorBaselines', []);
const embeddedAssets = getJsonScript(html, 'embeddedAssets', {});
const releaseId = 'yj-home-2026-09-04-v4-review';
const baselineVersions = Object.fromEntries(
  floorBaselines.map((floor) => [floor.floor_id, floor.version]),
);
const reviewConfig = {
  version: 1,
  enabled: true,
  storage_mode: 'local_export',
  storage_label: '本机草稿',
  project_id: projectConfig.project_id,
  release_id: releaseId,
  baseline_versions: baselineVersions,
  export_formats: ['json', 'markdown', 'csv'],
  three_anchor: { camera_preset: true, raycast: false, canvas_ratio_fallback: true },
};
const releaseManifest = {
  version: 1,
  project_id: projectConfig.project_id,
  release_id: releaseId,
  baseline_versions: baselineVersions,
  embedded_asset_count: Object.keys(embeddedAssets).length,
  review_storage_mode: 'local_export',
  privacy_review: 'uses the already approved embedded release assets; no extra source files',
  staged_sha256: 'written to the external Vercel release-manifest.json after staging',
};

const widget = `<!-- REVIEW_NOTES_WIDGET_START -->
<div id="reviewPinOverlay" class="review-pin-overlay" aria-hidden="true"></div>
<button id="reviewOrb" class="review-orb" type="button" aria-label="设计讨论与标注" aria-expanded="false" aria-controls="reviewDrawer">
  <span class="review-orb-ring" aria-hidden="true"></span>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><path d="m9.7 10.8 4.9-4.9 1.5 1.5-4.9 4.9-2.2.7.7-2.3Z"/></svg>
  <span id="reviewOrbCount" class="review-orb-count" hidden>0</span>
</button>
<aside id="reviewDrawer" class="review-drawer" role="dialog" aria-label="设计讨论" aria-modal="false" aria-hidden="true">
  <header class="review-head">
    <div><span>DESIGN REVIEW</span><h2>定位讨论</h2></div>
    <button id="reviewClose" type="button" aria-label="关闭设计讨论">×</button>
  </header>
  <div class="review-local-note"><strong>本机草稿</strong><span>留言只保存在当前设备。导出后发送给设计方，才会进入下一版本。</span></div>
  <div class="review-actions">
    <button id="reviewAdd" class="primary" type="button">＋ 添加标注</button>
    <button id="reviewImport" type="button">导入</button>
    <button id="reviewExportAll" type="button">导出全部</button>
    <input id="reviewImportFile" type="file" accept="application/json,.json" hidden>
  </div>
  <div class="review-filters" role="group" aria-label="筛选讨论">
    <button type="button" data-review-filter="current">当前区域</button>
    <button type="button" data-review-filter="open" aria-pressed="true">待讨论</button>
    <button type="button" data-review-filter="history">历史版本</button>
  </div>
  <form id="reviewComposer" class="review-composer" hidden>
    <div class="review-anchor-summary"><span>标注位置</span><strong id="reviewAnchorName">尚未选择</strong></div>
    <label>你的称呼<input id="reviewAuthor" maxlength="40" placeholder="例如：杨靖 / 家人"></label>
    <label>留言<textarea id="reviewBody" maxlength="1000" rows="4" required placeholder="说清楚希望保留、调整或需要确认的内容"></textarea></label>
    <div class="review-form-actions"><button id="reviewCancel" type="button">取消</button><button class="primary" type="submit">保存留言</button></div>
  </form>
  <div id="reviewEmpty" class="review-empty"><strong>还没有讨论</strong><span>点击“添加标注”，再点图纸、效果图或 3D 区域。</span></div>
  <div id="reviewList" class="review-list" aria-live="polite"></div>
  <footer class="review-foot"><span id="reviewStorageState">本机保存 · 可导入/导出</span><div><button id="reviewExportJson" type="button">JSON</button><button id="reviewExportMd" type="button">Markdown</button><button id="reviewExportCsv" type="button">CSV</button></div></footer>
</aside>
<div id="reviewToast" class="review-toast" role="status" aria-live="polite"></div>
<!-- REVIEW_NOTES_WIDGET_END -->`;

const style = `<style id="reviewNotesStyle">
:root{--review-accent:var(--color-ember-accent,var(--clay,#dc5000));--review-ink:var(--color-warm-cream,#f6eee2);--review-panel:rgba(19,17,14,.97);--review-line:rgba(246,238,226,.16);--review-muted:#a9a095}
.review-orb{position:fixed;z-index:1202;right:max(20px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));display:grid;place-items:center;width:48px;height:48px;padding:0;border:1px solid rgba(255,255,255,.25);border-radius:50%;background:var(--review-accent);color:#fff8ee;box-shadow:0 15px 38px rgba(0,0,0,.35),0 0 0 7px rgba(220,80,0,.08);cursor:grab;touch-action:none;transition:transform .2s ease,box-shadow .2s ease}.review-orb:hover{transform:translateY(-2px);box-shadow:0 19px 44px rgba(0,0,0,.42),0 0 0 9px rgba(220,80,0,.1)}.review-orb.dragging{cursor:grabbing;transform:scale(1.06)}.review-orb svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}.review-orb-ring{position:absolute;inset:-7px;border:1px solid rgba(220,80,0,.3);border-radius:50%;animation:reviewPulse 2.8s ease-out infinite}.review-orb-count{position:absolute;right:-5px;top:-5px;min-width:19px;height:19px;padding:0 5px;border:2px solid #17140f;border-radius:999px;background:var(--review-ink);color:#1a1713;font:700 9px/15px var(--sans)}
.review-drawer{position:fixed;z-index:1201;right:max(20px,env(safe-area-inset-right));bottom:max(82px,calc(env(safe-area-inset-bottom) + 64px));width:min(380px,calc(100vw - 28px));max-height:min(76vh,760px);overflow:auto;padding:0;border:1px solid var(--review-line);border-radius:22px;background:var(--review-panel);color:var(--review-ink);box-shadow:0 28px 90px rgba(0,0,0,.48);backdrop-filter:blur(24px);opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);transform-origin:bottom right;transition:opacity .2s ease,transform .24s ease,visibility .2s}.review-drawer.open{opacity:1;visibility:visible;transform:none}.review-head{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:20px 20px 15px;background:linear-gradient(var(--review-panel),rgba(19,17,14,.92));border-bottom:1px solid var(--review-line);backdrop-filter:blur(20px)}.review-head span{font:600 8px/1 var(--sans);letter-spacing:.17em;color:var(--review-accent)}.review-head h2{margin:7px 0 0;font:500 28px/.95 var(--serif);color:var(--review-ink)}.review-head button{width:34px;height:34px;border:1px solid var(--review-line);border-radius:50%;background:transparent;color:var(--review-ink);font-size:22px;cursor:pointer}.review-local-note{display:grid;gap:5px;margin:14px 16px 0;padding:12px 13px;border:1px solid rgba(220,80,0,.25);border-radius:14px;background:rgba(220,80,0,.08)}.review-local-note strong{font-size:10px;color:#f49a62}.review-local-note span{font-size:9px;line-height:1.55;color:var(--review-muted)}
.review-actions,.review-filters,.review-form-actions,.review-foot,.review-foot div{display:flex;gap:7px;align-items:center}.review-actions{padding:14px 16px 10px}.review-actions button,.review-filters button,.review-form-actions button,.review-foot button,.review-note-actions button,.review-note-actions select,.review-reply-form button{min-height:34px;border:1px solid var(--review-line);border-radius:999px;background:rgba(255,255,255,.04);color:var(--review-ink);padding:7px 10px;font:600 9px/1 var(--sans);cursor:pointer}.review-actions .primary,.review-form-actions .primary,.review-reply-form .primary{border-color:var(--review-accent);background:var(--review-accent);color:white}.review-filters{padding:0 16px 13px;border-bottom:1px solid var(--review-line)}.review-filters button[aria-pressed="true"]{background:var(--review-ink);color:#1a1713;border-color:var(--review-ink)}
.review-composer{display:grid;gap:12px;margin:14px 16px;padding:14px;border:1px solid rgba(220,80,0,.36);border-radius:16px;background:rgba(255,255,255,.035)}.review-composer[hidden],.review-empty[hidden],.review-reply-form[hidden],.review-orb-count[hidden]{display:none!important}.review-anchor-summary{display:grid;gap:4px;padding-bottom:10px;border-bottom:1px solid var(--review-line)}.review-anchor-summary span,.review-composer label{font-size:9px;color:var(--review-muted)}.review-anchor-summary strong{font-size:11px;color:var(--review-ink)}.review-composer label{display:grid;gap:6px}.review-composer input,.review-composer textarea,.review-reply-form textarea{width:100%;border:1px solid var(--review-line);border-radius:11px;background:rgba(0,0,0,.22);color:var(--review-ink);padding:10px 11px;font:400 11px/1.55 var(--sans);outline:none;resize:vertical}.review-composer input:focus,.review-composer textarea:focus,.review-reply-form textarea:focus{border-color:var(--review-accent);box-shadow:0 0 0 3px rgba(220,80,0,.12)}.review-form-actions{justify-content:flex-end}
.review-empty{display:grid;place-items:center;gap:7px;min-height:150px;padding:32px;text-align:center}.review-empty strong{font:500 20px/1 var(--serif)}.review-empty span{max-width:230px;font-size:10px;line-height:1.6;color:var(--review-muted)}.review-list{display:grid;gap:10px;padding:13px 16px}.review-note{position:relative;padding:13px;border:1px solid var(--review-line);border-radius:15px;background:rgba(255,255,255,.035)}.review-note-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.review-note-locate{display:grid;gap:4px;min-width:0;padding:0;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.review-note-locate strong{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.review-note-locate span,.review-note-time{font-size:8px;color:var(--review-muted)}.review-note-status{padding:4px 7px;border-radius:999px;background:rgba(220,80,0,.12);color:#f2a06d;font-size:8px}.review-note-body{margin:11px 0 10px;font-size:11px;line-height:1.65;color:#ddd5c9;white-space:pre-wrap}.review-thread{display:grid;gap:7px;margin:9px 0;padding-left:10px;border-left:1px solid rgba(220,80,0,.35)}.review-thread div{font-size:9px;line-height:1.55;color:var(--review-muted)}.review-thread strong{color:#d8d0c3}.review-note-actions{display:flex;gap:6px;align-items:center}.review-note-actions select{margin-left:auto}.review-reply-form{display:grid;gap:7px;margin-top:10px}.review-reply-form div{display:flex;justify-content:flex-end;gap:6px}
.review-foot{position:sticky;bottom:0;justify-content:space-between;padding:12px 16px;background:linear-gradient(rgba(19,17,14,.92),var(--review-panel));border-top:1px solid var(--review-line);backdrop-filter:blur(20px)}.review-foot>span{font-size:8px;color:var(--review-muted)}.review-foot button{min-height:28px;padding:5px 7px}.review-toast{position:fixed;z-index:1210;left:50%;bottom:max(24px,env(safe-area-inset-bottom));max-width:min(500px,calc(100vw - 32px));padding:10px 14px;border:1px solid var(--review-line);border-radius:999px;background:#17140f;color:#f5ede2;font-size:10px;box-shadow:0 15px 44px rgba(0,0,0,.35);opacity:0;pointer-events:none;transform:translate(-50%,10px);transition:.2s}.review-toast.show{opacity:1;transform:translate(-50%,0)}
.review-pin-overlay{position:fixed;inset:0;z-index:1198;pointer-events:none}.review-pin{position:absolute;display:grid;place-items:center;width:24px;height:24px;padding:0;border:2px solid #fff3e4;border-radius:50%;background:var(--review-accent);color:white;font:700 9px/1 var(--sans);box-shadow:0 8px 22px rgba(0,0,0,.35);pointer-events:auto;cursor:pointer;transform:translate(-50%,-50%)}.review-anchor-flash{animation:reviewFlash 1.6s ease}.review-placement-mode [data-review-anchor]{cursor:crosshair!important}.review-placement-mode [data-review-anchor]:hover{outline:2px solid var(--review-accent);outline-offset:3px}
@keyframes reviewPulse{0%{opacity:.7;transform:scale(.82)}70%,100%{opacity:0;transform:scale(1.35)}}@keyframes reviewFlash{0%,100%{box-shadow:0 0 0 0 rgba(220,80,0,0)}25%,70%{box-shadow:0 0 0 6px rgba(220,80,0,.42)}}
@media(max-width:700px){.review-orb{width:48px;height:48px}.review-drawer{right:7px;bottom:7px;width:calc(100vw - 14px);max-height:min(82vh,760px);border-radius:20px;transform-origin:bottom center}.review-actions{display:grid;grid-template-columns:1.35fr .65fr .9fr}.review-actions button{padding-inline:7px}.review-foot{align-items:flex-start;flex-direction:column}.review-foot div{width:100%}.review-foot button{flex:1}}
@media(prefers-reduced-motion:reduce){.review-orb-ring{animation:none}.review-orb,.review-drawer,.review-toast,.review-anchor-flash{transition:none;animation:none}}
</style>`;

const script = `<script id="reviewNotesScript">
(() => {
  const parseJson = (id, fallback) => {
    try { return JSON.parse(document.getElementById(id)?.textContent || ''); } catch { return fallback; }
  };
  const config = parseJson('reviewConfig', {});
  const embeddedNotes = parseJson('reviewNotes', []);
  const project = parseJson('projectConfig', {});
  const baselines = parseJson('floorBaselines', []);
  const baselineVersions = Object.fromEntries(baselines.map((floor) => [floor.floor_id, floor.version]));
  const storageKey = 'renovation-review:' + (config.project_id || project.project_id || 'project');
  const positionKey = storageKey + ':orb-position';
  const authorKey = storageKey + ':author';
  const allowedStatuses = ['open', 'answered', 'accepted', 'rejected', 'resolved'];
  const statusLabels = { open: '待讨论', answered: '已回复', accepted: '接受修改', rejected: '不采用', resolved: '已解决' };
  const orb = document.getElementById('reviewOrb');
  const drawer = document.getElementById('reviewDrawer');
  const list = document.getElementById('reviewList');
  const empty = document.getElementById('reviewEmpty');
  const composer = document.getElementById('reviewComposer');
  const authorInput = document.getElementById('reviewAuthor');
  const bodyInput = document.getElementById('reviewBody');
  const anchorName = document.getElementById('reviewAnchorName');
  const pinOverlay = document.getElementById('reviewPinOverlay');
  const count = document.getElementById('reviewOrbCount');
  const toast = document.getElementById('reviewToast');
  let pendingAnchor = null;
  let placing = false;
  let filter = 'open';
  let toastTimer = 0;

  const safeStorage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
  };
  const storedNotes = (() => {
    try { return JSON.parse(safeStorage.get(storageKey) || '[]'); } catch { return []; }
  })();
  let notes = Array.isArray(storedNotes) && storedNotes.length ? storedNotes : embeddedNotes;
  authorInput.value = safeStorage.get(authorKey) || '';

  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  const save = () => {
    safeStorage.set(storageKey, JSON.stringify(notes));
    render();
  };
  const uid = () => 'note-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  const currentPanel = () => document.querySelector('.panel.active')?.id || location.hash.slice(1) || 'overview';
  const currentFloor = (target) => target?.closest('[data-floor-id]')?.dataset.floorId
    || document.body.dataset.activeVisualFloor
    || document.querySelector('.floor-switch button.active,[data-floor-target][aria-selected="true"]')?.dataset.floorTarget
    || project.target?.primary_floor_id
    || null;
  const slug = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'area';

  const ensureAnchors = () => {
    document.querySelectorAll('.panel[id]').forEach((node) => {
      if (!node.dataset.reviewAnchor) node.dataset.reviewAnchor = 'panel-' + slug(node.id);
    });
    const viewer = document.querySelector('.viewer-shell.reference-viewer');
    if (viewer) viewer.dataset.reviewAnchor = 'visuals-3d-viewer';
    document.querySelectorAll('[data-floor-plan="source"]').forEach((img) => {
      const target = img.closest('figure,.plan-layer,.plan-viewport') || img.parentElement;
      const floor = img.dataset.floorId || target?.dataset.floorId || 'floor';
      if (target && !target.dataset.reviewAnchor) target.dataset.reviewAnchor = 'plan-' + slug(floor);
    });
    document.querySelectorAll('[data-room-card="true"][data-room-id]').forEach((node) => {
      if (!node.dataset.reviewAnchor) node.dataset.reviewAnchor = 'room-' + slug(node.dataset.floorId) + '-' + slug(node.dataset.roomId);
    });
    const seen = new Map();
    document.querySelectorAll('[data-asset]').forEach((node) => {
      if (node.dataset.reviewAnchor) return;
      const panel = node.closest('.panel[id]')?.id || 'page';
      const floor = node.dataset.floorId || 'shared';
      const room = node.dataset.roomId || '';
      const base = 'asset-' + slug(panel) + '-' + slug(floor) + '-' + slug(room) + '-' + slug(node.dataset.asset);
      const occurrence = (seen.get(base) || 0) + 1;
      seen.set(base, occurrence);
      node.dataset.reviewAnchor = occurrence === 1 ? base : base + '-' + occurrence;
    });
  };
  ensureAnchors();

  const openDrawer = () => {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    orb.setAttribute('aria-expanded', 'true');
  };
  const closeDrawer = () => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    orb.setAttribute('aria-expanded', 'false');
  };
  const setPlacing = (value) => {
    placing = value;
    document.documentElement.classList.toggle('review-placement-mode', value);
    document.getElementById('reviewAdd').textContent = value ? '取消定位' : '＋ 添加标注';
    if (value) {
      closeDrawer();
      showToast('请点击要讨论的图纸、效果图或 3D 区域');
    }
  };
  const describeAnchor = (target, floor) => {
    if (target.classList.contains('reference-viewer')) return (floor || '当前楼层') + ' · 3D 交互模型';
    return target.dataset.lightbox
      || target.querySelector('img[alt]')?.getAttribute('alt')
      || target.querySelector('figcaption strong,h2,h3,h4')?.textContent?.trim()
      || target.dataset.roomId
      || target.dataset.reviewAnchor;
  };

  document.addEventListener('pointerup', (event) => {
    if (!placing || event.target.closest('#reviewDrawer,#reviewOrb,.review-pin')) return;
    const direct = event.target.closest('[data-review-anchor]');
    const target = event.target.closest('canvas')?.closest('.reference-viewer') || direct;
    if (!target) { showToast('这个位置暂时不能标注，请点击图纸、卡片或 3D 画布'); return; }
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const floor = currentFloor(target);
    const isThree = target.classList.contains('reference-viewer');
    const cameraButton = isThree ? target.querySelector('[data-camera-view][aria-pressed="true"]') : null;
    pendingAnchor = {
      type: isThree ? 'three' : target.matches('figure,[data-asset],.plan-layer,.plan-viewport') ? 'image' : 'dom',
      anchor_id: target.dataset.reviewAnchor,
      x_ratio: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y_ratio: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
      camera_id: cameraButton?.dataset.cameraView || null,
      camera_state: cameraButton ? { preset: cameraButton.dataset.cameraView } : null,
      asset_id: target.dataset.asset || null,
      visual_correspondence_id: target.dataset.visualCorrespondenceId || null,
    };
    pendingAnchor.floor_id = floor;
    pendingAnchor.panel_id = target.closest('.panel[id]')?.id || currentPanel();
    pendingAnchor.room_id = target.dataset.roomId || target.closest('[data-room-id]')?.dataset.roomId || null;
    pendingAnchor.baseline_version = floor ? baselineVersions[floor] ?? null : null;
    anchorName.textContent = describeAnchor(target, floor);
    composer.hidden = false;
    setPlacing(false);
    openDrawer();
    bodyInput.focus();
  }, true);

  const notePayload = () => ({
    schema_version: 1,
    project_id: config.project_id || project.project_id,
    release_id: config.release_id,
    exported_at: new Date().toISOString(),
    storage_mode: 'local_export',
    notes,
    revision_requests: notes.filter((note) => note.status === 'accepted').map((note) => ({
      request_id: 'revision-' + note.note_id,
      source_note_ids: [note.note_id],
      floor_id: note.floor_id,
      room_id: note.room_id,
      anchor_id: note.anchor.anchor_id,
      target_baseline_version: note.baseline_version,
      decision: note.decision || note.body,
      safety_review_required: note.anchor.type === 'three',
    })),
  });
  const download = (name, type, value) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([value], { type }));
    link.download = name;
    document.body.append(link);
    link.click();
    setTimeout(() => { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  };
  const csvCell = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const exportJson = () => download('review-notes.json', 'application/json;charset=utf-8', JSON.stringify(notePayload(), null, 2));
  const exportMarkdown = () => {
    const lines = ['# 设计讨论记录', '', '- 项目：' + (config.project_id || project.project_id), '- 版本：' + config.release_id, '- 导出：' + new Date().toLocaleString(), ''];
    notes.forEach((note, index) => {
      lines.push('## ' + (index + 1) + '. ' + note.anchor_label, '', '- 状态：' + statusLabels[note.status], '- 楼层：' + (note.floor_id || '全屋'), '- 页面：' + note.panel_id, '- 标注：' + note.anchor.anchor_id, '- 作者：' + note.author.display_name, '', note.body, '');
      note.events.filter((event) => event.type === 'reply').forEach((event) => lines.push('> 回复 · ' + event.author + '：' + event.body, ''));
    });
    download('review-notes.md', 'text/markdown;charset=utf-8', lines.join('\\n'));
  };
  const exportCsv = () => {
    const rows = [['note_id','release_id','floor_id','room_id','panel_id','anchor_id','status','author','body','created_at','updated_at']];
    notes.forEach((note) => rows.push([note.note_id,note.release_id,note.floor_id,note.room_id,note.panel_id,note.anchor.anchor_id,note.status,note.author.display_name,note.body,note.created_at,note.updated_at]));
    download('review-index.csv', 'text/csv;charset=utf-8', '\\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\\n'));
  };

  const focusNote = (note) => {
    if (note.panel_id && location.hash !== '#' + note.panel_id) location.hash = note.panel_id;
    const activate = () => {
      if (note.floor_id) document.querySelector('#' + CSS.escape(note.panel_id) + ' [data-floor-target="' + CSS.escape(note.floor_id) + '"]')?.click();
      if (note.anchor.type === 'three' && note.anchor.camera_id) document.querySelector('[data-camera-view="' + CSS.escape(note.anchor.camera_id) + '"]')?.click();
      const target = document.querySelector('[data-review-anchor="' + CSS.escape(note.anchor.anchor_id) + '"]');
      if (!target) { showToast('当前版本找不到原标注位置'); return; }
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.remove('review-anchor-flash');
      void target.offsetWidth;
      target.classList.add('review-anchor-flash');
      setTimeout(updatePins, 450);
    };
    setTimeout(activate, 180);
  };

  const appendReply = (note, body, author) => {
    const now = new Date().toISOString();
    note.events.push({ type: 'reply', at: now, body, author });
    note.updated_at = now;
    if (note.status === 'open') note.status = 'answered';
    save();
  };
  const updateStatus = (note, status) => {
    if (!allowedStatuses.includes(status) || note.status === status) return;
    const now = new Date().toISOString();
    note.events.push({ type: 'status_changed', at: now, from: note.status, to: status, author: authorInput.value.trim() || 'Reviewer' });
    note.status = status;
    note.updated_at = now;
    if (status === 'accepted') note.decision = note.body;
    save();
  };

  const render = () => {
    ensureAnchors();
    list.replaceChildren();
    const activePanel = currentPanel();
    const activeFloor = currentFloor();
    const visible = notes.filter((note) => {
      if (filter === 'current') return note.panel_id === activePanel && (!activeFloor || note.floor_id === activeFloor || !note.floor_id);
      if (filter === 'open') return !['rejected','resolved'].includes(note.status);
      return true;
    });
    visible.forEach((note) => {
      const card = document.createElement('article');
      card.className = 'review-note';
      const top = document.createElement('div');
      top.className = 'review-note-top';
      const locate = document.createElement('button');
      locate.type = 'button';
      locate.className = 'review-note-locate';
      const title = document.createElement('strong');
      title.textContent = note.anchor_label;
      const meta = document.createElement('span');
      meta.textContent = [note.floor_id, note.panel_id, note.anchor.camera_id].filter(Boolean).join(' · ');
      locate.append(title, meta);
      locate.addEventListener('click', () => focusNote(note));
      const badge = document.createElement('span');
      badge.className = 'review-note-status';
      badge.textContent = statusLabels[note.status] || note.status;
      top.append(locate, badge);
      const body = document.createElement('p');
      body.className = 'review-note-body';
      body.textContent = note.body;
      const thread = document.createElement('div');
      thread.className = 'review-thread';
      note.events.filter((event) => event.type === 'reply').forEach((event) => {
        const reply = document.createElement('div');
        const who = document.createElement('strong');
        who.textContent = (event.author || 'Reviewer') + '：';
        reply.append(who, document.createTextNode(event.body));
        thread.append(reply);
      });
      const actions = document.createElement('div');
      actions.className = 'review-note-actions';
      const replyButton = document.createElement('button');
      replyButton.type = 'button';
      replyButton.textContent = '回复';
      const select = document.createElement('select');
      select.setAttribute('aria-label', '讨论状态');
      allowedStatuses.forEach((status) => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = statusLabels[status];
        option.selected = status === note.status;
        select.append(option);
      });
      select.addEventListener('change', () => updateStatus(note, select.value));
      actions.append(replyButton, select);
      const replyForm = document.createElement('form');
      replyForm.className = 'review-reply-form';
      replyForm.hidden = true;
      const replyInput = document.createElement('textarea');
      replyInput.maxLength = 1000;
      replyInput.rows = 2;
      replyInput.placeholder = '继续讨论这个位置';
      const replyActions = document.createElement('div');
      const replyCancel = document.createElement('button');
      replyCancel.type = 'button';
      replyCancel.textContent = '取消';
      const replySave = document.createElement('button');
      replySave.type = 'submit';
      replySave.className = 'primary';
      replySave.textContent = '发送回复';
      replyActions.append(replyCancel, replySave);
      replyForm.append(replyInput, replyActions);
      replyButton.addEventListener('click', () => { replyForm.hidden = false; replyInput.focus(); });
      replyCancel.addEventListener('click', () => { replyForm.hidden = true; replyInput.value = ''; });
      replyForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const text = replyInput.value.trim();
        if (!text) return;
        appendReply(note, text, authorInput.value.trim() || 'Reviewer');
      });
      card.append(top, body);
      if (thread.childElementCount) card.append(thread);
      card.append(actions, replyForm);
      list.append(card);
    });
    empty.hidden = visible.length > 0;
    count.hidden = notes.length === 0;
    count.textContent = String(notes.length);
    updatePins();
  };

  const updatePins = () => {
    pinOverlay.replaceChildren();
    notes.filter((note) => !['rejected','resolved'].includes(note.status)).forEach((note, index) => {
      const target = document.querySelector('[data-review-anchor="' + CSS.escape(note.anchor.anchor_id) + '"]');
      if (!target || !target.getClientRects().length) return;
      const rect = target.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight || rect.right < 0 || rect.left > innerWidth) return;
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'review-pin';
      pin.textContent = String(index + 1);
      pin.style.left = (rect.left + rect.width * note.anchor.x_ratio) + 'px';
      pin.style.top = (rect.top + rect.height * note.anchor.y_ratio) + 'px';
      pin.setAttribute('aria-label', '打开讨论：' + note.anchor_label);
      pin.addEventListener('click', () => { openDrawer(); focusNote(note); });
      pinOverlay.append(pin);
    });
  };

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pendingAnchor) return;
    const body = bodyInput.value.trim();
    if (!body) return;
    const author = authorInput.value.trim() || 'Reviewer';
    const now = new Date().toISOString();
    const label = anchorName.textContent;
    const note = {
      note_id: uid(), project_id: config.project_id || project.project_id, release_id: config.release_id,
      floor_id: pendingAnchor.floor_id, baseline_version: pendingAnchor.baseline_version,
      panel_id: pendingAnchor.panel_id, room_id: pendingAnchor.room_id, anchor_label: label,
      anchor: { ...pendingAnchor }, author: { display_name: author }, body, status: 'open', decision: null,
      created_at: now, updated_at: now, events: [{ type: 'created', at: now, body, author }],
    };
    notes.push(note);
    safeStorage.set(authorKey, author);
    bodyInput.value = '';
    composer.hidden = true;
    pendingAnchor = null;
    save();
    showToast('留言已保存在本机，可导出发送');
  });

  document.getElementById('reviewClose').addEventListener('click', closeDrawer);
  document.getElementById('reviewAdd').addEventListener('click', () => setPlacing(!placing));
  document.getElementById('reviewCancel').addEventListener('click', () => { pendingAnchor = null; composer.hidden = true; });
  document.querySelectorAll('[data-review-filter]').forEach((button) => button.addEventListener('click', () => {
    filter = button.dataset.reviewFilter;
    document.querySelectorAll('[data-review-filter]').forEach((candidate) => candidate.setAttribute('aria-pressed', String(candidate === button)));
    render();
  }));
  document.getElementById('reviewExportJson').addEventListener('click', exportJson);
  document.getElementById('reviewExportMd').addEventListener('click', exportMarkdown);
  document.getElementById('reviewExportCsv').addEventListener('click', exportCsv);
  document.getElementById('reviewExportAll').addEventListener('click', () => { exportJson(); setTimeout(exportMarkdown, 180); setTimeout(exportCsv, 360); showToast('正在导出 JSON、Markdown 和 CSV'); });
  const fileInput = document.getElementById('reviewImportFile');
  document.getElementById('reviewImport').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.project_id !== (config.project_id || project.project_id)) throw new Error('项目 ID 不匹配');
      if (!Array.isArray(payload.notes)) throw new Error('缺少 notes 数组');
      const byId = new Map(notes.map((note) => [note.note_id, note]));
      payload.notes.forEach((note) => { if (note.note_id && note.anchor?.anchor_id) byId.set(note.note_id, note); });
      notes = [...byId.values()];
      save();
      showToast('已导入 ' + payload.notes.length + ' 条讨论');
    } catch (error) { showToast('导入失败：' + error.message); }
    fileInput.value = '';
  });

  let drag = null;
  const placeOrb = (x, y) => {
    const margin = 8;
    const maxX = innerWidth - orb.offsetWidth - margin;
    const maxY = innerHeight - orb.offsetHeight - margin;
    orb.style.left = Math.max(margin, Math.min(maxX, x)) + 'px';
    orb.style.top = Math.max(margin, Math.min(maxY, y)) + 'px';
    orb.style.right = 'auto';
    orb.style.bottom = 'auto';
  };
  const savedPosition = (() => { try { return JSON.parse(safeStorage.get(positionKey) || 'null'); } catch { return null; } })();
  if (savedPosition) requestAnimationFrame(() => placeOrb(savedPosition.x_ratio * innerWidth, savedPosition.y_ratio * innerHeight));
  orb.addEventListener('pointerdown', (event) => {
    const rect = orb.getBoundingClientRect();
    drag = { startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top, moved: false };
    orb.setPointerCapture(event.pointerId);
  });
  orb.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (drag.moved) { orb.classList.add('dragging'); placeOrb(drag.left + dx, drag.top + dy); }
  });
  orb.addEventListener('pointerup', () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    orb.classList.remove('dragging');
    if (moved) {
      const rect = orb.getBoundingClientRect();
      safeStorage.set(positionKey, JSON.stringify({ x_ratio: rect.left / innerWidth, y_ratio: rect.top / innerHeight }));
    } else if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
  });
  orb.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); drawer.classList.contains('open') ? closeDrawer() : openDrawer(); }
  });

  let frame = 0;
  const schedulePins = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(updatePins); };
  addEventListener('scroll', schedulePins, true);
  addEventListener('resize', () => { schedulePins(); const rect = orb.getBoundingClientRect(); placeOrb(rect.left, rect.top); });
  addEventListener('hashchange', () => setTimeout(render, 120));
  document.addEventListener('click', (event) => { if (event.target.closest('[data-floor-target],.tab,[data-camera-view]')) setTimeout(render, 160); });
  document.body.dataset.reviewMode = 'local_export';
  render();
})();
</script>`;

html = html.replace('</head>', `${style}\n</head>`);
html = html.replace('</body>', `${widget}\n</body>`);
html = setJsonScript(html, 'reviewConfig', reviewConfig);
html = setJsonScript(html, 'reviewNotes', Array.isArray(preservedNotes) ? preservedNotes : []);
html = setJsonScript(html, 'releaseManifest', releaseManifest);
html = html.replace('</body>', `${script}\n</body>`);

const tempPath = `${htmlPath}.review-notes.tmp`;
fs.writeFileSync(tempPath, html);
fs.renameSync(tempPath, htmlPath);

console.log(`Injected review notes into ${htmlPath}`);
console.log(`Release: ${releaseId}`);
console.log(`Embedded assets preserved: ${Object.keys(embeddedAssets).length}`);
console.log(`Final size: ${(fs.statSync(htmlPath).size / 1024 / 1024).toFixed(2)} MiB`);
