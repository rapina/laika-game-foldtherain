import { APP_CONFIG } from '../appConfig'
import type { GameCallbacks, GameRuntime } from './types'

export const RAIN_PER_NIGHT = 72
export const NIGHT_REQUIREMENTS = [5, 5, 6, 6, 7, 8, 8, 9] as const
const W = APP_CONFIG.designWidth, H = APP_CONFIG.designHeight
const PAPER = '#101a36', SILVER = '#bed3df', CORAL = '#ff806f', MINT = '#71d8b0'
export type Point = { x:number; y:number }
export type Fold = { a:Point; b:Point; born:number; fading?:number }
export type Block = { x:number; y:number; w:number; h:number }
export type Pot = { x:number; y:number; need:number; water:number; bloomed:boolean }

export function segmentHitsBlock(a:Point,b:Point,r:Block):boolean {
    const inside=(p:Point)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h
    if(inside(a)||inside(b)) return true
    const cross=(p:Point,q:Point,u:Point,v:Point)=>{
        const d=(q.x-p.x)*(v.y-u.y)-(q.y-p.y)*(v.x-u.x); if(Math.abs(d)<.001)return false
        const t=((u.x-p.x)*(v.y-u.y)-(u.y-p.y)*(v.x-u.x))/d
        const s=((u.x-p.x)*(q.y-p.y)-(u.y-p.y)*(q.x-p.x))/d
        return t>=0&&t<=1&&s>=0&&s<=1
    }
    const p1={x:r.x,y:r.y},p2={x:r.x+r.w,y:r.y},p3={x:r.x+r.w,y:r.y+r.h},p4={x:r.x,y:r.y+r.h}
    return cross(a,b,p1,p2)||cross(a,b,p2,p3)||cross(a,b,p3,p4)||cross(a,b,p4,p1)
}
export function addFold(folds:Fold[],fold:Fold):Fold[]{
    const next=folds.map(f=>({...f}))
    if(next.filter(f=>!f.fading).length>=3) next.filter(f=>!f.fading).sort((a,b)=>a.born-b.born)[0].fading=.8
    next.push(fold); return next
}
export function waterPot(pot:Pot):Pot {
    if(pot.bloomed)return pot
    const water=pot.water+1; return {...pot,water,bloomed:water>=pot.need}
}
export function foldCapacityBonus(activeFolds:number):number {
    return Math.max(0, 3-activeFolds)*20
}

type Drop={x:number;y:number;px:number;py:number;vx:number;vy:number;age:number;routed:boolean}
type Steam={x:number;y:number;life:number}
const nights=[
 {pots:[95],roofs:[[38,555,130,22]],chimneys:[]},
 {pots:[74,306],roofs:[[24,565,140,20],[226,530,140,20]],chimneys:[]},
 {pots:[82,308],roofs:[[28,555,135,20],[228,555,135,20]],chimneys:[195]},
 {pots:[60,195,330],roofs:[[18,600,110,20],[140,535,110,20],[263,585,110,20]],chimneys:[]},
 {pots:[68,200,322],roofs:[[18,560,105,20],[143,602,112,20],[275,540,96,20]],chimneys:[137]},
 {pots:[70,194,319],roofs:[[22,590,105,20],[140,530,108,20],[269,590,102,20]],chimneys:[132,258]},
 {pots:[49,145,245,342],roofs:[[12,575,78,20],[108,530,78,20],[207,585,78,20],[304,540,74,20]],chimneys:[97]},
 {pots:[48,145,245,342],roofs:[[10,585,80,20],[106,535,80,20],[205,590,80,20],[302,542,78,20]],chimneys:[96,294]},
]

