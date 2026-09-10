import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const target = path.resolve(process.argv[2] || path.join(repoRoot, 'example', 'output-html', 'room.html'));
let html = fs.readFileSync(target, 'utf8');

const viewerStart = html.indexOf('<div class="viewer-shell">', html.indexOf('<section id="visuals"'));
const firstFloorVisual = html.indexOf('<article class="floor-content active"', viewerStart);
if (viewerStart < 0 || firstFloorVisual < 0) throw new Error('viewer block not found');

const viewer = `<div class="viewer-shell reference-viewer"><div class="viewer-bar"><strong id="active3DTitle">一层 · 约 180㎡ · 独立概念模型</strong><div class="viewer-tools" role="group" aria-label="3D 视图控制"><button class="viewer-btn active" type="button" data-camera-view="bird" aria-pressed="true">鸟瞰</button><button class="viewer-btn" type="button" data-camera-view="top" aria-pressed="false">正投俯视</button><button class="viewer-btn" type="button" data-camera-view="axis" aria-pressed="false">主要轴线</button><button class="viewer-btn" type="button" data-camera-view="private" aria-pressed="false">卧室私区</button><button class="viewer-btn active" type="button" id="toggleWalls" aria-pressed="true">墙体</button><button class="viewer-btn" type="button" id="toggleNight" aria-pressed="false">夜景</button><button class="viewer-btn" type="button" id="toggleLabels" aria-pressed="false">房间名</button><button class="viewer-btn" type="button" id="capture3D">保存 PNG</button></div></div><div id="threeStage"><div id="threeMount"></div><div id="viewerStatus">一层独立模型 · 西侧客厅—餐厅完全开放，餐厨以满幅透明玻璃移门相连；东侧双卧双卫</div><div id="viewerError"><strong>正在加载交互 3D</strong><small>若网络不可用，下方各层静态 3D 与效果图仍完整内嵌。</small></div></div><div class="viewer-note">拖动旋转 · 滚轮缩放 · 右键平移。三层模型分别由各自 baseline 构建；普通户型图无法可靠判断承重属性，结构未核实前不可据此拆墙或扩洞。</div></div>`;
html = `${html.slice(0, viewerStart)}${viewer}${html.slice(firstFloorVisual)}`;

const styleEnd = html.indexOf('</style>');
if (styleEnd < 0) throw new Error('style block not found');
const css = `
#visuals>.section-head{background:#1d201d;color:#f6f0e7;border-radius:28px;padding:36px 42px;margin-bottom:18px}#visuals>.section-head .eyebrow{color:#d9b77c}#visuals>.section-head p{color:#c8c4bb}.reference-viewer{border-radius:24px;background:#171814;border-color:#34362f;box-shadow:0 24px 70px rgba(44,36,26,.16)}.reference-viewer .viewer-bar{padding:13px 15px;background:#151612}.reference-viewer .viewer-btn{border:1px solid #4e5048;background:#1f211d;color:#e8e3da;border-radius:999px;padding:8px 12px}.reference-viewer .viewer-btn.active,.reference-viewer .viewer-btn[aria-pressed="true"]{background:#d1ae75;color:#171814;border-color:#d1ae75}#threeStage{position:relative;min-height:620px;background:linear-gradient(#bdb5aa 0%,#8f8577 46%,#1a140d 100%);overflow:hidden}#threeMount,#threeMount canvas{display:block;width:100%;height:100%}#threeMount{position:absolute;inset:0}#viewerStatus{position:absolute;left:16px;right:16px;bottom:14px;z-index:3;padding:10px 13px;border:1px solid rgba(255,255,255,.16);border-radius:12px;background:rgba(20,20,17,.78);color:#eee7dc;font-size:10px;backdrop-filter:blur(8px)}#viewerError{position:absolute;inset:0;z-index:4;display:grid;place-content:center;text-align:center;background:linear-gradient(145deg,#bdb5aa,#756b5e);color:#171814}#viewerError[hidden]{display:none}#viewerError strong{font:700 24px var(--serif)}#viewerError small{display:block;max-width:520px;margin-top:8px}.reference-viewer .viewer-note{background:#f6f0e7;color:#6b665d}.floor-content .visual-intro{border-top:1px solid var(--line);padding-top:22px}.visual-grid.previews,.visual-grid.finals{grid-template-columns:repeat(auto-fit,minmax(310px,1fr))}@media(max-width:700px){#visuals>.section-head{padding:26px 22px}#threeStage{min-height:500px}.reference-viewer .viewer-tools{gap:5px}.reference-viewer .viewer-btn{padding:7px 9px}}
`;
html = `${html.slice(0, styleEnd)}${css}${html.slice(styleEnd)}`;

