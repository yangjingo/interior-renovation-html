import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = path.resolve(root, '../deploy/yj-home');
const project = JSON.parse(fs.readFileSync(path.join(stage, '.vercel/project.json'), 'utf8'));
if (project.projectName !== 'yj-home' || !/^prj_[A-Za-z0-9]+$/.test(project.projectId || '')) {
  throw new Error('Unexpected Vercel project binding');
}
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const privateNames = fs.readdirSync(path.join(root, 'example/input'))
  .filter(name => name.toLowerCase().endsWith('.pdf'))
  .map(name => name.match(/-([\p{Script=Han}]{2,3})(?=[（(]|\.pdf$)/u)?.[1]
    || name.match(/^([\p{Script=Han}]{2,3})结构/u)?.[1])
  .filter(Boolean);
const readPage = name => {
  const bytes = fs.readFileSync(path.join(root, 'example/output-html', name));
  const html = bytes.toString('utf8');
  for (const forbidden of ['file://', 'D:\\', 'C:\\', ...privateNames]) {
    if (html.includes(forbidden)) throw new Error(`Forbidden text in ${name}: ${forbidden}`);
  }
  return {bytes, html};
};
const visual = readPage('room.html');
const drawings = readPage('room-review.html');
const releaseMatch = visual.html.match(/<script[^>]*id="releaseManifest"[^>]*>([\s\S]*?)<\/script>/);
if (!releaseMatch) throw new Error('Visual page missing releaseManifest');
const release = JSON.parse(releaseMatch[1]);
if (release.circulation_modules !== 3 || release.visual_asset_count !== 3) throw new Error('Incomplete packaged visual/circulation page');
if (/href="[^"]*circulation-(?:guide|comparison)/.test(visual.html)) throw new Error('Standalone circulation link remains');
if (/<img[^>]*alt="[^"]*施工图裁片/.test(visual.html)) throw new Error('CAD image remains in visual page');
if (/<img[^>]*alt="[^"]*效果图/.test(drawings.html)) throw new Error('Render remains in drawing review');
if ((drawings.html.match(/施工图裁片" loading=/g) || []).length !== 10) throw new Error('CAD evidence count changed');
if ((drawings.html.match(/class="source-card" id="source-/g) || []).length !== 5) throw new Error('Original drawing set count changed');
if ((drawings.html.match(/data-source-pdf=/g) || []).length !== 5) throw new Error('Local PDF access count changed');
if (!visual.html.includes('room-review.html#source-sets')) throw new Error('Visual page missing original drawing entry');
if ((visual.html.match(/<img src="data:image\/png;base64,/g) || []).length !== 3) throw new Error('Packaged overview count changed');
if ((visual.html.match(/<iframe data-src="\.\/floor[123]-circulation\.html"/g) || []).length !== 3) throw new Error('Inline circulation modules changed');
if (!drawings.html.includes('早期方案三层平面图')) throw new Error('Historical drawing previews missing');
if (!drawings.html.includes('id="drawing-water-2f"><img src="data:image/png;base64,')) throw new Error('Second-floor water drawing repair missing');

const circulationFiles = [1, 2, 3].map(floor => {
  const name = `floor${floor}-circulation.html`;
  const bytes = fs.readFileSync(path.join(root, 'example/output-html', name));
  const source = fs.readFileSync(path.join(root, 'example/work/circulation-design', name));
  if (hash(bytes) !== hash(source)) throw new Error(`Circulation source mismatch: ${name}`);
  const version = floor === 1 ? 'v20' : 'v25';
  const manifest = JSON.parse(fs.readFileSync(path.join(root, `example/work/room-renders/floor${floor}/${version}/version.json`), 'utf8'));
  const asset = manifest.assets.find(item => item.status === 'current');
  if (!asset || asset.related_circulation_html !== `example/work/circulation-design/${name}` ||
      asset.related_circulation_sha256 !== hash(source) ||
      !source.toString('utf8').includes('YJ HOME CIRCULATION THEME V31')) {
    throw new Error(`Circulation manifest or theme mismatch: ${name}`);
  }
  return [name, bytes];
});
if (fs.existsSync(path.join(root, 'example/work/page-source'))) throw new Error('Old page-source directory remains');
const files = [
  ['index.html', visual.bytes],
  ['room.html', visual.bytes],
  ['room-review.html', drawings.bytes],
  ...circulationFiles
];
for (const [name, bytes] of files) {
  const target = path.join(stage, name);
  fs.writeFileSync(target, bytes);
  if (hash(fs.readFileSync(target)) !== hash(bytes)) throw new Error(`Staged hash mismatch: ${name}`);
}
for (const stale of ['circulation-guide.html', 'circulation-comparison.html']) {
  const target = path.join(stage, stale);
  if (fs.existsSync(target)) fs.rmSync(target);
}
const manifest = {
  version: 2,
  project_id: release.project_id,
  release_id: release.release_id,
  staged_file: 'index.html',
  staged_sha256: hash(visual.bytes),
  bytes: visual.bytes.length,
  companion_pages: files.slice(1).map(([file, bytes]) => ({file, sha256: hash(bytes), bytes: bytes.length})),
  visual_asset_count: release.visual_asset_count,
  circulation_modules: release.circulation_modules,
  cad_evidence_count: 10,
  original_drawing_sets: 5,
  floor_baseline_versions: release.baseline_versions,
  separation: {visual_page: 'room.html', drawing_page: 'room-review.html', standalone_circulation_page: false},
  privacy_review: {raw_source_files_in_staging: false, title_blocks_in_new_mep_crops: false, full_source_pdfs_browser_local_only: true},
  generated_at: new Date().toISOString()
};
fs.writeFileSync(path.join(stage, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({stage, release: manifest.release_id, sha256: manifest.staged_sha256, visualBytes: visual.bytes.length, reviewBytes: drawings.bytes.length, circulationModules: manifest.circulation_modules}, null, 2));
