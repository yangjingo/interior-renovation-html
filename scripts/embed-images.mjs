#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

function fail(message) {
  console.error(`embed-images: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const result = { marker: '__EMBEDDED_ASSETS__', force: false };
  const allowed = new Set(['html', 'manifest', 'output', 'marker', 'root', 'replace-json-script', 'force']);
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) fail(`unexpected argument ${token}`);
    const key = token.slice(2);
    if (!allowed.has(key)) fail(`unknown option --${key}`);
    if (key === 'force') {
      if (result.force) fail('duplicate option --force');
      result.force = true;
      continue;
    }
    if (key in result && key !== 'marker') fail(`duplicate option --${key}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail(`missing value for --${key}`);
    result[key] = value;
    i += 1;
  }
  if (!result.html || !result.manifest || !result.output) {
    fail('usage: node scripts/embed-images.mjs --html template.html --manifest assets.json --output result.html [--root project-root] [--marker __EMBEDDED_ASSETS__ | --replace-json-script embeddedAssets] [--force]');
  }
  return result;
}

const mimeByExtension = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);
const MAX_ASSETS = 100;
const MAX_COMPRESSED_BYTES = 32 * 1024 * 1024;
const MAX_TOTAL_COMPRESSED_BYTES = 128 * 1024 * 1024;
const MAX_DECODED_PIXELS = 25_000_000;
const MAX_TOTAL_DECODED_PIXELS = 250_000_000;
const MAX_FRAMES = 60;

function loadSharp() {
  const attempts = [() => createRequire(import.meta.url)('sharp')];
  const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (runtimeModules) {
    attempts.push(() => createRequire(path.join(runtimeModules, 'package.json'))('sharp'));
  }
  for (const attempt of attempts) {
    try { return attempt(); } catch { /* try the next controlled location */ }
  }
  fail('the sharp image decoder is required; install sharp or run inside the Codex primary runtime');
}

const sharp = loadSharp();

function canonicalPotential(candidate) {
  if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
  let parent = path.dirname(candidate);
  const tail = [path.basename(candidate)];
  while (!fs.existsSync(parent)) {
    const next = path.dirname(parent);
    if (next === parent) break;
    tail.unshift(path.basename(parent));
    parent = next;
  }
  return path.join(fs.realpathSync(parent), ...tail);
}

function formatMatchesMime(format, mime) {
  const accepted = {
    'image/avif': new Set(['avif', 'heif']),
    'image/gif': new Set(['gif']),
    'image/jpeg': new Set(['jpeg']),
    'image/png': new Set(['png']),
    'image/svg+xml': new Set(['svg']),
    'image/webp': new Set(['webp']),
  };
  return accepted[mime]?.has(format) || false;
}

