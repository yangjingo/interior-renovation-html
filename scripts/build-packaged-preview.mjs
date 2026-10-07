import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'example/output-html');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const floors = [
  {
    id: 'floor-1', number: '01', label: '一层', title: '到家与公共生活',
    version: 'v20', image: 'floor1-overall-render-v20.png',
    summary: '前廊、堂屋、客餐厨与右侧卧室的关系，按本次提交的整层图查看。',
    note: '封闭厨房、门窗和卫浴的具体尺寸，仍须以建筑及各专业修订图核定。'
  },
  {
    id: 'floor-2', number: '02', label: '二层', title: '开放厨房与家庭厅',
    version: 'v25', image: 'floor2-overall-render-v25.png',
    summary: '新图显示北侧洗衣区、开放厨房与吧台，并保留家庭厅和三间卧室。',
    note: '吧台与原阳台边界、洗衣设备及厨房给排水须在同一版修订图中确认。'
  },
  {
    id: 'floor-3', number: '03', label: '三层', title: '书房、衣帽间与露天花园',
    version: 'v25', image: 'floor3-overall-render-v25.png',
    summary: '新图显示一处公卫、主卧旁衣帽间及西南侧露天花园。',
    note: '包内图的衣帽间与花园开口和此前修正意向不完全一致；入口位置须由建筑、结构及现场核定。'
  }
];

