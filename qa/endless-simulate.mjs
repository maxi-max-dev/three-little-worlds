import {createState,startWave,step,release} from '../borrow-fire/model.js';
export function pilot(s){
 let target={x:240+Math.sin(s.time*.48)*125,y:395+Math.cos(s.time*.31)*65};
 const boss=s.enemies.find(e=>e.kind==='boss');
 if(boss?.aim){const a=Math.atan2(boss.aim.y-boss.y,boss.aim.x-boss.x),sign=s.p.x<240?1:-1;target={x:Math.max(40,Math.min(440,s.p.x-Math.sin(a)*140*sign)),y:Math.max(120,Math.min(525,s.p.y+Math.cos(a)*140*sign))};}
 const close=s.enemies.filter(e=>e.hp>0).sort((a,b)=>Math.hypot(a.x-s.p.x,a.y-s.p.y)-Math.hypot(b.x-s.p.x,b.y-s.p.y))[0];
 if(close&&Math.hypot(close.x-s.p.x,close.y-s.p.y)<95)target={x:s.p.x<close.x?50:430,y:s.p.y<close.y?260:515};
 return target;
}
export function simulate(build='swarm',seconds=240){const s=createState(build,'endless');startWave(s);const checkpoints=[];let last=-1,maxEnemies=0,maxBullets=0,bossSeen=false;
for(let i=0;i<seconds*60&&s.mode==='play';i++){if(s.ammo>=(build==='blast'?6:3)||s.heat>.68)release(s);step(s,1/60,{hold:s.heat<.82,target:pilot(s)});maxEnemies=Math.max(maxEnemies,s.enemies.length);maxBullets=Math.max(maxBullets,s.bullets.length);bossSeen ||= s.enemies.some(e=>e.kind==='boss');const mark=Math.floor(s.time/25);if(mark!==last){last=mark;checkpoints.push({seconds:Math.floor(s.time),tier:s.wave,hp:s.hp,enemies:s.enemies.length,kills:s.kills,bosses:s.bosses,cover:s.walls.length});}}
return {build,result:s.mode,seconds:+s.time.toFixed(1),hp:s.hp,kills:s.kills,bosses:s.bosses,bossSeen,broken:s.destroyedCover,expired:s.expiredCover,maxEnemies,maxBullets,checkpoints};}
if(typeof process!=='undefined'&&import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(['swarm','blast','arc'].map(b=>simulate(b)),null,2));