function normaliseSvgXmlEntities(source, key) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  let invalidEntity = false;
  const normalised = source.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()];
    const hexadecimal = entity[1].toLowerCase() === 'x';
    const value = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    if (!Number.isInteger(value) || value <= 0 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
      invalidEntity = true;
      return whole;
    }
    return String.fromCodePoint(value);
  });
  if (invalidEntity || /&(?:#[^;\s<]*|[A-Za-z][A-Za-z0-9._:-]*);/.test(normalised)) fail(`asset ${key} contains an invalid or unsupported XML entity`);
  return normalised;
}

function assertSafeSvg(bytes, key) {
  const source = normaliseSvgXmlEntities(bytes.toString('utf8'), key);
  const forbidden = [
    /<!DOCTYPE|<!ENTITY/i,
    /<script\b|<foreignObject\b|<metadata\b/i,
    /\bon[a-z]+\s*=/i,
    /@import\b|url\s*\(\s*['"]?\s*(?:https?:|\/\/|data:|file:|javascript:)/i,
    /\/\*[\s\S]*?\*\//,
    /<!--[\s\S]*?-->/,
  ];
  const unsafeHref = [...source.matchAll(/(?:href|xlink:href)\s*=\s*['"]([^'"]*)['"]/gi)]
    .some(match => !match[1].trim().startsWith('#'));
  const unsafeCssUrl = [...source.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)]
    .some(match => !match[2].trim().startsWith('#'));
  const escapedCssToken = /\\(?:[0-9a-f]{1,6}\s?|.)/i.test(source);
  if (!/<svg\b/i.test(source) || forbidden.some(pattern => pattern.test(source)) || unsafeHref || unsafeCssUrl || escapedCssToken) {
    fail(`asset ${key} is not a self-contained, script-free SVG; rasterise it before embedding`);
  }
}

function within(candidate, root) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

const args = parseArgs(process.argv.slice(2));
const htmlPath = path.resolve(args.html);
const manifestPath = path.resolve(args.manifest);
const outputPath = path.resolve(args.output);

if (!fs.existsSync(htmlPath)) fail(`HTML not found: ${htmlPath}`);
if (!fs.existsSync(manifestPath)) fail(`manifest not found: ${manifestPath}`);
const canonicalHtml = fs.realpathSync(htmlPath);
const canonicalManifest = fs.realpathSync(manifestPath);
const canonicalOutput = canonicalPotential(outputPath);
if (fs.existsSync(outputPath) && fs.lstatSync(outputPath).isSymbolicLink()) fail('--output must not be a symbolic link');
if (canonicalHtml === canonicalOutput) fail('--output must differ from --html so the marker-bearing template is preserved');
if (canonicalManifest === canonicalOutput) fail('--output must differ from --manifest so the source manifest is preserved');
if (fs.existsSync(outputPath) && !args.force) fail('--output already exists; choose a new path or pass --force after verifying the target');

const manifestDirectory = fs.realpathSync(path.dirname(manifestPath));
const assetRoot = fs.realpathSync(path.resolve(args.root || manifestDirectory));

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`manifest is not valid JSON: ${error.message}`);
}
if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') {
  fail('manifest must be a JSON object mapping asset keys to image paths');
}
if (Object.keys(manifest).length === 0) fail('manifest must contain at least one image');
if (Object.keys(manifest).length > MAX_ASSETS) fail(`manifest exceeds the ${MAX_ASSETS}-asset limit`);

