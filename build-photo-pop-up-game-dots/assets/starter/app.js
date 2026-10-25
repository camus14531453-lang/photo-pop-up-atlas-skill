/* Neutral static starter. No network, analytics, AI, or backend calls. */
'use strict';
const book = JSON.parse(document.getElementById('project-data').textContent);
const spreads = book.spreads || [book];
let pageIndex = 0, config = spreads[0], saved = spreads.map(()=>PopupState.initial());
let turnPhase = 0, turnTarget = null, textureEpoch = 0;
const $ = id => document.getElementById(id);
const EN = {
  open:'Open book', replay:'Replay', soundOff:'Sound off', soundOn:'Sound on',
  useAccessible:'Use accessible view', use3d:'Use 3D view', ready:'Ready to open.',
  sceneLabel:'Three-dimensional paper book. Equivalent game controls follow below.', choicesLabel:'Game pieces',
  help:'Select paper pieces or use the labelled buttons. Tab and Enter work throughout. Sound is optional. The accessible view uses the same rules and progress with reduced visual depth. After completion, pieces can still be inspected and heard.',
  audioHint:'Select a piece to hear its recording, if provided.',
  audioFailed:'This recording could not be played. Use the text clue instead.',
  audioBlocked:'Playback was blocked or unsupported. Toggle sound and select the piece again; the text clue remains available.',
  no3d:'3D is unavailable here. The same puzzle remains playable below. Reload to retry 3D.',
  imageFailed:'An image failed to load; its labelled shape remains usable. This is not a final-media preview.',
  lost3d:'3D graphics were interrupted. Continue the same puzzle below; reload to restore 3D.',
  progress:'{count} / {total}', selectedSuffix:' ✓'
};
const ZH = {
  open:'打开立体书', replay:'重新开始', soundOff:'声音已关闭', soundOn:'声音已开启',
  useAccessible:'切换无障碍视图', use3d:'切换立体视图', ready:'准备打开立体书。',
  sceneLabel:'三维立体书，下方提供等效游戏按钮。', choicesLabel:'游戏对象',
  help:'点击纸片或下方按钮进行游戏，也可以用 Tab 和回车键操作。声音可选；无障碍视图保留相同规则与进度，但减少视觉立体效果。完成后仍可查看对象和收听录音。',
  audioHint:'选择对象即可收听对应录音（如有）。',
  audioFailed:'这段录音无法播放，请使用文字线索。',
  audioBlocked:'播放被阻止或格式不受支持。请切换声音后重新选择对象；仍可使用文字线索。',
  no3d:'当前无法显示三维画面，下方仍可完成相同游戏。重新加载可再次尝试立体视图。',
  imageFailed:'一张图片加载失败，暂用带标签的形状代替。这不是最终素材预览。',
  lost3d:'三维图形已中断。可以继续使用下方按钮，或重新加载以恢复立体画面。',
  progress:'{count} / {total}', selectedSuffix:' ✓'
};
const ui = {...EN, ...(config.language.toLowerCase().startsWith('zh') ? ZH : {}), ...(config.ui || {})};
$('start').textContent=ui.open; $('replay').textContent=ui.replay; $('mute').textContent=ui.soundOff;
$('fallback').textContent=ui.useAccessible; $('scene').setAttribute('aria-label',ui.sceneLabel);
$('choices').setAttribute('aria-label',ui.choicesLabel); document.querySelector('.help').textContent=ui.help;
function progress(count) {return ui.progress.replace('{count}',String(count)).replace('{total}',String(config.game.targets.length));}
document.documentElement.lang = config.language;
document.title = book.title; $('title').textContent = book.title; $('intro').textContent = config.intro;
let state = PopupState.initial(), soundOn = false, currentAudio = null, audioEpoch = 0, lastCaption = '';
let renderer, scene, camera, leftPage, rightPage, ready3d = false, visualFallback = false;
let opening = 0, frameId = 0, lastTime = 0;
const pieceViews = new Map(), buttons = new Map();
const figures = new Map();
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
function stopAudio() { audioEpoch++; if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; currentAudio = null; } }
function playAudio(piece) {
  stopAudio();
  lastCaption = piece.caption || ''; $('sound-status').textContent = lastCaption;
  if (!soundOn || !piece.audio) return;
  const epoch = audioEpoch;
  const audio = new Audio(piece.audio); currentAudio = audio;
  audio.volume = 0.55;
  audio.onended = () => { if (epoch === audioEpoch) currentAudio = null; };
  audio.onerror = () => { if (epoch === audioEpoch) $('sound-status').textContent = (piece.caption ? piece.caption + ' ' : '') + ui.audioFailed; };
  audio.play().catch(() => { if (epoch === audioEpoch) $('sound-status').textContent = (piece.caption ? piece.caption + ' ' : '') + ui.audioBlocked; });
}
function drawUI() {
  $('start').disabled = state.started; $('replay').disabled = !state.started;
  $('status').textContent = state.complete ? config.game.winText : (state.message === config.game.retryText ? state.message : (state.started ? progress(state.picked.length) + '. ' + config.intro : ui.ready));
  if (book.spreads) {
    $('page-title').textContent = `${pageIndex+1} / ${spreads.length} · ${config.title}`;
    $('atlas-progress').textContent = (config.language.startsWith('zh')?'已完成跨页：':'Completed spreads: ') + saved.filter(s=>s.complete).length + ' / ' + spreads.length;
    $('previous').disabled = pageIndex === 0 || turnTarget !== null; $('next').disabled = pageIndex === spreads.length-1 || turnTarget !== null;
  }
  for (const p of config.pieces) {
    const b = buttons.get(pageIndex+':'+p.id); b.disabled = !state.started;
    b.setAttribute('aria-pressed', String(state.picked.includes(p.id)));
    b.textContent = p.label + (state.picked.includes(p.id) ? ui.selectedSuffix : '');
  }
}
function choose(id) {
  const p = config.pieces.find(p => p.id === id);
  if (!p || !state.started || turnTarget !== null) return;
  const next = PopupState.step(state, {type: 'pick', id}, config.game);
  state = next; saved[pageIndex] = state; drawUI(); playAudio(p);
}
for (const p of spreads.flatMap((s,i)=>s.pieces.map(p=>({...p,_spread:i})))) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = p.label;
  b.addEventListener('click', () => choose(p.id)); buttons.set(p._spread+':'+p.id, b); $('choices').appendChild(b);
}
// The reduced-depth view must retain photographic clues, not only button names.
for (const p of spreads.flatMap((s,i)=>s.pieces.map(p=>({...p,_spread:i})))) {
  const figure = document.createElement('figure');
  if (p.image) {
    const img = document.createElement('img'); img.src = p.image; img.alt = p.label;
    img.loading = 'lazy'; figure.appendChild(img);
  }
  const caption = document.createElement('figcaption');
  caption.textContent = p.label + (p.caption ? ': ' + p.caption : '');
  figure.appendChild(caption); $('media').appendChild(figure); figures.set(p._spread+':'+p.id, figure);
}
$('start').onclick = () => { state = PopupState.step(state, {type:'start'}, config.game); saved[pageIndex]=state; drawUI(); };
$('replay').onclick = () => { stopAudio(); lastCaption = ''; $('sound-status').textContent = ''; state = PopupState.step(state, {type:'reset'}, config.game); saved[pageIndex]=state; drawUI(); };
$('mute').onclick = () => { soundOn = !soundOn; stopAudio(); $('mute').textContent = soundOn ? ui.soundOn : ui.soundOff; $('mute').setAttribute('aria-pressed', String(!soundOn)); $('sound-status').textContent = lastCaption || (soundOn ? ui.audioHint : ''); };
function fallback(on, reason='') {
  if(on && turnTarget!==null) { const target=turnTarget;turnTarget=null;switchSpread(target); }
  visualFallback = on; document.body.classList.toggle('fallback', on);
  $('fallback').setAttribute('aria-pressed', String(on)); $('fallback').textContent = on ? ui.use3d : ui.useAccessible;
  $('notice').textContent = reason;
  if (!on && !ready3d) { fallback(true, ui.no3d); }
  else if (!on) resize();
}
$('fallback').onclick = () => fallback(!visualFallback);
function shapeTexture(p) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const sides = {triangle:3,square:4,pentagon:5,circle:40}[p.shape];
  g.fillStyle = p.color; g.strokeStyle = '#fff9ec'; g.lineWidth = 12; g.beginPath();
  for (let i=0;i<sides;i++) { const a=-Math.PI/2+i*2*Math.PI/sides, x=128+100*Math.cos(a), y=128+100*Math.sin(a); i ? g.lineTo(x,y) : g.moveTo(x,y); }
  g.closePath(); g.fill(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function resize() {
  if (!renderer || visualFallback) return;
  const box = $('scene').parentElement.getBoundingClientRect(), aspect = box.width / box.height;
  renderer.setSize(box.width,box.height,false); camera.aspect = aspect;
  const d = Math.max(6.7, 8.3 / aspect); camera.position.set(0, d*.8, d*.75); camera.lookAt(0,.3,0); camera.updateProjectionMatrix();
}

function loadSpread3d() {
  for (const v of pieceViews.values()) { v.pivot.parent.remove(v.pivot); v.face.geometry.dispose(); v.face.material.map.dispose(); v.face.material.dispose(); }
  pieceViews.clear();
  const epoch = ++textureEpoch;
  for (const [page,side] of [[leftPage,'left'],[rightPage,'right']]) {
    const paper=page.children[0], material=paper.material;
    if(material.map) material.map.dispose(); material.map=null; material.needsUpdate=true;
    if(config.maps && config.maps[side]) new THREE.TextureLoader().load(config.maps[side],t=>{
      if(epoch!==textureEpoch){t.dispose();return;} t.encoding=THREE.sRGBEncoding; material.map=t; material.needsUpdate=true;
    },undefined,()=>{$('notice').textContent=ui.imageFailed;});
  }
  for (const p of config.pieces) {
    const pivot = new THREE.Group(); pivot.position.set(p.x,.045,p.z); (p.page==='left'?leftPage:rightPage).add(pivot);
    const geo = new THREE.PlaneGeometry(p.height,p.height); geo.translate(0,p.height/2,0);
    const material = new THREE.MeshStandardMaterial({map:shapeTexture(p),transparent:true,alphaTest:.1,side:THREE.DoubleSide,roughness:1});
    const face = new THREE.Mesh(geo,material); face.userData.id=p.id; pivot.add(face); pivot.rotation.x=-Math.PI/2;
    pieceViews.set(p.id,{pivot,face,angle:-Math.PI/2});
    if (p.image) {
      new THREE.TextureLoader().load(p.image,t=>{ if(epoch!==textureEpoch){t.dispose();return;} t.encoding=THREE.sRGBEncoding; material.map.dispose(); material.map=t; material.needsUpdate=true; face.scale.x=t.image.width/t.image.height; },undefined,()=>{ $('notice').textContent=ui.imageFailed; });
    }
  }
}
function setup3d() {
  renderer = new THREE.WebGLRenderer({canvas:$('scene'), antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio || 1,2)); renderer.outputEncoding = THREE.sRGBEncoding;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#cbd4d6');
  camera = new THREE.PerspectiveCamera(42,1,.1,100);
  scene.add(new THREE.HemisphereLight(0xffffff,0x6b6962,.75)); const sun = new THREE.DirectionalLight(0xffffff,.35); sun.position.set(2,7,3); scene.add(sun);
  const table = new THREE.Mesh(new THREE.BoxGeometry(7,.12,4.6), new THREE.MeshStandardMaterial({color:new THREE.Color(0xb6c0bf).convertSRGBToLinear(),roughness:1})); table.position.y=-.13; scene.add(table);
  leftPage = new THREE.Group(); rightPage = new THREE.Group(); leftPage.position.y=.04; rightPage.position.y=.04; scene.add(leftPage,rightPage);
  for (const [page, sign] of [[leftPage,-1],[rightPage,1]]) {
    const paper = new THREE.Mesh(new THREE.BoxGeometry(2.5,.035,3),new THREE.MeshStandardMaterial({color:new THREE.Color(0xfff8e5).convertSRGBToLinear(),roughness:1})); paper.position.x=sign*1.25; page.add(paper);
  }
  loadSpread3d();
  ready3d=true; resize();
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(); let down=null;
  $('scene').addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,id:e.pointerId};});
  $('scene').addEventListener('pointercancel',()=>down=null);
  $('scene').addEventListener('pointerup',e=>{
    if(!down || down.id!==e.pointerId || Math.hypot(e.clientX-down.x,e.clientY-down.y)>9){down=null;return;}down=null;
    if(opening<.99 || !state.started || turnTarget!==null) return;
    const b=$('scene').getBoundingClientRect(); pointer.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);
    ray.setFromCamera(pointer,camera); const hits=ray.intersectObjects([...pieceViews.values()].map(v=>v.face)); if(hits.length) choose(hits[0].object.userData.id);
  });
  $('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();ready3d=false;fallback(true,ui.lost3d);});
  frameId=requestAnimationFrame(animate);
}
function animate(time) {
  frameId=requestAnimationFrame(animate); const dt=Math.min((time-lastTime)/1000,.05); lastTime=time;
  if(!ready3d || visualFallback || document.hidden) return;
  if(turnTarget!==null) {
    turnPhase += dt*2;
    if(turnPhase>=1) { const next=turnTarget; turnTarget=null; switchSpread(next); opening=0; turnPhase=0; }
    else { leftPage.rotation.z=-turnPhase*1.48; rightPage.rotation.z=turnPhase*1.48; for(const v of pieceViews.values()) v.pivot.rotation.x=-Math.PI/2; renderer.render(scene,camera); return; }
  }
  const target=state.started?1:0;
  opening=reduced.matches?target:opening+(target-opening)*Math.min(1,dt*4);
  if(Math.abs(opening-target)<.001)opening=target;
  leftPage.rotation.z=-(1-opening)*1.48; rightPage.rotation.z=(1-opening)*1.48;
  for(const [id,v] of pieceViews) {
    const a=(book.spreads || state.picked.includes(id))?0:-Math.PI/2;
    v.angle=reduced.matches?a:v.angle+(a-v.angle)*Math.min(1,dt*7);
    v.pivot.rotation.x=v.angle; v.pivot.visible=opening>.98;
  }
  renderer.render(scene,camera);
}
addEventListener('resize',resize); document.addEventListener('visibilitychange',()=>{if(document.hidden)stopAudio();});
addEventListener('pagehide',e=>{stopAudio();cancelAnimationFrame(frameId);if(renderer && !e.persisted)renderer.dispose();});
addEventListener('pageshow',e=>{if(e.persisted && ready3d){lastTime=performance.now();cancelAnimationFrame(frameId);frameId=requestAnimationFrame(animate);}});
function showSpread() {
  for(const [key,b] of buttons) b.hidden=!key.startsWith(pageIndex+':');
  for(const [key,f] of figures) f.hidden=!key.startsWith(pageIndex+':');
  $('intro').textContent=config.intro;
  if(book.spreads) {
    $('map-clue').textContent=config.mapCaption || '';
    for(const side of ['left','right']) { const img=$('map-'+side); img.hidden=!(config.maps && config.maps[side]); if(!img.hidden){img.src=config.maps[side];img.alt=config.mapCaption;} }
  }
  drawUI();
}
function switchSpread(index) {
  saved[pageIndex]=state; pageIndex=index; config=spreads[index]; state=saved[index];
  if(!state.started) {state=PopupState.step(state,{type:'start'},config.game);saved[index]=state;}
  lastCaption=''; $('sound-status').textContent=''; showSpread(); if(ready3d)loadSpread3d();
}
function navigate(delta) {
  const next=pageIndex+delta;
  if(turnTarget!==null || next<0 || next>=spreads.length)return;
  stopAudio();
  if(reduced.matches || visualFallback || !ready3d) switchSpread(next);
  else {turnTarget=next;turnPhase=0;drawUI();}
}
if(book.spreads) {
  $('atlas-nav').hidden=false; $('previous').textContent=config.language.startsWith('zh')?'上一跨页':'Previous spread'; $('next').textContent=config.language.startsWith('zh')?'下一跨页':'Next spread';
  $('reset-atlas').textContent=config.language.startsWith('zh')?'重玩整本':'Replay atlas';
  $('previous').onclick=()=>navigate(-1); $('next').onclick=()=>navigate(1);
  $('reset-atlas').onclick=()=>{stopAudio();turnTarget=null;saved=spreads.map(()=>PopupState.initial());state=saved[pageIndex];switchSpread(0);opening=0;};
}
showSpread();try{setup3d();}catch(err){fallback(true,ui.no3d);}
