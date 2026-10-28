import {W,H,BUILDS,createState,startWave,release,upgrade,step} from './model.js?v=2';
import {renderScene} from './renderer.js?v=2';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let selectedBuild='swarm';
let s=createState(),pointer=null,keys=new Set(),particles=[],rings=[],labels=[],shake=0,freeze=0,shown='',paused=false,audio=null,sound=false,last=0,best=0;
try{best=Number(localStorage.getItem('borrow-fire-best'))||0;}catch{}$('best').textContent=`最佳 ${best.toLocaleString()}`;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function tone(freq,duration=.08,type='sine',gain=.045){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),audio.currentTime+duration);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function loadBest(){try{best=Number(localStorage.getItem(`borrow-fire-v2-${selectedBuild}`))||0;}catch{best=0;}$('best').textContent=`${BUILDS[selectedBuild].name}最佳 ${best.toLocaleString()}`;}
function start(){s=createState(selectedBuild);particles=[];rings=[];labels=[];pointer=null;keys.clear();paused=false;shown='';loadBest();startWave(s);tone(300,.15);canvas.focus({preventScroll:true});}
function chooseBuild(){s=createState(selectedBuild);pointer=null;keys.clear();paused=false;shown='';loadBest();updateOverlay();}
function card(html){$('card').innerHTML=html;$('overlay').hidden=false;}
function updateOverlay(){
  const mode=paused?'pause':s.mode;
  if(shown===mode)return;shown=mode;$('overlay').hidden=mode==='play';
  $('pause').textContent=paused?'继续':'暂停';
  if(mode==='intro'){
    card(`<p class="eyebrow">BORROWED FIRE / 02</p><h2>选一架，借一场火</h2><p class="build-info">你是下方的小机甲。<br><strong>按住吸橙弹 · 松手自动反击</strong></p><div class="build-picker">${Object.entries(BUILDS).map(([id,b])=>`<button class="build-option ${id===selectedBuild?'selected':''}" data-build="${id}" aria-pressed="${id===selectedBuild}"><b>${b.name}</b><span>${b.tag}</span></button>`).join('')}</div><p class="build-info" id="buildDesc">${BUILDS[selectedBuild].desc}</p><button class="primary" id="start">驾驶${BUILDS[selectedBuild].name}出击</button><p class="fine">拖动移动 / WASD + 空格 · 温度满会丢弹<br>5 波 · 波间强化 · <a href="../borrow-fire-v1/">对比旧版</a></p>`);
    document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>{selectedBuild=b.dataset.build;s=createState(selectedBuild);shown='';loadBest();updateOverlay();});
    $('start').onclick=start;
  }
  if(mode==='pause'){
    card(`<div class="seal">Ⅱ</div><h2>歇一口气</h2><p>${BUILDS[s.build].name} · 第 ${s.wave} 波</p><button class="primary" id="resume">继续借火</button><p><button id="changeBuild">结束本局，换流派</button></p>`);
    $('resume').onclick=togglePause;$('changeBuild').onclick=chooseBuild;
  }
  if(mode==='upgrade'){
    const evolution={swarm:['蜂巢扩编','每 3 颗蓄弹多返还 1 枚，追踪弹更强'],blast:['爆心扩张','主爆范围 +8，连爆范围随之扩大'],arc:['多级跳电','松手闪电多跳 1 个敌人，吸弹电击更强']}[s.build];
    const opts=[['evolve',evolution[0],evolution[1]],[s.wave%2?'shield':'cool',s.wave%2?'扩大吸域':'冷却回路',s.wave%2?'吸弹范围扩大，更容易主动接弹':'松手后散热更快，缩短下一次蓄弹等待'],[s.hp<3?'heal':'capacity',s.hp<3?'修补机体':'扩充弹仓',s.hp<3?'恢复 1 点生命':'容量 +5，同时略微提升散热']];
    card(`<p class="eyebrow">${BUILDS[s.build].name} / 强化 ${s.buildLevel}</p><h2>第 ${s.wave} 波，收下了</h2><p>继续强化流派，或补足短板。</p><div class="choices">${opts.map(([id,name,desc])=>`<button class="choice" data-id="${id}"><b>${name}</b><span>${desc}</span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{upgrade(s,b.dataset.id);pointer=null;keys.clear();shown='';tone(540,.15);canvas.focus({preventScroll:true});});
  }
  if(mode==='dead'||mode==='win'){
    if(s.score>best){best=s.score;try{localStorage.setItem(`borrow-fire-v2-${s.build}`,String(best));}catch{}$('best').textContent=`${BUILDS[s.build].name}最佳 ${best.toLocaleString()}`;}
    card(`<p class="eyebrow">${BUILDS[s.build].name} / 强化 ${s.buildLevel}</p><h2>${mode==='win'?'火，都还回去了':'这口火，没接住'}</h2><p><strong style="font-size:32px">${s.score.toLocaleString()}</strong><br>吸收 ${s.absorbed} 颗 · 反击 ${s.releaseCount} 次<br>${mode==='win'?'五波完成。':`到达第 ${s.wave} 波。`}</p><button class="primary" id="retry">再来一局${BUILDS[s.build].name}</button><p><button id="changeBuild">换个流派试试</button></p>`);
    $('retry').onclick=start;$('changeBuild').onclick=chooseBuild;
  }
}
function togglePause(){if(!['play','pause'].includes(s.mode)&&!paused)return;paused=!paused;pointer=null;keys.clear();s.holding=false;shown='';updateOverlay();if(!paused)canvas.focus({preventScroll:true});}
$('pause').onclick=togglePause;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));tone(480,.1);};
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
canvas.addEventListener('pointerdown',e=>{if(s.mode!=='play'||paused||pointer)return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,...pos(e)};});
canvas.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId)Object.assign(pointer,pos(e));});
function up(e){if(pointer?.id!==e.pointerId)return;pointer=null;release(s);}
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>{if(pointer?.id===e.pointerId){pointer=null;s.holding=false;}});
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&e.target===canvas)e.preventDefault();if(e.code==='KeyP'&&!e.repeat)togglePause();if(e.target===canvas)keys.add(e.code);});window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'&&!paused)release(s);});window.addEventListener('blur',()=>{if(s.mode==='play'&&!paused)togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.mode==='play'&&!paused)togglePause();});
function burst(x,y,n,color,speed=140){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(.25+Math.random())*speed;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.3,max:.6,color});}}
function events(){for(const e of s.events){if(e.type==='absorb'){burst(e.x,e.y,7,BUILDS[s.build].color,90);rings.push({x:e.x,y:e.y,r:3,life:.12,color:BUILDS[s.build].color});tone(440+(e.n||s.ammo)*45,.055,'square',.012);}if(e.type==='charged'){labels.push({x:e.x,y:e.y-48,text:e.n===3?'可以反击！':e.n===6?'火力充足！':'满载爆发！',life:.65,color:BUILDS[s.build].color});}if(e.type==='zap'){tone(700,.08,'sawtooth',.025);}if(e.type==='explosion'){shake=reduced?0:9;burst(e.x,e.y,32,'#ffbf69',230);tone(90,.22,'triangle',.09);}if(e.type==='release'){rings.push({x:e.x,y:e.y,r:20,life:.45,color:BUILDS[s.build].color});shake=reduced?0:Math.min(8,e.n*.65);freeze=reduced?0:.035;tone(160+e.n*8,.18,'triangle',.09);labels.push({x:e.x,y:e.y-65,text:s.build==='blast'?`${e.n} 弹重炮！`:s.build==='arc'?'雷链释放！':`${e.n} 弹齐射！`,life:.75,color:BUILDS[s.build].color});}if(e.type==='kill'){burst(e.x,e.y,20,'#ffb68a',200);rings.push({x:e.x,y:e.y,r:8,life:.28,color:'#ff806f'});tone(200+e.n*100,.09,'triangle');if(e.n>1)labels.push({x:e.x,y:e.y-20,text:`${e.n} 连破`,life:.8,color:'#ffcf9e'});}if(e.type==='hit')burst(e.x,e.y,5,'#f3ebdf',80);if(e.type==='hurt'){shake=reduced?0:10;tone(75,.25,'sawtooth',.06);labels.push({x:s.p.x,y:s.p.y-50,text:e.text||'中弹了！',life:1,color:'#ff806f'});}if(e.type==='overheat'){tone(65,.2,'square',.025);labels.push({x:s.p.x,y:s.p.y-55,text:'过热！躲一下',life:1.3,color:'#ff806f'});}if(e.type==='wave')labels.push({...e,life:1.8,color:'#f3ebdf'});}s.events=[];}
function render(dt,t){
 const fx={particles,rings,labels,shake,reduced};
 renderScene(ctx,s,dt,t,fx);
 particles=fx.particles;rings=fx.rings;labels=fx.labels;shake=fx.shake;
}
function frame(ms){const dt=Math.min((ms-last)/1000||0,1/30);last=ms;if(!paused){if(freeze>0)freeze-=dt;else{const input={hold:!!pointer||keys.has('Space'),target:pointer,dx:(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy:(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)};step(s,dt,input);}events();render(dt,ms/1000);}else render(0,ms/1000);$('buildLabel').textContent=`${BUILDS[s.build].name} · 强化 ${s.buildLevel}`;$('score').textContent=s.score.toLocaleString();$('wave').textContent=`第 ${s.wave} / 5 波`;$('hearts').textContent='● '.repeat(Math.max(0,s.hp));$('capacity').textContent=`蓄弹 ${s.ammo} / ${s.cap}`;$('heat').style.width=`${s.heat*100}%`;$('heat').style.background=s.heat>.75?'#ff806f':'#a7e5e5';$('status').textContent=s.lock>0?'过热冷却':s.ammo>=s.cap?'满了，松手！':s.holding?'正在借火':s.ammo>0?'按住继续接火':'松手时没有护盾';updateOverlay();requestAnimationFrame(frame);}
loadBest();updateOverlay();requestAnimationFrame(frame);
