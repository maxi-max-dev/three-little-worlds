// Physical input outlives game state. Each panel has a separate generation.
export class InputGate {
  constructor(){this.held=new Set();this.generation=0;this.pending=new Map();this.active=false;this.ready=false;}
  open(now,delay=1200){this.generation++;this.active=true;this.ready=false;this.until=now+delay;this.pending.clear();}
  close(){this.generation++;this.active=false;this.ready=false;this.pending.clear();}
  tick(now){if(this.active&&!this.ready&&now>=this.until&&!this.held.size)this.ready=true;return this.ready;}
  down(id,target,now,repeat=false){const fresh=!this.held.has(id);this.tick(now);this.held.add(id);if(fresh&&!repeat&&this.ready&&target)this.pending.set(id,{target,generation:this.generation});}
  up(id,target){this.held.delete(id);const p=this.pending.get(id);this.pending.delete(id);return !!(this.active&&this.ready&&p&&p.generation===this.generation&&p.target===target);}
  cancel(id){this.held.delete(id);this.pending.delete(id);}
  suspend(now){const delay=Math.max(300,(this.until||0)-now);this.held.clear();this.open(now,delay);}
}
export function protectPanel(root,{delay=1200,onSuspend=()=>{}}={}){
  const gate=new InputGate();let actions=new Map(),status=null;
  const now=()=>performance.now(),control=e=>e.target.closest?.('button');
  function refresh(){gate.tick(now());for(const [b] of actions)b.disabled=!gate.ready||b.dataset.unavailable==='true';if(status)status.textContent=gate.ready?'点选预览，可改选；确认后继续':gate.held.size?'先松手，再选择':`休息一下 · ${Math.max(0,(gate.until-now())/1000).toFixed(1)} 秒后可选`;}
  window.addEventListener('pointerdown',e=>{gate.down('p'+e.pointerId,control(e),now());refresh();},true);
  window.addEventListener('pointermove',e=>{const id='p'+e.pointerId,p=gate.pending.get(id);if(p&&document.elementFromPoint(e.clientX,e.clientY)?.closest('button')!==p.target)gate.pending.delete(id);},true);
  window.addEventListener('pointerup',e=>{let b=control(e);if(b){const r=b.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)b=null;}const ok=gate.up('p'+e.pointerId,b);if(ok&&!b.disabled)actions.get(b)?.();refresh();},true);
  window.addEventListener('pointercancel',e=>{gate.cancel('p'+e.pointerId);onSuspend();refresh();},true);
  window.addEventListener('keydown',e=>{if(e.code==='Tab')return;const b=control(e);gate.down('k'+e.code,(e.code==='Enter'||e.code==='Space')?b:null,now(),e.repeat);if(gate.active&&(e.code==='Enter'||e.code==='Space'))e.preventDefault();refresh();},true);
  window.addEventListener('keyup',e=>{const b=control(e),ok=gate.up('k'+e.code,b);if(gate.active&&(e.code==='Enter'||e.code==='Space'))e.preventDefault();if(ok&&!b.disabled)actions.get(b)?.();refresh();},true);
  root.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  function suspend(){gate.suspend(now());onSuspend();refresh();}
  window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
  return {gate,refresh,open(bindings,wait=delay){actions=new Map(bindings);status=root.querySelector('[data-gate-status]');gate.open(now(),wait);refresh();},close(){actions.clear();gate.close();}};
}
