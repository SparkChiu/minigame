const $=id=>document.getElementById(id);
const canvas=$("gameCanvas"),ctx=canvas.getContext("2d");
const W=canvas.width,H=canvas.height,TILE=32,SAVE_KEY="escape_asylum_scene_demo_v2";
const WEEKDAYS=["周一","周二","周三","周四","周五","周六","周日"];
const keys=new Set();
let S,toastTimer=null,shopFirstPending=false,locationTimer=null,lastTime=performance.now();
const player={x:400,y:310,w:18,h:25,speed:154,dir:"down",step:0};

const itemMeta={
  tea:{name:"茶包",icon:"茶",desc:"老张一直想喝一杯像样的茶。",price:8},
  snack:{name:"点心",icon:"饼",desc:"可送给陈伯，也能直接恢复 18 体力。",price:6},
  soap:{name:"香皂",icon:"皂",desc:"使用后信任 +2、怀疑 -6。",price:8},
  flashlight:{name:"袖珍手电",icon:"灯",desc:"陈伯保留下来的小工具，是以后探索旧通道的准备。",price:null}
};

function defaultState(){return{
  version:2,day:1,actions:5,maxActions:5,energy:100,drug:0,trust:52,suspicion:8,tokens:8,morningDone:false,
  scene:"ward",player:{x:400,y:310},relations:{zhang:10,chen:0,nurse:5},
  requests:{zhangTea:false,chenSnack:false},inventory:{tea:0,snack:1,soap:0,flashlight:0},
  skills:{fitness:{lv:1,xp:0},social:{lv:1,xp:0},observe:{lv:1,xp:0}},
  intel:{wristband:false,treatmentNotice:false,nightRoster:false},
  flags:{metZhang:false,metChen:false,talkedNurse:false,confinement:false},
  logs:[{day:1,message:"你在东区 2 号病房醒来。床头柜上放着一只不属于你的腕带。",changes:[]}]
}}

const boundary=[
  {x:0,y:0,w:W,h:28},{x:0,y:H-28,w:W,h:28},{x:0,y:0,w:28,h:H},{x:W-28,y:0,w:28,h:H}
];

