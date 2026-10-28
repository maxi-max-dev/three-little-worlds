import {createState,startWave,step,release,decide} from '../borrow-fire/model.js';
export function measure(build){const s=createState(build);startWave(s);const rooms=[];let empty=0,maxAlive=0;
for(let frame=0;frame<36000&&s.mode!=='dead';frame++){
 if(s.mode==='clear'){rooms.push({node:s.node,seconds:+s.time.toFixed(2),emptySeconds:+empty.toFixed(2),maxAlive,hp:s.hp});empty=0;maxAlive=0;if(s.node==='a3')break;decide(s,s.node==='a1'?'a2s':'a3');continue;}
 if(s.pending&&s.enemies.length===0&&s.roomKills>0)empty+=1/60;
 maxAlive=Math.max(maxAlive,s.enemies.length);
 if(s.ammo>=(build==='blast'?6:3)||s.heat>.68)release(s);
 step(s,1/60,{hold:s.heat<.82,target:{x:240+Math.sin(s.time*.5)*85,y:435}});
}return {build,mode:s.mode,rooms};}
if(import.meta.url===`file://${process.argv[1]}`)console.log(JSON.stringify(['swarm','blast','arc'].map(measure),null,2));
