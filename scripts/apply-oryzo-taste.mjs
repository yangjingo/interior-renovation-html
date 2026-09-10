import fs from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const htmlPath = process.argv[2] || path.resolve(packageRoot, '..', '..', 'yj-three-floor-whole-home-plan.html');
const styleId = 'oryzoDarkroomTaste';

const css = String.raw`
/* ORYZO_DARKROOM_TASTE_START */
:root{
  --paper:#100904;--paper2:#160d08;--card:#1a100a;--ink:#ffedd7;--muted:#a99b8b;
  --line:#40372e;--wood:#9a7659;--clay:#dc5000;--sage:#78806d;--dark:#100904;
  --color-warm-cream:#ffedd7;--color-walnut-shadow:#100904;--color-bark-brown:#382416;
  --color-cork-border:#40372e;--color-driftwood:#6c5f51;--color-ember-accent:#dc5000;
  --serif:"Bahnschrift","Aptos Display","PingFang SC","Microsoft YaHei",sans-serif;
  --sans:"Aptos","PingFang SC","Microsoft YaHei",sans-serif
}
html{background:var(--color-walnut-shadow);scrollbar-color:var(--color-driftwood) var(--color-walnut-shadow)}
body{background:
  radial-gradient(circle at 74% 4%,rgba(92,54,30,.22),transparent 30rem),
  radial-gradient(circle at 16% 74%,rgba(220,80,0,.055),transparent 26rem),
  var(--color-walnut-shadow);color:var(--color-warm-cream);font-family:var(--sans);letter-spacing:0;overflow-x:hidden}
body:before{content:"";position:fixed;inset:0;pointer-events:none;z-index:1000;opacity:.11;mix-blend-mode:soft-light;background-image:repeating-linear-gradient(117deg,rgba(255,237,215,.05) 0,rgba(255,237,215,.05) 1px,transparent 1px,transparent 4px)}
body:after{content:"YJ HOME · THREE FLOORS · 540 M²";position:fixed;z-index:35;right:11px;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;font:500 9px/1 var(--sans);color:var(--color-driftwood);letter-spacing:.16em;pointer-events:none}
::selection{background:var(--color-ember-accent);color:var(--color-warm-cream)}

.app{display:block;min-height:100vh}
aside.site-nav{position:sticky;top:0;height:auto;padding:13px 30px;border:0;border-bottom:1px dashed var(--color-cork-border);background:rgba(16,9,4,.91);backdrop-filter:blur(18px);display:grid;grid-template-columns:minmax(205px,310px) minmax(0,1fr);align-items:center;gap:30px;z-index:40}
.brand{min-width:0}.brand .kicker{color:var(--color-ember-accent);font-size:8px;letter-spacing:.14em}.brand h1{font:500 16px/.95 var(--serif);margin:7px 0 0;white-space:nowrap;color:var(--color-warm-cream)}
.brand p,.nav-note{display:none}
nav{display:flex;justify-content:flex-end;gap:clamp(8px,1.45vw,24px);margin:0;min-width:0;overflow-x:auto;scrollbar-width:none}
nav::-webkit-scrollbar{display:none}
.tab{position:relative;flex:0 0 auto;border:0;border-radius:0;background:transparent;padding:10px 0 9px;color:var(--color-warm-cream);gap:6px;font:500 10px/1 var(--sans);white-space:nowrap;transition:color .2s ease,opacity .2s ease}
.tab:hover{background:transparent;color:var(--color-ember-accent)}
.tab:after{content:"";position:absolute;left:0;right:0;bottom:2px;border-bottom:1px dashed transparent;transform:scaleX(.3);transition:transform .25s ease,border-color .25s ease}
.tab[aria-selected="true"]{background:transparent;color:var(--color-warm-cream)}
.tab[aria-selected="true"]:after{border-color:var(--color-ember-accent);transform:scaleX(1)}
.tab .n{width:auto;height:auto;border:0;border-radius:0;display:inline;font-size:8px;color:var(--color-ember-accent);opacity:1}

main{min-width:0;padding:0 clamp(28px,4vw,68px) 90px}
.topbar{min-height:55px;margin:0;padding:15px 0;border-bottom:1px dashed var(--color-cork-border);color:var(--color-warm-cream)}
.crumb{font:500 9px/1.4 var(--sans);color:var(--color-driftwood);text-transform:uppercase;letter-spacing:.1em}
.btn,.plan-tools button,.room-nav button,.viewer-tools button,.buy-filter button{border:1px solid var(--color-driftwood);background:transparent;color:var(--color-warm-cream);border-radius:9999px;padding:8px 14px;font:500 9px/1 var(--sans);text-transform:uppercase;box-shadow:none;transition:background .2s ease,border-color .2s ease,color .2s ease}
.btn:hover,.plan-tools button:hover,.room-nav button:hover,.viewer-tools button:hover,.buy-filter button:hover{background:var(--color-bark-brown);border-color:var(--color-bark-brown);color:var(--color-warm-cream)}

.panel{padding-top:clamp(34px,5vw,72px);animation:darkroomEnter .5s cubic-bezier(.2,.7,.2,1) both}
.panel.active{display:block}
@keyframes darkroomEnter{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.section-head{position:relative;margin:0 0 clamp(32px,5vw,72px);padding:0 0 clamp(26px,3vw,42px);border-bottom:1px dashed var(--color-cork-border)}
.section-head:after{content:"* PRIVATE RESIDENTIAL CONCEPT";position:absolute;right:0;bottom:12px;font:500 8px/1 Arial,sans-serif;color:var(--color-ember-accent)}
.section-head h2{max-width:1100px;font:500 clamp(42px,6vw,86px)/.92 var(--serif);letter-spacing:0;margin:14px 0 20px;color:var(--color-warm-cream)}
.section-head p{max-width:900px;font-size:clamp(15px,1.35vw,20px);line-height:1.55;color:var(--color-warm-cream);opacity:.72;margin:0}
.kicker,.eyebrow{font:500 9px/1 var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--color-ember-accent)}

.hero{position:relative;isolation:isolate;overflow:hidden;border:0;border-radius:0;margin:calc(clamp(34px,5vw,72px)*-1) calc(clamp(28px,4vw,68px)*-1) 0;padding:clamp(54px,8vw,116px) clamp(34px,7vw,104px);min-height:calc(100vh - 112px);background:
  linear-gradient(112deg,rgba(16,9,4,.98) 8%,rgba(16,9,4,.76) 58%,rgba(56,36,22,.72)),
  radial-gradient(circle at 76% 44%,#6b543f 0,#382416 24%,#100904 68%);display:grid;align-content:center;border-bottom:1px dashed var(--color-cork-border)}
.hero:before{content:"";position:absolute;z-index:-1;width:min(52vw,710px);aspect-ratio:1;right:-7vw;top:50%;transform:translateY(-50%) rotate(18deg);border:1px solid var(--color-cork-border);border-radius:50%;background:radial-gradient(circle,transparent 0 64%,rgba(64,55,46,.07) 64% 72%,transparent 72% 80%,rgba(64,55,46,.13) 80% 90%,transparent 90%)}
.hero:after{content:"03 / 03";position:absolute;width:auto;height:auto;right:clamp(34px,6vw,90px);bottom:32px;border-radius:0;background:none;font:500 11px/1 var(--sans);color:var(--color-ember-accent);letter-spacing:.08em}
.hero h2{max-width:900px;font:500 clamp(54px,6.5vw,94px)/.9 var(--serif);letter-spacing:0;margin:18px 0 30px;color:var(--color-warm-cream);text-wrap:balance}
.hero p{max-width:790px;font-size:clamp(17px,1.6vw,25px);line-height:1.5;color:var(--color-warm-cream);opacity:.72}

.metrics,.grid3,.grid2{gap:1px;margin-top:1px;background:var(--color-cork-border)}
.metrics{grid-template-columns:repeat(4,1fr);margin-bottom:clamp(70px,10vw,150px)}
.grid3{grid-template-columns:repeat(3,1fr)}.grid2{grid-template-columns:repeat(2,1fr)}
.card{background:var(--color-walnut-shadow);border:0;border-radius:0;padding:clamp(22px,2.4vw,38px);box-shadow:none}
.metric{min-height:132px;display:flex;flex-direction:column;justify-content:space-between}
.metric strong{font:500 clamp(26px,2.55vw,40px)/.94 var(--serif);color:var(--color-warm-cream);margin:0;text-wrap:balance}.metric span{font-size:10px;line-height:1.6;color:var(--color-driftwood);text-transform:uppercase}
.floor-card{min-height:430px;background:var(--color-walnut-shadow);border:0;padding:clamp(25px,3vw,46px)}
.floor-card:before{height:1px;background:var(--tone)}
.floor-card h3{font:500 clamp(28px,2.8vw,44px)/.96 var(--serif);margin:28px 0 22px;color:var(--color-warm-cream)}
.floor-card p,.floor-card li{font-size:13px;line-height:1.8;color:var(--color-muted,#a99b8b)}
.floor-card ul{padding-left:16px}.floor-card li::marker{color:var(--color-ember-accent)}
.ratio{padding-top:18px;border-top:1px dashed var(--color-cork-border);font-size:9px;color:var(--color-ember-accent)}

.floor-switch{display:flex;gap:0;margin:0 0 42px;border-bottom:1px dashed var(--color-cork-border)}
.floor-switch button{flex:1;border:0;border-radius:0;padding:16px 14px;background:transparent;color:var(--color-driftwood);text-align:left;font:500 12px/1 var(--sans)}
.floor-switch small{font-size:9px;color:inherit;margin-top:8px}
.floor-switch button:hover{color:var(--color-warm-cream)}
.floor-switch button.active,.floor-switch button[aria-selected="true"]{background:var(--color-bark-brown);color:var(--color-warm-cream)}

.floor-content-head,.visual-intro{display:grid;grid-template-columns:auto minmax(220px,.65fr) minmax(300px,1fr);gap:24px;align-items:end;margin:12px 0 30px;padding-bottom:22px;border-bottom:1px dashed var(--color-cork-border)}
.floor-content-head h3,.visual-intro h3{font:500 clamp(30px,3.6vw,56px)/.92 var(--serif);margin:0;color:var(--color-warm-cream)}
.floor-content-head p,.visual-intro p{max-width:700px;margin:0;color:var(--color-muted,#a99b8b);font-size:13px;line-height:1.72}
.plan-layout{grid-template-columns:minmax(0,1.45fr) minmax(320px,.55fr);gap:1px;background:var(--color-cork-border);align-items:stretch}
.plan-viewport{height:min(76vh,840px);background:#f1e7d8;border:0;border-radius:0}
.room-detail{background:var(--color-bark-brown);color:var(--color-warm-cream);border-radius:0;padding:clamp(24px,3vw,44px);min-height:560px}
.room-count{font:500 58px/.8 var(--serif);color:var(--color-ember-accent);opacity:1}
.room-title{font:500 38px/.95 var(--serif);margin:22px 0 9px}.room-size{color:var(--color-ember-accent)}
.room-detail dl div{border-top:1px dashed var(--color-driftwood)}.room-detail dt{color:var(--color-driftwood)}.room-detail dd{color:var(--color-warm-cream);opacity:.76}
.room-list button{border:0;border-bottom:1px solid transparent;border-radius:0;padding:5px 2px;color:var(--color-driftwood)}.room-list button.active{background:transparent;color:var(--color-warm-cream);border-bottom-color:var(--color-ember-accent)}

.table-wrap{border:1px solid var(--color-cork-border);border-radius:0;background:transparent}.facts{margin-top:22px}
table{font-size:11px;color:var(--color-warm-cream)}th,td{border-bottom:1px dashed var(--color-cork-border);padding:14px 15px}th{color:var(--color-driftwood);background:var(--color-bark-brown);font-size:8px;text-transform:uppercase}tbody tr:hover{background:rgba(56,36,22,.35)}
.verification .yes{color:#93a688}.verification .no{color:#df7951}
.tag{border:1px solid var(--color-cork-border);border-radius:9999px;padding:5px 9px;background:transparent;color:var(--color-warm-cream);font-size:8px}.tag.proposal{background:transparent;color:var(--color-ember-accent);border-color:var(--color-ember-accent)}.tag.drawing{background:transparent;color:#a8b49c;border-color:#78806d}

.mods{grid-template-columns:repeat(2,1fr);gap:1px;background:var(--color-cork-border)}
.mod-card{background:var(--color-walnut-shadow);border:0;border-radius:0;padding:clamp(24px,3vw,44px)}
.mod-card h3{font:500 28px/1 var(--serif);color:var(--color-warm-cream)}.mod-card>strong{color:var(--color-warm-cream)}.mod-card p,.fallback{color:var(--color-muted,#a99b8b)}.fallback{border-top:1px dashed var(--color-cork-border)}.floor-pill{color:var(--color-ember-accent)}

.special-area-stack{gap:1px!important;background:var(--color-cork-border)}
.special-area-block{background:var(--color-walnut-shadow)!important;border:0!important;border-radius:0!important;padding:clamp(26px,3vw,46px)!important;gap:clamp(24px,4vw,60px)!important}
.special-copy h3{font:500 clamp(30px,3.2vw,50px)/.92 var(--serif)!important;color:var(--color-warm-cream)}.special-copy p{font-size:13px!important;color:var(--color-muted,#a99b8b)!important}
.special-visual-grid{gap:1px!important;background:var(--color-cork-border)}
.special-visual,.special-area-block.dark .special-visual{background:var(--color-bark-brown)!important;color:var(--color-warm-cream)!important;border:0!important;border-radius:0!important}
.special-visual img{border-radius:0;filter:saturate(.85) contrast(1.04)}

.viewer-shell{border-radius:0;border:1px solid var(--color-cork-border);background:var(--color-walnut-shadow);margin-bottom:48px}.viewer-bar{background:var(--color-walnut-shadow);border-bottom:1px dashed var(--color-cork-border);padding:14px 18px}.viewer-note{background:var(--color-bark-brown);color:var(--color-muted,#a99b8b);border-top:1px dashed var(--color-cork-border)}
#visuals>.section-head{background:transparent;color:var(--color-warm-cream);border-radius:0;padding:0 0 clamp(26px,3vw,42px);margin-bottom:42px}#visuals>.section-head .eyebrow{color:var(--color-ember-accent)}#visuals>.section-head p{color:var(--color-warm-cream);opacity:.72}
#threeStage{background:linear-gradient(150deg,#6f5a46,#20130b 60%,#100904)}
.pair-label{grid-template-columns:auto 1fr auto;margin:34px 0 15px;color:var(--color-driftwood)}.pair-label i{height:0;border-top:1px dashed var(--color-cork-border)}
.visual-grid{gap:1px;background:var(--color-cork-border);margin-bottom:34px}.visual-grid.previews,.visual-grid.finals{grid-template-columns:repeat(auto-fit,minmax(310px,1fr))}
.visual-card{background:var(--color-walnut-shadow);border:0;border-radius:0;color:var(--color-warm-cream);box-shadow:none;transition:background .2s ease}.visual-card:hover{background:var(--color-bark-brown)}
.visual-card img{border-radius:0;filter:saturate(.88) contrast(1.03);transition:filter .35s ease,transform .55s cubic-bezier(.2,.7,.2,1)}.visual-card:hover img{filter:saturate(1) contrast(1.06);transform:scale(1.012)}
.visual-card figcaption{padding:15px 16px}.visual-card figcaption strong{font-size:11px;color:var(--color-warm-cream)}.visual-card figcaption span{font-size:9px;color:var(--color-muted,#a99b8b)}
.room-render-summary{border:0!important;border-top:1px dashed var(--color-cork-border)!important;border-bottom:1px dashed var(--color-cork-border)!important;border-radius:0!important;background:transparent!important;color:var(--color-warm-cream)!important;margin:18px 0!important;padding:16px 0!important}.room-render-summary strong{font:500 20px/1 var(--serif)!important}.room-render-card:before{background:var(--color-ember-accent);color:var(--color-warm-cream);border-radius:0}

.material-list{background:transparent;border:1px solid var(--color-cork-border);border-radius:0;padding:0 22px}.material-row{border-bottom:1px dashed var(--color-cork-border);padding:20px 0}.material-row strong{color:var(--color-warm-cream)}.material-row p{color:var(--color-muted,#a99b8b)}
.budget{margin-top:60px;background:var(--color-bark-brown);padding:clamp(28px,4vw,56px)}.budget-total{font:500 clamp(38px,5vw,72px)/.9 var(--serif);color:var(--color-warm-cream)}.factor select{border:0;border-bottom:1px solid var(--color-warm-cream);border-radius:0;background:transparent;color:var(--color-warm-cream)}.factor option{background:var(--color-walnut-shadow)}
.budget-foot,.small{color:var(--color-muted,#a99b8b)}

.buy-filter{border-bottom:1px dashed var(--color-cork-border);padding-bottom:16px;margin-bottom:1px}.buy-filter button{border:0;border-radius:0;border-bottom:1px solid transparent}.buy-filter button.active{background:transparent;color:var(--color-warm-cream);border-bottom-color:var(--color-ember-accent)}
.shopping-grid{grid-template-columns:repeat(3,1fr);gap:1px;background:var(--color-cork-border)}
.shop-card{background:var(--color-walnut-shadow);border:0;border-radius:0;min-height:250px;padding:24px}.shop-card h3{font:500 24px/1 var(--serif);color:var(--color-warm-cream)}.shop-card p{color:var(--color-muted,#a99b8b)}.shop-top{color:var(--color-ember-accent)}.shop-top em{color:#9aa68d}.search-term{background:var(--color-bark-brown);border-radius:0;color:var(--color-warm-cream)}.copy-search{border:0;border-radius:9999px;background:transparent;color:var(--color-warm-cream);text-decoration:underline;text-underline-offset:3px}

.lightbox-inner{background:var(--color-walnut-shadow);border:1px solid var(--color-cork-border);border-radius:0}.lightbox-bar{color:var(--color-warm-cream)}.lightbox-bar button{border-color:var(--color-driftwood);color:var(--color-warm-cream)}

@media(max-width:1100px){
  aside.site-nav{grid-template-columns:1fr;padding:12px 22px;gap:8px}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand h1{margin:0}.brand .kicker{display:none}nav{justify-content:flex-start}.floor-content-head,.visual-intro{grid-template-columns:auto 1fr}.floor-content-head p,.visual-intro p{grid-column:1/-1}.material-row{grid-template-columns:130px 1fr 1fr}.shopping-grid{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:700px){
  body:after{display:none}aside.site-nav{position:sticky;padding:10px 14px}.brand h1{font-size:13px}nav{gap:16px}.tab{font-size:9px}.tab span:last-child{display:inline}.tab .n{display:none}
  main{padding:0 14px 54px}.topbar{min-height:48px}.hero{margin:calc(clamp(34px,5vw,72px)*-1) -14px 0;padding:60px 22px;min-height:72vh}.hero h2{font-size:clamp(40px,11vw,52px);line-height:.94}
  .metrics,.grid3,.grid2,.mods,.shopping-grid,.visual-grid{grid-template-columns:1fr}.metrics{margin-bottom:76px}.metric{min-height:112px}.section-head:after{position:static;display:block;margin-top:18px}.section-head h2{font-size:42px}
  .floor-switch{overflow-x:auto}.floor-switch button{min-width:150px}.floor-content-head,.visual-intro{display:grid;grid-template-columns:1fr}.floor-content-head p,.visual-intro p{grid-column:auto}.plan-layout{grid-template-columns:1fr}.plan-viewport{height:60vh}.room-detail{min-height:auto}.special-area-block{grid-template-columns:1fr!important}.special-visual-grid{grid-template-columns:1fr!important}.material-row{grid-template-columns:1fr}.material-row p:last-child{grid-column:auto}.budget{padding:26px 18px}.shopping-grid{grid-template-columns:1fr}
}
@media print{body{background:#fff;color:#111}body:before,body:after{display:none}aside.site-nav{position:relative;background:#fff;color:#111}.panel{padding-top:24px}.card,.visual-card,.shop-card{color:#111;background:#fff}.section-head h2,.hero h2,.floor-card h3,.visual-card figcaption strong{color:#111}.hero{min-height:0;background:#fff;color:#111}}
/* ORYZO_DARKROOM_TASTE_END */`;

let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(new RegExp(`<style\\s+id=["']${styleId}["']>[\\s\\S]*?<\\/style>`, 'i'), '');
html = html.replace('</head>', `<style id="${styleId}">${css}</style>\n</head>`);
if (!/<body\b[^>]*\bdata-ui-style=/i.test(html)) html = html.replace('<body ', '<body data-ui-style="oryzo-darkroom" ');

const tempPath = `${htmlPath}.taste.tmp`;
fs.writeFileSync(tempPath, html);
fs.renameSync(tempPath, htmlPath);
console.log(`Applied ORYZO darkroom taste system to ${htmlPath}`);
