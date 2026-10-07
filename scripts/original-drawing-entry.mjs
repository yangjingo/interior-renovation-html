import fs from 'node:fs';
import path from 'node:path';

const sourceSets = [
  {id: 'early', number: '01', title: '早期三层平面方案', pages: 3, role: '历史方案', description: '用于对照三层空间和房间用途的变化。它是早期意向，不作为当前施工依据。', links: []},
  {id: 'architecture', number: '02', title: '建筑图', pages: 20, role: '空间与门窗', description: '核对各层房间用途、门窗洞口、阳台边界与建筑平面。', links: [['arch-1f', '一层 · 第 7 页'], ['arch-2f', '二层 · 第 8 页'], ['floor3Plan', '三层 · 第 9 页']]},
  {id: 'structure', number: '03', title: '结构图', pages: 17, role: '梁板与开口', description: '核对梁、板、墙、楼板高差及拟调整区域；改洞与花园荷载须由结构专业复核。', links: [['struct-2f-beam', '二层 · GS-05'], ['struct-3f-beam', '三层 · GS-07'], ['struct-3f-slab', '三层 · GS-08']]},
  {id: 'plumbing', number: '04', title: '给排水图', pages: 9, role: '用水与排水', description: '核对卫浴、生活阳台的现有给排水关系；新厨房及花园排水需要另行回图。', links: [['water-2f', '二层 · SS-03'], ['water-ss08', '三层 · SS-08']]},
  {id: 'electrical', number: '05', title: '电气图', pages: 15, role: '回路与点位', description: '核对照明、插座、配电及弱电现状；按最终设备清单重新计算和布点。', links: [['electric-al2', '二层 · AL2'], ['electric-3f-weak', '三层 · 弱电']]}
];

const sourceCss = `
  @media(max-width:560px){.site-header{flex-wrap:wrap;padding-top:10px;padding-bottom:10px}.site-nav{width:100%;overflow-x:auto}.site-nav a{white-space:nowrap;flex:1;justify-content:center;padding:8px 10px;font-size:13px}}
  .source-sets{border-top:1px solid var(--line);padding:32px 0 38px;scroll-margin-top:120px}.source-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:18px}.source-heading h2{font:normal clamp(26px,3vw,38px)/1.2 Georgia,"Noto Serif SC",serif;margin:8px 0 0}.source-heading p{color:#d6c8b8;font-size:13px;max-width:420px;margin:0}.source-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.source-card{border:1px solid var(--line);background:#2c2420;border-radius:8px;padding:20px;scroll-margin-top:120px}.source-card-top{display:flex;justify-content:space-between;color:#cda98f;font-size:11px;letter-spacing:.12em}.source-card h3{font-size:22px;margin:14px 0 0;font-weight:500}.source-role{color:#d6a480;font-size:12px}.source-card p{min-height:43px;color:#d6c8b8;font-size:13px;margin:12px 0}.source-links{display:flex;flex-wrap:wrap;gap:8px;min-height:36px;margin:10px 0 15px}.source-links a,.source-links span{display:inline-flex;align-items:center;border:1px solid #6b574b;border-radius:100px;padding:5px 10px;font-size:12px;text-decoration:none}.source-links a:hover{border-color:var(--copper-light)}.local-pdf{display:inline-flex;align-items:center;min-height:42px;border-radius:5px;background:var(--copper);padding:9px 14px;color:#fff;cursor:pointer;font-size:13px;font-weight:600}.local-pdf:hover{background:#c27b50}.local-pdf input{position:absolute;width:1px;height:1px;opacity:0}.local-pdf:focus-within{outline:2px solid #fff;outline-offset:3px}.source-note{font-size:12px;color:#bfae9f;margin:18px 0 0}.early-previews{border-top:1px solid var(--line);margin:8px 0 15px}.early-previews summary{cursor:pointer;color:#e5b18b;font-size:13px;padding:11px 0}.early-previews>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.early-previews figure{margin:0;background:#f5f1eb;color:#3a3029}.early-previews img{width:100%;height:160px;object-fit:contain}.early-previews figcaption{font-size:11px;text-align:center;padding:6px}.drawing-card{scroll-margin-top:120px}.pdf-dialog{width:min(94vw,1200px);height:min(92vh,900px);padding:0;border:1px solid var(--line);border-radius:9px;background:#211b18;color:#fff}.pdf-dialog::backdrop{background:rgba(0,0,0,.78)}.pdf-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 18px}.pdf-dialog-head strong{font-size:14px}.pdf-dialog-actions{display:flex;gap:10px;align-items:center}.pdf-dialog-actions a{font-size:12px}.pdf-dialog-actions button{border:1px solid var(--line);background:none;color:#fff;border-radius:5px;padding:5px 10px}.pdf-dialog iframe{display:block;width:100%;height:calc(100% - 57px);border:0;background:#fff}@media(max-width:700px){.source-heading{display:block}.source-heading p{margin-top:10px}.source-grid{grid-template-columns:1fr}.source-card p{min-height:0}.early-previews img{height:120px}}`;

