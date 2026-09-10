import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('example/output-blender');
const targetDir = path.join(root, 'yj-home-blender-v9-stair-rebuild');
const templatePath = path.join(targetDir, 'interactive-preview-template.html');
const hostedPath = path.join(targetDir, 'interactive-preview-hosted.html');

const html = fs.readFileSync(templatePath, 'utf8');

fs.mkdirSync(targetDir, { recursive: true });

const hosted = html
  .replace("const embeddedModelUrl = 'data:model/gltf-binary;base64,__YJ_EMBEDDED_GLB_BASE64__';\n    const modelUrl = location.protocol === 'file:' ? embeddedModelUrl : 'yj-three-floor-renovation-v9-web.glb';", "const modelUrl = 'yj-three-floor-renovation-v9-web.glb';")
  .replace(
    '交互模型加载失败。请确认当前设备可以访问 Three.js CDN；模型数据已经内嵌，不再依赖旁边的 GLB 文件。也可以打开 <a href="interactive-preview-hosted.html">HTTP / 部署轻量版</a>。',
    '交互模型加载失败。请通过本地 HTTP 服务或部署后的网址打开，并确认网络可访问 Three.js CDN。也可以直接下载 <a href="yj-three-floor-renovation-v9-web.glb">网页优化 GLB</a>。'
  );
fs.writeFileSync(hostedPath, hosted);

console.log(JSON.stringify({ templatePath, hostedPath }));
