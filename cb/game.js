(function(root){
'use strict';
const data=typeof module!=='undefined'?require('./levels.js'):root;
class BlastGame {
 constructor(level){
  this.level=level;this.foods=data.makeFoods(level);this.total=this.foods.reduce((n,f)=>n+f.hp,0);
  this.lanes=level.lanes.map((lane,c)=>lane.map((color,i)=>({id:`${c}-${i}`,color,left:20,tier:1})));
  this.seats=Array(5).fill(null);this.state='playing';this.eaten=0;this.served=0;this.merges=0;this.combo=0;this.bestCombo=0;this.sinceBite=0;this.clock=0;this.elapsed=0;this.stall=0;this.events=[];this.reason='';
 }
 get speed(){return this.combo>=150?2:this.combo>=80?1.5:this.combo>=30?1.2:1;}
 get remaining(){return this.foods.reduce((n,f)=>n+f.hp,0);}
 get visibleColors(){return [...new Set(this.exposed().map(f=>f.color))];}
 occupied(x,y,except){return this.foods.find(f=>f!==except&&x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h);}
 settle(){
  let moving=true;
  while(moving){moving=false;for(const f of [...this.foods].sort((a,b)=>a.y-b.y)){
   while(f.y>0){let blocked=false;for(let x=f.x;x<f.x+f.w;x++)if(this.occupied(x,f.y-1,f)){blocked=true;break;}
    if(blocked)break;f.y--;moving=true;
   }
  }}
 }
 exposed(){
  const seen=new Map();for(let x=0;x<10;x++){
   const f=this.foods.filter(f=>x>=f.x&&x<f.x+f.w).sort((a,b)=>a.y-b.y)[0];if(f)seen.set(f.id,f);
  }return [...seen.values()];
 }
 admit(lane){
  if(this.state!=='playing'||!this.lanes[lane]?.length)return false;
  const slot=this.seats.indexOf(null);if(slot<0){this.events.push({type:'full'});return false;}
  const guest=this.lanes[lane].shift();this.seats[slot]=guest;this.events.push({type:'admit',slot,color:guest.color});
  this.merge();this.stall=0;this.check();return true;
 }
 merge(){
  for(let color=0;color<data.TYPES.length;color++){
   const slots=this.seats.map((g,i)=>g&&g.color===color?i:-1).filter(i=>i>=0);
   if(slots.length<3)continue;
   const group=slots.slice(0,3);const guests=group.map(i=>this.seats[i]);const target=group[0];
   const merged={id:guests[0].id,color,left:guests.reduce((n,g)=>n+g.left,0),tier:Math.max(...guests.map(g=>g.tier))+1};
   for(const slot of group)this.seats[slot]=null;this.seats[target]=merged;
   this.merges++;this.combo+=10;this.bestCombo=Math.max(this.bestCombo,this.combo);this.sinceBite=0;
   this.events.push({type:'merge',slot:target,slots:group,color,left:merged.left});
  }
 }
 check(){
  if(!this.foods.length){this.state='won';this.events.push({type:'won'});return;}
  const possible=this.exposed().some(f=>this.seats.some(g=>g&&g.color===f.color));
  if(possible){this.stall=0;return;}
  if(this.seats.every(Boolean))this.reason='餐位已满，五位客人都吃不到当前底层料理。';
  else if(this.lanes.every(q=>!q.length))this.reason='候客已用完，桌上客人无法吃掉剩余料理。';
  else {this.stall=0;this.reason='';return;}
  if(this.stall>=2){this.state='lost';this.events.push({type:'lost'});}
 }
 tick(dt){
  if(this.state!=='playing')return;dt=Math.max(0,Math.min(dt,.1));this.elapsed+=dt;this.sinceBite+=dt;this.stall+=dt;
  if(this.sinceBite>2.5)this.combo=0;
  this.clock+=dt;
  const period=.27/this.speed;
  if(this.clock>=period){this.clock-=period;
   for(let slot=0;slot<5;slot++){
    const guest=this.seats[slot];if(!guest)continue;
    const exposed=this.exposed().filter(f=>f.color===guest.color);
    if(!exposed.length)continue;
    const food=exposed[(this.eaten+slot)%exposed.length];
    const from={x:food.x,y:food.y,w:food.w,h:food.h};
    food.hp--;guest.left--;this.eaten++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);this.sinceBite=0;this.stall=0;
    this.events.push({type:'bite',slot,color:guest.color,from,giant:food.w>1});
    if(food.hp===0){this.foods=this.foods.filter(f=>f!==food);this.settle();}
    if(guest.left===0){this.seats[slot]=null;this.served++;this.events.push({type:'depart',slot,color:guest.color});}
   }
  }
  this.check();
 }
}
if(typeof module!=='undefined'){module.exports={BlastGame};return;}
root.BlastGame=BlastGame;
const $=id=>document.getElementById(id);const canvas=$('scene'),ctx=canvas.getContext('2d');
ctx.scale(2,2);
let index=0,game,paused=false,last=0,flights=[],notices=[],bowls=[],time=0,hintEnabled=true,sound=false,audio,shownResult=false,helpWasPaused=false,viewY=new Map();
let saved={};try{saved=JSON.parse(localStorage.getItem('wicked-feast-blast-v2')||'{}');}catch{}
function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.7;ctx.stroke();}}
function text(str,x,y,size=13,color='#655449',align='center'){ctx.font=`600 ${size}px "Microsoft YaHei", sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(str,x,y);}
function drawFood(f,x,y,w,h,alpha=1){
 const t=data.TYPES[f.color];ctx.save();ctx.globalAlpha=alpha;
 rounded(x+1.5,y+1.5,w-3,h-3,5,t.color,t.ink);
 ctx.strokeStyle=t.ink;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+w*.2,y+h*.69);ctx.quadraticCurveTo(x+w*.5,y+h*.94,x+w*.8,y+h*.69);ctx.stroke();
 if(w>45){text(String(f.hp),x+w/2,y+h*.46,22,'#fff9ed');}
 else text(t.symbol,x+w/2,y+h*.4,11,t.ink);
 ctx.restore();
}
function drawGuest(g,x,y,r=22,back=false){
 const t=data.TYPES[g.color];ctx.save();
 if(g.color===0){rounded(x-r*.83,y-r*1.22,r*.6,r*.8,8,t.color,t.ink);rounded(x+r*.25,y-r*1.22,r*.6,r*.8,8,t.color,t.ink);}
 if(g.color===1){for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(x+sign*r*.65,y-r*.55);ctx.lineTo(x+sign*r*.66,y-r*1.36);ctx.lineTo(x+sign*r*.22,y-r*.67);ctx.fillStyle='#e9d6b1';ctx.fill();ctx.strokeStyle=t.ink;ctx.stroke();}}
 if(g.color===2){for(const sign of [-1,1]){ctx.beginPath();ctx.ellipse(x+sign*r*.67,y-r*.8,r*.3,r*.62,sign*.6,0,Math.PI*2);ctx.fillStyle=t.color;ctx.fill();ctx.strokeStyle=t.ink;ctx.stroke();}}
 if(g.color===3){rounded(x-4,y-r*1.3,8,13,3,'#8a9970','#607044');}
 rounded(x-r,y-r,r*2,r*1.9,r*.8,t.color,t.ink);
 if(!back){ctx.fillStyle=t.ink;for(const s of [-1,1]){ctx.beginPath();ctx.ellipse(x+s*r*.36,y-r*.1,2,3,0,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(x,y+r*.07,r*.2,0,Math.PI);ctx.strokeStyle=t.ink;ctx.stroke();}
 else {text(t.symbol,x,y,18,t.ink);}
 if(g.tier>1){text('♛',x,y-r-9,18,'#9b753c');}
 ctx.restore();
}
function ping(freq){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),gain=audio.createGain();o.connect(gain);gain.connect(audio.destination);o.frequency.value=freq;gain.gain.setValueAtTime(.025,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);o.start();o.stop(audio.currentTime+.1);}catch{}}
function load(n){index=Math.max(0,Math.min(data.LEVELS.length-1,n));game=new BlastGame(data.LEVELS[index]);paused=false;flights=[];notices=[];bowls=[];viewY=new Map();shownResult=false;time=0;$('result').close();$('help-dialog').close();$('level').value=index;$('pause').textContent='暂停';$('story').textContent=game.level.story;$('stage-tip').textContent=`${index+1} / ${data.LEVELS.length} · ${game.level.chapter||'开席入门'} · ${game.level.subtitle}`;update();}
function queueMarkup(){
 return game.lanes.map((lane,c)=>`<div class="lane"><button class="guest-button head" data-lane="${c}" ${!lane.length||paused||game.state!=='playing'?'disabled':''} aria-label="${lane[0]?`安排第${c+1}列${data.TYPES[lane[0].color].guest}入座`: '此列已空'}">${lane[0]?guestMarkup(lane[0],true):'<span class="empty">此列已空</span>'}</button><div class="followers">${lane.slice(1,4).map(g=>guestMarkup(g,false)).join('')||'<span class="empty">—</span>'}</div><small>${lane.length?`候客 ${lane.length} 位`:'候客结束'}</small></div>`).join('');
}
function guestMarkup(g,head){const t=data.TYPES[g.color];return `<span class="guest-icon t${g.color}" style="--body:${t.color};--ink:${t.ink}"><i></i><b>${t.symbol}</b><em>• ᴗ •</em></span>${head?`<span class="guest-name">${t.guest}</span><span class="appetite">20 口</span>`:''}`;}
let queueKey='';
function put(id,value){if($(id).textContent!==String(value))$(id).textContent=value;}
function update(){
 $('progress').max=game.total;$('progress').value=game.eaten;put('left',`${game.remaining} / ${game.total} 口`);put('combo',game.combo);put('speed',`×${game.speed}`);put('seat-count',`${game.seats.filter(Boolean).length}/5`);
 const key=game.lanes.map(q=>q.map(g=>g.id).join(',')).join('|')+paused+game.state;
 if(key!==queueKey){queueKey=key;$('queues').innerHTML=queueMarkup();}
 const t=game.visibleColors.map(c=>data.TYPES[c]);const chips=t.map(t=>`<span style="--chip:${t.color}">${t.symbol} ${t.name}</span>`).join('');if($('exposed').innerHTML!==chips)$('exposed').innerHTML=chips;
 const idle=!game.exposed().some(f=>game.seats.some(g=>g&&g.color===f.color));
 put('hint',paused?'已暂停，继续后再安排入座':game.state==='won'?'料理全部吃完，开席成功！':game.state==='lost'?game.reason:idle?'看底层口味，点击每列最前面的客人入座':'正在自动进食 · 留意后续队列，三位同类会合并');
 $('hint').classList.toggle('warning',idle&&game.seats.some(Boolean)&&game.state==='playing');
 $('exposed-row').hidden=!hintEnabled;
}
function events(){for(const e of game.events){
 if(e.type==='bite'){flights.push({...e,age:0});if(game.eaten%5===0)ping(360+e.color*90);}
 if(e.type==='merge'){notices.push({text:`合成大胃王 · ${e.left}口`,age:0,slot:e.slot});ping(660);}
 if(e.type==='full'){notices.push({text:'餐位满了，等待吃饱或合并',age:0,slot:2});}
 if(e.type==='depart'){notices.push({text:'吃饱离席',age:0,slot:e.slot});bowls.push({slot:e.slot,age:0});}
 }game.events.length=0;}
function draw(){
 ctx.clearRect(0,0,390,500);
 rounded(11,10,368,316,13,'#d9c5a4','#89705a');rounded(19,23,352,290,7,'#ece1cc');
 for(let y=0;y<12;y++){ctx.beginPath();ctx.moveTo(22,313-y*24);ctx.lineTo(368,313-y*24);ctx.strokeStyle='#dccfb9';ctx.lineWidth=1;ctx.stroke();}
 const exposedIds=new Set(game.exposed().map(f=>f.id));
 ctx.save();ctx.beginPath();ctx.rect(20,24,350,288);ctx.clip();
 for(const f of game.foods){let vy=viewY.has(f.id)?viewY.get(f.id):f.y;if(!paused)vy+=(f.y-vy)*.22;viewY.set(f.id,vy);const x=20+f.x*35,y=312-(vy+f.h)*24;drawFood(f,x,y,f.w*35,f.h*24);
  if(hintEnabled&&exposedIds.has(f.id)){ctx.strokeStyle='#fff9e9';ctx.lineWidth=2;ctx.strokeRect(x+4,y+4,f.w*35-8,f.h*24-8);}
 }ctx.restore();
 rounded(9,7,372,19,5,'#b1bfa1','#77866c');text('河 狸 料 理 货 架',195,17,10,'#53634d');
 const hidden=game.foods.filter(f=>f.y>=12).reduce((n,f)=>n+f.hp,0);if(hidden){rounded(255,32,104,22,8,'#fff7e8');text(`上层还有 ${hidden} 口`,307,43,10);}
 text('自动传菜 ↓',195,349,11,'#9a8975');
 // The small conveyor visibly receives empty bowls after diners leave.
 rounded(19,474,352,15,6,'#c7bfa9','#948b75');text('空碗回收 → 河狸清洗',195,482,9,'#746c58');
 for(const bowl of bowls){const k=Math.min(1,bowl.age/2),start=45+bowl.slot*75,x=start+(351-start)*k;ctx.beginPath();ctx.arc(x,480,5,0,Math.PI);ctx.strokeStyle='#fff8e8';ctx.lineWidth=2;ctx.stroke();}
 // Beaver employee washes the bowls delivered along the return track.
 rounded(351,467,26,25,8,'#a89278','#78624e');rounded(349,461,8,9,4,'#a89278','#78624e');rounded(372,461,8,9,4,'#a89278','#78624e');rounded(350,465,28,18,8,'#b8a083','#78624e');text('•  •',364,470,9,'#5e4d3e');rounded(360,475,8,6,1,'#fff7e7');
 ctx.strokeStyle='#78624e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(353,483);ctx.lineTo(345,481+(bowls.length?Math.sin(time*8)*3:0));ctx.stroke();
 for(let slot=0;slot<5;slot++){
  const x=45+slot*75;
  rounded(x-27,437,54,14,5,'#c6ae88','#967553');rounded(x-19,451,7,16,2,'#bca47d');rounded(x+12,451,7,16,2,'#bca47d');
  const g=game.seats[slot];if(g){drawGuest(g,x,414,g.tier>1?27:23,true);rounded(x-24,445,48,19,5,'#fff9ed','#b2a186');text(`${g.left}口`,x,455,12,data.TYPES[g.color].ink);}
  else text('空位',x,416,11,'#b7a58e');
 }
 rounded(11,434,368,9,3,'#ad8a62','#846344');
 for(const f of flights){const t=Math.min(1,f.age/.32),sx=20+(f.from.x+f.from.w/2)*35,sy=Math.max(40,312-(f.from.y+f.from.h/2)*24),ex=45+f.slot*75,ey=394;
  const x=sx+(ex-sx)*t,y=sy+(ey-sy)*t;drawFood({color:f.color,hp:1},x-9,y-8,18,16,1-t*.15);
 }
 for(const n of notices){const a=Math.max(0,1-n.age/1.8);ctx.save();ctx.globalAlpha=a;rounded(58,365-n.age*8,274,29,9,'#fff8e9','#c1a581');text(n.text,195,380-n.age*8,12);ctx.restore();}
 if(paused){rounded(11,10,368,479,12,'#f6efdfcc');text('暂停营业',195,228,23);text('点击「继续」返回',195,258,13);}
}
function result(){if(shownResult||game.state==='playing')return;shownResult=true;
 const won=game.state==='won';$('result-title').textContent=won?'开席成功！':'这桌卡住了';$('result-copy').textContent=won?'货架已清空，怪客们吃得心满意足。':game.reason+' 重试时先看货架底层，再看各列后续口味。';
 $('result-stats').textContent=`吃掉 ${game.eaten} 口 · 合并 ${game.merges} 次 · 最高 Combo ${game.bestCombo}`;
 $('next').hidden=!won||index===data.LEVELS.length-1;$('replay').textContent=won?'再玩一次':'重新安排';
 if(won){saved[index]=Math.max(saved[index]||0,game.bestCombo);try{localStorage.setItem('wicked-feast-blast-v2',JSON.stringify(saved));}catch{}}
 setTimeout(()=>{if(shownResult&&game.state!=='playing'&&!$('result').open)$('result').showModal();},450);
}
function frame(now){const dt=last?Math.min((now-last)/1000,.1):0;last=now;
 if(!paused&&!document.hidden){time+=dt;game.tick(dt);events();for(const f of flights)f.age+=dt;for(const n of notices)n.age+=dt;for(const b of bowls)b.age+=dt;flights=flights.filter(f=>f.age<.32);notices=notices.filter(n=>n.age<1.8);bowls=bowls.filter(b=>b.age<2.3);update();result();}
 draw();requestAnimationFrame(frame);
}
 $('level').innerHTML=data.LEVELS.map((l,i)=>`<option value="${i}">${i+1} · ${l.title}</option>`).join('');
 $('level').onchange=e=>load(+e.target.value);$('restart').onclick=()=>load(index);$('replay').onclick=()=>load(index);$('next').onclick=()=>load(index+1);
 $('pause').onclick=()=>{if(game.state!=='playing')return;paused=!paused;$('pause').textContent=paused?'继续':'暂停';update();};
 $('help').onclick=()=>{helpWasPaused=paused;paused=true;$('pause').textContent='继续';update();$('help-dialog').showModal();};
 function restorePause(){paused=helpWasPaused;$('pause').textContent=paused?'继续':'暂停';update();}
 $('close-help').onclick=()=>{$('help-dialog').close();restorePause();};
 $('help-dialog').addEventListener('cancel',restorePause);
 $('hint-toggle').onchange=e=>{hintEnabled=e.target.checked;update();};$('sound').onclick=()=>{sound=!sound;$('sound').textContent=`音效：${sound?'开':'关'}`;if(sound)ping(400);};
 $('queues').onclick=e=>{const button=e.target.closest('[data-lane]');if(button&&!paused){game.admit(+button.dataset.lane);events();update();}};
 document.addEventListener('keydown',e=>{if(e.target.matches('select,input,button')||$('help-dialog').open||$('result').open)return;if(['1','2','3'].includes(e.key)&&!paused){game.admit(+e.key-1);events();update();}});
 document.addEventListener('visibilitychange',()=>{last=0;});
 load(0);requestAnimationFrame(frame);
})(typeof globalThis!=='undefined'?globalThis:this);