for (const [index, floor] of floors.entries()) {
  const number = index + 1;
  const versionDir = path.join(root, `example/work/room-renders/floor${number}/${floor.version}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(versionDir, 'version.json'), 'utf8'));
  const asset = manifest.assets.find(item => item.file === path.relative(root, path.join(versionDir, floor.image)).split(path.sep).join('/'));
  if (!asset || asset.status !== 'current') throw new Error(`Missing current overview for ${floor.id}`);
  const image = fs.readFileSync(path.join(versionDir, floor.image));
  if (sha256(image) !== asset.sha256 || !image.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    throw new Error(`Overview failed checksum or PNG signature: ${floor.id}`);
  }
  floor.imageData = `data:image/png;base64,${image.toString('base64')}`;
  const circulation = fs.readFileSync(path.join(root, `example/work/circulation-design/floor${number}-circulation.html`));
  if (sha256(circulation) !== asset.related_circulation_sha256 ||
      !circulation.toString('utf8').includes('YJ HOME CIRCULATION THEME V31')) {
    throw new Error(`Circulation theme/source mismatch: ${floor.id}`);
  }
  const original = fs.readFileSync(path.join(root, `example/input/archives/${['一层-CAD图-预览图-动线图.zip', '二层-CAD图_预览图_动线图.zip', '三层图纸资料包.zip'][index]}`));
  if (sha256(original) !== asset.source_archive_sha256) throw new Error(`Archive changed: ${floor.id}`);
  fs.writeFileSync(path.join(output, `floor${number}-circulation.html`), circulation);
}

const css = `
  :root{--ink:#1e1916;--paper:#f3eee6;--cream:#fffaf1;--copper:#b26943;--copper-light:#d7a77c;--muted:#bcada0;--line:#5d5048;--panel:#29221e;--max:1320px}
  *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--ink);color:var(--cream);font-family:"Microsoft YaHei","Noto Sans SC",sans-serif;line-height:1.65}button,a{font:inherit}button{cursor:pointer}a{color:inherit}img{display:block;max-width:100%}[hidden]{display:none!important}
  .site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px max(22px,calc((100vw - var(--max))/2));background:rgba(30,25,22,.96);border-bottom:1px solid var(--line);backdrop-filter:blur(18px)}.brand{text-decoration:none;font-family:Georgia,"Noto Serif SC",serif;font-size:18px;letter-spacing:.15em}.site-nav{display:flex;gap:8px;align-items:center}.site-nav a{display:inline-flex;min-height:44px;align-items:center;padding:8px 16px;text-decoration:none;border:1px solid transparent;border-radius:100px;color:#ddd0c1}.site-nav a[aria-current="page"]{border-color:var(--copper);color:var(--cream)}.site-nav a:hover{border-color:#8d6e59}.wrap{max-width:var(--max);margin:auto;padding:0 28px}
  .intro{padding:32px 0 12px}.eyebrow{display:block;color:var(--copper-light);font-size:11px;letter-spacing:.19em;text-transform:uppercase}.intro h1{font:normal clamp(28px,3vw,42px)/1.2 Georgia,"Noto Serif SC",serif;letter-spacing:.04em;margin:9px 0 10px}.intro p{color:#d0c4b9;margin:0;max-width:760px;font-size:14px}.floor-tabs{display:flex;gap:8px;border-bottom:1px solid var(--line);padding:15px 0 20px}.floor-tabs button{flex:1;max-width:240px;min-height:52px;background:transparent;color:#d7cbc0;border:1px solid var(--line);border-radius:6px;text-align:left;padding:8px 16px}.floor-tabs button[aria-selected="true"]{color:var(--cream);background:#3b2b23;border-color:var(--copper)}.floor-tabs span{display:block;color:var(--copper-light);font-size:11px;letter-spacing:.15em}.floor-tabs strong{font-size:15px;font-weight:500}
  .floor-panel{padding:26px 0 70px}.floor-heading{margin:0 0 18px}.floor-heading h2{font:normal clamp(30px,3.7vw,52px)/1.15 Georgia,"Noto Serif SC",serif;margin:8px 0}.floor-heading p{color:#d6c7b8;margin:0;font-size:14px}.hero-image{margin:0;background:#e4dfd7;border-radius:8px;overflow:hidden}.hero-image img{width:100%;height:auto;object-fit:contain}.hero-image figcaption{padding:12px 17px;background:#2b241f;color:#d5c7b9;font-size:12px}.route-section{border-top:1px solid var(--line);margin-top:34px;padding-top:30px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:17px}.section-heading h3{font:normal clamp(27px,3vw,39px)/1.2 Georgia,"Noto Serif SC",serif;margin:5px 0 0}.section-heading p{font-size:13px;color:var(--muted);margin:0}.route-frame{background:var(--panel);border:1px solid var(--line);border-radius:8px;overflow:hidden}.route-frame iframe{display:block;width:100%;height:920px;border:0;background:var(--panel)}.floor-note{margin:20px 0 0;padding:15px 18px;border-left:3px solid var(--copper);background:#352820;color:#e0cec0;font-size:13px}.floor-note a{color:#f1c099;text-underline-offset:3px}.foot{border-top:1px solid var(--line);color:#a99c91;font-size:12px;padding:26px 0 34px}
  :focus-visible{outline:2px solid #f5b27f;outline-offset:3px}@media(max-width:700px){.site-header{position:relative;flex-wrap:wrap;padding:10px 16px}.site-nav{width:100%;overflow-x:auto}.site-nav a{white-space:nowrap;flex:1;justify-content:center;padding:7px 10px;font-size:12px}.wrap{padding:0 16px}.intro{padding-top:20px}.intro h1{font-size:27px}.intro p{font-size:12px}.hero-image figcaption{font-size:11px}.floor-tabs{gap:5px;padding:12px 0}.floor-tabs button{min-height:52px;padding:8px 9px}.floor-tabs strong{font-size:13px}.floor-panel{padding:20px 0 55px}.floor-heading h2{font-size:30px}.floor-heading p{font-size:12px}.section-heading{display:block}.section-heading p{margin-top:6px}.route-frame iframe{height:880px}#floor-3 .route-frame iframe{height:min(680px,calc(100svh - 96px))}}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

const panels = floors.map((floor, index) => `<article class="floor-panel" id="${floor.id}" role="tabpanel" aria-labelledby="tab-${floor.id}" ${index ? 'hidden' : ''}>
  <div class="floor-heading"><span class="eyebrow">${floor.number} / FLOOR OVERVIEW</span><h2>${floor.title}</h2><p>${floor.summary}</p></div>
  <figure class="hero-image"><img src="${floor.imageData}" alt="${floor.label}本次提交的整层效果预览图" ${index ? 'loading="lazy"' : ''}><figcaption>本次提交的整层预览 · ${floor.version.toUpperCase()} · 效果示意，开口与尺寸须按修订图核定</figcaption></figure>
  <section class="route-section" aria-label="${floor.label}互动动线"><div class="section-heading"><div><span class="eyebrow">DAILY CIRCULATION</span><h3>这一层怎么走</h3></div><p>选择场景，播放路线并核对交汇位置</p></div><div class="route-frame"><iframe data-src="./floor${index + 1}-circulation.html" title="${floor.label}互动动线图" loading="lazy"></iframe></div></section>
  <p class="floor-note">${floor.note} <a href="./room-review.html#${floor.id}">查看本层施工图核对 ↗</a></p>
</article>`).join('');
const release = {
  version: 1,
  project_id: 'yj-three-floor-whole-home-2026-09-v3',
  release_id: 'yj-home-2026-10-07-v31-circulation-theme',
  baseline_versions: {'floor-1': 20, 'floor-2': 25, 'floor-3': 25},
  visual_asset_count: 3,
  circulation_modules: 3,
  source: 'Three user-supplied floor packages; exact PNG and locally themed circulation HTML'
};
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><link rel="icon" href="data:,"><title>三层设计预览｜YJ Home</title><meta name="description" content="逐层查看用户提交的整层效果图和互动动线图。施工图核对单独展示。"><style>${css}</style></head><body><header class="site-header"><a class="brand" href="./room.html">YJ · HOME</a><nav class="site-nav" aria-label="主导航"><a aria-current="page" href="./room.html">设计预览</a><a href="./room-review.html">施工图核对</a><a href="./room-review.html#source-sets">原始图纸</a></nav></header><main id="visuals" class="wrap"><div class="intro"><span class="eyebrow">THREE FLOORS · USER PREVIEWS</span><h1>三层预览，按楼层查看。</h1><p>每层先看本次提交的整层效果图，再在同页选择生活场景查看动线。施工图核对与原始图纸入口在另一页。</p></div><div class="floor-tabs" role="tablist" aria-label="选择楼层">${floors.map((floor, index) => `<button id="tab-${floor.id}" type="button" role="tab" aria-controls="${floor.id}" aria-selected="${index === 0}" tabindex="${index ? '-1' : '0'}" data-floor="${floor.id}"><span>${floor.number} / FLOOR</span><strong>${floor.label}</strong></button>`).join('')}</div>${panels}</main><footer class="foot"><div class="wrap">YJ HOME · 设计意向预览 · V31　｜　效果图和动线图不替代建筑、结构与水电修订图。</div></footer><script type="application/json" id="releaseManifest">${JSON.stringify(release)}</script><script>
  const tabs=[...document.querySelectorAll('[role="tab"][data-floor]')];
  const frameConfig=new Map(tabs.map(tab=>{const frame=document.querySelector('#'+tab.dataset.floor+' iframe');return [tab.dataset.floor,{src:frame.dataset.src,title:frame.title}]}));
  const activate=id=>{
    const chosen=tabs.some(tab=>tab.dataset.floor===id)?id:'floor-1';
    for(const tab of tabs){
      const active=tab.dataset.floor===chosen,panel=document.getElementById(tab.dataset.floor);
      tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
      if(!active){panel.querySelector('iframe')?.remove();panel.hidden=true;continue}
      panel.hidden=false;
      let frame=panel.querySelector('iframe');
      if(!frame){frame=document.createElement('iframe');frame.title=frameConfig.get(chosen).title;frame.loading='lazy';panel.querySelector('.route-frame').append(frame)}
      if(!frame.hasAttribute('src'))frame.src=frameConfig.get(chosen).src;
    }
  };
  for(const tab of tabs){tab.addEventListener('click',()=>{activate(tab.dataset.floor);if(location.hash.slice(1)!==tab.dataset.floor)location.hash=tab.dataset.floor});tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const index=tabs.indexOf(tab),next=tabs[(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];next.focus();next.click()})}
  addEventListener('hashchange',()=>activate(location.hash.slice(1)));activate(location.hash.slice(1));
</script></body></html>`;
fs.writeFileSync(path.join(output, 'room.html'), html);
console.log(JSON.stringify({release: release.release_id, visualAssets: 3, circulationModules: 3, bytes: Buffer.byteLength(html)}, null, 2));
