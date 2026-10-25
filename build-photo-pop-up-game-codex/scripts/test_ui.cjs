'use strict';
/* Mocked DOM/audio control-flow tests. Not a browser, rendering, or playback test. */
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm'), path=require('node:path');
const starter=path.join(__dirname,'../assets/starter');
const cfg=JSON.parse(fs.readFileSync(path.join(starter,'demo.json'),'utf8'));
cfg.pieces[0].image='data:image/png;base64,SYNTHETIC';cfg.language='zh-CN';cfg.pieces[0].caption='四条边，这是文字线索。';cfg.pieces[0].audio='data:audio/wav;base64,MOCK';
function element(){return {textContent:'',disabled:false,attrs:{},children:[],events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.events[k]=fn;},appendChild(el){this.children.push(el);}};}
const els={};for(const id of ['project-data','title','intro','start','replay','mute','fallback','scene','choices','sound-status','status','notice','media'])els[id]=element();
els['project-data'].textContent=JSON.stringify(cfg);
const help=element(),bodyClasses=new Set();let plays=0,pauses=0;
class MockAudio{constructor(src){this.src=src;this.currentTime=0;}play(){plays++;return Promise.resolve();}pause(){pauses++;}}
const context=vm.createContext({console,document:{getElementById:id=>els[id],querySelector:()=>help,documentElement:{lang:''},body:{classList:{toggle(name,on){on?bodyClasses.add(name):bodyClasses.delete(name);}}},addEventListener(){},createElement:element},Audio:MockAudio,matchMedia:()=>({matches:true}),addEventListener(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0}});
vm.runInContext(fs.readFileSync(path.join(starter,'game-state.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(starter,'app.js'),'utf8'),context);
assert.equal(els.start.textContent,'打开立体书');assert.equal(els.mute.textContent,'声音已关闭');
assert.ok(bodyClasses.has('fallback'));assert.match(els.notice.textContent,/三维/);
assert.equal(els.media.children.length,cfg.pieces.length);
assert.equal(els.media.children[0].children[0].src,cfg.pieces[0].image);
assert.ok(els.media.children[0].children[1].textContent.includes(cfg.pieces[0].caption));
const button=id=>els.choices.children[cfg.pieces.findIndex(p=>p.id===id)];
assert.equal(button('square').disabled,true);
els.start.onclick();button('square').events.click();
assert.equal(els['sound-status'].textContent,cfg.pieces[0].caption);assert.equal(plays,0);
els.mute.onclick();assert.equal(els['sound-status'].textContent,cfg.pieces[0].caption);
els.mute.onclick();assert.equal(els['sound-status'].textContent,cfg.pieces[0].caption);
for(const id of cfg.game.targets)button(id).events.click();
assert.equal(els.status.textContent,cfg.game.winText);assert.equal(button('square').disabled,false);
els.mute.onclick();button('square').events.click();assert.equal(plays,1);assert.equal(els.status.textContent,cfg.game.winText);
assert.equal(els['sound-status'].textContent,cfg.pieces[0].caption);
els.replay.onclick();assert.equal(els['sound-status'].textContent,'');assert.ok(pauses>0);assert.notEqual(els.status.textContent,cfg.game.winText);
console.log('Mocked UI checks passed: Chinese labels, no-WebGL fallback, muted captions, mute preservation, post-win listen, replay cleanup. No browser/audio verified.');