const assets = {};
let totalCompressedBytes = 0;
let totalDecodedPixels = 0;
let totalSanitisedBytes = 0;
for (const [key, relativeFile] of Object.entries(manifest)) {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) fail(`invalid asset key: ${key}`);
  if (typeof relativeFile !== 'string' || !relativeFile.trim()) fail(`asset ${key} must map to a file path`);
  if (path.isAbsolute(relativeFile)) fail(`asset ${key} must use a relative path`);
  const lexicalSource = path.resolve(path.dirname(manifestPath), relativeFile);
  if (!fs.existsSync(lexicalSource)) fail(`asset not found for ${key}: ${lexicalSource}`);
  const source = fs.realpathSync(lexicalSource);
  if (!within(source, assetRoot)) fail(`asset ${key} escapes --root: ${source}`);
  if (source === canonicalOutput) fail(`--output would overwrite source asset ${key}: ${source}`);
  const stat = fs.statSync(source);
  if (!stat.isFile()) fail(`asset ${key} is not a regular file: ${source}`);
  const inputMime = mimeByExtension.get(path.extname(source).toLowerCase());
  if (!inputMime) fail(`unsupported image type for ${key}: ${source}`);
  const bytes = fs.readFileSync(source);
  if (bytes.length === 0) fail(`asset is empty: ${source}`);
  if (bytes.length > MAX_COMPRESSED_BYTES) fail(`asset ${key} exceeds the 32 MiB compressed-input limit`);
  totalCompressedBytes += bytes.length;
  if (totalCompressedBytes > MAX_TOTAL_COMPRESSED_BYTES) fail('asset set exceeds the 128 MiB compressed-input limit');
  if (inputMime === 'image/svg+xml') assertSafeSvg(bytes, key);
  let metadata;
  try {
    metadata = await sharp(bytes, { failOn: 'error', limitInputPixels: MAX_DECODED_PIXELS, animated: true }).metadata();
  } catch (error) {
    fail(`asset ${key} cannot be decoded: ${error.message}`);
  }
  if (!Number.isFinite(metadata.width) || metadata.width < 1 || !Number.isFinite(metadata.height) || metadata.height < 1) {
    fail(`asset ${key} has no valid pixel dimensions`);
  }
  if (!formatMatchesMime(metadata.format, inputMime)) {
    fail(`asset ${key} decodes as ${metadata.format || 'unknown'}, not ${inputMime}`);
  }
  const pages = Number(metadata.pages || 1);
  const pageHeight = Number(metadata.pageHeight || metadata.height);
  const decodedPixels = metadata.width * pageHeight * pages;
  if (!Number.isInteger(pages) || pages < 1 || pages > MAX_FRAMES || decodedPixels > MAX_DECODED_PIXELS) {
    fail(`asset ${key} exceeds the 25 MP / 60-frame decode limit`);
  }
  totalDecodedPixels += decodedPixels;
  if (totalDecodedPixels > MAX_TOTAL_DECODED_PIXELS) fail('asset set exceeds the 250 MP cumulative decode limit');
  if (inputMime === 'image/avif') {
    const brands = bytes.subarray(8, Math.min(bytes.length, 64)).toString('ascii');
    if (bytes.subarray(4, 8).toString('ascii') !== 'ftyp' || !/avif|avis/.test(brands)) fail(`asset ${key} is HEIF but not AVIF`);
  }
  let sanitisedBytes;
  try {
    const lossless = inputMime === 'image/png' || inputMime === 'image/svg+xml' || inputMime === 'image/gif' || metadata.hasAlpha;
    sanitisedBytes = await sharp(bytes, { failOn: 'error', limitInputPixels: MAX_DECODED_PIXELS, animated: true })
      .rotate()
      .webp(lossless ? { lossless: true, effort: 4 } : { quality: 88, effort: 4, smartSubsample: true })
      .toBuffer();
    await sharp(sanitisedBytes, { failOn: 'error', limitInputPixels: MAX_DECODED_PIXELS, animated: true }).raw().toBuffer();
  } catch (error) {
    fail(`asset ${key} has an incomplete or corrupt pixel stream: ${error.message}`);
  }
  if (sanitisedBytes.length > MAX_COMPRESSED_BYTES) fail(`sanitised asset ${key} exceeds the 32 MiB output limit`);
  totalSanitisedBytes += sanitisedBytes.length;
  if (totalSanitisedBytes > MAX_TOTAL_COMPRESSED_BYTES) fail('sanitised asset set exceeds the 128 MiB output limit');
  assets[key] = `data:image/webp;base64,${sanitisedBytes.toString('base64')}`;
}

const encoded = JSON.stringify(assets).replaceAll('<', '\\u003c');
const html = fs.readFileSync(htmlPath, 'utf8');
let rendered;
if (args['replace-json-script']) {
  const scriptId = args['replace-json-script'];
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(scriptId)) fail(`invalid JSON script ID: ${scriptId}`);
  const escapedId = scriptId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<script\\b(?=[^>]*\\bid=["']${escapedId}["'])(?=[^>]*\\btype=["']application/json["'])[^>]*>)[\\s\\S]*?(<\\/script>)`, 'gi');
  const matches = [...html.matchAll(pattern)];
  if (matches.length !== 1) fail(`JSON script ${scriptId} must occur exactly once; found ${matches.length}`);
  rendered = html.replace(pattern, (_, open, close) => `${open}${encoded}${close}`);
} else {
  const occurrences = html.split(args.marker).length - 1;
  if (occurrences !== 1) fail(`marker ${args.marker} must occur exactly once; found ${occurrences}`);
  rendered = html.replace(args.marker, encoded);
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const temporaryOutput = `${outputPath}.tmp-${process.pid}`;
try {
  fs.writeFileSync(temporaryOutput, rendered, { flag: 'wx' });
  fs.renameSync(temporaryOutput, outputPath);
} finally {
  if (fs.existsSync(temporaryOutput)) fs.unlinkSync(temporaryOutput);
}
console.log(JSON.stringify({ output: outputPath, assets: Object.keys(assets).length, bytes: fs.statSync(outputPath).size }, null, 2));
