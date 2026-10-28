import {protectPanel} from './input-gate.js?v=3.0.3';
import {W,H,BUILDS,createState,startWave,release,upgrade,step,options,decide,NODES,AREAS} from './model.js?v=3';
import {renderScene} from './renderer.js?v=3';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
let selectedBuild='swarm';
let s=createState(),pointer=null,keys=new Set(),particles=[],rings=[],labels=[],shake=0,freeze=0,shown='',paused=false,audio=null,sound=false,last=0,best=0,movePointer=null,firePointer=null,moveVector={dx:0,dy:0};
try{best=Number(localStorage.getItem('borrow-fire-best'))||0;}catch{}$('best').textContent=`最佳 ${best.toLocaleString()}`;
const panel=protectPanel($('card'),{onSuspend:()=>{resetInput();if(s.mode!=='intro'&&!paused){paused=true;shown='';updateOverlay();}}});
let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const prefs=JSON.parse(localStorage.getItem('borrow-fire-prefs')||'{}');sound=prefs.sound??false;reduced=prefs.reduced??reduced;}catch{}
function savePrefs(){try{localStorage.setItem('borrow-fire-prefs',JSON.stringify({sound,reduced}));}catch{}}
function resetInput(){pointer=null;movePointer=null;firePointer=null;moveVector={dx:0,dy:0};keys.clear();s.holding=false;}
function tone(freq,duration=.08,type='sine',gain=.045){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq*.5),audio.currentTime+duration);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}}
function loadBest(){try{best=Number(localStorage.getItem(`borrow-fire-v3-${selectedBuild}`))||0;}catch{best=0;}$('best').textContent=`${BUILDS[selectedBuild].name}最佳 ${best.toLocaleString()}`;}
function start(){s=createState(selectedBuild);resetInput();particles=[];rings=[];labels=[];pointer=null;keys.clear();paused=false;shown='';loadBest();startWave(s);tone(300,.15);canvas.focus({preventScroll:true});}
function chooseBuild(){s=createState(selectedBuild);pointer=null;keys.clear();paused=false;shown='';loadBest();updateOverlay();}
function card(html){resetInput();$('card').innerHTML=html+'<p data-gate-status role=\"status\"></p>';$('overlay').hidden=false;}
function bindPanel(wait=1200){const bindings=[...$('card').querySelectorAll('button')].filter(b=>!b.closest('[hidden]')).map(b=>{const fn=b.onclick;b.onclick=null;return [b,fn];});panel.open(bindings,wait);}
function updateOverlay(){
  const mode=paused?'pause':s.mode;const overlayKey=mode==='clear'?mode+':'+s.node+':'+s.story.join(',')+':'+s.areaUpgraded:mode;
  if(shown===overlayKey)return;const sameRoomStep=mode==='clear'&&shown.startsWith('clear:'+s.node+':');shown=overlayKey;$('overlay').hidden=mode==='play';$('overlay').classList.toggle('ending',mode==='win');if(mode==='play')panel.close();
  $('pause').textContent=paused?'继续':'暂停';
  if(mode==='intro'){
    card(`<h2>中央炉熄了</h2><p class="build-info">借一点火，走到那里。<br><strong>按住吸橙弹 · 松手自动反击</strong></p><div class="build-picker">${Object.entries(BUILDS).map(([id,b])=>`<button class="build-option ${id===selectedBuild?'selected':''}" data-build="${id}" aria-pressed="${id===selectedBuild}"><b>${b.name}</b><span>${b.tag}</span></button>`).join('')}</div><p class="build-info" id="buildDesc">${BUILDS[selectedBuild].desc}</p><button class="primary" id="start">驾驶${BUILDS[selectedBuild].name}出击</button><p class="fine">左侧移动 · 右侧吸放 / WASD + 空格<br>三大区域 · 九个阶段 · <a href="../borrow-fire-v2/">回访 v2</a></p>`);
    document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>{selectedBuild=b.dataset.build;s=createState(selectedBuild);shown='';loadBest();updateOverlay();});
    $('start').onclick=start;
  }
  if(mode==='pause'){
    card(`<div class="seal">Ⅱ</div><h2>歇一口气</h2><p>${AREAS[s.area]} · 阶段 ${s.stage}/3</p><button class="primary" id="resume">继续借火</button><p><button id="changeBuild">结束本局，换流派</button></p><p>刷新页面会重新开始本局。</p>`);
    $('resume').onclick=togglePause;$('changeBuild').onclick=chooseBuild;
  }
  if(mode==='clear'){
    const node=NODES[s.node],opts=options(s);
    const title=node.story!==undefined&&s.story[node.story]===null?(node.story===0?'暗屋里，还有微光':'火原来流向这里'):s.stage===3&&!s.areaUpgraded?`${AREAS[s.area]} · 已完成`:`${AREAS[s.area]} · 阶段 ${s.stage}/3 完成`;
    card(`<h2>${title}</h2><p>生命 ${s.hp}/5 · 余火 ${s.ember}/6${s.converted?`（剩弹转为 ${s.converted} 余火）`:''}</p><p>${s.stage===3?'留一点时间，再走下一程。':'出口已开，选择下一步。'}</p><div class="choices">${opts.map(o=>`<button class="choice" data-id="${o.id}" data-unavailable="${!!o.disabled}" aria-pressed="false"><b>${o.name}</b><span>${o.desc}${o.disabled?' · 余火不足':''}</span></button>`).join('')}</div><button class="primary" id="confirmUpgrade" data-unavailable="true">确认选择</button>`);
    if(opts.length===1&&NODES[opts[0].id]){document.querySelector('.choices').hidden=true;$('confirmUpgrade').dataset.unavailable='false';$('confirmUpgrade').textContent='下一阶段 · '+opts[0].name;}
    let preview=opts.length===1&&NODES[opts[0].id]?opts[0].id:null;const expectedState=s;const version=s.node+':'+s.story.join(',')+':'+s.areaUpgraded;
    document.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{preview=b.dataset.id;document.querySelectorAll('[data-id]').forEach(c=>c.setAttribute('aria-pressed',String(c===b)));$('confirmUpgrade').dataset.unavailable='false';$('confirmUpgrade').textContent=NODES[preview]||['evolve','cool','heal','capacity'].includes(preview)?'确认 · 进入下一阶段':'确认 · 收下这份火';});
    $('confirmUpgrade').onclick=()=>{if(!preview||s!==expectedState||s.mode!=='clear'||version!==s.node+':'+s.story.join(',')+':'+s.areaUpgraded)return;panel.close();if(decide(s,preview)){resetInput();shown='';tone(540,.15);canvas.focus({preventScroll:true});updateOverlay();}};
  }
  if(mode==='dead'||mode==='win'){
    if(s.score>best){best=s.score;try{localStorage.setItem(`borrow-fire-v3-${s.build}`,String(best));}catch{}$('best').textContent=`${BUILDS[s.build].name}最佳 ${best.toLocaleString()}`;}
    card(`<h2>${mode==='win'?'中央炉，亮了':'这口火，没接住'}</h2><p><strong style="font-size:32px">${s.score.toLocaleString()}</strong><br>吸收 ${s.absorbed} 颗 · 反击 ${s.releaseCount} 次<br>${mode==='win'?`走过九个阶段 · ${Math.round(s.totalTime)} 秒<br>${s.story.some(x=>x==='help')?'远处，有灯回应。':'炉火照着来时的路。'}`:`到达${AREAS[s.area]} · 阶段 ${s.stage}/3`}<br>本局行动：${s.story.map(x=>x==='help'?'留下火':x==='self'?'护住自己':'继续前行').join(' / ')}</p><button class="primary" id="retry">再来一局${BUILDS[s.build].name}</button><p><button id="changeBuild">换个流派试试</button></p>`);
    $('retry').onclick=start;$('changeBuild').onclick=chooseBuild;
  }
  if(mode!=='play')bindPanel(mode==='intro'||mode==='pause'||sameRoomStep?300:mode==='win'||(mode==='clear'&&(s.stage===3||s.node==='c2s'||s.node==='c2r'))?3000:1200);
}
function togglePause(){if(!['play','pause'].includes(s.mode)&&!paused)return;paused=!paused;resetInput();shown='';updateOverlay();if(!paused)canvas.focus({preventScroll:true});}
$('pause').onclick=togglePause;$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`声音：${sound?'开':'关'}`;$('sound').setAttribute('aria-pressed',String(sound));savePrefs();tone(480,.1);};
$('motion').onclick=()=>{reduced=!reduced;$('motion').textContent=`震屏：${reduced?'弱':'开'}`;savePrefs();};
$('motion').textContent=`震屏：${reduced?'弱':'开'}`;$('sound').textContent=`声音：${sound?'开':'关'}`;
function pos(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
canvas.addEventListener('pointerdown',e=>{if(s.mode!=='play'||paused||pointer||e.button!==0)return;if(e.pointerType==='touch')return;e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointer={id:e.pointerId,...pos(e)};});
canvas.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId)Object.assign(pointer,pos(e));});
function up(e){if(pointer?.id!==e.pointerId)return;pointer=null;if(s.mode==='play'&&!paused)release(s);}
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',e=>{if(pointer?.id===e.pointerId){pointer=null;s.holding=false;}});
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)&&e.target===canvas)e.preventDefault();if(e.code==='KeyP'&&!e.repeat)togglePause();if(e.target===canvas&&s.mode==='play'&&!paused&&!e.repeat)keys.add(e.code);});window.addEventListener('keyup',e=>{const held=keys.delete(e.code);if(held&&e.code==='Space'&&!paused)release(s);});window.addEventListener('blur',()=>{if(s.mode==='play'&&!paused)togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&s.mode==='play'&&!paused)togglePause();});
const joystick=$('joystick'),fireButton=$('fire');
function stick(e){const r=joystick.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2),n=Math.max(1,Math.hypot(dx,dy));moveVector={dx:dx/n,dy:dy/n};}
joystick.addEventListener('pointerdown',e=>{if(s.mode!=='play'||paused||movePointer!==null)return;e.preventDefault();movePointer=e.pointerId;if(e.isTrusted)joystick.setPointerCapture(e.pointerId);stick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===movePointer)stick(e);});
for(const type of ['pointerup','pointercancel'])joystick.addEventListener(type,e=>{if(e.pointerId===movePointer){movePointer=null;moveVector={dx:0,dy:0};}});
fireButton.addEventListener('pointerdown',e=>{if(s.mode!=='play'||paused||firePointer!==null)return;e.preventDefault();firePointer=e.pointerId;if(e.isTrusted)fireButton.setPointerCapture(e.pointerId);});
fireButton.addEventListener('pointermove',e=>{if(e.pointerId!==firePointer)return;const r=fireButton.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){firePointer=null;s.holding=false;}});
fireButton.addEventListener('pointerup',e=>{if(e.pointerId===firePointer){firePointer=null;if(!paused)release(s);}});
fireButton.addEventListener('pointercancel',()=>{firePointer=null;s.holding=false;});
function burst(x,y,n,color,speed=140){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=(.25+Math.random())*speed;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.3,max:.6,color});}}
function events(){for(const e of s.events){if(e.type==='absorb'){burst(e.x,e.y,7,BUILDS[s.build].color,90);rings.push({x:e.x,y:e.y,r:3,life:.12,color:BUILDS[s.build].color});tone(440+(e.n||s.ammo)*45,.055,'square',.012);}if(e.type==='charged'){labels.push({x:e.x,y:e.y-48,text:e.n===3?'可以反击！':e.n===6?'火力充足！':'满载爆发！',life:.65,color:BUILDS[s.build].color});}if(e.type==='zap'){tone(700,.08,'sawtooth',.025);}if(e.type==='explosion'){shake=reduced?0:9;burst(e.x,e.y,32,'#ffbf69',230);tone(90,.22,'triangle',.09);}if(e.type==='release'){rings.push({x:e.x,y:e.y,r:20,life:.45,color:BUILDS[s.build].color});shake=reduced?0:Math.min(8,e.n*.65);freeze=reduced?0:.035;tone(160+e.n*8,.18,'triangle',.09);labels.push({x:e.x,y:e.y-65,text:s.build==='blast'?`${e.n} 弹重炮！`:s.build==='arc'?'雷链释放！':`${e.n} 弹齐射！`,life:.75,color:BUILDS[s.build].color});}if(e.type==='kill'){burst(e.x,e.y,20,'#ffb68a',200);rings.push({x:e.x,y:e.y,r:8,life:.28,color:'#ff806f'});tone(200+e.n*100,.09,'triangle');if(e.n>1)labels.push({x:e.x,y:e.y-20,text:`${e.n} 连破`,life:.8,color:'#ffcf9e'});}if(e.type==='hit')burst(e.x,e.y,5,'#f3ebdf',80);if(e.type==='hurt'){shake=reduced?0:10;tone(75,.25,'sawtooth',.06);labels.push({x:s.p.x,y:s.p.y-50,text:e.text||'中弹了！',life:1,color:'#ff806f'});}if(e.type==='danger')tone(180,.12,'square',.025);if(e.type==='overheat'){tone(65,.2,'square',.025);labels.push({x:s.p.x,y:s.p.y-55,text:'过热！躲一下',life:1.3,color:'#ff806f'});}if(e.type==='wave')labels.push({...e,life:1.8,color:'#f3ebdf'});}s.events=[];}
function render(dt,t){
 const fx={particles,rings,labels,shake,reduced};
 renderScene(ctx,s,dt,t,fx);
 particles=fx.particles;rings=fx.rings;labels=fx.labels;shake=fx.shake;
}
function frame(ms){const dt=Math.min((ms-last)/1000||0,1/30);last=ms;if(!paused){if(freeze>0)freeze-=dt;else{const input={hold:!!pointer||firePointer!==null||keys.has('Space'),target:pointer,dx:moveVector.dx+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),dy:moveVector.dy+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)};step(s,dt,input);}events();render(dt,ms/1000);}else render(0,ms/1000);$('buildLabel').textContent=`${BUILDS[s.build].name} · 强化 ${s.buildLevel}`;$('score').textContent=s.score.toLocaleString();$('wave').textContent=`${AREAS[s.area]} ${s.stage}/3`;$('hearts').textContent='● '.repeat(Math.max(0,s.hp));$('capacity').textContent=`蓄弹 ${s.ammo} / ${s.cap}`;$('heat').style.width=`${s.heat*100}%`;$('heat').style.background=s.heat>.75?'#ff806f':'#a7e5e5';$('status').textContent=s.ready?'新操作开始战斗':s.lock>0?'过热冷却':s.ammo>=s.cap?'满了，松手！':s.holding?'正在借火':s.ammo>0?'按住继续接火':'松手时没有护盾';$('touchControls').hidden=s.mode!=='play'||paused;updateOverlay();panel.refresh();requestAnimationFrame(frame);}
loadBest();updateOverlay();requestAnimationFrame(frame);
// Read-only diagnostics for the public QA runner; never changes simulation state.
if(new URLSearchParams(location.search).has('qa')){
 const timings=[],errors=[];window.addEventListener('error',e=>errors.push(e.message));window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));let previous=performance.now();
 function sample(now){timings.push(now-previous);previous=now;if(timings.length>3600)timings.shift();requestAnimationFrame(sample);}requestAnimationFrame(sample);
 window.borrowFireQA=Object.freeze({snapshot:()=>structuredClone(s),errors:()=>[...errors],performance:()=>({samples:timings.length,p50:[...timings].sort((a,b)=>a-b)[Math.floor(timings.length*.5)],p95:[...timings].sort((a,b)=>a-b)[Math.floor(timings.length*.95)],userAgent:navigator.userAgent})});
}
