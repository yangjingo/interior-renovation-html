import fs from 'node:fs';
import path from 'node:path';

const [htmlPath, outDir, ...keys] = process.argv.slice(2);
if (!htmlPath || !outDir || keys.length === 0) {
  throw new Error('Usage: node extract-embedded-references.mjs <html> <out-dir> <asset-key...>');
}

const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script[^>]*id="embeddedAssets"[^>]*>([\s\S]*?)<\/script>/);
if (!match) throw new Error('embeddedAssets script not found');
const assets = JSON.parse(match[1]);
fs.mkdirSync(outDir, { recursive: true });

for (const key of keys) {
  const value = assets[key];
  if (typeof value !== 'string') throw new Error(`Unknown asset key: ${key}`);
  const data = value.match(/^data:image\/(webp|png|jpeg);base64,(.+)$/s);
  if (!data) throw new Error(`Unsupported data URI for: ${key}`);
  const ext = data[1] === 'jpeg' ? 'jpg' : data[1];
  const output = path.join(outDir, `${key}.${ext}`);
  fs.writeFileSync(output, Buffer.from(data[2], 'base64'));
  console.log(output);
}
