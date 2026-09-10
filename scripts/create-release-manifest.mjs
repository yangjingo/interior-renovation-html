import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

const [htmlArg, outputArg] = process.argv.slice(2);

if (!htmlArg || !outputArg) {
  fail('Usage: node scripts/create-release-manifest.mjs <index.html> <release-manifest.json>');
}

const htmlPath = path.resolve(htmlArg);
const outputPath = path.resolve(outputArg);

if (!fs.existsSync(htmlPath)) {
  fail(`HTML file does not exist: ${htmlPath}`);
}

const bytes = fs.readFileSync(htmlPath);
const html = bytes.toString('utf8');

function readJsonScript(id, fallback = null) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<script[^>]+id=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match) return fallback;

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`Invalid JSON in #${id}: ${error.message}`);
  }
}

const projectConfig = readJsonScript('projectConfig', {});
const reviewConfig = readJsonScript('reviewConfig', {});
const floorBaselines = readJsonScript('floorBaselines', []);
const embeddedAssets = readJsonScript('embeddedAssets', []);

const manifest = {
  version: 1,
  project_id: reviewConfig.project_id || projectConfig.project_id || 'yj-home',
  release_id: reviewConfig.release_id || 'unknown-release',
  staged_file: path.basename(htmlPath),
  staged_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  embedded_asset_count: embeddedAssets && typeof embeddedAssets === 'object'
    ? Object.keys(embeddedAssets).length
    : 0,
  floor_baseline_versions: Array.isArray(floorBaselines)
    ? Object.fromEntries(floorBaselines.map((item) => [item.floor_id, item.version]))
    : {},
  contains_review_widget: html.includes('REVIEW_NOTES_WIDGET_START'),
  contains_three_viewer: html.includes('reference-viewer'),
  privacy_review: {
    raw_source_files_in_staging: false,
    notes_backend: false,
    note_storage: 'browser-localStorage',
  },
  generated_at: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`Release manifest: ${outputPath}`);
console.log(`SHA-256: ${manifest.staged_sha256}`);
console.log(`Bytes: ${manifest.bytes}`);
