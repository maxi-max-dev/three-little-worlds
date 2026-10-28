import {createState,startWave,step,release,options,decide,NODES,sight} from '../borrow-fire/model.js';
export function simulate(build,route='safe',help='leave',evolution='evolve'){
 const s=createState(build);startWave(s);const rooms=[];let prev='',frame=0;
 for(;frame<60*1800&&!['dead','win'].includes(s.mode);frame++){
  if(s.mode==='clear'){rooms.push({node:s.node,hp:s.hp,time:+s.time.toFixed(1)});let opts=options(s),o=opts.find(o=>o.id===help&&!o.disabled)||opts.find(o=>o.id===evolution)||opts.find(o=>o.id.endsWith(route==='safe'?'s':'r'))||opts[0];decide(s,o.id);continue;}
  // A deterministic test pilot, no changes to health/enemies/ammo or time.
  let target={x:240+Math.sin(s.time*.5)*85,y:435};
  const charger=s.enemies.find(e=>e.kind==='charger'&&e.fire<.7&&e.fire>-.45);
  if(charger)target={x:s.p.x+(s.p.x<240?90:-90),y:480};
  const only=s.enemies.filter(e=>e.hp>0);if(only.length&&only.every(e=>e.kind==='charger'))target={x:only[0].x,y:only[0].y+45};
  if(s.node==='b2r'||s.node==='c2r'){const e=only.find(e=>e.kind!=='charger')||only[0];if(e&&!sight(s,s.p,e)){target=s.p.y>235?{x:240,y:215}:{x:e.x,y:215};}else if(e)target={x:e.x,y:Math.min(500,e.y+180)};}
  const boss=s.enemies.find(e=>e.kind==='boss');
  const limit=build==='blast'?6:3;
  if(s.ammo>=limit||s.heat>.68){release(s);}
  step(s,1/60,{hold:s.heat<.82,target});
 }
 return {build,route,help,mode:s.mode,hp:s.hp,time:+s.totalTime.toFixed(1),node:s.node,frames:frame,visited:s.visited,rooms,absorbed:s.absorbed};
}
if(import.meta.url===`file://${process.argv[1]}`)for(const b of ['swarm','blast','arc'])for(const r of ['safe','risk'])console.log(JSON.stringify(simulate(b,r)));
