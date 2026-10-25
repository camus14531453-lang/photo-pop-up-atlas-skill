'use strict';
/* Mocked DOM/audio control-flow tests. Not a browser, rendering, or playback test. */
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const starter=path.join(__dirname,'../assets/starter');
const cfg=JSON.parse(fs.readFileSync(path.join(starter,'demo.json'),'utf8'));
cfg.pieces[0].image='data:image/png;base64,SYNTHETIC';cfg.language='zh-CN';cfg.pieces[0].caption='四条边，这是文字线索。';cfg.pieces[0].audio='data:audio/wav;base64,MOCK';
function element(){return {textContent:'',disabled:false,attrs:{},children:[],events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},appendChild(el){this.children.push(el);}};}
const els={};for(const id of ['project-data','title','intro','start','replay','mute','fallback','scene','choices','sound-status','status','notice','media','page-title','atlas-progress','previous','next','reset-atlas','atlas-nav','map-clue','map-left','map-right'])els[id]=element();
const book={...cfg,spreads:[{...cfg,id:'one'},{...cfg,id:'two'}]};delete book.pieces;delete book.game;els['project-data'].textContent=JSON.stringify(book);
const help=element(),bodyClasses=new Set();let plays=0,pauses=0;
class MockAudio{constructor(src){this.src=src;this.currentTime=0;}play(){plays++;return Promise.resolve();}pause(){pauses++;}}
const context=vm.createContext({console,document:{getElementById:id=>els[id],querySelector:()=>help,documentElement:{lang:''},body:{classList:{toggle(name,on){on?bodyClasses.add(name):bodyClasses.delete(name);}}},addEventListener(){},createElement:element},Audio:MockAudio,matchMedia:()=>({matches:true}),addEventListener(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0}});
vm.runInContext(fs.readFileSync(path.join(starter,'game-state.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(starter,'app.js'),'utf8'),context);

els.start.onclick();els.mute.onclick();
const pick=i=>els.choices.children[i].events.click();
for(const id of cfg.game.targets) pick(cfg.pieces.findIndex(p=>p.id===id));
assert.match(els['atlas-progress'].textContent,/1 \/ 2/);
pick(0);const before=pauses;els.next.onclick();assert.ok(pauses>before);
assert.ok(els.choices.children[0].hidden);assert.equal(els.choices.children[3].hidden,false);
for(const id of cfg.game.targets) pick(3+cfg.pieces.findIndex(p=>p.id===id));
assert.match(els['atlas-progress'].textContent,/2 \/ 2/);
els.previous.onclick();assert.equal(els.status.textContent,cfg.game.winText);
els.replay.onclick();assert.match(els['atlas-progress'].textContent,/1 \/ 2/);
els['reset-atlas'].onclick();assert.match(els['atlas-progress'].textContent,/0 \/ 2/);
for(let i=0;i<20;i++){els.next.onclick();els.previous.onclick();}
assert.match(els['page-title'].textContent,/1 \/ 2/);
console.log('Mock atlas: scoped IDs, navigation, 20 round trips, completion retention, page/all replay, audio cancellation passed.');
