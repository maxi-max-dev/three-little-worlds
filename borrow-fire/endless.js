// Continuous arena director. Campaign room configuration never enters this module.
export function pressure(time){const tier=1+Math.floor(time/25);return {tier,limit:Math.min(18,3+tier),interval:Math.max(.35,1.65/(1+(tier-1)*.16)),attack:Math.min(2.2,1+(tier-1)*.085),speed:Math.min(1.45,1+(tier-1)*.035)};}
const near=(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r;
const inside=(w,p,r=0)=>p.x>w.x-r&&p.x<w.x+w.w+r&&p.y>w.y-r&&p.y<w.y+w.h+r;
export function beginEndless(s){
 s.mode='play';s.ready=true;s.node='endless';s.area=0;s.stage=1;s.wave=1;s.time=0;s.totalTime=0;
 s.p={x:240,y:440};s.inv=1.2;s.walls=[];s.enemies=[];s.bullets=[];s.shots=[];s.effects=[];
 s.spawn=.2;s.pending=1;s.bosses=0;s.nextBoss=75;s.bossWarning=0;s.nextTerrain=18;s.terrainSerial=0;s.destroyedCover=0;s.expiredCover=0;s.nextGrowth=25;s.pressure=pressure(0);
 s.events.push({type:'wave',x:240,y:290,text:'无尽借火 · 撑得更久'});
}
export function spawnArenaEnemy(s,kind){
 const spots=[{x:240,y:145},...[60,130,350,420].map(x=>({x,y:145})),...[225,310,395,480].flatMap(y=>[{x:45,y},{x:435,y}]),...[115,200,285,370].map(x=>({x,y:535})),...[110,185,260,335].map(x=>({x,y:225}))];
 const valid=spots.filter(p=>!near(p,s.p,150)&&!s.walls.some(w=>w.warn<=0&&inside(w,p,35))&&!s.enemies.some(e=>e.hp>0&&near(e,p,48)));
 if(!valid.length)return false;
 const pos=valid[s.serial%valid.length],tier=s.pressure.tier;
 const hp=kind==='boss'?65+s.bosses*20:kind==='charger'?3.8+Math.max(0,tier-4)*.35:2.4+Math.max(0,tier-4)*.35;
 s.enemies.push({id:s.serial++,...pos,age:0,kind,hp,maxHp:hp,fire:kind==='sniper'?1.5:1.1,phase:1,cycle:0,volley:0});return true;
}
export function tickEndless(s,dt){
 const old=s.pressure.tier;s.pressure=pressure(s.time);s.wave=s.pressure.tier;
 if(old!==s.pressure.tier)s.events.push({type:'wave',x:240,y:270,text:`压力 ${s.pressure.tier} · 火力在靠近`});
 for(const w of s.walls){
  if(w.warn>0){w.warn-=dt;if(w.warn<=0&&(inside(w,s.p,30)||s.enemies.some(e=>inside(w,e,e.kind==='boss'?45:25))))w.life=0;}
  else w.life-=dt;
 }
 const expired=s.walls.filter(w=>w.life<=0&&w.hp>0);s.expiredCover+=expired.length;
 s.walls=s.walls.filter(w=>w.life>0&&w.hp>0);
 if(s.time>=s.nextTerrain){
  s.nextTerrain=s.time+Math.max(7,15-s.pressure.tier*.4);
  const layouts=[{x:90,y:285,w:70,h:24},{x:320,y:360,w:65,h:24},{x:210,y:330,w:24,h:75},{x:85,y:425,w:60,h:24},{x:320,y:245,w:24,h:70},{x:210,y:480,w:70,h:24}];
  const i=s.terrainSerial++,box=layouts[i%layouts.length];
  if(s.walls.length<3&&!s.walls.some(w=>Math.abs(w.x-box.x)<85&&Math.abs(w.y-box.y)<95)&&!inside(box,s.p,45)&&!s.enemies.some(e=>inside(box,e,45))){s.walls.push({...box,id:i,warn:1.3,life:18,maxHp:8,hp:8,dynamic:true});s.events.push({type:'wave',x:240,y:260,text:'地形重组 · 虚线处将升起掩体'});}
 }
 const boss=s.enemies.some(e=>e.kind==='boss'&&e.hp>0);
 if(!boss&&!s.bossWarning&&s.time>=s.nextBoss){s.bossWarning=3;s.events.push({type:'wave',x:240,y:240,text:'守炉人正在靠近！'});}
 if(s.bossWarning>0){s.bossWarning=Math.max(.001,s.bossWarning-dt);if(s.bossWarning<=.001&&spawnArenaEnemy(s,'boss')){s.bossWarning=0;s.nextBoss=Infinity;}}
 s.spawn-=dt;
 const cap=s.pressure.limit; // A lingering boss never freezes the pressure ramp.
 if(s.spawn<=0&&s.enemies.filter(e=>e.hp>0&&e.kind!=='boss').length<cap){
  const t=s.pressure.tier;let added=false;
  for(let j=0;j<Math.min(4,1+Math.floor((t-1)/3))&&s.enemies.filter(e=>e.hp>0&&e.kind!=='boss').length<cap;j++){
  const i=s.serial;const kind=t>=3&&i%5===3?'charger':t>=2&&i%4===2?'sniper':'gun';
  if(spawnArenaEnemy(s,kind))added=true;else break;
  }if(added)s.spawn=s.pressure.interval;
 }
}
export function endlessKill(s,e){
 if(e.kind==='boss'){s.bosses++;s.nextBoss=s.time+90;s.hp=Math.min(5,s.hp+1);s.bullets=[];s.inv=Math.max(s.inv,1.5);s.score+=1500;s.events.push({type:'wave',x:240,y:260,text:'守炉人击破 · 修复1生命，继续！'});}
 if(s.kills>=s.nextGrowth){s.nextGrowth+=25;if(s.buildLevel<5)s.buildLevel++;else s.power+=.1;s.events.push({type:'wave',x:240,y:300,text:'火力进化 · 战斗继续'});}
}
export function hitCover(s,w,amount){
 if(!w?.dynamic||w.warn>0||w.hp<=0)return;
 w.hp-=amount;
 if(w.hp<=0){s.destroyedCover++;s.events.push({type:'explosion',x:w.x+w.w/2,y:w.y+w.h/2,n:25});s.effects.push({type:'explosion',x:w.x+w.w/2,y:w.y+w.h/2,r:25,life:.25});}
}
