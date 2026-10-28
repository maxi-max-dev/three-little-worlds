export const W = 480, H = 640;
export const BUILDS = {
  swarm: { name: '蜂群', tag: '快吸快放 · 追踪齐射', desc: '每借到 2 颗，额外返还 1 枚追踪弹。少量也能快速击破。', color: '#76d6ed' },
  blast: { name: '重炮', tag: '攒一口大的 · 范围爆破', desc: '把所有蓄弹压成一发炮弹。攒得越多，爆炸越大；6 颗起连爆。', color: '#ffbf69' },
  arc: { name: '雷链', tag: '边吸边打 · 连锁放电', desc: '每吸 3 颗自动电击最近敌人；松手让闪电在敌人间跳跃。', color: '#c7a0ff' }
};
export function createState(build = 'swarm') {
  if (!BUILDS[build]) build = 'swarm';
  return { mode:'intro', build, buildLevel:1, time:0, wave:1, score:0, hp:3,
    heat:0, ammo:0, cap:build==='blast'?16:12, shield:72, power:1, cool:1,
    holding:false, lock:0, inv:0, kills:0, absorbed:0, biggest:0,
    combo:0, comboTime:0, p:{x:240,y:410}, enemies:[], bullets:[], shots:[],
    events:[], effects:[], spawn:0, pending:0, serial:0, charge:0, releaseCount:0 };
}
export function startWave(s) {
  s.mode='play'; s.time=0; s.heat=0; s.ammo=0; s.charge=0; s.holding=false;
  s.lock=0; s.inv=1.2; s.p={x:240,y:410}; s.bullets=[]; s.shots=[];
  s.enemies=[]; s.effects=[]; s.pending=3+s.wave*2; s.spawn=.12;
  s.events.push({type:'wave',x:240,y:300,text:`第 ${s.wave} 波 · ${BUILDS[s.build].name}`});
}
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
function damage(s,e,amount) {
  if (e.hp<=0) return;
  e.hp-=amount;
  s.events.push({type:'hit',x:e.x,y:e.y});
  if(e.hp<=0) {
    s.kills++; s.combo++; s.comboTime=1.5;
    s.score+=100+Math.min(5,s.combo-1)*40;
    s.events.push({type:'kill',x:e.x,y:e.y,n:s.combo});
  }
}
function lightning(s,origin,amount,jumps,range) {
  const hit = new Set(); let from=origin;
  for(let i=0;i<jumps;i++) {
    const target=s.enemies.filter(e=>e.hp>0&&!hit.has(e.id)&&dist(e,from)<=range)
      .sort((a,b)=>dist(a,from)-dist(b,from))[0];
    if(!target) break;
    s.effects.push({type:'arc',x:from.x,y:from.y,toX:target.x,toY:target.y,life:.24});
    hit.add(target.id); damage(s,target,amount); from=target;
  }
  if(hit.size) s.events.push({type:'zap',x:origin.x,y:origin.y,n:hit.size});
}
export function absorb(s,b) {
  if(!s.holding||s.lock>0||s.ammo>=s.cap) return false;
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
  const enemies=s.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,s.p)-dist(b,s.p));
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
  for(const e of s.enemies) if(e.hp>0&&dist(e,b)<b.r) damage(s,e,b.damage);
  if(b.echo) {
    // Charged shells send a secondary blast through surviving nearby targets.
    const target=s.enemies.filter(e=>e.hp>0&&dist(e,b)<b.r*2)
      .sort((a,c)=>dist(a,b)-dist(c,b))[0];
    if(target) {
      s.effects.push({type:'explosion',x:target.x,y:target.y,r:b.r*.65,life:.45});
      for(const e of s.enemies) if(e.hp>0&&dist(e,target)<b.r*.65) damage(s,e,b.damage*.55);
    }
  }
}
export function hurt(s,reason='中弹了！') {
  if(s.inv>0) return;
  s.hp--; s.inv=1.7; s.combo=0;
  s.events.push({type:'hurt',x:s.p.x,y:s.p.y,text:reason});
  if(s.hp<=0) {s.mode='dead';s.holding=false;}
}
export function upgrade(s,id) {
  if(s.mode!=='upgrade'||!['evolve','capacity','power','shield','heal','cool'].includes(id)) return;
  if(id==='evolve') s.buildLevel++;
  if(id==='capacity') {s.cap+=5;s.cool+=.15;}
  if(id==='power') s.power+=.5;
  if(id==='shield') s.shield+=18;
  if(id==='cool') s.cool+=.45;
  if(id==='heal') s.hp=Math.min(5,s.hp+1);
  s.wave++; startWave(s);
}
export function step(s,dt,input={}) {
  if(s.mode!=='play') return;
  s.time+=dt;s.inv=Math.max(0,s.inv-dt);s.lock=Math.max(0,s.lock-dt);
  s.comboTime-=dt;if(s.comboTime<=0)s.combo=0;
  for(const e of s.effects)e.life-=dt;s.effects=s.effects.filter(e=>e.life>0);
  let dx=input.dx||0,dy=input.dy||0;
  if(input.target) {
    dx=input.target.x-s.p.x;dy=input.target.y-s.p.y;const d=Math.hypot(dx,dy);
    if(d>1){const move=Math.min(d,340*dt);s.p.x+=dx/d*move;s.p.y+=dy/d*move;}
  } else {
    const d=Math.hypot(dx,dy);if(d){s.p.x+=dx/d*340*dt;s.p.y+=dy/d*340*dt;}
  }
  s.p.x=Math.max(22,Math.min(W-22,s.p.x));s.p.y=Math.max(90,Math.min(H-65,s.p.y));
  s.holding=!!input.hold&&s.lock<=0;
  s.heat=Math.max(0,s.heat+dt*(s.holding?.17:-.55*s.cool));
  if(s.heat>=1){s.ammo=0;s.holding=false;s.lock=1.15;s.heat=.98;s.events.push({type:'overheat',x:s.p.x,y:s.p.y});}
  s.spawn-=dt;
  if(s.pending>0&&s.spawn<=0) {
    const i=s.serial++,first=s.enemies.length===0;
    const kind=s.wave>=3&&i%3===0?'hunter':s.wave>=2&&i%3===1?'fan':'gun';
    const hp=kind==='hunter'?2.6:2.2+Math.floor(s.wave/2)*.8;
    s.enemies.push({id:i,x:first?240:65+(i*137)%350,y:first?170:110,age:0,kind,hp,maxHp:hp,fire:.45+(i%3)*.12});
    s.pending--;s.spawn=1.15;
  }
  for(const e of s.enemies) {
    if(e.hp<=0)continue;
    e.age+=dt;const dx=s.p.x-e.x,dy=s.p.y-e.y,d=Math.hypot(dx,dy)||1;
    if(e.kind==='hunter'){e.x+=dx/d*(42+s.wave*6)*dt;e.y+=dy/d*(42+s.wave*6)*dt;}
    else {e.y+=Math.min(.7,Math.max(-.7,(185+Math.sin(e.id)*45-e.y)*.02))*45*dt;e.x+=Math.sin(e.age*.9+e.id)*24*dt;}
    e.fire-=dt;
    if(e.fire<=0) {
      const angle=Math.atan2(dy,dx),fan=e.kind==='fan'?5:3;
      for(let j=0;j<fan;j++){const a=angle+(j-(fan-1)/2)*.17,v=150+s.wave*8;s.bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:8});}
      e.fire=e.kind==='hunter'?2.5:1.7-s.wave*.08;
      s.events.push({type:'fire',x:e.x,y:e.y});
    }
    if(dist(e,s.p)<26){hurt(s,'撞上敌人！');e.x-=dx/d*25;e.y-=dy/d*25;}
  }
  for(const b of s.bullets) {
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;const d=dist(b,s.p);
    if(d<s.shield&&absorb(s,b))b.life=0;
    else if(d<15){hurt(s);b.life=0;}
  }
  for(const b of s.shots) {
    let e=s.enemies.find(e=>e.id===b.target&&e.hp>0);
    if(!e){e=s.enemies.filter(e=>e.hp>0).sort((a,c)=>dist(a,b)-dist(c,b))[0];b.target=e?.id;}
    if(e){const a=Math.atan2(e.y-b.y,e.x-b.x),blend=Math.min(1,dt*(b.kind==='blast'?7:13)),speed=b.kind==='blast'?480:650;b.vx+=(Math.cos(a)*speed-b.vx)*blend;b.vy+=(Math.sin(a)*speed-b.vy)*blend;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
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
    s.mode=s.wave>=5?'win':'upgrade';s.holding=false;s.heat=0;s.bullets=[];s.shots=[];s.score+=s.wave*200;
  }
}