const pdfDialog = `<dialog class="pdf-dialog" id="local-pdf-dialog" aria-label="本机 PDF 预览"><div class="pdf-dialog-head"><strong data-pdf-title></strong><div class="pdf-dialog-actions"><a data-open-pdf-tab target="_blank" rel="noopener">新标签打开</a><button type="button" data-close-pdf>关闭</button></div></div><iframe title="本机 PDF 原件预览"></iframe></dialog>`;
const sourceScript = `<script>let localPdfUrl;const pdfDialog=document.querySelector('#local-pdf-dialog');const pdfFrame=pdfDialog.querySelector('iframe');const pdfTab=pdfDialog.querySelector('[data-open-pdf-tab]');for(const input of document.querySelectorAll('[data-source-pdf]'))input.addEventListener('change',()=>{const file=input.files&&input.files[0];if(!file)return;if(!/\\.pdf$/i.test(file.name)){input.value='';return}if(localPdfUrl)URL.revokeObjectURL(localPdfUrl);localPdfUrl=URL.createObjectURL(file);pdfFrame.src=localPdfUrl;pdfTab.href=localPdfUrl;pdfDialog.querySelector('[data-pdf-title]').textContent=input.closest('.source-card').querySelector('h3').textContent+' · 本机原件';pdfDialog.showModal();input.value=''});pdfDialog.querySelector('[data-close-pdf]').addEventListener('click',()=>pdfDialog.close());pdfDialog.addEventListener('close',()=>{pdfFrame.removeAttribute('src');pdfTab.removeAttribute('href');if(localPdfUrl)URL.revokeObjectURL(localPdfUrl);localPdfUrl=undefined});</script>`;

function makeSourceSection(root) {
  const earlyPreviews = [1, 2, 3].map(number => {
    const bytes = fs.readFileSync(path.join(root, `example/work/drawing-evidence/floor${number}-previous-scheme-plan.webp`));
    const floor = ['一', '二', '三'][number - 1];
    return `<figure><img src="data:image/webp;base64,${bytes.toString('base64')}" alt="早期方案${floor}层平面图" loading="lazy"><figcaption>${floor}层 · 历史平面方案</figcaption></figure>`;
  }).join('');
  const cards = sourceSets.map(set => `<article class="source-card" id="source-${set.id}"><div class="source-card-top"><span>${set.number} / 05</span><span>${set.pages} 页原件</span></div><h3>${set.title}</h3><span class="source-role">${set.role}</span><p>${set.description}</p><div class="source-links">${set.links.map(([key, label]) => `<a href="#drawing-${key}">${label} ↗</a>`).join('') || '<span>下方可查看三层历史平面图</span>'}</div>${set.id === 'early' ? `<details class="early-previews"><summary>查看三层历史平面图</summary><div>${earlyPreviews}</div></details>` : ''}<label class="local-pdf">从本机打开完整 PDF<input type="file" accept=".pdf,application/pdf" data-source-pdf="${set.id}"></label></article>`).join('');
  return `<section class="source-sets" id="source-sets" aria-labelledby="source-title"><div class="source-heading"><div><span class="eyebrow">ORIGINAL DRAWING SETS</span><h2 id="source-title">原始图纸 · 五套资料</h2></div><p>公开页面提供脱敏预览和对应核对位置。完整原件可从本机选择，在当前浏览器直接查看。</p></div><div class="source-grid">${cards}</div><p class="source-note">建筑、结构、水、电原件含私人图签，未上传本站；这里的施工图链接是经脱敏的选页摘录，并非整套 PDF。浏览器本地打开原件时不会上传文件。</p></section>`;
}

export function addOriginalDrawingEntry(name, html, drawingFloors, root) {
  let result = html.replace('</style>', `${sourceCss}</style>`);
  if (name === 'room.html') {
    return result
      .replace('<a href="./room-review.html">施工图核对</a></nav>', '<a href="./room-review.html">施工图核对</a><a href="./room-review.html#source-sets">原始图纸</a></nav>')
  }
  if (name !== 'room-review.html') throw new Error(`Unknown page ${name}`);
  const keys = drawingFloors.flatMap(floor => floor.drawings.map(([key]) => key));
  let index = 0;
  result = result
    .replace(/<figure class="drawing-card">/g, () => `<figure class="drawing-card" id="drawing-${keys[index++]}">`)
    .replace('<a aria-current="page" href="./room-review.html">施工图核对</a></nav>', '<a aria-current="page" href="./room-review.html">施工图核对</a><a href="#source-sets">原始图纸</a></nav>')
    .replace('<nav class="review-index"', `${makeSourceSection(root)}<nav class="review-index"`)
    .replace('</body></html>', `${pdfDialog}${sourceScript}</body></html>`);
  if (index !== keys.length || !result.includes('id="source-sets"')) throw new Error('Source entry injection failed');
  return result;
}
