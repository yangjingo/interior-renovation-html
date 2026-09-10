import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function args(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) values[argv[index].replace(/^--/, '')] = argv[index + 1];
  if (!values.manifest || !values.root) throw new Error('Usage: node scripts/refresh-blender-manifest.mjs --manifest file.json --root artifact-directory');
  return values;
}

const values = args(process.argv.slice(2));
const root = path.resolve(values.root);
const manifestPath = path.resolve(values.manifest);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

for (const relative of Object.keys(manifest.artifacts || {})) {
  const file = path.resolve(root, relative);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.statSync(file).isFile()) throw new Error(`Unsafe or missing artifact: ${relative}`);
  const bytes = fs.readFileSync(file);
  manifest.artifacts[relative] = {
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Refreshed ${Object.keys(manifest.artifacts || {}).length} artifact records in ${manifestPath}`);