const maps={
  ward:{
    name:"东区 2 号病房",floor:["#c3cab2","#bac3a9"],wall:"#5e6e5c",
    walls:[...boundary,{x:62,y:72,w:215,h:112},{x:515,y:70,w:210,h:80},{x:86,y:330,w:188,h:67},{x:330,y:80,w:88,h:60}],
    decor:[
      {kind:"bed",x:62,y:72,w:215,h:112},{kind:"cabinet",x:515,y:70,w:210,h:80},{kind:"table",x:86,y:330,w:188,h:67},{kind:"chair",x:330,y:80,w:88,h:60},{kind:"rug",x:320,y:245,w:240,h:120},{kind:"door",x:364,y:15,w:72,h:52}
    ],
    interactions:[
      {id:"bed",x:170,y:200,label:"在床铺休息",type:"object"},
      {id:"wristband",x:575,y:165,label:"查看陌生腕带",type:"object"},
      {id:"wardDoor",x:400,y:62,label:"前往走廊",type:"portal"},
      {id:"nurse",x:640,y:270,label:"和护士林交谈",type:"npc",name:"护士林",color:"#d9eee5"},
      {id:"window",x:715,y:210,label:"看看窗外",type:"object"}
    ]
  },
  corridor:{
    name:"东区公共走廊",floor:["#b9c0a8","#c5ccb5"],wall:"#516354",
    walls:[...boundary,{x:220,y:96,w:100,h:54},{x:476,y:96,w:100,h:54},{x:310,y:300,w:180,h:54},{x:92,y:206,w:76,h:100},{x:632,y:206,w:76,h:100}],
    decor:[
      {kind:"bench",x:220,y:96,w:100,h:54},{kind:"bench",x:476,y:96,w:100,h:54},{kind:"desk",x:310,y:300,w:180,h:54},{kind:"pillar",x:92,y:206,w:76,h:100},{kind:"pillar",x:632,y:206,w:76,h:100},
      {kind:"doorWard",x:40,y:48,w:62,h:68},{kind:"doorGarden",x:698,y:192,w:70,h:92},{kind:"doorShop",x:42,y:360,w:68,h:88},{kind:"board",x:344,y:30,w:112,h:42},{kind:"lockedDoor",x:344,y:410,w:112,h:42}
    ],
    interactions:[
      {id:"corridorWard",x:112,y:90,label:"回到病房",type:"portal"},
      {id:"corridorGarden",x:688,y:240,label:"前往康复花园",type:"portal"},
      {id:"corridorShop",x:120,y:402,label:"进入院内小卖部",type:"portal"},
      {id:"notice",x:400,y:82,label:"阅读本周治疗公告",type:"object"},
      {id:"workshopLocked",x:400,y:398,label:"查看工疗室门牌",type:"object"}
    ]
  },
  garden:{
    name:"康复花园",floor:["#8ca878","#96b080"],wall:"#4f684b",
    walls:[...boundary,{x:310,y:120,w:180,h:125},{x:72,y:82,w:145,h:75},{x:582,y:320,w:145,h:70},{x:92,y:326,w:125,h:55}],
    decor:[
      {kind:"pond",x:310,y:120,w:180,h:125},{kind:"flowers",x:72,y:82,w:145,h:75},{kind:"flowers",x:582,y:320,w:145,h:70},{kind:"bench",x:92,y:326,w:125,h:55},{kind:"training",x:326,y:335,w:150,h:74},{kind:"gate",x:34,y:386,w:78,h:62}
    ],
    interactions:[
      {id:"gardenGate",x:120,y:408,label:"返回公共走廊",type:"portal"},
      {id:"zhang",x:585,y:155,label:"和老张交谈",type:"npc",name:"老张",color:"#bd9f79"},
      {id:"chen",x:250,y:287,label:"和陈伯交谈",type:"npc",name:"陈伯",color:"#78909b"},
      {id:"exercise",x:400,y:325,label:"进行康复训练",type:"object"},
      {id:"gardenBench",x:155,y:314,label:"在长椅上坐一会儿",type:"object"}
    ]
  },
  shop:{
    name:"院内小卖部",floor:["#d6c9aa","#cdbf9f"],wall:"#6d6250",
    walls:[...boundary,{x:94,y:80,w:160,h:70},{x:94,y:205,w:160,h:70},{x:310,y:80,w:160,h:70},{x:560,y:74,w:145,h:130},{x:330,y:330,w:250,h:62}],
    decor:[
      {kind:"shelf",x:94,y:80,w:160,h:70},{kind:"shelf",x:94,y:205,w:160,h:70},{kind:"shelf",x:310,y:80,w:160,h:70},{kind:"counter",x:560,y:74,w:145,h:130},{kind:"rugShop",x:330,y:330,w:250,h:62},{kind:"doorShop",x:48,y:370,w:72,h:76}
    ],
    interactions:[
      {id:"shopDoor",x:130,y:402,label:"离开小卖部",type:"portal"},
      {id:"shopCounter",x:540,y:210,label:"浏览今日商品",type:"object"},
      {id:"shopShelf",x:278,y:115,label:"看看货架",type:"object"},
      {id:"shopPoster",x:450,y:318,label:"阅读积分兑换说明",type:"object"}
    ]
  }
};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function weekday(){return WEEKDAYS[(S.day-1)%7]}
function drugEffect(value=S.drug){
  if(value>=90)return{name:"近乎失去行动能力",actions:1,penalty:10,rate:.25};
  if(value>=80)return{name:"意识模糊",actions:2,penalty:8,rate:.4};
  if(value>=65)return{name:"重度镇静",actions:3,penalty:6,rate:.55};
  if(value>=50)return{name:"明显迟钝",actions:3,penalty:4,rate:.7};
  if(value>=25)return{name:"轻度迟钝",actions:4,penalty:2,rate:.85};
  return{name:"头脑清醒",actions:5,penalty:0,rate:1}
}
function normalize(){
  ["energy","drug","trust","suspicion"].forEach(k=>S[k]=clamp(Number(S[k])||0,0,100));
  S.maxActions=clamp(Number(S.maxActions)||drugEffect().actions,1,5);S.actions=clamp(Number(S.actions)||0,0,S.maxActions)
}
function mergeState(saved){
  const base=defaultState(),m={...base,...saved};
  m.relations={...base.relations,...(saved.relations||{})};m.requests={...base.requests,...(saved.requests||{})};m.inventory={...base.inventory,...(saved.inventory||{})};m.intel={...base.intel,...(saved.intel||{})};m.flags={...base.flags,...(saved.flags||{})};
  m.skills=Object.fromEntries(Object.keys(base.skills).map(k=>[k,{...base.skills[k],...(saved.skills?.[k]||{})}]));
  m.logs=(Array.isArray(saved.logs)?saved.logs:base.logs).slice(-30);m.scene=maps[m.scene]?m.scene:"ward";return m
}
function capture(){return{energy:S.energy,drug:S.drug,trust:S.trust,suspicion:S.suspicion,tokens:S.tokens,actions:S.actions,relations:{...S.relations},inventory:{...S.inventory},intel:{...S.intel},skills:Object.fromEntries(Object.entries(S.skills).map(([k,v])=>[k,(v.lv-1)*100+v.xp]))}}
function diff(before,after){
  const out=[],num=(key,label,goodHigh=true)=>{const d=after[key]-before[key];if(d)out.push({text:`${label} ${d>0?"+":""}${d}`,tone:(d>0)===goodHigh?"good":"bad"})};
  num("energy","体力");num("drug","药物",false);num("trust","信任");num("suspicion","怀疑",false);num("tokens","积分");num("actions","行动");
  const rn={zhang:"老张关系",chen:"陈伯关系",nurse:"护士林关系"};Object.keys(rn).forEach(k=>{const d=after.relations[k]-before.relations[k];if(d)out.push({text:`${rn[k]} ${d>0?"+":""}${d}`,tone:d>0?"good":"bad"})});
  Object.keys(itemMeta).forEach(k=>{const d=(after.inventory[k]||0)-(before.inventory[k]||0);if(d)out.push({text:`${itemMeta[k].name} ${d>0?"+":""}${d}`,tone:d>0?"good":"bad"})});
  const iname={wristband:"错误腕带编号",treatmentNotice:"每周治疗公告",nightRoster:"异常夜班记录"};Object.keys(iname).forEach(k=>{if(!before.intel[k]&&after.intel[k])out.push({text:`获得线索：${iname[k]}`,tone:"good"})});
  const sn={fitness:"体能成长",social:"社交成长",observe:"观察成长"};Object.keys(sn).forEach(k=>{const d=after.skills[k]-before.skills[k];if(d)out.push({text:`${sn[k]} +${d}`,tone:"good"})});return out
}
function addLog(message,changes=[]){S.logs.push({day:S.day,message,changes});S.logs=S.logs.slice(-30);renderLog();save(false)}
function save(show=true){S.scene=currentScene();S.player={x:Math.round(player.x),y:Math.round(player.y)};normalize();localStorage.setItem(SAVE_KEY,JSON.stringify(S));if(show)showToast("游戏已保存","good")}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;S=mergeState(JSON.parse(raw));return true}catch(e){showToast("存档损坏，无法继续","warning");return false}}
function showToast(text,tone=""){const t=$("toast");t.textContent=text;t.className=`toast show ${tone}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2800)}
function gainSkill(id,xp){const sk=S.skills[id],actual=Math.max(1,Math.round(xp*drugEffect().rate));sk.xp+=actual;while(sk.lv<5&&sk.xp>=(sk.lv===1?60:100)){sk.xp-=sk.lv===1?60:100;sk.lv++;showToast(`${id==="fitness"?"体能":id==="social"?"社交":"观察"}提升到 Lv.${sk.lv}`,"good")}}
function gainRelation(id,n){const unlocked=id==="zhang"?S.requests.zhangTea:id==="chen"?S.requests.chenSnack:true;S.relations[id]=clamp((S.relations[id]||0)+n,0,unlocked?100:30)}

function renderLog(){
  const logs=S.logs.filter(l=>(l.day||S.day)===S.day);$("log").innerHTML=logs.length?logs.map(l=>`<article class="logEntry"><div>${escapeHtml(l.message)}</div>${l.changes?.length?`<div class="changeRow">${l.changes.map(c=>`<span class="change ${c.tone||""}">${escapeHtml(c.text)}</span>`).join("")}</div>`:""}</article>`).join(""):`<p>今天还没有新的记录。</p>`;requestAnimationFrame(()=>$("log").scrollTop=$("log").scrollHeight)
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderUI(){
  normalize();$("day").textContent=S.day;$("weekday").textContent=weekday();$("tokens").textContent=S.tokens;$("actions").textContent=`${S.actions} / ${S.maxActions}`;$("energy").textContent=S.energy;$("drug").textContent=S.drug;$("drugState").textContent=drugEffect().name.replace("头脑","");$("trust").textContent=S.trust;$("suspicion").textContent=S.suspicion;$("sceneName").textContent=maps[currentScene()].name;
  const warn=S.suspicion>=50;$("warningCard").classList.toggle("hidden",!warn);if(warn)$("warningText").textContent=`当前怀疑 ${S.suspicion}/60。达到 60 会立即中断行动并被隔离。`;
  const q=questInfo();$("questTitle").textContent=q.title;$("questText").textContent=q.text;renderLog()
}
function questInfo(){
  if(!S.morningDone)return{title:"完成晨间治疗",text:"护士林正在床边等你。完成治疗后才可以自由行动。"};
  if(!S.intel.wristband)return{title:"检查陌生腕带",text:"病房床头柜上放着登记你身份的腕带。靠近后按互动键。"};
  if(!S.flags.metZhang)return{title:"去花园认识院友",text:"离开病房，穿过走廊前往康复花园。老张也许注意过院内的异常。"};
  if(!S.intel.treatmentNotice)return{title:"了解每周日程",text:"走廊公告栏贴着本周治疗安排。固定日程可能成为以后调查的基础。"};
  if(S.actions<=0)return{title:"结束今天",text:"今天已经没有行动。查看日结，休息后进入下一天。"};
  return{title:"自由安排剩余行动",text:"你可以休息、锻炼、和院友交谈，或到小卖部准备关系物品。"}
}
function renderJournal(){
  const inv=Object.entries(itemMeta).filter(([k])=>(S.inventory[k]||0)>0).map(([k,m])=>`<span class="tag">${m.name} ×${S.inventory[k]}</span>`).join("")||"<span class='tag'>背包为空</span>";
  const intel=[S.intel.wristband&&"错误腕带编号",S.intel.treatmentNotice&&"每周治疗公告",S.intel.nightRoster&&"异常夜班记录"].filter(Boolean).map(x=>`<span class="tag">${x}</span>`).join("")||"<span class='tag'>尚未取得线索</span>";
  $("journalContent").innerHTML=`<div class="journalGrid"><section class="journalBlock"><h3>角色状态</h3><div class="journalRows"><div class="journalRow"><span>林默</span><b>东区 2 号病房</b></div><div class="journalRow"><span>体能</span><b>Lv.${S.skills.fitness.lv} · ${S.skills.fitness.xp} XP</b></div><div class="journalRow"><span>社交</span><b>Lv.${S.skills.social.lv} · ${S.skills.social.xp} XP</b></div><div class="journalRow"><span>观察</span><b>Lv.${S.skills.observe.lv} · ${S.skills.observe.xp} XP</b></div></div></section><section class="journalBlock"><h3>人物关系</h3><div class="journalRows"><div class="journalRow"><span>老张</span><b>${S.relations.zhang}/100</b></div><div class="journalRow"><span>陈伯</span><b>${S.relations.chen}/100</b></div><div class="journalRow"><span>护士林</span><b>${S.relations.nurse}/100</b></div></div></section><section class="journalBlock"><h3>背包</h3><div class="tagRow">${inv}</div><div id="itemActions"></div></section><section class="journalBlock"><h3>已知线索</h3><div class="tagRow">${intel}</div></section></div>`;
  const actions=$("itemActions");if(S.inventory.snack>0)actions.innerHTML+=`<button class="choice" data-use="snack"><b>吃掉点心</b><span>体力 +18，不消耗行动</span></button>`;if(S.inventory.soap>0)actions.innerHTML+=`<button class="choice" data-use="soap"><b>使用香皂</b><span>信任 +2、怀疑 -6，不消耗行动</span></button>`;actions.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>useItem(b.dataset.use))
}
function useItem(id){const before=capture();if(id==="snack"&&S.inventory.snack>0){S.inventory.snack--;S.energy=clamp(S.energy+18,0,100);addLog("你吃掉一份点心，体力恢复。",diff(before,capture()))}if(id==="soap"&&S.inventory.soap>0){S.inventory.soap--;S.trust+=2;S.suspicion=Math.max(0,S.suspicion-6);addLog("你整理好个人状态，查房记录变得更稳定。",diff(before,capture()))}renderJournal();renderUI()}

function spendAction(cost,message,fn=()=>{}){
  if(!S.morningDone){showToast("先完成晨间治疗。","warning");return false}if(S.actions<=0){showToast("今天已经没有行动了。","warning");return false}
  const total=cost+drugEffect().penalty;if(S.energy<total){showToast(`体力不足：需要 ${total} 点。`,"warning");return false}
  const before=capture();S.actions--;S.energy-=total;fn();normalize();const changes=diff(before,capture());addLog(message,changes);renderUI();save(false);if(S.suspicion>=60){triggerConfinement();return true}if(S.actions<=0)setTimeout(()=>endDay(true),500);return true
}

function setModalArt(scene){const files={ward:"ward.webp",corridor:"hospital.webp",garden:"garden.webp",shop:"shop.png"};$("eventArt").style.backgroundImage=`linear-gradient(rgba(35,50,39,.12),rgba(35,50,39,.12)),url("assets/${files[scene]||"ward.webp"}")`}
function openEvent(title,text,choices=[],eyebrow="场景互动"){
  setModalArt(currentScene());$("eventEyebrow").textContent=eyebrow;$("eventTitle").textContent=title;$("eventText").textContent=text;$("eventChoices").innerHTML="";
  choices.forEach(c=>{const b=document.createElement("button");b.className="choice";b.innerHTML=`<b>${c.title}</b><span>${c.sub||""}</span>`;b.onclick=()=>{const close=c.run?.()!==false;if(close)closeEvent()};$("eventChoices").appendChild(b)});$("eventModal").classList.remove("hidden");requestAnimationFrame(()=>$("eventChoices").querySelector("button")?.focus())
}
function closeEvent(){$("eventModal").classList.add("hidden");canvas.focus();renderUI();save(false)}
function simpleEvent(title,text,eyebrow="场景观察"){openEvent(title,text,[],eyebrow)}

function morningTreatment(){
  const effect=drugEffect();$("currentDrugInfo").textContent=`当前状态：${effect.name}。今日基础行动 ${effect.actions} 次，每次行动额外体力 ${effect.penalty}。`;$("morningChoices").innerHTML="";
  const choices=[
    {id:"full",title:"按医嘱服用",sub:"固定：信任 +6 · 怀疑 -4 · 药物 +18 · 体力 -5"},
    {id:"half",title:"只服一半",sub:"45% 蒙混过关；35% 引起注意；20% 被发现"}
  ];
  if(S.day>=2)choices.push({id:"avoid",title:"设法避开",sub:"高风险：可能保持清醒，也可能被强制服药并损失行动"});
  choices.forEach(c=>{const b=document.createElement("button");b.className="choice";b.innerHTML=`<b>${c.title}</b><span>${c.sub}</span>`;b.onclick=()=>resolveMorning(c.id);$("morningChoices").appendChild(b)});$("morningModal").classList.remove("hidden")
}
function resolveMorning(kind,roll=Math.random()){
  const before=capture();let message="",penalty=0;
  if(kind==="full"){S.trust+=6;S.suspicion=Math.max(0,S.suspicion-4);S.drug+=18;S.energy-=5;S.relations.nurse=clamp(S.relations.nurse+2,0,100);message="你按医嘱完成治疗。记录评价改善，但药物开始累积。"}
  if(kind==="half"){
    if(roll<.45){S.trust+=3;S.suspicion=Math.max(0,S.suspicion-2);S.drug+=8;message="你只服下一半，护士没有察觉。"}
    else if(roll<.8){S.trust-=2;S.suspicion+=4;S.drug+=8;message="护士注意到你的吞咽动作，记录上多了一处问号。"}
    else{S.trust-=6;S.suspicion+=9;S.drug+=12;S.energy-=3;message="藏起的半片药被发现，你的评价明显下降。"}
  }
  if(kind==="avoid"){
    if(roll<.5){S.trust-=2;S.suspicion+=6;message="你避开了服药，但异常表现被写进观察记录。"}
    else if(roll<.8){S.trust-=7;S.suspicion+=12;message="护士发现药片没有减少，你被列入重点观察。"}
    else{S.trust-=10;S.suspicion+=20;S.drug+=36;S.energy-=10;penalty=2;message="你被当场发现并遭到强制服药。"}
  }
  normalize();S.maxActions=drugEffect().actions;S.actions=Math.max(0,S.maxActions-penalty);S.morningDone=true;$("morningModal").classList.add("hidden");addLog(`${message} 今日可用 ${S.actions}/${S.maxActions} 次行动。`,diff(before,capture()));renderUI();save(false);showLocation();canvas.focus();if(S.suspicion>=60)triggerConfinement()
}

function interactionById(id){
  const actions={
    bed:()=>openEvent("你的床铺","这是病区里少数真正属于你的空间。休息能恢复体力，也会让药物带来的迟钝感减轻。",[
      {title:"休息一会儿",sub:"1 行动 · 体力 +30 · 药物负荷 -6",run:()=>spendAction(0,"你在病房安静休息，身体和思路都恢复了一些。",()=>{S.energy=clamp(S.energy+30,0,100);S.drug=Math.max(0,S.drug-6)})}
    ]),
    wristband:()=>S.intel.wristband?simpleEvent("陌生腕带","编号 E2-071 与病历页码不一致。你已经把它记进随身记录。"):openEvent("床头柜上的腕带","塑料腕带写着一个陌生名字，编号 E2-071。病历夹上的页码却从 318 开始。",[
      {title:"逐项记下姓名和编号",sub:"1 行动 · 体力 -5 · 观察成长 +35 · 获得线索",run:()=>spendAction(5,"你记下腕带与病历页码的矛盾：这不是一句“我不是他”，而是一组可以复查的编号。",()=>{S.intel.wristband=true;gainSkill("observe",35)})}
    ],"第一条线索"),
    wardDoor:()=>changeScene("corridor",145,92),corridorWard:()=>changeScene("ward",400,105),corridorGarden:()=>changeScene("garden",145,405),gardenGate:()=>changeScene("corridor",650,240),corridorShop:()=>changeScene("shop",145,398),shopDoor:()=>changeScene("corridor",145,380),
    nurse:()=>openEvent("护士林","她大部分时候只是按制度工作。你表现稳定时，她愿意把你的话写进正式记录。",[
      {title:"问她今天的安排",sub:"1 行动 · 体力 -8 · 护士关系 +8 · 社交成长",run:()=>spendAction(8,"护士林告诉你，病区活动会按星期轮换。她也把这次平静交谈写进记录。",()=>{S.flags.talkedNurse=true;S.relations.nurse=clamp(S.relations.nurse+8,0,100);S.trust+=3;gainSkill("social",25)})}
    ],"人物互动"),
    window:()=>simpleEvent("病房窗户","玻璃只能打开一条缝。花园在主楼西侧，外墙之外偶尔能听见城市车辆的声音。"),
    notice:()=>S.intel.treatmentNotice?simpleEvent("本周治疗公告","周一集中评估，周二延长治疗，周五病历与药品联合清点。日程每周重复。","周期信息"):openEvent("本周治疗公告","公告把每周治疗写成固定表格。周二晚间治疗会延长到 21:00，周五则联合清点病历。",[
      {title:"抄下完整安排",sub:"1 行动 · 体力 -5 · 观察成长 +25 · 获得周期信息",run:()=>spendAction(5,"你抄下本周治疗公告。固定重复的日程以后可能用于核对其他记录。",()=>{S.intel.treatmentNotice=true;gainSkill("observe",25)})}
    ],"周期信息"),
    workshopLocked:()=>simpleEvent("工疗工作坊","门牌写着“第 2 天起安排工作”。这个 v2.0 原型先开放病房、走廊、花园和小卖部，完整工作场景将在后续扩展。","尚未开放"),
    zhang:()=>talkZhang(),chen:()=>talkChen(),exercise:()=>openEvent("花园康复训练","沿着花圃完成一轮慢跑和拉伸。训练会消耗体力，但能提高体能并降低少量药物负荷。",[
      {title:"完成一轮训练",sub:"1 行动 · 体力 -20 · 药物 -4 · 体能成长 +45 · 怀疑 -1",run:()=>spendAction(20,"你完成一轮康复训练。活动和出汗让迟钝感减轻了一些。",()=>{S.drug=Math.max(0,S.drug-4);S.suspicion=Math.max(0,S.suspicion-1);gainSkill("fitness",45)})}
    ]),
    gardenBench:()=>openEvent("花园长椅","树荫把走廊的监控挡住了一半。这里适合短暂休息，也适合观察院友的日常路线。",[
      {title:"坐下恢复一会儿",sub:"1 行动 · 体力 +18 · 观察成长 +10",run:()=>spendAction(0,"你在长椅上坐了一会儿，记住了几名工作人员经过花园的方向。",()=>{S.energy=clamp(S.energy+18,0,100);gainSkill("observe",10)})}
    ]),
    shopCounter:()=>openShop(),shopShelf:()=>simpleEvent("逐日补充的货架","目前只有茶包、点心和香皂。更多调查与路线物品会在后续天数逐步出现。","院内物资"),shopPoster:()=>simpleEvent("积分兑换说明","进入小卖部免费。每次进入后第一次成功购买消耗 1 次行动；本次停留内继续购买不再消耗行动。","购买规则")
  };actions[id]?.()
}
function talkZhang(){
  S.flags.metZhang=true;const choices=[{title:"陪老张聊一会儿",sub:"1 行动 · 体力 -8 · 老张关系 +10 · 社交成长",run:()=>spendAction(8,"老张以前做过记者。他说，院里最值得记住的不是传闻，而是每周都会重复的细节。",()=>{gainRelation("zhang",10);gainSkill("social",30)})}];
  if(!S.requests.zhangTea)choices.push({title:"送给他一包茶",sub:S.inventory.tea>0?"茶包 -1 · 关系突破 · 获得夜班线索":"需要在小卖部购买茶包",run:()=>{if(S.inventory.tea<=0){showToast("你没有茶包。","warning");return false}const before=capture();S.inventory.tea--;S.requests.zhangTea=true;S.relations.zhang=clamp(S.relations.zhang+22,0,100);S.intel.nightRoster=true;addLog("老张接过茶，告诉你：同一位院外人员每周两次在深夜进入行政区。",diff(before,capture()));return true}});
  openEvent("老张","他喜欢坐在花圃旁，眼神总在数经过走廊的人。",choices,"人物互动")
}
function talkChen(){
  S.flags.metChen=true;const choices=[{title:"问他旧楼的结构",sub:"1 行动 · 体力 -8 · 陈伯关系 +10 · 社交成长",run:()=>spendAction(8,"陈伯说旧楼的管线比新楼复杂，花园外侧还有已经停用的检修口。",()=>{gainRelation("chen",10);gainSkill("social",25)})}];
  if(!S.requests.chenSnack)choices.push({title:"把点心分给陈伯",sub:S.inventory.snack>0?"点心 -1 · 关系突破 · 获得袖珍手电":"背包里没有点心",run:()=>{if(S.inventory.snack<=0){showToast("你没有点心。","warning");return false}const before=capture();S.inventory.snack--;S.requests.chenSnack=true;S.relations.chen=clamp(S.relations.chen+24,0,100);S.inventory.flashlight++;addLog("陈伯收下点心，把一只袖珍手电交给你。他说旧楼停电时用得上。",diff(before,capture()));return true}});
  openEvent("陈伯","他曾是维修工，讲话不多，但对墙后的管线比任何人都熟。",choices,"人物互动")
}

function openShop(){shopFirstPending=true;renderShop();$("shopModal").classList.remove("hidden")}
function renderShop(){
  $("shopTokens").textContent=S.tokens;$("shopRule").textContent=shopFirstPending?"本次第一次成功购买消耗 1 次行动；完成首购后继续购买不消耗行动。":"本次首购行动已经结算，继续购买不再消耗行动。";$("shopGrid").innerHTML="";
  ["tea","snack","soap"].forEach(id=>{const m=itemMeta[id],d=document.createElement("article");d.className="shopItem";d.innerHTML=`<span class="itemIcon">${m.icon}</span><strong>${m.name} · ${m.price} 积分</strong><small>${m.desc}</small><button class="secondary" data-buy="${id}">购买</button>`;$("shopGrid").appendChild(d)});$("shopGrid").querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buyItem(b.dataset.buy))
}
function buyItem(id){
  const m=itemMeta[id];if(S.tokens<m.price){showToast("积分不够。","warning");return}if(shopFirstPending&&S.actions<=0){showToast("今天没有行动，无法完成本次首购。","warning");return}
  const before=capture();if(shopFirstPending){S.actions--;shopFirstPending=false}S.tokens-=m.price;S.inventory[id]=(S.inventory[id]||0)+1;addLog(`你在小卖部购买了${m.name}。`,diff(before,capture()));renderShop();renderUI();if(S.actions<=0){$("shopModal").classList.add("hidden");setTimeout(()=>endDay(true),400)}
}
function closeShop(){shopFirstPending=false;$("shopModal").classList.add("hidden");canvas.focus();renderUI();save(false)}

function endDay(auto=false){
  if(!auto&&S.actions>0&&!confirm(`今天还剩 ${S.actions} 次行动，确定提前结束吗？`))return;const before=capture();S.energy=clamp(S.energy+45,0,100);S.drug=Math.max(0,S.drug-10);normalize();$("dayEndTitle").textContent=`第 ${S.day} 天 · ${weekday()}结束`;$("dayEndText").textContent="正常过夜使体力恢复 45、药物负荷降低 10。信任、怀疑、关系、能力、物品和线索保持不变。";$("dayEndStats").innerHTML=`<div><b>${S.energy}</b><br><small>明日体力</small></div><div><b>${S.drug}</b><br><small>药物负荷</small></div><div><b>${S.trust}</b><br><small>信任</small></div><div><b>${S.suspicion}</b><br><small>怀疑</small></div>`;addLog("夜里很安静。你睡了一觉，体力恢复，药物负荷降低。",diff(before,capture()));$("dayEndModal").classList.remove("hidden")
}
function nextDay(){S.day++;S.morningDone=false;S.maxActions=drugEffect().actions;S.actions=S.maxActions;S.scene="ward";player.x=400;player.y=310;S.logs.push({day:S.day,message:`第 ${S.day} 天（${weekday()}）开始。新的行动会记录在这里。`,changes:[]});$("dayEndModal").classList.add("hidden");renderUI();save(false);changeScene("ward",400,310,false);morningTreatment()}
function triggerConfinement(){
  if(S.flags.confinement)return;S.flags.confinement=true;S.actions=0;S.trust-=8;S.drug+=36;S.energy-=10;S.suspicion=50;normalize();["eventModal","shopModal","journalModal","morningModal","dayEndModal"].forEach(id=>$(id).classList.add("hidden"));$("confinementText").textContent="怀疑达到 60。当前行动被中断，剩余行动全部取消；隔离占用 1 天，并执行强制服药。";$("confinementModal").classList.remove("hidden");addLog("院方启动隔离处分：剩余行动取消，并执行强制服药。",[]);renderUI();save(false)
}
function finishConfinement(){S.flags.confinement=false;$("confinementModal").classList.add("hidden");S.day++;S.morningDone=false;S.energy=clamp(S.energy+30,0,100);S.maxActions=drugEffect().actions;S.actions=S.maxActions;S.scene="ward";player.x=400;player.y=310;S.logs.push({day:S.day,message:`隔离结束。第 ${S.day} 天（${weekday()}）开始。`,changes:[]});renderUI();save(false);changeScene("ward",400,310,false);morningTreatment()}

function currentScene(){return S?.scene||"ward"}
function changeScene(scene,x,y,banner=true){S.scene=scene;player.x=x;player.y=y;renderUI();save(false);if(banner)showLocation();canvas.focus()}
function showLocation(){const b=$("locationBanner");b.textContent=maps[currentScene()].name;b.classList.add("show");clearTimeout(locationTimer);locationTimer=setTimeout(()=>b.classList.remove("show"),1500)}
function rectForPlayer(x=player.x,y=player.y){return{x:x-player.w/2,y:y-player.h/2,w:player.w,h:player.h}}
function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function canMove(x,y){return !maps[currentScene()].walls.some(w=>overlaps(rectForPlayer(x,y),w))}
function nearestInteraction(){let best=null,bestD=58;for(const i of maps[currentScene()].interactions){const d=Math.hypot(player.x-i.x,player.y-i.y);if(d<bestD){best=i;bestD=d}}return best}
function canControl(){return !$("gameScreen").classList.contains("hidden")&&["introModal","morningModal","eventModal","shopModal","journalModal","dayEndModal","confinementModal"].every(id=>$(id).classList.contains("hidden"))}
function interact(){if(!canControl())return;const item=nearestInteraction();if(!item){showToast("附近没有可以互动的目标。");return}interactionById(item.id)}

function drawFloor(map){ctx.fillStyle=map.floor[0];ctx.fillRect(0,0,W,H);for(let y=28;y<H-28;y+=TILE)for(let x=28;x<W-28;x+=TILE){ctx.fillStyle=((x+y)/TILE)%2?map.floor[0]:map.floor[1];ctx.fillRect(x,y,TILE,TILE);ctx.strokeStyle="rgba(50,65,52,.12)";ctx.strokeRect(x,y,TILE,TILE)}}
function drawDecor(d){
  const k=d.kind;ctx.save();if(k==="bed"){ctx.fillStyle="#8e6f50";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.fillStyle="#e8dfc3";ctx.fillRect(d.x+13,d.y+11,d.w-26,d.h-22);ctx.fillStyle="#b7c9a7";ctx.fillRect(d.x+20,d.y+18,55,d.h-36)}
  else if(k==="cabinet"||k==="shelf"){ctx.fillStyle=k==="shelf"?"#806b4e":"#66765f";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle="#3e4b3f";for(let y=d.y+18;y<d.y+d.h;y+=22)ctx.strokeRect(d.x+8,y,d.w-16,10)}
  else if(k==="table"||k==="desk"||k==="counter"){ctx.fillStyle=k==="counter"?"#8b704c":"#9b7955";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.fillStyle="#b48b60";ctx.fillRect(d.x+6,d.y+6,d.w-12,12)}
  else if(k==="chair"){ctx.fillStyle="#6d7c65";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.fillStyle="#84947b";ctx.fillRect(d.x+10,d.y+9,d.w-20,d.h-18)}
  else if(k==="rug"){ctx.fillStyle="#8da081";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle="#6f826c";ctx.lineWidth=5;ctx.strokeRect(d.x+8,d.y+8,d.w-16,d.h-16)}
  else if(k==="rugShop"){ctx.fillStyle="#b99a67";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle="#8a704d";ctx.strokeRect(d.x+7,d.y+7,d.w-14,d.h-14)}
  else if(k.includes("door")||k==="gate"||k==="lockedDoor"){ctx.fillStyle=k==="gate"?"#496b49":k==="lockedDoor"?"#6c665b":"#5b4734";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.fillStyle="#d3b15d";ctx.fillRect(d.x+d.w-15,d.y+d.h/2,5,5)}
  else if(k==="board"){ctx.fillStyle="#795f42";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.fillStyle="#efe4bd";ctx.fillRect(d.x+7,d.y+7,d.w-14,d.h-14)}
  else if(k==="bench"){ctx.fillStyle="#6e593d";ctx.fillRect(d.x,d.y+10,d.w,d.h-18);ctx.fillStyle="#967650";for(let x=d.x+8;x<d.x+d.w-8;x+=22)ctx.fillRect(x,d.y,d.w>120?16:12,d.h-5)}
  else if(k==="pillar"){ctx.fillStyle="#738171";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.fillStyle="#879486";ctx.fillRect(d.x+10,d.y,d.w-20,d.h)}
  else if(k==="pond"){ctx.fillStyle="#668f91";ctx.beginPath();ctx.ellipse(d.x+d.w/2,d.y+d.h/2,d.w/2,d.h/2,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#b1c49a";ctx.lineWidth=10;ctx.stroke()}
  else if(k==="flowers"){ctx.fillStyle="#52734d";ctx.fillRect(d.x,d.y,d.w,d.h);const c=["#d2a359","#d37e72","#e4d790","#b887bb"];for(let x=d.x+12,i=0;x<d.x+d.w-8;x+=22,i++){ctx.fillStyle=c[i%c.length];ctx.fillRect(x,d.y+12+(i%2)*24,8,8)}}
  else if(k==="training"){ctx.fillStyle="#879a7a";ctx.fillRect(d.x,d.y,d.w,d.h);ctx.strokeStyle="#f0e5bb";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(d.x+18,d.y+d.h/2);ctx.lineTo(d.x+d.w-18,d.y+d.h/2);ctx.stroke()}
  ctx.restore()
}
function drawCharacter(x,y,color,name,isPlayer=false){
  ctx.save();const bob=isPlayer&&keys.size?Math.sin(player.step)*1.5:0;ctx.translate(Math.round(x),Math.round(y+bob));ctx.fillStyle="#d6ac82";ctx.fillRect(-7,-20,14,10);ctx.fillStyle=isPlayer?"#334a3a":color;ctx.fillRect(-9,-10,18,22);ctx.fillStyle="#1f2c24";ctx.fillRect(-8,12,6,8);ctx.fillRect(2,12,6,8);ctx.fillStyle="#273329";ctx.fillRect(-5,-18,2,2);ctx.fillRect(3,-18,2,2);if(name){ctx.font="bold 11px Microsoft YaHei";const w=ctx.measureText(name).width+10;ctx.fillStyle="rgba(35,51,40,.82)";ctx.fillRect(-w/2,-38,w,16);ctx.fillStyle="#fff7df";ctx.textAlign="center";ctx.fillText(name,0,-26)}ctx.restore()
}
function draw(){
  const map=maps[currentScene()];drawFloor(map);ctx.fillStyle=map.wall;map.walls.forEach(w=>ctx.fillRect(w.x,w.y,w.w,w.h));map.decor.forEach(drawDecor);map.interactions.filter(i=>i.type==="npc").forEach(i=>drawCharacter(i.x,i.y,i.color,i.name));drawCharacter(player.x,player.y,"#334a3a",null,true);
  const near=canControl()?nearestInteraction():null;$("interactPrompt").classList.toggle("hidden",!near);if(near)$("promptText").textContent=near.label;requestAnimationFrame(draw)
}
function update(now){
  const dt=Math.min(.034,(now-lastTime)/1000);lastTime=now;if(canControl()){
    let dx=0,dy=0;if(keys.has("arrowleft")||keys.has("a"))dx--;if(keys.has("arrowright")||keys.has("d"))dx++;if(keys.has("arrowup")||keys.has("w"))dy--;if(keys.has("arrowdown")||keys.has("s"))dy++;
    if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;player.step+=dt*10;if(Math.abs(dx)>Math.abs(dy))player.dir=dx<0?"left":"right";else player.dir=dy<0?"up":"down";const nx=player.x+dx*player.speed*dt,ny=player.y+dy*player.speed*dt;if(canMove(nx,player.y))player.x=nx;if(canMove(player.x,ny))player.y=ny}
  }requestAnimationFrame(update)
}

function startGame(){
  $("titleScreen").classList.add("hidden");$("gameScreen").classList.remove("hidden");player.x=clamp(S.player?.x||400,40,W-40);player.y=clamp(S.player?.y||310,40,H-40);renderUI();showLocation();canvas.focus();if(S.flags.confinement){$("confinementModal").classList.remove("hidden")}else if(!S.morningDone)setTimeout(morningTreatment,180)
}
function newGame(){if(localStorage.getItem(SAVE_KEY)&&!confirm("开始新游戏会覆盖当前存档，确定继续吗？"))return;S=defaultState();localStorage.removeItem(SAVE_KEY);$("titleScreen").classList.add("hidden");$("introModal").classList.remove("hidden")}
function continueGame(){if(load())startGame()}

addEventListener("keydown",e=>{
  const key=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(key))e.preventDefault();keys.add(key);if((key==="e"||key===" ")&&!e.repeat)interact();if(key==="escape"){if(!$("shopModal").classList.contains("hidden"))closeShop();else if(!$("journalModal").classList.contains("hidden")){$("journalModal").classList.add("hidden");canvas.focus()}else if(!$("eventModal").classList.contains("hidden"))closeEvent()}
});addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));addEventListener("blur",()=>keys.clear());
document.querySelectorAll("[data-dir]").forEach(b=>{const key={up:"arrowup",down:"arrowdown",left:"arrowleft",right:"arrowright"}[b.dataset.dir];const on=e=>{e.preventDefault();keys.add(key);b.setPointerCapture?.(e.pointerId)},off=e=>{e.preventDefault();keys.delete(key)};b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointercancel",off);b.addEventListener("lostpointercapture",off)});
$("touchInteract").onclick=interact;$("newGameBtn").onclick=newGame;$("continueBtn").onclick=continueGame;$("enterWardBtn").onclick=()=>{$("introModal").classList.add("hidden");startGame();save(false)};$("saveBtn").onclick=()=>save(true);$("closeEventBtn").onclick=closeEvent;$("closeShopBtn").onclick=closeShop;$("journalBtn").onclick=()=>{renderJournal();$("journalModal").classList.remove("hidden")};$("closeJournalBtn").onclick=()=>{$("journalModal").classList.add("hidden");canvas.focus()};$("endDayBtn").onclick=()=>endDay(false);$("nextDayBtn").onclick=nextDay;$("finishConfinementBtn").onclick=finishConfinement;$("helpBtn").onclick=()=>openEvent("操作说明","使用 WASD 或方向键移动。靠近人物、家具、门和公告栏后按 E 或空格互动；手机使用下方方向键和“互动”按钮。走路与换场景免费，只有明确标注的生活、社交、调查和购买会消耗行动。",[],"控制方式");

S=defaultState();if(localStorage.getItem(SAVE_KEY))$("continueBtn").classList.remove("hidden");
window.__escapeGame={getState:()=>JSON.parse(JSON.stringify(S)),teleport(scene,id){if(maps[scene])S.scene=scene;const i=maps[S.scene].interactions.find(x=>x.id===id);if(i){player.x=i.x;player.y=i.y+42}renderUI()},interactById:interactionById,resolveMorning:(kind,roll)=>resolveMorning(kind,roll),reset(){S=defaultState();localStorage.removeItem(SAVE_KEY)}};
requestAnimationFrame(update);requestAnimationFrame(draw);
