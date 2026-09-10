import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error('Usage: node scripts/embed-blender-glb.mjs --template template.html --glb model.glb --output result.html');
    }
    values[key.slice(2)] = value;
  }
  for (const required of ['template', 'glb', 'output']) {
    if (!values[required]) throw new Error(`Missing --${required}`);
  }
  return values;
}

const marker = '__YJ_EMBEDDED_GLB_BASE64__';
const args = parseArgs(process.argv.slice(2));
const templatePath = path.resolve(args.template);
const glbPath = path.resolve(args.glb);
const outputPath = path.resolve(args.output);
const template = fs.readFileSync(templatePath, 'utf8');
const markerCount = template.split(marker).length - 1;
if (markerCount !== 1) throw new Error(`Expected one GLB marker, found ${markerCount}`);
const encoded = fs.readFileSync(glbPath).toString('base64');
const result = template.replace(marker, encoded);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, result);
console.log(JSON.stringify({ output: outputPath, bytes: Buffer.byteLength(result), embeddedGlbBytes: fs.statSync(glbPath).size }));
