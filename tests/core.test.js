import test from 'node:test';
import assert from 'node:assert/strict';
import {newLoot,lootWeight,lootValue,lootSpeed,lootWalkable,lootInteract,dropLoot,lootTick,moveLoot,newGrid,calcGrid,projectedGrid,placeGrid,newLife,newLifeWorld,validLifeWorld,lifeAct,retireLife,nextLife,tickLife,lifeWalkable} from '../games/models.js';

test('loot: heavier gear changes movement, weight cap rejects an extra item, dropping preserves it',()=>{
 const s=newLoot();s.phase='playing';const base=lootSpeed(s);s.x=270;s.y=395;assert.equal(lootInteract(s).type,'pickup');assert.ok(lootSpeed(s)<base);s.x=365;s.y=240;lootInteract(s);s.x=350;s.y=460;assert.equal(lootInteract(s).type,'full');assert.equal(lootWeight(s),6);assert.ok(dropLoot(s,0));assert.ok(s.items.some(o=>o.id==='bell'&&o.x===350));assert.equal(lootInteract(s).type,'pickup');assert.equal(lootWeight(s),4);
});
test('loot: feather opens only the light route; bell opens a permanent usable bridge',()=>{
 const s=newLoot();s.phase='playing';assert.equal(lootWalkable(s,480,190),false);s.x=205;s.y=170;lootInteract(s);assert.equal(lootWalkable(s,480,190),true);s.bag.push({id:'heart'});assert.equal(lootWalkable(s,480,190),false);s.bag=[{id:'bell'}];s.x=411;s.y=373;assert.equal(lootInteract(s).type,'gate');assert.equal(lootWalkable(s,480,373),true);dropLoot(s,0);assert.equal(lootWalkable(s,480,373),true);
});
test('loot: a complete near-shore round returns a score; timeout never banks cargo',()=>{
 const s=newLoot();s.phase='playing';s.x=350;s.y=460;lootInteract(s);for(let i=0;i<120;i++)moveLoot(s,-1,0,.02);s.x=120;s.y=420;assert.equal(lootInteract(s).type,'win');assert.equal(s.score,8);const failed=newLoot();failed.phase='playing';failed.bag=[{id:'heart'}];lootTick(failed,91,0);assert.equal(failed.phase,'lost');assert.equal(failed.score,0);
});
test('loot: lamp blocks ghost damage, life countdown is independent of protection',()=>{
 const a=newLoot();a.phase='playing';a.x=630;a.y=340;lootTick(a,.1,0);assert.equal(a.hits,1);const b=newLoot();b.phase='playing';b.x=630;b.y=340;b.bag=[{id:'lamp'}];lootTick(b,.1,0);assert.equal(b.hits,0);assert.equal(b.time,89.9);
});
test('grid: water changes downstream forest, orchard and hive production',()=>{
 const board=Array(9).fill(null);board[0]={kind:'pond',level:1};board[1]={kind:'forest',level:1};board[2]={kind:'orchard',level:1};board[5]={kind:'hive',level:1};const irrigated=calcGrid(board);board[0]=null;const dry=calcGrid(board);assert.ok(irrigated.values[1]>dry.values[1]);assert.ok(irrigated.values[2]>dry.values[2]);assert.ok(irrigated.values[5]>dry.values[5]);
});
test('grid: pollution removes downstream yield and replacement restores it',()=>{
 const board=Array(9).fill(null);board[1]={kind:'forest',level:1};board[2]={kind:'orchard',level:1};board[5]={kind:'hive',level:1};board[0]={kind:'kiln',level:1};const dirty=calcGrid(board);board[0]={kind:'pond',level:1};const clean=calcGrid(board);assert.ok(clean.values[1]>dirty.values[1]);assert.ok(clean.values[5]>dirty.values[5]);
});
test('grid: legal whole games terminate after exactly twelve choices and can win without a fixed draw',()=>{
 const results=[];for(const seed of [281026,72,918,2026,1]){const s=newGrid(seed);s.phase='playing';for(let turn=0;turn<12;turn++){let best=null;for(const k of s.offers)for(let i=0;i<9;i++){const p=projectedGrid(s,i,k);if(p&&(!best||p.total>best.p.total))best={k,i,p};}assert.ok(placeGrid(s,best.i,best.k));}assert.equal(s.history.length,12);assert.equal(s.turn,12);assert.equal(placeGrid(s,0,s.offers[0]),null);results.push(s.score);}assert.ok(results.every(n=>n>=320),JSON.stringify(results));console.log('Greedy legal full-game totals:',results.join(', '));
});
test('grid: unavailable cards and level-four upgrades cannot consume a turn',()=>{
 const s=newGrid(1);s.phase='playing';assert.equal(placeGrid(s,0,'hive'),null);s.board[0]={kind:'forest',level:3};assert.equal(placeGrid(s,0,'forest'),null);assert.equal(s.turn,0);assert.equal(s.score,0);
});
test('life: bridge can be built gradually and carried wood is not inherited',()=>{
 let s=newLife();s.phase='playing';s.wood=2;lifeAct(s,{type:'bridge'});assert.equal(s.world.bridge,1);retireLife(s);s=nextLife(s);assert.equal(s.wood,0);assert.equal(s.world.bridge,1);assert.equal(s.world.generation,2);assert.equal(lifeWalkable(s,460,350),false);s.phase='playing';s.wood=2;lifeAct(s,{type:'bridge'});lifeAct(s,{type:'bridge'});assert.equal(lifeWalkable(s,460,350),true);
});
test('life: lighthouse completion requires a tree planted by a prior generation',()=>{
 let s=newLife();s.phase='playing';lifeAct(s,{type:'plot',index:0});assert.equal(lifeAct(s,{type:'plot',index:0}),false);s.world.lighthouse=3;assert.equal(lifeAct(s,{type:'tower'}),false);retireLife(s);s=nextLife(s);s.phase='playing';assert.equal(lifeAct(s,{type:'plot',index:0}),true);assert.equal(s.light,true);assert.equal(lifeAct(s,{type:'tower'}),true);assert.equal(s.phase,'won');assert.equal(s.world.won,true);
});
test('life: sixty-second expiry preserves projects, new generation regrows wood, valid JSON resumes',()=>{
 let s=newLife();s.phase='playing';s.world.bridge=2;s.world.trees[0]=0;s.world.planted[0]=1;tickLife(s,61);assert.equal(s.phase,'between');s=nextLife(s);assert.equal(s.world.trees[0],1);const copy=JSON.parse(JSON.stringify(s.world));assert.equal(validLifeWorld(copy),true);assert.equal(newLife(copy).world.bridge,2);assert.equal(newLife(copy).world.planted[0],1);assert.equal(validLifeWorld({...copy,bridge:NaN}),false);assert.equal(validLifeWorld({...copy,planted:[99,null]}),false);
});
test('life: refreshing between lives keeps the handoff and advances only once',()=>{
 let s=newLife();s.phase='playing';lifeAct(s,{type:'plot',index:0});retireLife(s);const restored=newLife(JSON.parse(JSON.stringify(s.world)));assert.equal(restored.phase,'between');assert.deepEqual(restored.contributions,['种下一棵晨光树']);s=nextLife(restored);assert.equal(s.world.generation,2);assert.equal(s.phase,'ready');assert.equal(s.world.awaitingNext,false);assert.equal(nextLife(s).world.generation,2);
});