const modulePattern = /<script type="module">[\s\S]*?<\/script>\s*<\/body>/;
if (!modulePattern.test(html)) throw new Error('module script not found');

const moduleCode = String.raw`<script type="module">
(async()=>{
  const stage=document.getElementById('threeStage');
  const mount=document.getElementById('threeMount');
  const fallback=document.getElementById('viewerError');
  const status=document.getElementById('viewerStatus');
  const title=document.getElementById('active3DTitle');
  try{
    const THREE=await import('three');
    const {OrbitControls}=await import('three/addons/controls/OrbitControls.js');
    const projectConfig=JSON.parse(document.getElementById('projectConfig').textContent);
    const buildingCore=JSON.parse(document.getElementById('buildingCore').textContent);
    const baselines=JSON.parse(document.getElementById('floorBaselines').textContent);
    const modifications=JSON.parse(document.getElementById('modifications').textContent);
    const verticalAssumptions=projectConfig.vertical_assumptions;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.03;
    mount.replaceChildren(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','三层住宅逐层独立交互式三维模型');
    const scene=new THREE.Scene();
    const dayColor=new THREE.Color(0xb8b0a4);
    const nightColor=new THREE.Color(0x111315);
    scene.background=dayColor.clone();
    scene.fog=new THREE.Fog(dayColor,26,58);
    const camera=new THREE.PerspectiveCamera(40,1,.08,110);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=4;controls.maxDistance=48;controls.maxPolarAngle=Math.PI*.495;controls.screenSpacePanning=true;

    function texture(base,kind='cement'){
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=base;c.fillRect(0,0,128,128);let seed=34917;const random=()=>((seed=Math.imul(seed^(seed>>>15),seed|1))>>>0)/4294967296;
      if(kind==='wood'){for(let y=3;y<128;y+=4){c.strokeStyle='rgba(225,183,135,'+(.025+random()*.055)+')';c.beginPath();c.moveTo(0,y);for(let x=0;x<=128;x+=8)c.lineTo(x,y+Math.sin((x+random()*14)*.11)*(.5+random()));c.stroke();}}
      else if(kind==='tile'){c.strokeStyle='rgba(30,30,27,.16)';for(let i=0;i<=128;i+=32){c.beginPath();c.moveTo(i,0);c.lineTo(i,128);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(128,i);c.stroke();}}
      else{for(let i=0;i<1700;i++){const shade=random()>.5?238:28;c.fillStyle='rgba('+shade+','+shade+','+shade+','+(.01+random()*.025)+')';c.fillRect(random()*128,random()*128,1+random()*1.4,1+random()*1.4);}}
      const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(kind==='tile'?4:3,kind==='tile'?4:3);return map;
    }
    const cementMap=texture('#827d75');const plasterMap=texture('#989087');const woodMap=texture('#3c2c22','wood');const tileMap=texture('#77766f','tile');
    const material={
      stone:new THREE.MeshStandardMaterial({color:0x817a70,map:cementMap,roughness:.94}),
      cement:new THREE.MeshStandardMaterial({color:0x68645e,map:cementMap,roughness:.96}),
      woodFloor:new THREE.MeshStandardMaterial({color:0x4b3b31,map:woodMap,roughness:.82}),
      tile:new THREE.MeshStandardMaterial({color:0x73756f,map:tileMap,roughness:.9}),
      wall:new THREE.MeshStandardMaterial({color:0xaa9b8c,map:plasterMap,roughness:.97}),
      wallDark:new THREE.MeshStandardMaterial({color:0x7c6a5c,map:plasterMap,roughness:.96}),
      wood:new THREE.MeshStandardMaterial({color:0x3d2d23,map:woodMap,roughness:.76}),
      charcoal:new THREE.MeshStandardMaterial({color:0x242523,roughness:.88}),
      fabric:new THREE.MeshStandardMaterial({color:0x4d4944,roughness:1}),
      fabricLight:new THREE.MeshStandardMaterial({color:0xaaa197,roughness:1}),
      metal:new THREE.MeshStandardMaterial({color:0x202321,roughness:.43,metalness:.7}),
      ceramic:new THREE.MeshStandardMaterial({color:0xdfdcd4,roughness:.28}),
      glass:new THREE.MeshPhysicalMaterial({color:0xa8b6b6,transparent:true,opacity:.25,roughness:.08,transmission:.25,side:THREE.DoubleSide}),
      plant:new THREE.MeshStandardMaterial({color:0x52604e,roughness:.95}),
      glow:new THREE.MeshStandardMaterial({color:0xffd29e,emissive:0xffa956,emissiveIntensity:.8,roughness:.35})
    };
    const hemi=new THREE.HemisphereLight(0xfff1dc,0x423a34,1.9);scene.add(hemi);
    const sun=new THREE.DirectionalLight(0xffd5a6,3);sun.position.set(10,18,11);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshStandardMaterial({color:0x201810,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.18;ground.receiveShadow=true;scene.add(ground);
    const modelRoot=new THREE.Group();scene.add(modelRoot);
    const models=new Map();let currentFloor='floor-1';let night=false;let wallsVisible=true;let labelsVisible=false;

    function box(w,h,d,x,y,z,mat,parent,ry=0){const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.02,w),Math.max(.02,h),Math.max(.02,d)),mat);mesh.position.set(x,y,z);mesh.rotation.y=ry;mesh.castShadow=h>.12;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
    function cylinder(r,h,x,y,z,mat,parent,sides=24){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,sides),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
    function sofa(x,z,w,parent,ry=0){box(w,.32,.78,x,.29,z,material.fabricLight,parent,ry);box(w,.58,.18,x,.62,z+.33,material.fabric,parent,ry);}
    function bed(x,z,w,parent,ry=0){box(w,.16,2.02,x,.14,z,material.wood,parent,ry);box(w-.06,.27,1.94,x,.34,z,material.ceramic,parent,ry);}
    function chair(x,z,parent){box(.46,.42,.46,x,.24,z,material.fabric,parent);box(.46,.55,.12,x,.64,z+.19,material.fabric,parent);}
    function plant(x,z,parent){cylinder(.2,.28,x,.14,z,material.charcoal,parent);for(let i=0;i<7;i++){const leaf=box(.09,.62,.05,x,.62,z,material.plant,parent);leaf.rotation.z=(i-3)*.19;leaf.rotation.y=i*.9;}}
    function addLamp(x,z,parent,power=.38){cylinder(.055,.03,x,2.5,z,material.glow,parent,16);const light=new THREE.PointLight(0xffbd7a,power,4.6,2);light.position.set(x,2.42,z);light.userData.base=power;parent.add(light);}
    function centre(zone,overall){return{x:zone.bounds.x+zone.bounds.width/2-overall.width/2,z:zone.bounds.z+zone.bounds.depth/2-overall.depth/2};}
    function floorMaterial(floorId,zone){const id=zone.id;if(zone.classification==='exterior'||id.includes('balcony')||id.includes('porch')||id.includes('landscape'))return material.tile;if(zone.classification==='wet-service'||id.includes('wet')||id.includes('bath'))return material.tile;if(id.includes('bedroom')||id.includes('primary')||id.includes('guest')||id.includes('west-'))return material.woodFloor;if(floorId==='floor-3')return material.cement;return material.stone;}
    function openingWidth(opening){const mod=modifications.find(item=>item.id===opening.modification_id);const range=mod?.delta?.opening_width_mm;if(range&&Number.isFinite(range.min)&&Number.isFinite(range.max))return(range.min+range.max)/2000;return opening.id.includes('stair')?1.4:1.0;}
    function openingGaps(floor,zones){const byId=new Map(zones.map(z=>[z.id,z]));return floor.openings.map(op=>{const a=byId.get(op.between[0]),b=byId.get(op.between[1]);if(!a||!b)return null;const A=a.bounds,B=b.bounds,w=openingWidth(op);const ar=A.x+A.width,br=B.x+B.width,ab=A.z+A.depth,bb=B.z+B.depth;if(Math.abs(ar-B.x)<.01||Math.abs(br-A.x)<.01){const line=Math.abs(ar-B.x)<.01?ar:br;const from=Math.max(A.z,B.z),to=Math.min(ab,bb),mid=(from+to)/2;return{axis:'v',line,from:Math.max(from,mid-w/2),to:Math.min(to,mid+w/2),id:op.id};}if(Math.abs(ab-B.z)<.01||Math.abs(bb-A.z)<.01){const line=Math.abs(ab-B.z)<.01?ab:bb;const from=Math.max(A.x,B.x),to=Math.min(ar,br),mid=(from+to)/2;return{axis:'h',line,from:Math.max(from,mid-w/2),to:Math.min(to,mid+w/2),id:op.id};}return null;}).filter(Boolean);}
    function allEdges(zones){const raw=[];for(const zone of zones){const b=zone.bounds;raw.push({axis:'h',line:b.z,start:b.x,end:b.x+b.width,zone},{axis:'h',line:b.z+b.depth,start:b.x,end:b.x+b.width,zone},{axis:'v',line:b.x,start:b.z,end:b.z+b.depth,zone},{axis:'v',line:b.x+b.width,start:b.z,end:b.z+b.depth,zone});}const groups=new Map();for(const e of raw){const key=e.axis+':'+e.line.toFixed(3);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}const result=[];for(const list of groups.values()){const points=[...new Set(list.flatMap(e=>[e.start,e.end]).map(n=>n.toFixed(3)))].map(Number).sort((a,b)=>a-b);for(let i=0;i<points.length-1;i++){const start=points[i],end=points[i+1],mid=(start+end)/2,owners=list.filter(e=>mid>e.start-.001&&mid<e.end+.001).map(e=>e.zone);if(owners.length)result.push({axis:list[0].axis,line:list[0].line,start,end,owners});}}return result;}
    function addWallSegment(edge,start,end,height,wallMat,parent,overall){const length=end-start;if(length<.03)return;const wallThickness=.09;if(edge.axis==='h')box(length,height,wallThickness,(start+end)/2-overall.width/2,height/2+.12,edge.line-overall.depth/2,wallMat,parent);else box(wallThickness,height,length,edge.line-overall.width/2,height/2+.12,(start+end)/2-overall.depth/2,wallMat,parent);}
    function addWallWithGaps(edge,gaps,height,wallMat,parent,overall){const relevant=gaps.filter(g=>g.axis===edge.axis&&Math.abs(g.line-edge.line)<.01&&g.to>edge.start&&g.from<edge.end).sort((a,b)=>a.from-b.from);let cursor=edge.start;for(const gap of relevant){const from=Math.max(edge.start,gap.from),to=Math.min(edge.end,gap.to);addWallSegment(edge,cursor,from,height,wallMat,parent,overall);const lintelHeight=Math.max(.25,height-2.15);if(to>from)addWallSegment(edge,from,to,lintelHeight,wallMat,parent,{width:overall.width,depth:overall.depth});const lintel=parent.children[parent.children.length-1];if(lintel&&to>from)lintel.position.y=2.15+lintelHeight/2;cursor=Math.max(cursor,to);}addWallSegment(edge,cursor,edge.end,height,wallMat,parent,overall);}
    function addRailing(edge,parent,overall){const length=edge.end-edge.start;if(length<.05)return;const x=edge.axis==='h'?(edge.start+edge.end)/2-overall.width/2:edge.line-overall.width/2;const z=edge.axis==='h'?edge.line-overall.depth/2:(edge.start+edge.end)/2-overall.depth/2;const w=edge.axis==='h'?length:.035,d=edge.axis==='h'?.035:length;box(w,.78,d,x,.55,z,material.glass,parent);box(w,.045,d,x,.98,z,material.metal,parent);const steps=Math.max(2,Math.ceil(length/1.2));for(let i=0;i<=steps;i++){const p=edge.start+(length*i/steps);box(.035,1,.035,edge.axis==='h'?p-overall.width/2:x,.5,edge.axis==='h'?z:p-overall.depth/2,material.metal,parent);}}
    function edgeConnects(edge,first,second){const ids=new Set(edge.owners.map(zone=>zone.id));return ids.size===2&&ids.has(first)&&ids.has(second);}
    function addFullWidthGlassPartition(edge,parent,overall){const length=edge.end-edge.start;if(length<.1)return;const panelCount=4,panelLength=length/panelCount;for(let i=0;i<panelCount;i++){const start=edge.start+i*panelLength,end=start+panelLength;const x=edge.axis==='h'?(start+end)/2-overall.width/2:edge.line-overall.width/2;const z=edge.axis==='h'?edge.line-overall.depth/2:(start+end)/2-overall.depth/2;box(edge.axis==='h'?panelLength-.045:.025,2.25,edge.axis==='h'?.025:panelLength-.045,x,1.245,z,material.glass,parent);const framePosition=start-overall.width/2;box(.025,2.32,.045,framePosition,1.28,z,material.metal,parent);}const endPosition=edge.end-overall.width/2;box(.025,2.32,.045,endPosition,1.28,edge.line-overall.depth/2,material.metal,parent);}
    function labelSprite(text,x,z,parent){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='rgba(24,25,22,.88)';c.roundRect(8,8,496,112,28);c.fill();c.fillStyle='#f7efe4';c.font='600 38px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,64);const t=new THREE.CanvasTexture(canvas);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));s.scale.set(2.9,.72,1);s.position.set(x,2.95,z);parent.add(s);}
    function furnish(floorId,zone,group,overall){const {x,z}=centre(zone,overall),id=zone.id,b=zone.bounds;if(id.includes('primary'))bed(x,z,1.8,group,Math.PI/2);else if(id.includes('bedroom')||id.includes('guest')||id.includes('west-'))bed(x,z,1.5,group,Math.PI/2);if(id.includes('living')||id.includes('lounge')){sofa(x,z+.65,Math.min(2.7,b.width-.6),group);box(1.15,.24,.68,x,.18,z-.45,material.wood,group);}if(id.includes('hall')){box(1.8,.68,.42,x,.36,z-b.depth/2+.55,material.wood,group);chair(x-1.4,z,group);chair(x+1.4,z,group);}if(id.includes('dining')){box(2.25,.72,1,x,.38,z,material.wood,group);for(const dx of[-1.3,1.3])for(const dz of[-.42,.42])chair(x+dx,z+dz,group);}if(id.includes('kitchen')){box(Math.min(3.5,b.width-.5),.86,.62,x,.44,z-b.depth/2+.45,material.wood,group);box(.62,.86,Math.min(2.1,b.depth-.5),x-b.width/2+.42,.44,z,material.charcoal,group);}if(id.includes('study')){box(1.8,.08,.8,x,.82,z,material.wood,group);chair(x,z+.85,group);}if(id.includes('wet')){box(.95,.72,.5,x-.65,.38,z,material.wood,group);box(.55,.42,.72,x+.8,.23,z,material.ceramic,group);box(.02,1.75,.9,x+.2,.9,z+.75,material.glass,group);}if(id.includes('stair')){for(let i=0;i<9;i++){const rise=.09+i*.1;box(1.45,rise,.31,x-.85,rise/2,z-b.depth/2+.35+i*.31,material.charcoal,group);}box(1.45,.9,.65,x-.85,.45,z+.2,material.charcoal,group);}if(id.includes('balcony')||id.includes('landscape')){box(1.15,.36,.5,x,.22,z,material.fabricLight,group);plant(x+Math.min(1.4,b.width/3),z,group);}if(id.includes('porch')){box(1.5,.34,.42,x,.2,z,material.wood,group);}if(!id.includes('stair')&&!id.includes('balcony')&&!id.includes('porch'))addLamp(x,z,group,.28);}
    function buildFloor(floor){const activeVariant=floor.variants.find(v=>v.id===floor.preferred_visual_state);if(!activeVariant)throw new Error('缺少楼层方案 '+floor.floor_id);const removed=new Set(activeVariant.zone_deltas?.remove||[]);const rawActiveZones=floor.zones.filter(zone=>!removed.has(zone.id)).concat(activeVariant.zone_deltas?.add||[]);const activeZones=rawActiveZones.map(zone=>{if(floor.floor_id==='floor-1'&&zone.id==='f1-dining')return{...zone,bounds:{...zone.bounds,depth:3.3}};return zone;});const activeModifications=modifications.filter(item=>item.floor_id===floor.floor_id&&activeVariant.modification_ids.includes(item.id));const group=new THREE.Group();group.name=floor.floor_id;group.userData={floorId:floor.floor_id,coreVersion:buildingCore.version,baselineVersion:floor.version,activeModificationIds:activeModifications.map(item=>item.id)};const slabs=new THREE.Group(),walls=new THREE.Group(),rails=new THREE.Group(),furniture=new THREE.Group(),labels=new THREE.Group();group.add(slabs,walls,rails,furniture,labels);group.userData.parts={walls,labels};const overall=floor.overall_bounds;for(const zone of activeZones){const c=centre(zone,overall),b=zone.bounds;box(b.width-.035,.12,b.depth-.035,c.x,.06,c.z,floorMaterial(floor.floor_id,zone),slabs);furnish(floor.floor_id,zone,furniture,overall);labelSprite(zone.label,c.x,c.z,labels);}const gaps=openingGaps(floor,activeZones);for(const edge of allEdges(activeZones)){const exteriorOwners=edge.owners.filter(zone=>zone.classification==='exterior'||zone.id.includes('balcony')||zone.id.includes('porch')||zone.id.includes('landscape'));const interiorOwners=edge.owners.filter(zone=>!exteriorOwners.includes(zone));if(edge.owners.length===1&&exteriorOwners.length){if(!edge.owners[0].id.includes('porch'))addRailing(edge,rails,overall);continue;}if(floor.floor_id==='floor-1'&&edgeConnects(edge,'f1-living','f1-dining'))continue;if(floor.floor_id==='floor-1'&&edgeConnects(edge,'f1-dining','f1-kitchen')){addFullWidthGlassPartition(edge,walls,overall);continue;}const height=edge.owners.length===1?2.2:1.45;const wallMat=floor.floor_id==='floor-3'?material.wallDark:material.wall;addWallWithGaps(edge,gaps,height,wallMat,walls,overall);}labels.visible=false;models.set(floor.floor_id,group);modelRoot.add(group);}
    for(const floor of baselines)buildFloor(floor);
    if(models.size!==projectConfig.target.floor_ids.length)throw new Error('楼层独立模型数量与设计范围不一致');
    const floorNames={'floor-1':'一层','floor-2':'二层','floor-3':'三层'};
    const floorStatus={'floor-1':'西侧客厅—餐厅完全开放，餐厨以满幅透明玻璃移门相连；东侧双卧双卫。','floor-2':'中部家庭厅—南阳台轴；西侧两卧与生活阳台，东侧双卧双卫。','floor-3':'家庭厅—景观阳台轴；西侧书房/游戏房与阳台，东侧两卧双卫。'};
    function distinctiveZone(floorId,privateView=false){const floor=baselines.find(item=>item.floor_id===floorId);const ids=privateView?['primary']:floorId==='floor-1'?['hall']:['lounge'];return floor.zones.find(zone=>ids.some(id=>zone.id.includes(id)))||floor.zones[0];}
    function setView(kind){const floor=baselines.find(item=>item.floor_id===currentFloor);const zone=distinctiveZone(currentFloor,kind==='private');const c=centre(zone,floor.overall_bounds);if(kind==='top'){camera.position.set(0,25,.01);controls.target.set(0,0,0);camera.up.set(0,0,-1);}else if(kind==='axis'){camera.position.set(c.x,5.1,9.8);controls.target.set(c.x,.75,c.z);camera.up.set(0,1,0);}else if(kind==='private'){camera.position.set(c.x+6.5,5.5,c.z+7);controls.target.set(c.x,.7,c.z);camera.up.set(0,1,0);}else{camera.position.set(17.2,18.5,21.5);controls.target.set(0,.55,0);camera.up.set(0,1,0);}camera.lookAt(controls.target);controls.update();document.querySelectorAll('[data-camera-view]').forEach(button=>{const on=button.dataset.cameraView===kind;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});}
    function showFloor(floorId){if(!models.has(floorId))return;currentFloor=floorId;for(const[id,group]of models)group.visible=id===floorId;const name=floorNames[floorId]||floorId;title.textContent=name+' · 约 180㎡ · 独立概念模型';status.textContent=name+'独立模型 · '+floorStatus[floorId];setView('bird');}
    function applyLighting(){scene.background=(night?nightColor:dayColor).clone();scene.fog.color.copy(scene.background);hemi.intensity=night?.34:1.9;sun.intensity=night?.28:3;for(const group of models.values())group.traverse(obj=>{if(obj.isPointLight)obj.intensity=night?obj.userData.base*1.55:obj.userData.base;});renderer.toneMappingExposure=night?.78:1.15;}
    document.querySelectorAll('[data-camera-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.cameraView)));
    document.getElementById('toggleWalls').addEventListener('click',event=>{wallsVisible=!wallsVisible;for(const group of models.values())group.userData.parts.walls.visible=wallsVisible;event.currentTarget.classList.toggle('active',wallsVisible);event.currentTarget.setAttribute('aria-pressed',String(wallsVisible));status.textContent=wallsVisible?'墙体已显示':'墙体已隐藏，可检查家具与动线';});
    document.getElementById('toggleLabels').addEventListener('click',event=>{labelsVisible=!labelsVisible;for(const group of models.values())group.userData.parts.labels.visible=labelsVisible;event.currentTarget.classList.toggle('active',labelsVisible);event.currentTarget.setAttribute('aria-pressed',String(labelsVisible));});
    document.getElementById('toggleNight').addEventListener('click',event=>{night=!night;applyLighting();event.currentTarget.classList.toggle('active',night);event.currentTarget.setAttribute('aria-pressed',String(night));status.textContent=night?'夜景 · 暖色局部光':'日景 · 暖灰材质与自然光';});
    document.getElementById('capture3D').addEventListener('click',()=>{renderer.render(scene,camera);renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='yj-'+currentFloor+'-3d-'+new Date().toISOString().slice(0,10)+'.png';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);},'image/png');});
    document.addEventListener('floorchange',event=>showFloor(event.detail.floorId));
    function resize(){const width=stage.clientWidth,height=Math.max(500,Math.min(720,innerHeight*.7));renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
    addEventListener('resize',resize,{passive:true});resize();showFloor(document.body.dataset.activeVisualFloor||'floor-1');applyLighting();
    function loop(){requestAnimationFrame(loop);controls.update();renderer.render(scene,camera);}loop();fallback.hidden=true;stage.classList.add('ready');
  }catch(error){fallback.hidden=false;stage.classList.add('failed');fallback.querySelector('small').textContent='Three.js 未能加载：'+error.message+'。下方每层静态 3D 与效果图仍可离线查看。';}
})();
</script></body>`;
html = html.replace(modulePattern, moduleCode);
fs.writeFileSync(target, html);
console.log(JSON.stringify({ target, bytes: Buffer.byteLength(html), renderer: 'reference-style-independent-floor-models' }, null, 2));
