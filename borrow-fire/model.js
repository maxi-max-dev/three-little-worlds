import {NODES, AREAS} from './world.js?v=3';
export {NODES,AREAS};
export const W = 480, H = 640;
export const BUILDS = {
  swarm: { name: '蜂群', tag: '快吸快放 · 追踪齐射', desc: '每借到 2 颗，额外返还 1 枚追踪弹。少量也能快速击破。', color: '#76d6ed' },
  blast: { name: '重炮', tag: '攒一口大的 · 范围爆破', desc: '把所有蓄弹压成一发炮弹。攒得越多，爆炸越大；6 颗起连爆。', color: '#ffbf69' },
  arc: { name: '雷链', tag: '边吸边打 · 连锁放电', desc: '每吸 3 颗自动电击最近敌人；松手让闪电在敌人间跳跃。', color: '#c7a0ff' }
};
export function createState(build = 'swarm') {
  if (!BUILDS[build]) build = 'swarm';
  return { mode:'intro', node:'a1', area:0, stage:1, visited:[], routes:[], ember:0, story:[null,null], shieldOnce:0, boostOnce:0, safeLamp:false, totalTime:0, roomKills:0, clearCount:0, ready:true, build, buildLevel:1, time:0, wave:1, score:0, hp:5,
    heat:0, ammo:0, cap:build==='blast'?16:12, shield:72, power:1, cool:1,
    holding:false, lock:0, inv:0, kills:0, absorbed:0, biggest:0,
    combo:0, comboTime:0, p:{x:240,y:410}, enemies:[], bullets:[], shots:[],
    events:[], effects:[], spawn:0, pending:0, serial:0, charge:0, releaseCount:0 };
}
export function startWave(s,id=s.node) {
  const node=NODES[id];if(!node)throw Error('Unknown room');
  s.node=id;s.area=node.area;s.stage=node.stage;s.wave=node.area*3+node.stage;
  s.visited.push(id);s.mode='play';s.ready=true;s.time=0;s.heat=0;s.ammo=0;s.charge=0;s.holding=false;
  s.lock=0;s.inv=1.2;s.p={x:240,y:490};s.bullets=[];s.shots=[];s.enemies=[];s.effects=[];
  s.roomKills=0;s.pending=node.enemies.length;s.spawn=.5;s.walls=node.walls.map(w=>({...w}));
  if(s.safeLamp){s.walls.push({x:70,y:355,w:70,h:24,lamp:true});s.safeLamp=false;}
  s.events.push({type:'wave',x:240,y:300,text:`${AREAS[s.area]} · ${s.stage}/3`});
}
export function options(s){
 if(s.mode!=='clear')return [];
 const node=NODES[s.node];
 if(node.story!==undefined&&s.story[node.story]===null)return [
  {id:'help',name:node.story===0?'点亮暗屋':'启动回流',desc:node.story===0?'3 余火 · 点亮暗屋，弹仓+1并恢复1生命':'3 余火 · 下一房增加安全灯掩体',disabled:s.ember<3},
  {id:'self',name:'留给自己',desc:node.story===0?'3 余火 · 下一房抵挡一次伤害':'3 余火 · 下一房反击伤害 +25%',disabled:s.ember<3},
  {id:'leave',name:'继续前进',desc:'不消耗余火'}];
 if(s.stage===3&&!s.areaUpgraded)return [
  {id:'evolve',name:['蜂巢扩编','爆心扩张','多级跳电'][['swarm','blast','arc'].indexOf(s.build)],desc:'当前流派进化一级'},
  {id:'cool',name:'冷却回路',desc:'散热 +45%，持续吸收升温降低'},
  {id:s.hp<5?'heal':'capacity',name:s.hp<5?'修补机体':'扩充弹仓',desc:s.hp<5?'恢复 2 点生命':'容量 +5'}];
 return node.next.map(id=>({id,name:NODES[id].name,desc:NODES[id].rewardText}));
}
export function decide(s,id){
 const offered=options(s).find(o=>o.id===id&&!o.disabled);if(!offered)return false;
 const node=NODES[s.node];
 if(node.story!==undefined&&s.story[node.story]===null){
  s.story[node.story]=id;
  if(id!=='leave')s.ember-=3;
  if(id==='help'){if(node.story===0){s.hp=Math.min(5,s.hp+1);s.cap++;}else s.safeLamp=true;}
  if(id==='self'){if(node.story===0)s.shieldOnce=1;else s.boostOnce=1;}
 }else if(s.stage===3&&!s.areaUpgraded){applyUpgrade(s,id);s.ember=0;s.areaUpgraded=false;startWave(s,node.next[0]);}
 else{if(s.stage===1)s.routes.push(id);if(s.stage===3){s.ember=0;s.areaUpgraded=false;}startWave(s,id);}
 return true;
}
function applyUpgrade(s,id){
 if(id==='evolve')s.buildLevel++;
 if(id==='capacity')s.cap+=5;
 if(id==='cool')s.cool+=.45;
 if(id==='heal')s.hp=Math.min(5,s.hp+2);
}
export function upgrade(s,id){return decide(s,id);}
export function contains(w,p,r=0){return p.x>w.x-r&&p.x<w.x+w.w+r&&p.y>w.y-r&&p.y<w.y+w.h+r;}
export function sight(s,a,b){const d=Math.hypot(a.x-b.x,a.y-b.y),n=Math.ceil(d/6);for(let i=1;i<n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if((s.walls||[]).some(w=>contains(w,p)))return false;}return true;}
function move(s,p,dx,dy,r=16){const parts=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));for(let i=0;i<parts;i++){const x=p.x+dx/parts,y=p.y+dy/parts;if(!(s.walls||[]).some(w=>contains(w,{x,y:p.y},r)))p.x=x;if(!(s.walls||[]).some(w=>contains(w,{x:p.x,y},r)))p.y=y;}p.x=Math.max(22,Math.min(W-22,p.x));p.y=Math.max(100,Math.min(H-72,p.y));}
function fire(s,e,angles,speed=175){for(const a of angles){if(s.bullets.length>=180)break;s.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:8});}s.events.push({type:'fire',x:e.x,y:e.y});}
function enemyStep(s,e,dt){
 e.age+=dt;if(e.age<.65)return;
 const dx=s.p.x-e.x,dy=s.p.y-e.y,d=Math.hypot(dx,dy)||1;
 if(e.kind==='boss'){
  const phase=e.hp<=e.maxHp*.5?2:1;
  if(phase!==e.phase){e.phase=phase;e.cycle=0;e.volley=0;s.bullets=[];s.inv=Math.max(s.inv,1.5);s.events.push({type:'wave',x:240,y:300,text:'守炉人 · 核心过载'});}
  e.cycle+=dt;const t=e.cycle%7;e.open=t>=3&&t<5.5;
  e.telegraph=t>=2&&t<3;e.fire=e.telegraph?3-t:1;
  e.volley-=dt;
  if(t<2&&e.volley<=0){const a=Math.atan2(dy,dx);fire(s,e,phase===1?[-.35,-.175,0,.175,.35].map(v=>a+v):Array.from({length:12},(_,i)=>a+(i-5.5)*.36),phase===1?175:190);e.volley=.38;}
  if(phase===2&&t>=5.5&&t<6.2){if(!e.aim)e.aim={x:s.p.x,y:s.p.y};e.telegraph=true;e.fire=6.2-t;}
  else if(phase===2&&t>=6.2&&e.aim){const a=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);move(s,e,Math.cos(a)*190*dt,Math.sin(a)*190*dt,30);}
  if(t<.1){e.aim=null;e.x+=(240-e.x)*dt*2;e.y+=(170-e.y)*dt*2;}
 }else if(e.kind==='charger'){
  e.fire-=dt;
  if(e.fire<.7&&e.fire>0&&!e.aim)e.aim={x:s.p.x,y:s.p.y};
  if(e.fire<=0&&e.fire>-.45&&e.aim){e.dashing=true;const a=Math.atan2(e.aim.y-e.y,e.aim.x-e.x);move(s,e,Math.cos(a)*330*dt,Math.sin(a)*330*dt);}
  if(e.fire<=-.45){e.dashing=false;e.weak=1.6; e.fire=2.8;e.aim=null;}
  if(e.weak>0){e.weak-=dt;if(dist(e,s.p)<65&&s.holding){damage(s,e,dt*2);}}
 }else{
  e.fire-=dt;
  if(e.fire<(e.kind==='sniper'?.8:.5)&&!e.aim)e.aim={x:s.p.x,y:s.p.y};
  if(e.fire<=0){const a=Math.atan2((e.aim||s.p).y-e.y,(e.aim||s.p).x-e.x);fire(s,e,e.kind==='sniper'?[a-.025,a,a+.025]:[-.22,0,.22].map(v=>a+v),e.kind==='sniper'?320:165+s.area*12);e.fire=e.kind==='sniper'?2.8:2;e.aim=null;}
 }
 if(dist(e,s.p)<(e.kind==='boss'?40:28))hurt(s,'撞击不能吸收');
}
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function damage(s,e,amount) {
  if (e.hp<=0) return;
  if(s.mode!=='play')return;
  amount*=s.boostOnce?1.25:1;if(e.kind==='boss'&&!e.open)amount*=.3;
  e.hp-=amount;
  s.events.push({type:'hit',x:e.x,y:e.y});
  if(e.hp<=0) {
    s.kills++;s.roomKills++; s.combo++; s.comboTime=1.5;
    s.score+=100+Math.min(5,s.combo-1)*40;
    s.events.push({type:'kill',x:e.x,y:e.y,n:s.combo});
    if(s.pending===0&&s.enemies.every(e=>e.hp<=0))finishRoom(s);
  }
}
function lightning(s,origin,amount,jumps,range) {
  const hit = new Set(); let from=origin;
  for(let i=0;i<jumps;i++) {
    const target=s.enemies.filter(e=>e.hp>0&&!hit.has(e.id)&&dist(e,from)<=range&&sight(s,from,e))
      .sort((a,b)=>dist(a,from)-dist(b,from))[0];
    if(!target) break;
    s.effects.push({type:'arc',x:from.x,y:from.y,toX:target.x,toY:target.y,life:.24});
    hit.add(target.id); damage(s,target,amount); from=target;
  }
  if(hit.size) s.events.push({type:'zap',x:origin.x,y:origin.y,n:hit.size});
}
export function absorb(s,b) {
  if(s.mode!=='play'||!s.holding||s.lock>0||s.ammo>=s.cap) return false;
  s.ammo++; s.absorbed++; s.charge++;
  s.heat=Math.min(1,s.heat+(s.build==='blast'?.025:.029));
  s.events.push({type:'absorb',x:b.x,y:b.y,n:s.ammo});
  if(s.ammo===3||s.ammo===6||s.ammo===10) s.events.push({type:'charged',x:s.p.x,y:s.p.y,n:s.ammo});
  if(s.build==='arc'&&s.charge%3===0) lightning(s,s.p,.7+.25*s.buildLevel,1,310);
  return true;
}
export function release(s) {
  s.holding=false;
  if(s.mode!=='play'||s.ammo===0) return;
  const n=s.ammo; s.releaseCount++; s.biggest=Math.max(s.biggest,n);
  const enemies=s.enemies.filter(e=>e.hp>0&&sight(s,s.p,e)).sort((a,b)=>dist(a,s.p)-dist(b,s.p));
  s.events.push({type:'release',x:s.p.x,y:s.p.y,n,build:s.build});
  if(s.build==='arc') {
    lightning(s,s.p,s.power*(1.1+n*.45),Math.min(2+s.buildLevel,1+Math.floor(n/2)),900);
  } else if(s.build==='blast') {
    const a=enemies.length?Math.atan2(enemies[0].y-s.p.y,enemies[0].x-s.p.x):-Math.PI/2;
    s.shots.push({kind:'blast',x:s.p.x,y:s.p.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,
      life:2.8,target:enemies[0]?.id,damage:s.power*(1.5+n*.9),r:48+n*4+s.buildLevel*8,
      echo:n>=6,echoPower:s.buildLevel});
  } else {
    const count=n+Math.floor(n/2)+(s.buildLevel-1)*Math.ceil(n/3);
    for(let i=0;i<count;i++) {
      const e=enemies[Math.floor(i/3)%enemies.length];
      const a=(e?Math.atan2(e.y-s.p.y,e.x-s.p.x):-Math.PI/2)+(i%3-1)*.3;
      s.shots.push({kind:'swarm',x:s.p.x,y:s.p.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,
        life:2.2,target:e?.id,damage:s.power*(1.15+(s.buildLevel-1)*.1)});
    }
  }
  s.ammo=0; s.heat=Math.max(0,s.heat-(s.build==='swarm'?.36:.28));
}
function explode(s,b) {
  s.effects.push({type:'explosion',x:b.x,y:b.y,r:b.r,life:.38});
  s.events.push({type:'explosion',x:b.x,y:b.y,n:b.r});
  for(const e of s.enemies) if(e.hp>0&&dist(e,b)<b.r&&sight(s,b,e)) damage(s,e,b.damage);
  if(b.echo) {
    // Charged shells send a secondary blast through surviving nearby targets.
    const target=s.enemies.filter(e=>e.hp>0&&dist(e,b)<b.r*2)
      .sort((a,c)=>dist(a,b)-dist(c,b))[0];
    if(target) {
      s.effects.push({type:'explosion',x:target.x,y:target.y,r:b.r*.65,life:.45});
      for(const e of s.enemies) if(e.hp>0&&dist(e,target)<b.r*.65&&sight(s,target,e)) damage(s,e,b.damage*.55);
    }
  }
}
export function hurt(s,reason='中弹了！') {
  if(s.mode!=='play'||s.inv>0)return;
  if(s.shieldOnce){s.shieldOnce=0;s.inv=1.7;s.events.push({type:'wave',x:s.p.x,y:s.p.y-40,text:'余火护住了你'});return;}
  s.hp--; s.inv=1.7; s.combo=0;
  s.events.push({type:'hurt',x:s.p.x,y:s.p.y,text:reason});
  if(s.hp<=0) {s.mode='dead';s.holding=false;s.bullets=[];s.shots=[];}
}
export function step(s,dt,input={}) {
  if(s.mode!=='play') return;
  if(s.ready){if(!input.hold&&!input.dx&&!input.dy&&!input.target)return;s.ready=false;}
  s.time+=dt;s.totalTime+=dt;s.inv=Math.max(0,s.inv-dt);s.lock=Math.max(0,s.lock-dt);
  s.comboTime-=dt;if(s.comboTime<=0)s.combo=0;
  for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
  let dx=input.dx||0,dy=input.dy||0;
  if(input.target){dx=input.target.x-s.p.x;dy=input.target.y-s.p.y;}
  const len=Math.hypot(dx,dy);if(len)move(s,s.p,dx/len*Math.min(input.target?len:Infinity,260*dt),dy/len*Math.min(input.target?len:Infinity,260*dt));
  s.holding=!!input.hold&&s.lock<=0;
  const oldHeat=s.heat;
  s.heat=Math.max(0,s.heat+dt*(s.holding?.14/Math.sqrt(s.cool):-.55*s.cool));
  if(oldHeat<.75&&s.heat>=.75)s.events.push({type:'danger',x:s.p.x,y:s.p.y});
  if(s.heat>=1){s.ammo=0;s.holding=false;s.lock=1.15;s.heat=.98;s.events.push({type:'overheat',x:s.p.x,y:s.p.y});}
  s.spawn-=dt;
  const node=NODES[s.node];
  if(s.pending>0&&s.spawn<=0&&s.enemies.length<6){
   const i=node.enemies.length-s.pending,kind=node.enemies[i],id=s.serial++;
   const spots=[{x:240,y:165},{x:100,y:160},{x:380,y:175},{x:80,y:290},{x:400,y:300}];
   const spot=spots.filter(p=>dist(p,s.p)>150&&!(s.walls||[]).some(w=>contains(w,p,25)))[i%Math.max(1,spots.filter(p=>dist(p,s.p)>150&&!(s.walls||[]).some(w=>contains(w,p,25))).length)];
   if(spot){const hp=kind==='boss'?125:kind==='charger'?4:3+s.area*.4;s.enemies.push({id,...spot,age:0,kind,hp,maxHp:hp,fire:kind==='sniper'?1.5:1.2,phase:1,cycle:0,volley:0});s.pending--;s.spawn=node.interval;}
  }
  for(const e of s.enemies){if(e.hp>0&&s.mode==='play')enemyStep(s,e,dt);}
  for(const b of s.bullets) {
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(s.walls.some(w=>contains(w,b))){b.life=0;continue;}const d=dist(b,s.p);
    if(d<s.shield&&sight(s,s.p,b)&&absorb(s,b))b.life=0;
    else if(d<15){hurt(s);b.life=0;}
  }
  for(const b of s.shots) {
    let e=s.enemies.find(e=>e.id===b.target&&e.hp>0&&sight(s,b,e));
    if(!e){e=s.enemies.filter(e=>e.hp>0&&sight(s,b,e)).sort((a,c)=>dist(a,b)-dist(c,b))[0];b.target=e?.id;}
    if(e){const a=Math.atan2(e.y-b.y,e.x-b.x),blend=Math.min(1,dt*(b.kind==='blast'?7:13)),speed=b.kind==='blast'?480:650;b.vx+=(Math.cos(a)*speed-b.vx)*blend;b.vy+=(Math.sin(a)*speed-b.vy)*blend;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(s.walls.some(w=>contains(w,b))){b.life=0;continue;}
    for(const enemy of s.enemies) {
      if(enemy.hp>0&&dist(enemy,b)<24) {
        b.life=0;
        if(b.kind==='blast')explode(s,b);else damage(s,enemy,b.damage);
        break;
      }
    }
  }
  s.enemies=s.enemies.filter(e=>e.hp>0);
  s.bullets=s.bullets.filter(b=>b.life>0&&b.x>-20&&b.x<W+20&&b.y>-20&&b.y<H+20);
  s.shots=s.shots.filter(b=>b.life>0);
  if(s.mode==='play'&&s.pending===0&&s.enemies.length===0) {
    finishRoom(s);
  }
}

function finishRoom(s){if(s.mode!=='play')return;const node=NODES[s.node];
    s.mode=node.boss?'win':'clear';s.holding=false;s.heat=0;s.bullets=[];s.shots=[];s.clearCount++;s.score+=s.wave*200;
    s.converted=Math.min(2,Math.floor(s.ammo/3));s.ember=Math.min(6,s.ember+Math.min(3,s.roomKills)+s.converted);s.ammo=0;s.boostOnce=0;s.shieldOnce=0;
    if(node.reward==='heal')s.hp=Math.min(5,s.hp+1);
    if(node.reward==='power')s.power+=.15;
    s.events.push({type:'wave',x:240,y:300,text:node.boss?'中央炉亮了':'火收下了 · 出口开启'});
}
