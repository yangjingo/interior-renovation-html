#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const selections = [
  { id: 'beige_wall_001', role: 'warm mineral plaster', maps: ['Diffuse', 'nor_gl', 'Rough'] },
  { id: 'wood_floor', role: 'warm oak floor and light joinery', maps: ['Diffuse', 'nor_gl', 'Rough'] },
  { id: 'dark_wood', role: 'dark walnut cabinetry and furniture', maps: ['Diffuse', 'nor_gl', 'Rough'] },
  { id: 'floor_tiles_02', role: 'warm stone and wet-area tile', maps: ['Diffuse', 'nor_gl', 'Rough'] },
  { id: 'terlenka', role: 'cream upholstery and linen surface', maps: ['Diffuse', 'nor_gl', 'Rough'] },
];

const hdriSelections = [
  { id: 'suburban_garden', role: 'sunlit residential garden image-based lighting', map: 'hdri', extension: 'hdr' },
];

const modelSelections = [
  { id: 'dining_chair_02', role: 'upholstered dining chair' },
  { id: 'modern_arm_chair_01', role: 'modern lounge accent chair' },
  { id: 'modern_coffee_table_01', role: 'stone and wood coffee table' },
];

function parseOutputDir() {
  const index = process.argv.indexOf('--output-dir');
  if (index === -1) return path.resolve('assets/blender-pbr/polyhaven');
  if (!process.argv[index + 1]) throw new Error('--output-dir requires a path');
  return path.resolve(process.argv[index + 1]);
}

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest('hex');
}

async function requestWithRetry(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw new Error(`Request failed after ${attempts} attempts: ${url}\n${lastError?.message || lastError}`);
}

async function fetchJson(url) {
  return (await requestWithRetry(url)).json();
}

async function fetchBytes(url) {
  const response = await requestWithRetry(url);
  return Buffer.from(await response.arrayBuffer());
}

const outputDir = parseOutputDir();
await mkdir(outputDir, { recursive: true });

const manifest = {
  version: 1,
  provider: 'Poly Haven',
  license: 'CC0 1.0',
  license_url: 'https://polyhaven.com/license',
  resolution: '1k',
  format: 'jpg',
  assets: [],
  hdris: [],
  models: [],
};

for (const selection of selections) {
  const files = await fetchJson(`https://api.polyhaven.com/files/${selection.id}`);
  const asset = {
    id: selection.id,
    role: selection.role,
    page_url: `https://polyhaven.com/a/${selection.id}`,
    maps: {},
  };
  for (const mapName of selection.maps) {
    const remote = files[mapName]?.['1k']?.jpg;
    if (!remote?.url || !remote?.md5) throw new Error(`Missing 1k JPG ${mapName} map for ${selection.id}`);
    const fileName = `${selection.id}_${mapName.toLowerCase()}_1k.jpg`;
    const filePath = path.join(outputDir, fileName);
    let bytes;
    try {
      bytes = await readFile(filePath);
    } catch {
      bytes = await fetchBytes(remote.url);
      await writeFile(filePath, bytes);
    }
    const actualMd5 = digest('md5', bytes);
    if (actualMd5 !== remote.md5) throw new Error(`MD5 mismatch for ${fileName}`);
    asset.maps[mapName] = {
      file: fileName,
      bytes: bytes.length,
      md5: actualMd5,
      sha256: digest('sha256', bytes),
      source_url: remote.url,
    };
  }
  manifest.assets.push(asset);
}

for (const selection of hdriSelections) {
  const files = await fetchJson(`https://api.polyhaven.com/files/${selection.id}`);
  const remote = files[selection.map]?.['1k']?.[selection.extension];
  if (!remote?.url || !remote?.md5) throw new Error(`Missing 1k ${selection.extension.toUpperCase()} for ${selection.id}`);
  const fileName = `${selection.id}_1k.${selection.extension}`;
  const filePath = path.join(outputDir, fileName);
  let bytes;
  try {
    bytes = await readFile(filePath);
  } catch {
    bytes = await fetchBytes(remote.url);
    await writeFile(filePath, bytes);
  }
  const actualMd5 = digest('md5', bytes);
  if (actualMd5 !== remote.md5) throw new Error(`MD5 mismatch for ${fileName}`);
  manifest.hdris.push({
    id: selection.id,
    role: selection.role,
    page_url: `https://polyhaven.com/a/${selection.id}`,
    file: fileName,
    bytes: bytes.length,
    md5: actualMd5,
    sha256: digest('sha256', bytes),
    source_url: remote.url,
  });
}

for (const selection of modelSelections) {
  const files = await fetchJson(`https://api.polyhaven.com/files/${selection.id}`);
  const remote = files.gltf?.['1k']?.gltf;
  if (!remote?.url || !remote?.md5) throw new Error(`Missing 1k glTF package for ${selection.id}`);
  const packageDir = path.join(outputDir, 'models', selection.id);
  await mkdir(packageDir, { recursive: true });
  const packageFiles = {
    [path.basename(new URL(remote.url).pathname)]: remote,
    ...(remote.include || {}),
  };
  const model = {
    id: selection.id,
    role: selection.role,
    page_url: `https://polyhaven.com/a/${selection.id}`,
    entry_file: `models/${selection.id}/${path.basename(new URL(remote.url).pathname)}`.replaceAll('\\', '/'),
    files: {},
  };
  for (const [relativeName, modelFile] of Object.entries(packageFiles)) {
    if (!modelFile?.url || !modelFile?.md5) throw new Error(`Incomplete glTF package entry ${relativeName} for ${selection.id}`);
    const filePath = path.join(packageDir, ...relativeName.split('/'));
    await mkdir(path.dirname(filePath), { recursive: true });
    let bytes;
    try {
      bytes = await readFile(filePath);
    } catch {
      bytes = await fetchBytes(modelFile.url);
      await writeFile(filePath, bytes);
    }
    const actualMd5 = digest('md5', bytes);
    if (actualMd5 !== modelFile.md5) throw new Error(`MD5 mismatch for ${relativeName}`);
    model.files[relativeName] = {
      bytes: bytes.length,
      md5: actualMd5,
      sha256: digest('sha256', bytes),
      source_url: modelFile.url,
    };
  }
  manifest.models.push(model);
}

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  outputDir,
  assets: manifest.assets.length,
  hdris: manifest.hdris.length,
  models: manifest.models.length,
  files: manifest.assets.reduce((sum, asset) => sum + Object.keys(asset.maps).length, 0)
    + manifest.hdris.length
    + manifest.models.reduce((sum, model) => sum + Object.keys(model.files).length, 0),
}, null, 2));
