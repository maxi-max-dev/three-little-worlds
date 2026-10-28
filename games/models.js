export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function rng(seed){let a=seed|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export const LOOT={
 feather:{name:'风羽',weight:1,value:3,color:'#b8e4ee',description:'走得更快；总负重 ≤ 3 时可走上方风道'},
 bell:{name:'重钟',weight:4,value:7,color:'#e9b66d',description:'能敲开石闸；开路后也可以放下'},
 lamp:{name:'潮灯',weight:2,value:5,color:'#91dcc8',description:'驱散东岸的幽影，免受幽影碰撞'},
 pearl:{name:'月珠',weight:2,value:8,color:'#ebd9e8',description:'一颗值 8；也会占用你的负重'},
 heart:{name:'海之心',weight:3,value:18,color:'#f3a5a0',description:'深处的宝物，值 18；记得留出回程时间'}
};
export const LOOT_WALLS=[{x:25,y:28,w:875,h:25},{x:25,y:505,w:875,h:25},{x:25,y:28,w:25,h:500},{x:875,y:28,w:25,h:500},{x:180,y:270,w:100,h:32},{x:300,y:95,w:30,h:100},{x:650,y:320,w:125,h:30},{x:700,y:80,w:30,h:95}];
export function newLoot(){return {phase:'ready',time:90,x:128,y:420,bag:[],gate:false,hitCooldown:0,hits:0,score:0,items:[{id:'feather',x:205,y:170},{id:'bell',x:270,y:395},{id:'lamp',x:365,y:240},{id:'pearl',x:350,y:460},{id:'pearl',x:580,y:430},{id:'pearl',x:615,y:210},{id:'heart',x:815,y:120}],last:'先在近岸捡一件宝物，再决定往哪里走。'};}
export const lootWeight=s=>s.bag.reduce((n,o)=>n+LOOT[o.id].weight,0);
export const lootValue=s=>s.bag.reduce((n,o)=>n+LOOT[o.id].value,0);
export const hasLoot=(s,k)=>s.bag.some(o=>o.id===k);
export const lootSpeed=s=>(150+(hasLoot(s,'feather')?65:0))/(1+lootWeight(s)*.125);
export const inBoat=s=>Math.hypot(s.x-108,s.y-420)<55;
export function lootWalkable(s,x,y){
 if(x<64||x>862||y<66||y>492)return false;
 if(LOOT_WALLS.some(r=>x>r.x-10&&x<r.x+r.w+10&&y>r.y-10&&y<r.y+r.h+10))return false;
 if(x>438&&x<528){
  if(y>346&&y<400&&s.gate)return true;
  if(y>165&&y<215&&hasLoot(s,'feather')&&lootWeight(s)<=3)return true;
  return false;
 }
 return true;
}
export function moveLoot(s,dx,dy,dt){if(s.phase!=='playing')return;const n=Math.hypot(dx,dy)||1,spd=lootSpeed(s)*dt;const x=s.x+dx/n*spd,y=s.y+dy/n*spd;if(lootWalkable(s,x,s.y))s.x=x;if(lootWalkable(s,s.x,y))s.y=y;}
export function lootInteract(s){
 if(s.phase!=='playing')return {type:'none'};
 if(inBoat(s)){
  if(!s.bag.length){s.last='空手回船？先带一件东西回来。';return {type:'empty'};}
  s.score=lootValue(s);s.phase='won';s.last='船离岸了。你带回了自己选择的东西。';return {type:'win'};
 }
 if(!s.gate&&dist(s,{x:454,y:373})<58){
  if(!hasLoot(s,'bell')){s.last='石闸挡路。带上近岸的重钟来敲开它。';return {type:'blocked'};}
  s.gate=true;s.last='石闸打开了！这条路会留下，钟可以放下。';return {type:'gate'};
 }
 const item=s.items.filter(o=>dist(s,o)<48).sort((a,b)=>dist(s,a)-dist(s,b))[0];
 if(!item){s.last='靠近宝物、石闸或归航的小船，再按 E。';return {type:'none'};}
 if(lootWeight(s)+LOOT[item.id].weight>7){s.last='装不下了。点背包中的物品放下，再决定。';return {type:'full'};}
 s.items.splice(s.items.indexOf(item),1);s.bag.push(item);s.last=`拿到${LOOT[item.id].name}。${LOOT[item.id].description}。`;return {type:'pickup',id:item.id};
}
export function dropLoot(s,i){if(s.phase!=='playing'||!s.bag[i])return false;const [o]=s.bag.splice(i,1);o.x=s.x;o.y=s.y;s.items.push(o);s.last=`放下了${LOOT[o.id].name}，你轻了一些。它还在原地。`;return true;}
export function lootTick(s,dt,t){
 if(s.phase!=='playing')return;
 s.time=Math.max(0,s.time-dt);s.hitCooldown=Math.max(0,s.hitCooldown-dt);
 if(!s.hitCooldown&&!hasLoot(s,'lamp')){
  const ghosts=lootGhosts(t);
  if(ghosts.some(g=>dist(s,g)<29)){
   s.hits++;s.hitCooldown=2.5;s.time=Math.max(0,s.time-5);s.last='幽影擦身而过，丢了 5 秒。潮灯能保护你。';
  }
 }
 if(s.time<=0){s.phase='lost';s.score=0;s.last='潮水封住了归路。这次的宝物没能带回。';}
}
export function lootGhosts(t){return [{x:630+Math.sin(t*.9)*60,y:270+Math.cos(t*.6)*70},{x:790+Math.cos(t*.75)*42,y:200+Math.sin(t*.8)*50}];}

export const TILES={
 pond:{name:'水塘',color:'#89c9de',note:'产 2 · 让相邻树林长得更好'},
 forest:{name:'树林',color:'#86ba91',note:'产 2 · 邻水 +2；供养果园与工坊'},
 orchard:{name:'果园',color:'#e7b383',note:'产 2 · 邻树加成，湿润树林更好'},
 hive:{name:'蜂房',color:'#ebc56e',note:'产 1 · 从相邻果园获得额外收成'},
 mill:{name:'工坊',color:'#a9b7ca',note:'产 2 · 每片相邻树林贡献其产量'},
 home:{name:'小屋',color:'#d8b0b5',note:'产 3 · 邻果园 +3，邻水 +2'},
 kiln:{name:'窑炉',color:'#c3937f',note:'产 8 · 每座相邻窑炉 +3；邻近树果蜂 −3'}
};
export const near=i=>[i%3?i-1:-1,i%3<2?i+1:-1,i>2?i-3:-1,i<6?i+3:-1].filter(n=>n>=0);
export function calcGrid(board){
 const values=Array(9).fill(0),details=Array(9).fill('');
 const around=(i,k)=>near(i).filter(j=>board[j]?.kind===k);
 const level=i=>board[i]?.level||1;
 for(let i=0;i<9;i++){
  const k=board[i]?.kind;if(!k)continue;
  if(k==='pond'){values[i]=2*level(i);details[i]='水塘滋养四邻';}
  if(k==='forest'){values[i]=(2+(around(i,'pond').length?2:0))*level(i);details[i]=around(i,'pond').length?'邻水，树林 +2':'树林基础收成';}
  if(k==='kiln'){values[i]=(8+around(i,'kiln').length*3)*level(i);details[i]='窑火使相邻树、果、蜂减产 3';}
 }
 for(let i=0;i<9;i++)if(board[i]?.kind==='forest'){const penalty=around(i,'kiln').length*3;values[i]=Math.max(0,values[i]-penalty);if(penalty)details[i]+=` · 窑火 −${penalty}`;}
 for(let i=0;i<9;i++){
  const k=board[i]?.kind;if(k==='orchard'){values[i]=(2+around(i,'forest').reduce((n,j)=>n+Math.ceil(values[j]/2),0))*level(i);values[i]=Math.max(0,values[i]-around(i,'kiln').length*3);details[i]=`树林带来的果实 +${around(i,'forest').reduce((n,j)=>n+Math.ceil(values[j]/2),0)}`;}
  if(k==='mill'){values[i]=(2+around(i,'forest').reduce((n,j)=>n+values[j],0))*level(i);details[i]='收成来自相邻树林的实际产量';}
  if(k==='home'){values[i]=(3+around(i,'orchard').length*3+(around(i,'pond').length?2:0))*level(i);details[i]='邻果园 +3，邻水 +2';}
 }
 for(let i=0;i<9;i++)if(board[i]?.kind==='hive'){const extra=around(i,'orchard').reduce((n,j)=>n+values[j],0);values[i]=Math.max(0,(1+extra)*level(i)-around(i,'kiln').length*3);details[i]=`相邻果园送来 +${extra}`;}
 return {values,details,total:values.reduce((a,b)=>a+b,0)};
}
export function gridOffers(seed,turn){const keys=Object.keys(TILES),r=rng(seed+turn*953),out=[];if(turn===0)return ['forest','home','kiln'];if(turn===1)return ['orchard','pond','mill'];if(turn===2)return ['hive','forest','home'];while(out.length<3){const k=keys[Math.floor(r()*keys.length)];if(!out.includes(k))out.push(k);}return out;}
export function newGrid(seed=Date.now()%100000){const board=Array(9).fill(null);board[4]={kind:'pond',level:1};return {phase:'ready',seed,board,turn:0,score:0,target:320,offers:gridOffers(seed,0),selected:null,history:[]};}
export function projectedGrid(s,idx,kind){const b=s.board.map(o=>o?{...o}:null);if(b[idx]?.kind===kind){if(b[idx].level>=3)return null;b[idx].level++;}else b[idx]={kind,level:1};return {board:b,...calcGrid(b)};}
export function placeGrid(s,idx,choice){
 if(s.phase!=='playing'||idx<0||idx>8||!s.offers.includes(choice))return null;
 const p=projectedGrid(s,idx,choice);if(!p)return null;
 s.board=p.board;s.score+=p.total;s.turn++;s.history.push(p.total);s.selected=null;
 if(s.turn===12)s.phase=s.score>=s.target?'won':'lost';else s.offers=gridOffers(s.seed,s.turn);
 return p;
}

export const LIFE_TREES=[{x:205,y:170},{x:295,y:115},{x:305,y:280},{x:180,y:305},{x:650,y:410},{x:730,y:350},{x:790,y:260}];
export const LIFE_PLOTS=[{x:240,y:420},{x:350,y:210}];
export function newLifeWorld(){return {version:1,generation:1,bridge:0,lighthouse:0,trees:LIFE_TREES.map(()=>2),planted:[null,null],history:[],won:false,awaitingNext:false};}
export function validLifeWorld(w){return w&&w.version===1&&Number.isInteger(w.generation)&&w.generation>=1&&w.generation<=10000&&Number.isInteger(w.bridge)&&w.bridge>=0&&w.bridge<=3&&Number.isInteger(w.lighthouse)&&w.lighthouse>=0&&w.lighthouse<=3&&Array.isArray(w.trees)&&w.trees.length===7&&w.trees.every(n=>Number.isInteger(n)&&n>=0&&n<=2)&&Array.isArray(w.planted)&&w.planted.length===2&&w.planted.every(n=>n===null||Number.isInteger(n)&&n>=1&&n<=w.generation)&&Array.isArray(w.history)&&typeof w.won==='boolean';}
export function newLife(w=newLifeWorld()){return {world:w,phase:w.won?'won':w.awaitingNext?'between':'ready',x:130,y:410,time:60,wood:0,light:false,action:0,workTarget:null,contributions:w.awaitingNext?[...(w.history.at(-1)?.actions||[])]:[],last:w.generation>1?'看看前人种下的树，收下晨光，再走过他们修的桥。':'先去圆形土圃种树，再为下一代修一座桥。'};}
export function lifeWalkable(s,x,y){if(x<65||x>860||y<75||y>480)return false;if(x>414&&x<505&&!(s.world.bridge>=3&&y>315&&y<381))return false;return true;}
export function moveLife(s,dx,dy,dt){if(s.phase!=='playing')return;const n=Math.hypot(dx,dy)||1,spd=155*dt,x=s.x+dx/n*spd,y=s.y+dy/n*spd;if(lifeWalkable(s,x,s.y))s.x=x;if(lifeWalkable(s,s.x,y))s.y=y;}
export function lifeNearby(s){
 const choices=[];
 LIFE_PLOTS.forEach((p,i)=>{if(dist(s,p)<53)choices.push({type:'plot',index:i,d:dist(s,p),...p});});
 LIFE_TREES.forEach((p,i)=>{if(s.world.trees[i]>0&&dist(s,p)<51)choices.push({type:'tree',index:i,d:dist(s,p),...p});});
 if(dist(s,{x:404,y:348})<59)choices.push({type:'bridge',d:dist(s,{x:404,y:348}),x:404,y:348});
 if(dist(s,{x:784,y:125})<65)choices.push({type:'tower',d:dist(s,{x:784,y:125}),x:784,y:125});
 return choices.sort((a,b)=>a.d-b.d)[0]||null;
}
export function lifeAct(s,target=lifeNearby(s)){
 if(s.phase!=='playing'||!target)return false;
 const w=s.world;
 if(target.type==='plot'){
  if(w.planted[target.index]===null){w.planted[target.index]=w.generation;s.contributions.push('种下一棵晨光树');s.last='种下了。它会在下一代长成，留下点亮灯塔的光。';return true;}
  if(w.planted[target.index]<w.generation&&!s.light){s.light=true;s.last='你收到了前人留下的晨光。把它带到东岸的灯塔。';return true;}
  s.last=s.light?'你已带着晨光，去东岸吧。':'小树还没长成。下一代会看到它。';return false;
 }
 if(target.type==='tree'){
  if(s.wood>=3){s.last='最多带 3 根木头。先送去修桥或修灯塔。';return false;}
  if(w.trees[target.index]<=0)return false;w.trees[target.index]--;s.wood++;s.last=`拾得木头 ${s.wood}/3。桥与灯塔都需要它。`;return true;
 }
 if(target.type==='bridge'){
  if(w.bridge>=3){s.last='桥已经修好，每一代都可以从这里过河。';return false;}
  if(!s.wood){s.last='桥需要 3 根木头；可以一次送一根，进度会留下。';return false;}
  s.wood--;w.bridge++;s.contributions.push('为桥添一根木头');s.last=w.bridge===3?'桥接通了两岸。下一代不用再修一次。':`桥已修 ${w.bridge}/3，哪怕生命结束，进度也会留下。`;return true;
 }
 if(target.type==='tower'){
  if(w.lighthouse<3){if(!s.wood){s.last=`灯塔已修 ${w.lighthouse}/3。带木头来，进度会保留。`;return false;}s.wood--;w.lighthouse++;s.contributions.push('修缮灯塔');s.last=`灯塔已修 ${w.lighthouse}/3。${w.lighthouse===3?'用前人留下的晨光点亮它。':''}`;return true;}
  if(!s.light){s.last='灯塔修好了，还需要上一代种下的晨光。';return false;}
  w.won=true;s.phase='won';s.contributions.push('点亮灯塔');w.history.push({generation:w.generation,actions:[...s.contributions]});s.last='你的一生结束不了所有事，但可以接住别人留下的光。';return true;
 }
 return false;
}
export function retireLife(s){if(s.phase!=='playing')return;const w=s.world;w.history.push({generation:w.generation,actions:[...s.contributions]});w.history=w.history.slice(-30);w.awaitingNext=true;s.phase='between';s.action=0;}
export function nextLife(s){if(s.phase!=='between')return s;s.world.generation++;s.world.awaitingNext=false;s.world.trees=s.world.trees.map(n=>Math.min(2,n+1));return newLife(s.world);}
export function tickLife(s,dt){if(s.phase!=='playing')return;s.time=Math.max(0,s.time-dt);if(s.time===0)retireLife(s);}