class RainAudio {
 private ctx:AudioContext|null=null; private rain:AudioBufferSourceNode|null=null
 unlock(){if(this.ctx)return;const c=new AudioContext();this.ctx=c;const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0)
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*.12
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;s.loop=true;f.type='highpass';f.frequency.value=3600;g.gain.value=.045;s.connect(f).connect(g).connect(c.destination);s.start();this.rain=s}
 tone(freq:number,duration=.13,volume=.08){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),n=this.ctx.currentTime;o.frequency.value=freq;g.gain.setValueAtTime(volume,n);g.gain.exponentialRampToValueAtTime(.001,n+duration);o.connect(g).connect(this.ctx.destination);o.start();o.stop(n+duration)}
 fold(){this.tone(115,.18,.06)} drip(){this.tone(410,.09,.035)}
 bloom(index:number){[880,1108,1320].forEach((f,i)=>setTimeout(()=>this.tone(f+index*18,.32,.075),i*85))}
 destroy(){try{this.rain?.stop();this.ctx?.close()}catch{/* closed */}}
}

export class SampleGame implements GameRuntime {
 private canvas!:HTMLCanvasElement;private ctx!:CanvasRenderingContext2D;private callbacks:GameCallbacks|null=null
 private ro:ResizeObserver|null=null;private raf=0;private last=0;private night=0;private drops:Drop[]=[];private pots:Pot[]=[]
 private folds:Fold[]=[];private steam:Steam[]=[];private emitted=0;private emitClock=0;private settle=0;private shake=0
 private message=0;private score=0;private over=false;private complete=false;private pointer:Point|null=null;private hover:Point|null=null
 private audio=new RainAudio();private locale='en'

