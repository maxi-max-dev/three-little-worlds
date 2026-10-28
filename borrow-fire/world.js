export const AREAS=['灰烬外沿','输火回廊','炉心前庭'];
const wall=(x,y,w,h)=>({x,y,w,h});
const outer=[wall(65,305,90,24),wall(325,305,90,24)];
const corridor=[wall(155,260,26,170),wall(300,260,26,170)];
const pillars=[wall(100,310,65,28),wall(315,310,65,28)];
const node=(area,stage,name,enemies,next,walls=[],extra={})=>({area,stage,name,enemies,next,walls,interval:2.6,maxAlive:3,rewardText:'战斗 · 继续向中央炉前进',...extra});
export const NODES={
 a1:node(0,1,'外沿入口',['gun','gun','gun','gun','gun'],['a2s','a2r'],[],{interval:2.8,maxAlive:2}),
 a2s:node(0,2,'补给侧路',['gun','gun','gun','gun','gun'],['a3'],outer,{reward:'heal',rewardText:'较低压力 · 清房恢复1生命',interval:2.6,maxAlive:2}),
 a2r:node(0,2,'连射阵地',['gun','gun','gun','gun','gun','gun','gun'],['a3'],outer,{reward:'power',rewardText:'更多连射敌 · 永久火力+15%',interval:2.2,maxAlive:3}),
 a3:node(0,3,'暗屋外',['gun','gun','sniper','gun','gun','sniper'],['b1'],outer,{story:0,interval:2.5,maxAlive:3}),
 b1:node(1,1,'瞄准走廊',['sniper','gun','gun','sniper','gun','sniper'],['b2s','b2r'],pillars,{interval:2.8,maxAlive:3,rewardText:'新区域 · 掩体挡弹，瞄准线不是伤害'}),
 b2s:node(1,2,'宽阔输火道',['gun','sniper','gun','sniper','gun','gun'],['b3'],pillars,{reward:'heal',rewardText:'远程组合 · 清房恢复1生命',interval:2.6,maxAlive:3}),
 b2r:node(1,2,'狭窄检修道',['gun','charger','gun','sniper','charger','gun','gun'],['b3'],corridor,{reward:'power',rewardText:'冲撞预告后闪开 · 永久火力+15%',interval:2.8,maxAlive:3}),
 b3:node(1,3,'回流装置',['gun','charger','sniper','gun','charger','sniper','gun','gun'],['c1'],pillars,{story:1,interval:2.5,maxAlive:4}),
 c1:node(2,1,'炉心门廊',['gun','sniper','charger','gun','sniper','charger','gun'],['c2s','c2r'],pillars,{interval:2.4,maxAlive:4,rewardText:'炉心前庭 · 三类敌人混合'}),
 c2s:node(2,2,'修复平台',['gun','sniper','charger','gun','sniper','gun'],['c3'],outer,{reward:'heal',rewardText:'标准战斗 · 清房恢复1生命',interval:2.5,maxAlive:3}),
 c2r:node(2,2,'高压配电室',['gun','sniper','charger','gun','sniper','charger','gun','sniper','gun'],['c3'],corridor,{reward:'power',rewardText:'高压精英组合 · 永久火力+15%',interval:2.2,maxAlive:4}),
 c3:node(2,3,'守炉人',['boss'],[],[],{boss:true,rewardText:'两阶段守炉人 · 借弹打暴露的核心'})
};