 async mount(container:HTMLElement,callbacks:GameCallbacks):Promise<void>{
  this.callbacks=callbacks;const q=new URLSearchParams(location.search).get('lang');this.locale=q||(navigator.language.startsWith('ko')?'ko':'en')
  this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d')!;container.appendChild(this.canvas)
  const fit=()=>{const s=Math.min(container.clientWidth/W,container.clientHeight/H),d=Math.max(1,devicePixelRatio||1)
   const bw=Math.ceil(W*s*d),bh=Math.ceil(H*s*d);if(this.canvas.width!==bw||this.canvas.height!==bh){this.canvas.width=bw;this.canvas.height=bh;this.ctx=this.canvas.getContext('2d')!;this.ctx.setTransform(bw/W,0,0,bh/H,0,0)}
   this.canvas.style.width=`${W*s}px`;this.canvas.style.height=`${H*s}px`}
  fit();this.ro=new ResizeObserver(fit);this.ro.observe(container);this.startNight(0)
  this.canvas.addEventListener('pointerdown',this.down);this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerup',this.up);this.canvas.addEventListener('pointercancel',this.cancel)
  ;(globalThis as any).__gameDesignSize={w:W,h:H};(globalThis as any).__forceGameOver=()=>this.finish()
  this.last=performance.now();this.raf=requestAnimationFrame(this.loop)
 }
 private startNight(index:number){this.night=index;const cfg=nights[index],need=NIGHT_REQUIREMENTS[index]
  this.pots=cfg.pots.map((x,i)=>({x,y:cfg.roofs[i][1]-13,need,water:0,bloomed:false}));this.drops=[];this.folds=[];this.steam=[];this.emitted=0;this.emitClock=0;this.settle=0;this.message=1.7}
 private pos(e:PointerEvent):Point{const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
 private down=(e:PointerEvent)=>{this.audio.unlock();if(this.complete){this.complete=false;this.over=false;this.score=0;this.startNight(0);return}
  this.canvas.setPointerCapture(e.pointerId);const p=this.pos(e),hit=this.folds.findIndex(f=>this.dist(p,f.a,f.b)<18&&!f.fading)
  if(hit>=0){this.folds[hit].fading=.35;this.audio.fold();return}this.pointer=p;this.hover=p}
 private move=(e:PointerEvent)=>{if(this.pointer)this.hover=this.pos(e)}
 private cancel=()=>{this.pointer=null;this.hover=null}
 private up=(e:PointerEvent)=>{if(!this.pointer)return;const b=this.pos(e),a=this.pointer;this.cancel();if(Math.hypot(b.x-a.x,b.y-a.y)<42)return
  if(this.blocks().some(r=>segmentHitsBlock(a,b,r))||a.y<150||b.y<150){this.shake=.35;this.audio.tone(75,.12,.09);return}
  this.folds=addFold(this.folds,{a,b,born:performance.now()});this.audio.fold()}
 private blocks():Block[]{const cfg=nights[this.night];return[...cfg.roofs.map(r=>({x:r[0],y:r[1],w:r[2],h:H-r[1]})),...this.pots.map(p=>({x:p.x-16,y:p.y-18,w:32,h:30}))]}
 private dist(p:Point,a:Point,b:Point){const l=(b.x-a.x)**2+(b.y-a.y)**2,t=Math.max(0,Math.min(1,((p.x-a.x)*(b.x-a.x)+(p.y-a.y)*(b.y-a.y))/l));return Math.hypot(p.x-a.x-t*(b.x-a.x),p.y-a.y-t*(b.y-a.y))}
 private loop=(now:number)=>{const dt=Math.min(.034,(now-this.last)/1000);this.last=now;this.update(dt);this.draw();this.raf=requestAnimationFrame(this.loop)}
 private update(dt:number){if(this.over)return;this.message-=dt;this.shake-=dt;this.folds.forEach(f=>{if(f.fading)f.fading-=dt});this.folds=this.folds.filter(f=>f.fading===undefined||f.fading>0)
  if(this.emitted<RAIN_PER_NIGHT){this.emitClock+=dt;while(this.emitClock>.19&&this.emitted<RAIN_PER_NIGHT){this.emitClock-=.19;const cols=[34,78,122,166,210,254,298,342],x=cols[(this.emitted*5+this.night*3)%cols.length];this.drops.push({x,y:139,px:x,py:139,vx:0,vy:155,age:0,routed:false});this.emitted++}}
  const cfg=nights[this.night]
  for(const d of this.drops){d.px=d.x;d.py=d.y;d.age+=dt;d.vy+=210*dt;d.x+=d.vx*dt;d.y+=d.vy*dt
   for(const f of this.folds){if(f.fading||d.routed)continue;const lo=Math.min(f.a.x,f.b.x)-3,hi=Math.max(f.a.x,f.b.x)+3;if(d.x>=lo&&d.x<=hi){const t=(d.x-f.a.x)/(f.b.x-f.a.x||.001),fy=f.a.y+(f.b.y-f.a.y)*t;if(d.py<=fy&&d.y>=fy){const target=Math.hypot(d.x-f.a.x,d.y-f.a.y)<Math.hypot(d.x-f.b.x,d.y-f.b.y)?f.a:f.b;d.vx=(target.x-d.x)*4.2;d.vy=28;d.y=fy-2;d.routed=true}}}
   for(const cx of cfg.chimneys)if(d.y>485&&d.y<610&&Math.abs(d.x-cx)<11){this.steam.push({x:cx,y:d.y,life:1.4});d.age=99}
   for(let i=0;i<this.pots.length;i++){const p=this.pots[i];if(!p.bloomed&&d.py<=p.y&&d.y>=p.y&&Math.abs(d.x-p.x)<17){const next=waterPot(p);this.pots[i]=next;d.age=99;this.audio.drip();if(next.bloomed){this.score+=100;this.audio.bloom(i)}}}
   if(d.routed&&d.vy>120)d.routed=false}
  this.drops=this.drops.filter(d=>d.y<H+30&&d.age<8);this.steam.forEach(s=>{s.life-=dt;s.y-=8*dt});this.steam=this.steam.filter(s=>s.life>0)
  if(this.emitted===RAIN_PER_NIGHT&&this.drops.length===0){this.settle+=dt;if(this.settle>1.2){if(this.pots.every(p=>p.bloomed)){this.score+=foldCapacityBonus(this.folds.filter(f=>!f.fading).length);if(this.night===7)this.finish();else this.startNight(this.night+1)}else this.startNight(this.night)}}}
 private finish(){if(this.over)return;this.complete=true;this.over=true;(globalThis as any).__gameOverUiBoxes=[{name:'final-title',x:35,y:300,w:320,h:100},{name:'restart',x:70,y:650,w:250,h:55}];this.callbacks?.onGameOver({score:this.score,phase:8})}
 private draw(){const c=this.ctx,cfg=nights[this.night];c.save();c.clearRect(0,0,W,H);c.fillStyle=PAPER;c.fillRect(0,0,W,H);if(this.shake>0)c.translate(Math.sin(performance.now()*.08)*5,0)
  c.globalAlpha=.08;c.strokeStyle='#dfe8ef';for(let y=0;y<H;y+=7){c.beginPath();c.moveTo(0,y+Math.sin(y)*2);c.lineTo(W,y);c.stroke()}c.globalAlpha=1
  const grad=c.createLinearGradient(0,0,0,170);grad.addColorStop(0,'#17274c');grad.addColorStop(1,PAPER);c.fillStyle=grad;c.fillRect(0,0,W,180);c.fillStyle='#25375d'
  for(let x=22;x<W;x+=55){c.beginPath();c.ellipse(x,102+(x%3)*5,52,30,0,0,Math.PI*2);c.fill()}
  c.fillStyle=SILVER;c.font='11px Galmuri11';c.textAlign='left';c.fillText(`${this.locale==='ko'?'밤':'NIGHT'} ${this.night+1} / 8`,20,35);c.textAlign='right';c.fillText(`${this.locale==='ko'?'점수':'SCORE'} ${this.score}`,W-20,54);c.textAlign='center';c.font='bold 17px Galmuri14';c.fillText(this.locale==='ko'?'비를 접는 밤':'FOLD THE RAIN',W/2,69);c.font='10px Galmuri11';c.fillStyle='#7388a5';c.fillText(this.locale==='ko'?'빈 곳을 드래그 · 선을 탭해 펼치기':'DRAG EMPTY SPACE · TAP A FOLD',W/2,92)
  c.fillStyle='#384866';for(let i=0;i<3;i++)c.fillRect(332+i*13,28,8,3);c.fillStyle=MINT;for(let i=0;i<3-this.folds.filter(f=>!f.fading).length;i++)c.fillRect(332+i*13,28,8,3)
  for(const r of cfg.roofs){c.fillStyle='#0a1328';c.fillRect(r[0],r[1]+8,r[2],H-r[1]);c.fillStyle='#1d2a48';c.beginPath();c.moveTo(r[0]-8,r[1]+8);c.lineTo(r[0]+r[2]/2,r[1]-18);c.lineTo(r[0]+r[2]+8,r[1]+8);c.closePath();c.fill();c.strokeStyle='#050b18';c.lineWidth=3;c.stroke();c.fillStyle='#d2a06c';for(let wx=r[0]+18;wx<r[0]+r[2]-8;wx+=34)c.fillRect(wx,r[1]+42,9,14)}
  for(const x of cfg.chimneys){c.fillStyle='#080f20';c.fillRect(x-8,485,16,73);c.strokeStyle='#3c4b67';c.strokeRect(x-8,485,16,73)}
  for(let i=0;i<this.pots.length;i++){const p=this.pots[i];c.fillStyle=p.bloomed?(i%2?MINT:CORAL):'#9c675d';c.beginPath();c.moveTo(p.x-13,p.y);c.lineTo(p.x+13,p.y);c.lineTo(p.x+9,p.y+22);c.lineTo(p.x-9,p.y+22);c.closePath();c.fill()
   if(p.bloomed){c.strokeStyle=MINT;c.lineWidth=2;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x,p.y-25);c.stroke();for(let a=0;a<5;a++){c.fillStyle=i%2?MINT:CORAL;c.beginPath();c.ellipse(p.x+Math.cos(a*1.256)*8,p.y-28+Math.sin(a*1.256)*8,5,3,a,0,Math.PI*2);c.fill()}}else{c.fillStyle=SILVER;c.font='9px Galmuri11';c.textAlign='center';c.fillText(`${p.water}/${p.need}`,p.x,p.y-8)}}
  c.lineCap='round';for(const f of this.folds){c.globalAlpha=f.fading?Math.max(0,f.fading/.8):1;c.strokeStyle='#f3f6ef';c.lineWidth=7;c.beginPath();c.moveTo(f.a.x,f.a.y);c.lineTo(f.b.x,f.b.y);c.stroke();c.strokeStyle='#8da7bd';c.lineWidth=2;c.stroke();c.globalAlpha=1}
  if(this.pointer&&this.hover){c.strokeStyle='#eaf5f4';c.lineWidth=3;c.setLineDash([7,6]);c.beginPath();c.moveTo(this.pointer.x,this.pointer.y);c.lineTo(this.hover.x,this.hover.y);c.stroke();c.setLineDash([])}
  c.strokeStyle=SILVER;c.lineWidth=2;for(const d of this.drops){c.globalAlpha=.45+Math.min(.5,d.vy/400);c.beginPath();c.moveTo(d.x,d.y-8);c.lineTo(d.x-d.vx*.015,d.y);c.stroke()}c.globalAlpha=1
  for(const s of this.steam){c.globalAlpha=s.life/2;c.fillStyle='#d7e3e8';c.beginPath();c.arc(s.x,s.y,32+(1.4-s.life)*24,0,Math.PI*2);c.fill()}c.globalAlpha=1
  c.fillStyle='#7486a0';c.font='10px Galmuri11';c.textAlign='center';c.fillText(`${this.emitted} / ${RAIN_PER_NIGHT}`,W/2,820)
  if(this.message>0){c.globalAlpha=Math.min(1,this.message);c.fillStyle='rgba(7,14,31,.8)';c.fillRect(62,354,266,74);c.fillStyle='#e4edf0';c.font='bold 15px Galmuri14';c.fillText(this.locale==='ko'?`${this.night+1}번째 밤`:`NIGHT ${this.night+1}`,W/2,383);c.font='10px Galmuri11';c.fillText(this.locale==='ko'?'모든 화분을 깨워 주세요':'WAKE EVERY ROOFTOP POT',W/2,408);c.globalAlpha=1}
  if(this.complete){c.fillStyle='rgba(5,10,24,.88)';c.fillRect(0,0,W,H);c.fillStyle=MINT;c.font='bold 26px Galmuri14';c.textAlign='center';c.fillText(this.locale==='ko'?'여덟 밤이 피었습니다':'EIGHT NIGHTS IN BLOOM',W/2,340);c.fillStyle=CORAL;c.font='46px serif';c.fillText('✦  ❀  ✦',W/2,415);c.fillStyle=SILVER;c.font='11px Galmuri11';c.fillText(this.locale==='ko'?'화면을 눌러 다시 접기':'TAP TO FOLD AGAIN',W/2,690)}
  c.restore()}
 destroy(){cancelAnimationFrame(this.raf);this.ro?.disconnect();this.audio.destroy();this.canvas?.removeEventListener('pointerdown',this.down);this.canvas?.removeEventListener('pointermove',this.move);this.canvas?.removeEventListener('pointerup',this.up);this.canvas?.remove();delete(globalThis as any).__forceGameOver}
 getDebugState():Record<string,unknown>{return{over:this.over,score:this.score,night:this.night+1,emitted:this.emitted,folds:this.folds.length,bloomed:this.pots.filter(p=>p.bloomed).length}}
}
