const $=id=>document.getElementById(id);
const SAVE_KEY="escape_asylum_demo_v1_save";
const SAVE_VERSION=4;
let toastTimer=null;
let lastFocusedElement=null;
let intelRevealQueue=[];
let currentIntelReveal=null;

const skillsMeta={
  fitness:{name:"体能",icon:"🏃",desc:"提升工作耐力，也能在夜间路线中提供优势。"},
  work:{name:"工作",icon:"🛠️",desc:"提高工疗收益，并解锁洗衣房、后勤等岗位。"},
  social:{name:"社交",icon:"💬",desc:"更容易建立关系、得到人情和院外帮助。"},
  observe:{name:"观察",icon:"🔎",desc:"从排班、文件和环境中发现真正有用的线索。"}
};

const itemMeta={
  tea:{name:"茶包",icon:"🍵",desc:"完成老张的请求，换来夜班线索与复写纸。"},
  book:{name:"侦探小说",icon:"📘",desc:"护士林值夜班时想看的书，可换取正式复核申请表。"},
  snack:{name:"点心",icon:"🍪",desc:"恢复少量体力，也适合分享。"},
  notebook:{name:"笔记本",icon:"📒",desc:"完成小文的请求，换来装载证据的防水信封。"},
  phonecard:{name:"电话卡",icon:"☎️",desc:"可在访客区联系院外。"},
  material:{name:"零件材料",icon:"🔩",desc:"制作维修通道地图需要 3 份。"},
  soap:{name:"香皂",icon:"🧼",desc:"使用后改善个人状态：怀疑 -6、信任 +2。"},
  carbon:{name:"复写纸",icon:"📑",desc:"整理证据包的关键材料，可从老张处获得或购买。"},
  envelope:{name:"防水信封",icon:"✉️",desc:"保护证据原件的关键材料，可从小文处获得或购买。"},
  flashlight:{name:"袖珍手电",icon:"🔦",desc:"夜间穿过维修通道不可缺少的照明工具。"},
  form:{name:"复核申请表",icon:"📝",desc:"合法离院的关键表格，只能通过帮助护士林获得。"},
  casefile:{name:"密封证据包",icon:"🗂️",desc:"由三份关键证据、复写纸与防水信封整理而成，两条离院路线都需要。"}
};

const requestMeta={
  zhang:{item:"tea",flag:"zhangTea",gain:22,reward:"复写纸 ×1",rewardItem:"carbon"},
  chen:{item:"snack",flag:"chenSnack",gain:24,reward:"袖珍手电 ×1、零件材料 ×1",rewardItem:"flashlight"},
  xiaowen:{item:"notebook",flag:"xiaowenNotebook",gain:24,reward:"防水信封 ×1",rewardItem:"envelope"},
  nurse:{item:"book",flag:"nurseBook",gain:24,reward:"复核申请表 ×1",rewardItem:"form"}
};

const intelMeta={
  wristband:{title:"错误腕带编号",icon:"🏷️",type:"线索",desc:"你的腕带编号与病历页码根本对不上。"},
  rules:{title:"院规与评估漏洞",icon:"📋",type:"线索",desc:"“病情稳定”主要由行为记录与主治评估决定。"},
  trayMark:{title:"重复的餐盘编号",icon:"🥣",type:"线索",desc:"你的餐盘编号与另一名早已出院的患者完全相同。"},
  catalogNote:{title:"旧档案编目便签",icon:"🔖",type:"线索",desc:"旧档案不按姓名排列；三只文件盒的标签中只有一句真话。"},
  foldedNote:{title:"夹在书页里的求助纸条",icon:"✉️",type:"线索",desc:"纸条记录了一个被改名后转走的患者，以及每周二的异常探视。"},
  stampMismatch:{title:"不一致的蓝色骑缝章",icon:"🔵",type:"线索",desc:"转院材料上的蓝章来自已停用的行政印章，日期对不上。"},
  nightRoster:{title:"异常夜班记录",icon:"🌙",type:"线索",desc:"同一位院外人员每周两次在深夜进入行政区。"},
  transferCopy:{title:"被改动的转院单",icon:"🧾",type:"关键证据",desc:"转院单上的原始姓名被覆盖，日期也被改过。",evidence:true},
  originalFile:{title:"病历原件",icon:"📁",type:"关键证据",desc:"原始入院记录显示：送你入院的人并非登记家属。",evidence:true},
  paymentRecord:{title:"私人付款记录",icon:"💳",type:"关键证据",desc:"有人持续向院外中间人支付“照护费用”。",evidence:true},
  tunnelMap:{title:"维修通道地图",icon:"🗺️",type:"离院方案",desc:"旧后勤通道可以绕开正门，出口通向花园外侧。"}
};

const locations=[
  {id:"ward",name:"病房",img:"ward.webp",cost:0,desc:"休息、整理床位，恢复体力或提升日常评价。",unlock:()=>true},
  {id:"workshop",name:"工疗工作坊",img:"workshop.webp",cost:18,desc:"工作赚积分和材料，提升工作技能。",unlock:()=>true},
  {id:"garden",name:"康复花园",img:"garden.webp",cost:10,desc:"和病友相处、锻炼身体，也会遇到随机事件。",unlock:()=>true},
  {id:"library",name:"图书室",img:"library.webp",cost:12,desc:"阅读院规、做记录，提高观察与社交能力。",unlock:()=>true},
  {id:"cafeteria",name:"食堂",img:"cafeteria.webp",cost:14,desc:"从第2天开放。帮忙能赚积分，也容易认识人。",unlock:s=>s.day>=2,reason:"第 2 天起开放"},
  {id:"laundry",name:"洗衣房",img:"laundry.webp",cost:18,desc:"稳定的后勤岗位，也是很多文件和物资流动的地方。",unlock:s=>s.day>=3&&(s.skills.work.lv>=2||s.trust>=55),reason:"第 3 天后，工作 Lv.2 或信任 ≥ 55"},
  {id:"nurse",name:"护士站",img:"nurse.webp",cost:10,desc:"帮忙整理物品、了解评估流程，提升院方关系。",unlock:s=>s.trust>=58,reason:"院方信任 ≥ 58"},
  {id:"archives",name:"档案室外围",img:"archives.webp",cost:20,desc:"找到真正的病历需要足够观察力和前置线索。",unlock:s=>countIntel(s)>=2&&s.skills.observe.lv>=3,reason:"至少 2 条线索 + 观察 Lv.3"},
  {id:"visitor",name:"访客与电话区",img:"visitor.webp",cost:8,desc:"建立院外联络。可用电话卡，或凭良好评估申请通话。",unlock:s=>s.day>=4&&(s.trust>=65||hasItem(s,"phonecard")),reason:"第 4 天后，信任 ≥ 65 或拥有电话卡"},
  {id:"maintenance",name:"后勤维修间",img:"maintenance.webp",cost:18,desc:"陈伯熟悉旧楼结构。完成他的物品请求后，关系才会开放备用路线。",unlock:s=>s.day>=5&&s.requests.chenSnack&&s.relations.chen>=45,reason:"第 5 天后，完成陈伯请求且关系 ≥ 45"}
];

const defaultState=()=>({
  day:1, period:0, actions:4, energy:100, trust:45, suspicion:15, drug:0, tokens:0,
  skills:{
    fitness:{lv:1,xp:0},work:{lv:1,xp:0},social:{lv:1,xp:0},observe:{lv:1,xp:0}
  },
  relations:{zhang:10,chen:0,xiaowen:0,nurse:5},
  requests:{zhangTea:false,chenSnack:false,xiaowenNotebook:false,nurseBook:false},
  inventory:{tea:0,book:0,snack:1,notebook:0,phonecard:0,material:0,soap:0,carbon:0,envelope:0,flashlight:0,form:0,casefile:0},
  intel:{wristband:false,rules:false,trayMark:false,catalogNote:false,foldedNote:false,stampMismatch:false,nightRoster:false,transferCopy:false,originalFile:false,paymentRecord:false,tunnelMap:false},
  storyFlags:{xiaowenNote:false,inspection:false,chenValve:false},
  externalContact:false,
  legalPass:false,
  morningDone:false,
  logs:[{day:1,message:"你进入东区 2 号病房。14 天后将被转往高戒备区。",changes:[]}],
  storyStage:0,
  lastEvent:"",
  completed:false,
  saveVersion:SAVE_VERSION
});
let S=defaultState();

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function normalizeStats(){S.energy=clamp(S.energy,0,100);S.trust=clamp(S.trust,0,100);S.suspicion=clamp(S.suspicion,0,100);S.drug=clamp(S.drug,0,100)}
function drugEffect(value=S.drug){
  if(value>=50)return {name:"强镇静",className:"drug-strong",energyPenalty:6,xpRate:.6,desc:"每次消耗行动的活动额外消耗 6 点体力；能力成长只有 60%；合法离院需低于 60，维修通道需低于 35。"};
  if(value>=25)return {name:"反应迟钝",className:"drug-mild",energyPenalty:3,xpRate:.8,desc:"每次消耗行动的活动额外消耗 3 点体力；能力成长只有 80%。"};
  return {name:"头脑清醒",className:"drug-clear",energyPenalty:0,xpRate:1,desc:"行动与能力成长不受药物影响。"};
}
function setScreen(id){document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));$(id).classList.add("active")}
function mergeState(saved){
  const base=defaultState();
  const merged={...base,...saved};
  merged.skills=Object.fromEntries(Object.keys(base.skills).map(id=>[id,{...base.skills[id],...(saved.skills?.[id]||{})}]));
  merged.relations={...base.relations,...(saved.relations||{})};
  merged.requests={...base.requests,...(saved.requests||{})};
  merged.inventory={...base.inventory,...(saved.inventory||{})};
  merged.intel={...base.intel,...(saved.intel||{})};
  merged.storyFlags={...base.storyFlags,...(saved.storyFlags||{})};
  const savedLogs=Array.isArray(saved.logs)?saved.logs:base.logs;
  const savedVersion=Number(saved.saveVersion)||0;
  const chronologicalLogs=savedVersion<3?savedLogs.slice().reverse():savedLogs.slice();
  merged.logs=chronologicalLogs.slice(-20).map(entry=>typeof entry==="string"
    ? {day:merged.day,message:entry,changes:[]}
    : {day:Number(entry.day)||merged.day,message:String(entry.message||""),changes:Array.isArray(entry.changes)?entry.changes:[]});
  merged.energy=clamp(Number(merged.energy)||0,0,100);
  merged.trust=clamp(Number(merged.trust)||0,0,100);
  merged.suspicion=clamp(Number(merged.suspicion)||0,0,100);
  merged.drug=clamp(Number(merged.drug)||0,0,100);
  merged.actions=clamp(Number(merged.actions)||0,0,4);
  merged.day=clamp(Number(merged.day)||1,1,15);
  merged.saveVersion=SAVE_VERSION;
  return merged;
}
function setSaveState(label){if($("saveState"))$("saveState").textContent=label}
function saveGame(show=true){
  try{
    normalizeStats();
    S.saveVersion=SAVE_VERSION;
    localStorage.setItem(SAVE_KEY,JSON.stringify(S));
    setSaveState(show?"刚刚手动保存":"已自动保存");
    if(show)showToast("💾 游戏已保存");
  }catch(e){setSaveState("保存失败");showToast("无法保存，请检查浏览器存储设置","danger")}
}
function loadGame(){const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;try{S=mergeState(JSON.parse(raw));saveGame(false);return true}catch(e){showToast("存档损坏，无法继续","danger");return false}}
function deleteSave(){localStorage.removeItem(SAVE_KEY)}
function hasItem(s,id,n=1){return (s.inventory[id]||0)>=n}
function countIntel(s){return Object.values(s.intel).filter(Boolean).length}
function evidenceCount(s){return ["transferCopy","originalFile","paymentRecord"].filter(k=>s.intel[k]).length}
function progressPct(){
  let n=0,total=8;
  if(evidenceCount(S)>=3)n++;
  if(S.externalContact)n++;
  if(S.intel.originalFile)n++;
  if(S.intel.tunnelMap||S.legalPass)n++;
  if(S.skills.social.lv>=3||S.trust>=75)n++;
  if(S.skills.observe.lv>=3)n++;
  if(S.drug<60)n++;
  if(hasItem(S,"casefile"))n++;
  return Math.round(n/total*100)
}
function relationHearts(v){const full=Math.min(5,Math.floor(v/20));return "♥".repeat(full)+"♡".repeat(5-full)}
function gainRelation(id,amount,bypass=false){
  const current=S.relations[id]||0,meta=requestMeta[id],done=meta?S.requests[meta.flag]:true;
  S.relations[id]=clamp(current+amount,0,bypass||done?100:30);
  return S.relations[id]-current;
}
function gainSkill(id,xp){const effect=drugEffect(),actualXp=Math.max(1,Math.round(xp*effect.xpRate));let sk=S.skills[id];sk.xp+=actualXp;while(sk.xp>=100&&sk.lv<5){sk.xp-=100;sk.lv++;toastLog(`${skillsMeta[id].name}提升到 Lv.${sk.lv}！`)}}
function showToast(message,tone="info"){
  const el=$("toast");
  if(!el)return;
  el.textContent=message;el.className=`toast show ${tone}`;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
}
function addIntel(id){
  if(!S.intel[id]){
    S.intel[id]=true;
    toastLog(`获得：${intelMeta[id].title}`,false);
    setTimeout(()=>showToast(`${intelMeta[id].icon} 获得${intelMeta[id].type}：${intelMeta[id].title}`,intelMeta[id].evidence?"evidence":"info"),120);
    queueIntelReveal(id);
  }
}
function queueIntelReveal(id){
  if(!intelMeta[id])return;
  intelRevealQueue.push(id);
  if(!currentIntelReveal)showNextIntelReveal();
}
function showNextIntelReveal(){
  const id=intelRevealQueue.shift();
  if(!id){currentIntelReveal=null;$("intelRevealModal").classList.add("hidden");return}
  const intel=intelMeta[id];currentIntelReveal=id;
  $("intelRevealIcon").textContent=intel.icon;$("intelRevealType").textContent=`获得${intel.type}`;$("intelRevealTitle").textContent=intel.title;$("intelRevealDesc").textContent=intel.desc;
  $("intelRevealBadge").textContent=intel.evidence?"关键证据":"新情报";$("intelRevealBadge").className=`intelRevealBadge ${intel.evidence?"isEvidence":""}`;
  $("intelRevealCard").className=`modalCard compact intelRevealCard ${intel.evidence?"isEvidence":""}`;
  $("intelRevealModal").classList.remove("hidden");$("intelRevealConfirm").focus();
}
function confirmIntelReveal(){
  if(!currentIntelReveal)return;
  $("intelRevealModal").classList.add("hidden");currentIntelReveal=null;
  showNextIntelReveal();
}
function useAction(cost){
  if(S.actions<=0){toastLog("今天已经没有自由行动了。");return false}
  const effect=drugEffect(),totalCost=cost+effect.energyPenalty;
  if(S.energy<totalCost){toastLog(`体力不足。这次行动需要 ${totalCost} 点体力，其中药物影响增加 ${effect.energyPenalty} 点。`);return false}
  S.actions--;S.energy=clamp(S.energy-totalCost,0,100);S.period=Math.min(3,4-S.actions);
  if(effect.energyPenalty>0)toastLog(`${effect.name}：这次行动额外消耗 ${effect.energyPenalty} 点体力，能力成长按 ${Math.round(effect.xpRate*100)}% 计算。`,false);
  return true;
}
function captureFeedback(){
  return {
    energy:S.energy,trust:S.trust,suspicion:S.suspicion,drug:S.drug,tokens:S.tokens,actions:S.actions,
    skills:Object.fromEntries(Object.keys(skillsMeta).map(id=>[id,S.skills[id].lv*100+S.skills[id].xp])),
    relations:{...S.relations},inventory:{...S.inventory},intel:{...S.intel},
    externalContact:S.externalContact,legalPass:S.legalPass
  };
}
function changeTone(id,delta){
  if(id==="actions")return "neutral";
  if(id==="suspicion"||id==="drug")return delta<0?"good":"bad";
  return delta>0?"good":"bad";
}
function feedbackChanges(before,after){
  const changes=[];
  const addNumber=(id,label,a,b)=>{const delta=b-a;if(delta)changes.push({text:`${label} ${delta>0?"+":""}${delta}`,tone:changeTone(id,delta)})};
  addNumber("energy","体力",before.energy,after.energy);
  addNumber("trust","信任",before.trust,after.trust);
  addNumber("suspicion","怀疑",before.suspicion,after.suspicion);
  addNumber("drug","药物负荷",before.drug,after.drug);
  addNumber("tokens","积分",before.tokens,after.tokens);
  addNumber("actions","剩余行动",before.actions,after.actions);
  Object.keys(skillsMeta).forEach(id=>addNumber(id,`${skillsMeta[id].name}成长`,before.skills[id],after.skills[id]));
  const relationNames={zhang:"老张关系",chen:"陈伯关系",xiaowen:"小文关系",nurse:"护士林关系"};
  Object.keys(relationNames).forEach(id=>addNumber(id,relationNames[id],before.relations[id],after.relations[id]));
  Object.keys(itemMeta).forEach(id=>addNumber(id,itemMeta[id].name,before.inventory[id]||0,after.inventory[id]||0));
  Object.keys(intelMeta).forEach(id=>{if(!before.intel[id]&&after.intel[id])changes.push({text:`获得${intelMeta[id].type}：${intelMeta[id].title}`,tone:intelMeta[id].evidence?"good":"neutral"})});
  if(!before.externalContact&&after.externalContact)changes.push({text:"院外联络 已建立",tone:"good"});
  if(!before.legalPass&&after.legalPass)changes.push({text:"复核资格 已获得",tone:"good"});
  return changes;
}
function trackAction(fn){
  const before=captureFeedback(),logStart=S.logs.length;
  const result=fn();
  normalizeStats();
  const changes=feedbackChanges(before,captureFeedback());
  if(changes.length){
    if(S.logs.length>logStart)S.logs[S.logs.length-1].changes=changes;
    else S.logs.push({day:S.day,message:"行动完成。",changes});
    S.logs=S.logs.slice(-20);renderLog();saveGame(false);
  }
  return result;
}
function toastLog(msg,notify=true,changes=[]){S.logs.push({day:S.day,message:msg,changes});S.logs=S.logs.slice(-20);renderLog();saveGame(false);if(notify)showToast(msg)}

function render(){
  normalizeStats();
  const dayActionContent=$("dayActionContent");dayActionContent.classList.toggle("hidden",!S.morningDone);dayActionContent.setAttribute("aria-hidden",String(!S.morningDone));
  $("day").textContent=S.day;$("period").textContent=["上午","中午","下午","傍晚"][S.period]||"傍晚";
  $("energy").textContent=S.energy;$("energyBar").style.width=S.energy+"%";
  $("trust").textContent=S.trust;$("suspicion").textContent=S.suspicion;$("tokens").textContent=S.tokens;
  $("daysLeft").textContent=Math.max(0,15-S.day);
  $("mobileDay").textContent=S.day;$("mobilePeriod").textContent=["上午","中午","下午","傍晚"][S.period]||"傍晚";
  $("mobileActions").textContent=S.actions;$("mobileDaysLeft").textContent=Math.max(0,15-S.day);
  $("mobileTopEnergy").textContent=S.energy;$("mobileTopDrug").textContent=S.drug;$("mobileTopTrust").textContent=S.trust;$("mobileTopSuspicion").textContent=S.suspicion;
  renderActions();renderLocations();renderGrowth();renderRelations();renderIntel();renderBag();renderEscape();renderConditions();renderLog();renderDailyHint();
}
function renderActions(){$("actionPips").innerHTML=Array.from({length:4},(_,i)=>`<i class="${i>=S.actions?'used':''}"></i>`).join("")}
function renderDailyHint(){
  const tips=[
    ["行动与体力","多数院内活动会同时消耗一次行动和体力；病房休息只恢复体力，不消耗行动。"],
    ["晨间治疗","药物负荷达到 25/50 会进入反应迟钝/强镇静，增加行动体力消耗并降低能力成长；夜间会自然下降 14。"],
    ["技能成长","技能经验会跨天保留。等级提升后，会出现更高收益的工作或新的调查方式。"],
    ["信任与怀疑","信任会开放正式工作和通话机会；怀疑过高会让高风险行动更难执行。"],
    ["关系与请求","聊天只能把关系推进到熟悉阶段；完成角色的物品请求，才能突破关系瓶颈并获得专属资源。"],
    ["线索与证据","普通线索负责解释矛盾，关键证据才能支撑离院申诉；两者在情报页使用不同标记。"],
    ["地点开放","区域由天数、技能、信任或关系共同开放，已经开放的地点会持续保留。"],
    ["院外联络","证据留在院内仍可能被收回；院外联络是一项独立的离院条件。"],
    ["物品用途","茶包、点心、笔记本和侦探小说用于关系突破；复写纸与防水信封可组合成密封证据包。"],
    ["剧情分支","同一事件的选择可能影响不同人物的关系，也可能让某条线索以另一种方式出现。"],
    ["线索谜题","部分关键文件藏在编目规则或互相矛盾的标签后，错误答案也会留下数值后果。"],
    ["两条离院路线","合法离院更依赖信任、社交和护士支持；维修通道更依赖体能、观察和陈伯。"],
    ["每日结算","结束一天会恢复体力，药物负荷降低 14、怀疑降低 5；能力、关系、物品和情报不会清零。"],
    ["倒计时","第 15 天上午会触发转院。两条路线都要求三份关键证据和院外联络。"]
  ];
  const [title,text]=tips[(S.day-1)%tips.length];
  $("dailyHint").textContent=`第 ${S.day} 天的院内生活记录会在上方实时更新。`;
  $("dayGoal").textContent=`今日信息：剩余 ${S.actions}/4 次行动 · 距转院 ${Math.max(0,15-S.day)} 天`;
  $("tipTitle").textContent=title;$("tipText").textContent=text;
}
function activatePanel(panelId){
  const tab=document.querySelector(`.tab[data-panel="${panelId}"]`);
  if(!tab)return;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  document.querySelectorAll(".contentPanel").forEach(p=>p.classList.toggle("active",p.id===panelId));
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderLocations(){
  $("locationGrid").innerHTML="";
  locations.forEach(l=>{
    const open=l.unlock(S),effect=drugEffect(),shownCost=l.cost+effect.energyPenalty;
    const card=document.createElement("button");card.className="locationCard"+(open?"":" locked");card.dataset.location=l.id;
    card.disabled=!open;card.setAttribute("aria-label",open?`${l.name}，${l.desc}`:`${l.name}，未开放：${l.reason}`);
    card.innerHTML=`<img src="assets/${l.img}" alt="${l.name}"><div class="locationBody"><div class="locationTitle">${l.name}</div><p>${l.desc}</p><div class="locationMeta"><span>${l.cost?`体力约 -${shownCost}${effect.energyPenalty?`（药物 +${effect.energyPenalty}）`:""}`:"可恢复体力"}</span><span>${open?"进入 →":"未开放"}</span></div></div>${open?"":`<div class="lockReason">🔒 ${l.reason}</div>`}`;
    if(open)card.onclick=()=>openLocation(l.id);
    $("locationGrid").appendChild(card);
  });
}
function renderGrowth(){
  $("skillCards").innerHTML="";
  Object.entries(skillsMeta).forEach(([id,m])=>{
    const sk=S.skills[id],d=document.createElement("div");d.className="skillCard";
    d.innerHTML=`<div class="skillIcon">${m.icon}</div><h3>${m.name} Lv.${sk.lv}</h3><div class="skillBar"><i style="width:${sk.xp}%"></i></div><small>${sk.xp}/100</small><p>${m.desc}</p>`;
    $("skillCards").appendChild(d);
  });
  $("gEnergy").textContent=S.energy+"/100";$("drug").textContent=S.drug;$("gTrust").textContent=S.trust;$("gSuspicion").textContent=S.suspicion;
  const effect=drugEffect();$("drugEffect").className=`drugEffect ${effect.className}`;$("drugEffect").textContent=`${effect.name}：${effect.desc}`;
}
function renderRelations(){
  const data=[
    ["zhang","老张","🧓","病友 · 曾做过记者","喜欢喝茶，记性非常好。经常注意到别人忽略的细节。"],
    ["chen","陈伯","🧰","病友 · 原维修工","熟悉旧楼管线和维修间，讲话不多。"],
    ["xiaowen","小文","👩","病友 · 图书室志愿者","喜欢记录故事，和院外公益组织保持过联系。"],
    ["nurse","护士林","👩‍⚕️","护士","大部分时候只是按制度工作。你表现稳定时，她愿意认真听你说话。"]
  ];
  $("relationsGrid").innerHTML="";
  data.forEach(([id,name,ico,role,desc])=>{
    const v=S.relations[id],c=document.createElement("div"),meta=requestMeta[id],done=S.requests[meta.flag],capped=!done&&v>=30;c.className="relationCard";
    const req=done?`<div class="request">✓ 请求已完成 · 关系可以继续深入</div>`:`<div class="request">想要：${itemMeta[meta.item].name} ×1<br><small>完成后获得：${meta.reward}</small></div>`;
    const gate=capped?`<div class="relationGate">关系停留在熟悉阶段。需要完成物品请求，才能继续提升并取得专属资源。</div>`:"";
    c.innerHTML=`<div class="relationHead"><div class="npcAvatar">${ico}</div><div><b>${name}</b><small>${role}</small></div></div><div class="hearts">${relationHearts(v)}</div><p>${desc}</p>${req}${gate}<button class="actionBtn" data-talk="${id}" ${capped?"disabled":""}>${capped?"等待完成请求":"聊一会儿"}</button>${done?"":`<button class="actionBtn" data-help="${id}">交付${itemMeta[meta.item].name}</button>`}`;
    $("relationsGrid").appendChild(c);
  });
  document.querySelectorAll("[data-talk]").forEach(b=>b.onclick=()=>talkNPC(b.dataset.talk));
  document.querySelectorAll("[data-help]").forEach(b=>b.onclick=()=>helpNPC(b.dataset.help));
}
function renderIntel(){
  $("intelBoard").innerHTML="";
  Object.entries(intelMeta).forEach(([id,m])=>{
    const got=S.intel[id],d=document.createElement("div");d.className="intelCard"+(got?"":" locked");
    d.innerHTML=`<div class="pin">${got?m.icon:"❓"}</div><h3>${got?m.title:"未知"}</h3>${got&&m.evidence?`<span class="evidenceBadge">关键证据</span>`:""}<p>${got?m.desc:"继续生活、工作和建立关系，线索会逐渐浮现。"}</p>`;
    $("intelBoard").appendChild(d);
  });
}
function renderBag(){
  $("inventoryGrid").innerHTML="";
  Object.entries(itemMeta).forEach(([id,m])=>{
    const n=S.inventory[id]||0,d=document.createElement("div");d.className="inventoryItem";
    const relationItem=["tea","book","snack","notebook"].includes(id),routeItem=["phonecard","material","carbon","envelope","flashlight","form","casefile"].includes(id);
    const critical=relationItem?`<span class="itemKeyBadge">关系物品</span>`:(routeItem?`<span class="itemKeyBadge">关键物品</span>`:"");
    let action="";
    if(id==="snack"&&n>0)action=`<button class="actionBtn" data-use="${id}">吃掉（体力 +18）</button>`;
    if(id==="soap"&&n>0)action=`<button class="actionBtn" data-use="${id}">使用（怀疑 -6 · 信任 +2）</button>`;
    if(id==="casefile"&&n===0){const ready=evidenceCount(S)>=3&&hasItem(S,"carbon")&&hasItem(S,"envelope");action=`<div class="craftRequirements">需要：关键证据 ${evidenceCount(S)}/3 · 复写纸 ${S.inventory.carbon}/1 · 防水信封 ${S.inventory.envelope}/1</div><button class="actionBtn" data-craft="casefile" ${ready?"":"disabled"}>整理密封证据包</button>`}
    d.innerHTML=`<div class="itemTop"><span class="itemIcon">${m.icon}</span><b>× ${n}</b></div><strong>${m.name}</strong><small>${m.desc}</small>${critical}${action}`;
    $("inventoryGrid").appendChild(d);
  });
  const shop=[["tea",8],["book",12],["snack",6],["notebook",10],["phonecard",18],["soap",8],["carbon",14],["envelope",16],["flashlight",24]];
  $("shopGrid").innerHTML="";
  shop.forEach(([id,price])=>{
    const m=itemMeta[id],d=document.createElement("div");d.className="shopItem";
    d.innerHTML=`<div class="itemTop"><span class="itemIcon">${m.icon}</span><b>${price} 积分</b></div><strong>${m.name}</strong><small>${m.desc}</small><button class="actionBtn" data-buy="${id}" data-price="${price}">购买</button>`;
    $("shopGrid").appendChild(d);
  });
  document.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buyItem(b.dataset.buy,+b.dataset.price));
  document.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>useItem(b.dataset.use));
  document.querySelectorAll("[data-craft]").forEach(b=>b.onclick=()=>craftEvidencePacket());
}
function escapeReadyLegal(){
  return evidenceCount(S)>=3&&hasItem(S,"casefile")&&S.externalContact&&S.legalPass&&S.trust>=78&&S.relations.nurse>=30&&S.skills.social.lv>=3&&S.drug<60;
}
function escapeReadyTunnel(){
  return evidenceCount(S)>=3&&hasItem(S,"casefile")&&hasItem(S,"flashlight")&&S.externalContact&&S.intel.tunnelMap&&S.skills.fitness.lv>=3&&S.skills.observe.lv>=3&&S.suspicion<80&&S.drug<35;
}
function escapeReadyAny(){return escapeReadyLegal()||escapeReadyTunnel()}
function renderEscape(){
  const checks=[
    ["3份关键证据",`${evidenceCount(S)}/3`,evidenceCount(S)>=3],
    ["病历原件",S.intel.originalFile?"已找到":"未找到",S.intel.originalFile],
    ["密封证据包",hasItem(S,"casefile")?"已整理":"缺复写纸/信封",hasItem(S,"casefile")],
    ["院外联络",S.externalContact?"已建立":"未建立",S.externalContact],
    ["可执行离院方案",(S.legalPass||S.intel.tunnelMap)?"已准备":"未准备",S.legalPass||S.intel.tunnelMap],
    ["观察能力","Lv."+S.skills.observe.lv,S.skills.observe.lv>=3],
    ["社会支持","社交 Lv."+S.skills.social.lv,S.skills.social.lv>=3],
    ["清醒程度",`药物负荷 ${S.drug}`,S.drug<60]
  ];
  $("escapeChecklist").innerHTML=checks.map(([a,b,ok])=>`<div class="checkItem ${ok?"done":""}"><b>${ok?"✓ ":""}${a}</b><span>${b}</span></div>`).join("");
  const legal=escapeReadyLegal(),tunnel=escapeReadyTunnel();
  const req=(ok,text)=>`<li class="${ok?"met":"missing"}">${ok?"✓":"○"} ${text}</li>`;
  $("escapeRoutes").innerHTML=`
    <div class="routeCard ${legal?"ready":""}">
      <div class="eyebrow">方案 A</div><h3>合法离院 · 申诉复核</h3>
      <p>把证据交给院外联系人，并利用稳定的院方评价争取紧急复核。你会从正门走出去。</p>
      <ul>${req(evidenceCount(S)>=3,`关键证据 ${evidenceCount(S)}/3`)}${req(hasItem(S,"casefile"),"密封证据包")}${req(S.externalContact,"已联系院外")}${req(S.legalPass,"已提交复核申请表")}${req(S.trust>=78,`信任 ${S.trust}/78`)}${req(S.relations.nurse>=30,`护士林关系 ${S.relations.nurse}/30`)}${req(S.skills.social.lv>=3,`社交 Lv.${S.skills.social.lv}/3`)}${req(S.drug<60,`药物负荷 ${S.drug}/60`)}</ul>
      <button class="routeBtn" id="legalEscape" ${legal?"":"disabled"}>${legal?"执行合法离院":"条件未满足"}</button>
    </div>
    <div class="routeCard ${tunnel?"ready":""}">
      <div class="eyebrow">方案 B</div><h3>夜间离院 · 维修通道</h3>
      <p>让院外的人带着证据等待，你从旧后勤通道离开。成功后再公开证据恢复身份。</p>
      <ul>${req(evidenceCount(S)>=3,`关键证据 ${evidenceCount(S)}/3`)}${req(hasItem(S,"casefile"),"密封证据包")}${req(hasItem(S,"flashlight"),"袖珍手电")}${req(S.externalContact,"已联系院外")}${req(S.intel.tunnelMap,"维修通道地图")}${req(S.skills.fitness.lv>=3,`体能 Lv.${S.skills.fitness.lv}/3`)}${req(S.skills.observe.lv>=3,`观察 Lv.${S.skills.observe.lv}/3`)}${req(S.suspicion<80,`怀疑 ${S.suspicion}/80`)}${req(S.drug<35,`药物负荷 ${S.drug}/35`)}</ul>
      <button class="routeBtn" id="tunnelEscape" ${tunnel?"":"disabled"}>${tunnel?"今晚执行计划":"条件未满足"}</button>
    </div>`;
  if(legal)$("legalEscape").onclick=()=>executeEscape("legal");
  if(tunnel)$("tunnelEscape").onclick=()=>executeEscape("tunnel");
  const pct=progressPct();
  $("progressPct").textContent=pct+"%";
  document.querySelector(".escapeProgressCard .progressRing").style.setProperty("--pct",(pct*3.6)+"deg");
}
function renderConditions(){
  const effect=drugEffect();
  const tags=[`⚡ 体力 ${S.energy}`,`💊 药物负荷 ${S.drug}`,`🧠 ${effect.name}`,`🙂 信任 ${S.trust}`,`👁 怀疑 ${S.suspicion}`];
  if(S.externalContact)tags.push("☎️ 已联系院外");
  if(S.legalPass)tags.push("📄 已获复核资格");
  if(hasItem(S,"casefile"))tags.push("🗂️ 证据包已密封");
  $("conditionTags").innerHTML=tags.map(x=>`<span>${x}</span>`).join("");
  $("contextTip").textContent=S.drug>=25?`当前${effect.name}：${effect.desc}`:(evidenceCount(S)>=3&&!hasItem(S,"casefile")?"三份关键证据需要与复写纸、防水信封组合，才能成为可带离医院的密封证据包。":(S.suspicion>=65?"怀疑达到较高水平时，高风险调查会更容易带来额外代价。":(evidenceCount(S)>=3&&!S.externalContact?"三份关键证据与院外联络是两项独立的离院条件。":"工作、关系、技能、物品和情报都会跨天保留。")));
}
function escapeText(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderLog(){
  const entries=S.logs.filter(entry=>(Number(entry.day)||S.day)===S.day);
  $("log").innerHTML=entries.length?entries.map(entry=>{
    const chips=(entry.changes||[]).map(change=>`<span class="changeChip ${change.tone||"neutral"}">${escapeText(change.text)}</span>`).join("");
    return `<article class="logEntry"><div class="logMessage">${escapeText(entry.message)}</div>${chips?`<div class="logChanges">${chips}</div>`:""}</article>`;
  }).join(""):`<div class="logEmpty">今天还没有新的记录。完成行动后，数值变化会显示在这里。</div>`;
  $("activityLatest").textContent=entries.length?`最新：${entries[entries.length-1].message}`:"最新：等待今天的第一条记录";
  $("logCount").textContent=`${entries.length} 条记录`;
  requestAnimationFrame(()=>{$("log").scrollTop=$("log").scrollHeight});
}

function morningTreatment(){
  if(S.morningDone)return;
  $("dayActionContent").classList.add("hidden");$("dayActionContent").setAttribute("aria-hidden","true");
  const box=$("morningEvent");box.classList.remove("hidden");
  const effect=drugEffect();
  box.innerHTML=`<h3>晨间治疗</h3><p>护士递来今天的常规药物。药物负荷会影响后续行动的体力消耗、能力成长和离院条件。</p><div class="drugImpact">当前药物状态：${effect.name}。${effect.desc}</div><div class="morningChoices">
    <button class="secondary" data-med="full"><b>按医嘱服用</b><br><small>信任 +6 · 药物负荷 +18 · 体力 -5；可能进入迟钝或强镇静</small></button>
    <button class="secondary" data-med="half"><b>只服一半</b><br><small>信任 +2 · 药物负荷 +8 · 怀疑 +3</small></button>
    <button class="secondary" data-med="avoid"><b>设法避开</b><br><small>药物负荷不增加 · 信任 -3 · 怀疑 +8</small></button>
  </div>`;
  box.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>trackAction(()=>{
    const k=b.dataset.med;
    if(k==="full"){S.trust+=6;S.drug+=18;S.energy-=5;gainRelation("nurse",2);toastLog(`你配合完成晨间治疗。当前药物状态：${drugEffect().name}。`)} 
    if(k==="half"){S.trust+=2;S.drug+=8;S.suspicion+=3;toastLog(`你只服下一半，暂时没有被发现。当前药物状态：${drugEffect().name}。`)} 
    if(k==="avoid"){S.trust-=3;S.suspicion+=8;gainSkill("observe",10);toastLog(`你避开了服药，但护士多看了你一眼。当前药物状态：${drugEffect().name}。`)} 
    S.morningDone=true;box.classList.add("hidden");S.trust=clamp(S.trust,0,100);S.suspicion=clamp(S.suspicion,0,100);render();saveGame(false);
    setTimeout(triggerDailyStory,180);
  }));
}
function openLocation(id){
  if(!S.morningDone){toastLog("先处理晨间治疗。");return}
  if(S.actions<=0){toastLog("今天没有自由行动了。");return}
  const map={
    ward:wardEvent,workshop:workshopEvent,garden:gardenEvent,library:libraryEvent,cafeteria:cafeteriaEvent,
    laundry:laundryEvent,nurse:nurseEvent,archives:archivesEvent,visitor:visitorEvent,maintenance:maintenanceEvent
  };
  map[id]();
}
function openEvent({eyebrow="行动",title,text,img="ward.webp",choices=[]}){
  lastFocusedElement=document.activeElement;
  $("eventEyebrow").textContent=eyebrow;$("eventTitle").textContent=title;$("eventText").textContent=text;$("eventImg").src="assets/"+img;
  $("eventChoices").innerHTML="";
  choices.forEach(c=>{
    const b=document.createElement("button"),effect=drugEffect();b.className="eventChoice";
    let sub=c.sub||"";
    if(effect.energyPenalty>0)sub=sub.replace(/体力 -(\d+)/g,(_,n)=>`体力 -${Number(n)+effect.energyPenalty}（含药物 +${effect.energyPenalty}）`);
    if(effect.xpRate<1&&/(XP|成长)/.test(sub))sub+=` · 当前成长效率 ${Math.round(effect.xpRate*100)}%`;
    b.innerHTML=`<b>${c.title}</b><span>${sub}</span>`;b.onclick=()=>{trackAction(()=>{if(c.fn)c.fn()});closeEvent()};$("eventChoices").appendChild(b)
  });
  $("eventModal").classList.remove("hidden");
  requestAnimationFrame(()=>( $("eventChoices").querySelector("button") || $("closeEventBtn") ).focus());
}
function openSimpleEvent(eyebrow,title,text,icon,img){openEvent({eyebrow,title:`${icon||""} ${title}`,text,img,choices:[{title:"知道了",fn:()=>{}}]})}
function closeEvent(){$("eventModal").classList.add("hidden");render();saveGame(false);lastFocusedElement?.focus?.();checkAutoEnd()}
function checkAutoEnd(){if(S.actions<=0&&!S.completed)setTimeout(()=>endDay(),250)}

function triggerDailyStory(){
  if(!$("eventModal").classList.contains("hidden"))return;
  if(S.day===3&&!S.storyFlags.xiaowenNote){
    S.storyFlags.xiaowenNote=true;saveGame(false);
    openEvent({eyebrow:"剧情分支 · 小文",title:"夹在书页里的纸条",text:"小文把一本旧诗集推到你面前。书脊里夹着一张求助纸条，上面写着一个陌生姓名和“每周二 21:10”。走廊另一头，护士林正朝这里走来。",img:"library.webp",choices:[
      {title:"收下纸条并替她保密",sub:"获得线索 · 小文关系上升 · 怀疑上升",fn:()=>{gainRelation("xiaowen",14);S.suspicion+=4;addIntel("foldedNote");toastLog("你把纸条藏进衣袖，小文第一次说出了那名患者的原名。")}},
      {title:"把纸条交给护士林核对",sub:"信任与护士关系上升 · 小文关系下降",fn:()=>{S.trust+=7;gainRelation("nurse",10);gainRelation("xiaowen",-6,true);addIntel("stampMismatch");toastLog("护士林没有收走纸条，而是指出纸上的蓝章早已停用。")}},
      {title:"把书原样还给小文",sub:"小文关系小幅上升 · 不获得线索",fn:()=>{gainRelation("xiaowen",7);S.trust+=1;toastLog("你没有追问。小文记住了你没有逼她表态。")}}
    ]});
    return;
  }
  if(S.day===6&&!S.storyFlags.inspection){
    S.storyFlags.inspection=true;saveGame(false);
    openEvent({eyebrow:"剧情分支 · 临时检查",title:"主任查房提前了",text:"主任临时检查病区，桌上放着你的评估表。他问你是否仍然坚持“病历写错了”。护士林站在一旁，没有替任何人说话。",img:"nurse.webp",choices:[
      {title:"只陈述可以核对的编号矛盾",sub:"需要至少 2 条线索 · 成功时信任与护士关系上升",fn:()=>{if(countIntel(S)<2){S.suspicion+=4;toastLog("你说出的细节还不足以互相印证，主任把它记成了反复申诉。");return}S.trust+=8;S.suspicion=Math.max(0,S.suspicion-3);gainRelation("nurse",6);gainSkill("social",30);toastLog("你没有判断动机，只列出编号、日期和印章。主任第一次要求复印材料。")}},
      {title:"展示腕带与蓝章的矛盾",sub:"需要错误腕带编号 · 可获得印章线索",fn:()=>{if(!S.intel.wristband){S.suspicion+=3;toastLog("你还拿不出具体编号，谈话很快结束。");return}S.trust+=3;S.suspicion+=2;gainSkill("observe",25);addIntel("stampMismatch");toastLog("护士林确认：腕带登记日与蓝章启用日期不可能同时成立。")}},
      {title:"保持沉默，观察他们如何记录",sub:"怀疑下降 · 观察成长",fn:()=>{S.suspicion=Math.max(0,S.suspicion-4);gainSkill("observe",20);toastLog("你没有争辩，只记住了主任把评估表放回哪一只文件夹。")}}
    ]});
    return;
  }
  if(S.day===9&&!S.storyFlags.chenValve){
    S.storyFlags.chenValve=true;saveGame(false);
    openEvent({eyebrow:"剧情分支 · 陈伯",title:"维修间少了一只阀门",text:"陈伯发现旧通道的检修阀被拆走了。库房还有备用件，但领用记录会留下名字。护士站也在追查丢失的工具。",img:"maintenance.webp",choices:[
      {title:"拿出材料和陈伯一起修好",sub:"材料 -1 · 陈伯关系与工作成长上升",fn:()=>{if(!hasItem(S,"material")){toastLog("你没有合适的材料，陈伯只能暂时封住接口。");return}S.inventory.material--;gainRelation("chen",16);gainSkill("work",35);toastLog("阀门重新转动。陈伯说，这条路现在至少不会被蒸汽封死。")}},
      {title:"把缺件情况报告护士站",sub:"信任上升 · 陈伯关系下降",fn:()=>{S.trust+=8;gainRelation("nurse",5);gainRelation("chen",-8,true);toastLog("库房补发了阀门，但陈伯整晚没有再和你说话。")}},
      {title:"藏起附近的备用工具",sub:"材料 +2 · 怀疑上升",fn:()=>{S.inventory.material+=2;S.suspicion+=7;toastLog("你留下了两件可能有用的零件，工具清点却多出了一处缺口。")}}
    ]});
  }
}

function archiveBoxPuzzle(){
  openEvent({eyebrow:"线索谜题 · 三只档案盒",title:"只有一句标签是真的",text:"绿盒写着“病历不在绿盒”；蓝盒写着“病历在灰盒”；灰盒写着“蓝盒标签是假的”。编目便签说明：三句话中只有一句真话。病历藏在哪只盒子里？",img:"archives.webp",choices:[
    {title:"打开绿盒",sub:"选择绿盒",fn:()=>{if(!useAction(20))return;S.suspicion+=4;gainSkill("observe",45);addIntel("originalFile");toastLog("答案正确：蓝盒与灰盒的标签互相否定，必有一句为真；所以绿盒标签必须为假，病历就在绿盒。")}},
    {title:"打开蓝盒",sub:"选择蓝盒 · 错误会消耗行动并增加怀疑",fn:()=>{if(!useAction(15))return;S.suspicion+=6;toastLog("蓝盒是空的。若病历在蓝盒，绿盒与灰盒会同时为真，不符合“只有一句真话”。")}},
    {title:"打开灰盒",sub:"选择灰盒 · 错误会消耗行动并增加怀疑",fn:()=>{if(!useAction(15))return;S.suspicion+=6;toastLog("灰盒只有旧处方。若病历在灰盒，绿盒与蓝盒会同时为真。")}}
  ]});
}

function wardEvent(){
  openEvent({title:"回到病房",text:"你的床位是少数真正属于自己的空间。休息不会消耗自由行动；整理床位则会用掉一个时段，但能改善院方评价。",img:"ward.webp",choices:[
    {title:"休息一会儿",sub:"不消耗行动 · 体力 +30",fn:()=>{S.energy=clamp(S.energy+30,0,100);toastLog("你在病房休息，体力恢复。")}},
    {title:"整理床位和公共区域",sub:"消耗 1 行动 · 体力 -5 · 信任 +5",fn:()=>{if(!useAction(5))return;S.trust+=5;S.suspicion=Math.max(0,S.suspicion-2);toastLog("你主动整理了病房，日常评价改善。")}}
  ]});
}
function workshopEvent(){
  openEvent({title:"作业疗法工作坊",text:"木工、简单维修和包装工作是你最稳定的积分来源。技能越高，收益越好。",img:"workshop.webp",choices:[
    {title:"认真完成今天的工疗",sub:"1 行动 · 体力 -18 · 工作 XP +40 · 积分与材料",fn:()=>{if(!useAction(18))return;gainSkill("work",40);const earn=10+S.skills.work.lv*3;S.tokens+=earn;S.inventory.material+=S.skills.work.lv>=2?2:1;S.trust+=3;toastLog(`完成工疗：积分 +${earn}，材料 +${S.skills.work.lv>=2?2:1}。`) }},
    {title:"趁空档锻炼搬运",sub:"1 行动 · 体力 -22 · 体能 XP +40",fn:()=>{if(!useAction(22))return;gainSkill("fitness",40);toastLog("你把搬运工作当成训练，体能提高。")}}
  ]});
}
function gardenEvent(){
  openEvent({title:"康复花园",text:"这里是病友最放松的地方。你可以锻炼，也可以选择和某个人坐下来聊聊。",img:"garden.webp",choices:[
    {title:"锻炼身体",sub:"1 行动 · 体力 -20 · 体能 XP +45",fn:()=>{if(!useAction(20))return;gainSkill("fitness",45);S.suspicion=Math.max(0,S.suspicion-1);toastLog("完成一轮康复训练。")}},
    {title:"找老张聊天",sub:"1 行动 · 体力 -10 · 老张关系 +10 · 社交 XP",fn:()=>{if(!useAction(10))return;gainRelation("zhang",10);gainSkill("social",30);if(S.requests.zhangTea&&S.relations.zhang>=35&&!S.intel.nightRoster)addIntel("nightRoster");toastLog("你和老张聊了很久。")}},
    {title:"找陈伯聊天",sub:"1 行动 · 体力 -10 · 陈伯关系 +10",fn:()=>{if(!useAction(10))return;gainRelation("chen",10);gainSkill("social",25);toastLog("陈伯对你说起旧楼维修间。")}},
    {title:"拆开长椅下的纸鹤",sub:"需要：小文关系 ≥ 35 · 可获得求助纸条线索",fn:()=>{if(S.relations.xiaowen<35){toastLog("纸鹤只有一半编号，你还不知道另一半在哪里。");return}if(!useAction(8))return;gainSkill("observe",25);addIntel("foldedNote");toastLog("纸鹤内侧写着同一个姓名和每周二的探视时间。")} }
  ]});
}
function libraryEvent(){
  openEvent({title:"图书室",text:"你可以查阅院规、旧院刊和公开资料。很多有用的信息并不秘密，只是没人认真看。",img:"library.webp",choices:[
    {title:"研究院规和评估流程",sub:"1 行动 · 体力 -12 · 观察 XP +45",fn:()=>{if(!useAction(12))return;gainSkill("observe",45);if(S.skills.observe.lv>=2&&!S.intel.rules)addIntel("rules");if(!S.intel.wristband)addIntel("wristband");toastLog("你把腕带编号、病历编号和院规逐条记了下来。")}},
    {title:"陪小文整理书架",sub:"1 行动 · 体力 -10 · 小文关系 +12 · 社交 XP",fn:()=>{if(!useAction(10))return;gainRelation("xiaowen",12);gainSkill("social",30);toastLog("你和小文一起整理书架，她对你的来历越来越好奇。")}},
    {title:"整理旧档案编目卡",sub:"1 行动 · 体力 -12 · 观察 XP +35 · 获得编目线索",fn:()=>{if(!useAction(12))return;gainSkill("observe",35);addIntel("catalogNote");toastLog("你在退色的卡片背面读到：三只文件盒的标签中只有一句真话。")} }
  ]});
}
function cafeteriaEvent(){
  openEvent({title:"食堂帮工",text:"食堂工作轻松一些，收益不高，但能恢复一点体力，也容易听到各区的闲谈。",img:"cafeteria.webp",choices:[
    {title:"参加食堂帮工",sub:"1 行动 · 体力 -14（结束后 +8）· 工作 XP +30 · 积分 +10",fn:()=>{if(!useAction(14))return;gainSkill("work",30);S.tokens+=10;S.energy=clamp(S.energy+8,0,100);S.trust+=2;toastLog("食堂帮工结束，你顺便吃了点热食。")}},
    {title:"坐下来和大家吃饭",sub:"1 行动 · 体力 -6 · 社交 XP +35 · 随机关系 +8",fn:()=>{if(!useAction(6))return;gainSkill("social",35);const ids=["zhang","chen","xiaowen"];const id=ids[Math.floor(Math.random()*ids.length)];gainRelation(id,8);toastLog("一顿普通的饭，让你和病友更熟了。")}},
    {title:"核对餐盘底部的编号",sub:"1 行动 · 体力 -8 · 观察 XP +30 · 获得编号线索",fn:()=>{if(!useAction(8))return;gainSkill("observe",30);S.suspicion+=2;addIntel("trayMark");toastLog("你的餐盘和一张旧出院照片里的餐盘，都刻着 E2-071。")} }
  ]});
}
function laundryEvent(){
  openEvent({title:"洗衣房",text:"床单、制服、文件袋都从这里经过。它既是后勤岗位，也是观察医院运行方式的好地方。",img:"laundry.webp",choices:[
    {title:"正常完成洗衣工疗",sub:"1 行动 · 体力 -18 · 工作 XP +38 · 积分 +14 · 材料 +1",fn:()=>{if(!useAction(18))return;gainSkill("work",38);S.tokens+=14;S.inventory.material++;S.trust+=3;if(S.skills.observe.lv>=2&&!S.intel.transferCopy)addIntel("transferCopy");toastLog("你完成后勤工作，并注意到一只被重复贴签的文件袋。")}},
    {title:"观察文件和制服流向",sub:"1 行动 · 体力 -16 · 观察 XP +45 · 怀疑 +4",fn:()=>{if(!useAction(16))return;gainSkill("observe",45);S.suspicion+=4;if(!S.intel.transferCopy)addIntel("transferCopy");toastLog("你确认自己的转院单被人改动过。")}}
  ]});
}
function nurseEvent(){
  openEvent({title:"护士站",text:"护士林并不知道全部真相，但她熟悉院方评价制度。与其把她当敌人，不如让她看到你稳定、清楚的一面。",img:"nurse.webp",choices:[
    {title:"帮忙整理活动用品",sub:"1 行动 · 体力 -10 · 信任 +6 · 护士林关系 +8",fn:()=>{if(!useAction(10))return;S.trust+=6;gainRelation("nurse",8);gainSkill("social",15);toastLog("护士林对你的评价明显改善。")}},
    {title:"冷静说明病历里的矛盾",sub:"1 行动 · 体力 -10 · 需至少 2 条线索",fn:()=>{if(countIntel(S)<2){toastLog("你现在只有感觉，没有足够具体的矛盾点。");return}if(!useAction(10))return;gainRelation("nurse",12);S.trust+=3;gainSkill("social",25);toastLog("你没有说“有人害我”，而是只指出两个可核对的编号问题。护士林第一次认真记了下来。")}},
    {title:"核对印章领用登记",sub:"需要：餐盘编号或求助纸条 · 观察 XP +35 · 获得印章线索",fn:()=>{if(!S.intel.trayMark&&!S.intel.foldedNote){toastLog("你还没有能与领用日期交叉核对的编号。");return}if(!useAction(10))return;gainSkill("observe",35);gainRelation("nurse",5);addIntel("stampMismatch");toastLog("登记表显示，那枚蓝色骑缝章在你的转院单日期前已经停用。")} },
    {title:"递交正式复核申请",sub:"需要：复核申请表 ×1 · 信任 ≥75 · 护士林关系 ≥30 · 社交 Lv.3",fn:()=>{if(S.legalPass){toastLog("正式复核申请已经递交。");return}if(!hasItem(S,"form")||S.trust<75||S.relations.nurse<30||S.skills.social.lv<3){toastLog("申请条件不足：需要复核申请表、信任 75、护士林关系 30 和社交 Lv.3。");return}if(!useAction(8))return;S.inventory.form--;S.legalPass=true;toastLog("护士林接过申请表，把你的三项可核对矛盾写进正式复核流程。")}}
  ]});
}
function archivesEvent(){
  openEvent({title:"档案室外围",text:"你已经知道该找什么。真正困难的不是“闯进去”，而是在公开工作流程里找到那份被藏起来的原件。",img:"archives.webp",choices:[
    {title:"核对旧档案索引",sub:"1 行动 · 体力 -16 · 观察 XP +35 · 获得编目线索",fn:()=>{if(!useAction(16))return;gainSkill("observe",35);S.suspicion+=3;addIntel("catalogNote");toastLog("索引没有姓名，只有绿、蓝、灰三只盒子和一句“仅一真”。")}},
    {title:"破解三只档案盒",sub:"需要：旧档案编目便签 · 进入逻辑谜题",fn:()=>{if(!S.intel.catalogNote){toastLog("三只盒子的标签互相矛盾，你还不知道哪条编目规则有效。");return}setTimeout(archiveBoxPuzzle,0)}},
    {title:"追查私人付款文件",sub:"需要：夜班记录，或求助纸条 + 印章线索；观察 Lv.3",fn:()=>{const route=S.intel.nightRoster||(S.intel.foldedNote&&S.intel.stampMismatch);if(!route||S.skills.observe.lv<3){toastLog("现有线索还不能锁定付款文件的日期和经手人。");return}if(!useAction(20))return;S.suspicion+=7;gainSkill("observe",35);addIntel("paymentRecord");toastLog("异常探视时间与付款入账时间完全重合。")}}
  ]});
}
function visitorEvent(){
  openEvent({title:"访客与电话区",text:"只要能把信息带到院外，证据才真正有意义。你可以用电话卡，也可以凭良好评价申请一次正式通话。",img:"visitor.webp",choices:[
    {title:"使用电话卡联系大学同学",sub:"消耗 电话卡 ×1 · 建立院外联络",fn:()=>{if(!hasItem(S,"phonecard")){toastLog("你没有电话卡。");return}if(!useAction(8))return;S.inventory.phonecard--;S.externalContact=true;gainSkill("social",25);toastLog("你联系上了大学同学周言。他答应保存你之后传出去的证据。")}},
    {title:"申请一次正式通话",sub:"需要：信任 ≥ 72 · 社交 Lv.2",fn:()=>{if(S.trust<72||S.skills.social.lv<2){toastLog("你的当前评估还不足以批准这次通话。");return}if(!useAction(8))return;S.externalContact=true;S.trust+=2;toastLog("你的通话申请获批。周言在电话另一头确认了你的真实身份。")}},
    {title:"托公益阅读志愿者带出口信",sub:"需要：完成小文请求 · 求助纸条 · 小文关系 ≥ 45",fn:()=>{if(!S.requests.xiaowenNotebook||!S.intel.foldedNote||S.relations.xiaowen<45){toastLog("还需要完成小文的请求，并取得求助纸条与足够关系。");return}if(!useAction(8))return;S.externalContact=true;gainRelation("xiaowen",6);gainSkill("social",30);toastLog("志愿者把纸条照片和你的真实姓名带给了周言。")} }
  ]});
}
function maintenanceEvent(){
  openEvent({title:"后勤维修间",text:"陈伯说旧楼以前有一条用于锅炉检修的通道。现在只剩后勤人员知道入口。",img:"maintenance.webp",choices:[
    {title:"和陈伯一起整理维修间",sub:"1 行动 · 体力 -18 · 陈伯关系 +12 · 工作 XP",fn:()=>{if(!useAction(18))return;gainRelation("chen",12);gainSkill("work",30);S.inventory.material+=2;toastLog("你帮陈伯整理零件，他开始把你当真正的朋友。")}},
    {title:"请陈伯画出旧维修通道",sub:"需要：完成陈伯请求 · 关系 ≥55 · 材料 ×3",fn:()=>{if(!S.requests.chenSnack||S.relations.chen<55||!hasItem(S,"material",3)){toastLog("还需要先完成陈伯的请求、建立足够关系，并准备 3 份材料。");return}if(!useAction(12))return;S.inventory.material-=3;addIntel("tunnelMap");toastLog("陈伯画出一张简图，并帮你确认旧门还能打开。")}}
  ]});
}
function talkNPC(id){
  return trackAction(()=>{
    if(!S.morningDone){toastLog("先处理晨间治疗。");return}
    const meta=requestMeta[id],done=S.requests[meta.flag];
    if(!done&&S.relations[id]>=30){toastLog(`你们已经熟悉，但关系没有继续深入。先帮对方找到${itemMeta[meta.item].name}。`);return}
    if(!useAction(8))return;
    const intendedGain=done?(S.relations[id]<55?7:3):10,gain=gainRelation(id,intendedGain);gainSkill("social",25);
    if(id==="zhang"&&done&&S.relations.zhang>=35&&!S.intel.nightRoster)addIntel("nightRoster");
    if(id==="xiaowen"&&S.relations.xiaowen>=45&&!S.externalContact&&S.skills.social.lv>=2){toastLog("小文说：她认识一个每周来院里做公益阅读的人，也许能帮你带话。")} 
    toastLog(`你们聊了一会儿，关系提升 ${gain}。${done?"之前的帮助让谈话更有分量。":"再深入需要用实际帮助建立信任。"}`);render();checkAutoEnd()
  });
}
function helpNPC(id){
  return trackAction(()=>{
    if(!S.morningDone){toastLog("先处理晨间治疗。");return}
    const meta=requestMeta[id],{item,flag,gain,rewardItem,reward}=meta;
    if(S.requests[flag]){toastLog("这个请求已经完成了。");return}
    if(!hasItem(S,item)){toastLog(`你没有${itemMeta[item].name}。`);return}
    S.inventory[item]--;S.requests[flag]=true;gainRelation(id,gain);S.trust+=1;gainSkill("social",15);
    if(id==="zhang"&&!S.intel.nightRoster)addIntel("nightRoster");
    if(id==="chen")S.inventory.material+=1;
    S.inventory[rewardItem]=(S.inventory[rewardItem]||0)+1;
    const person={zhang:"老张",chen:"陈伯",xiaowen:"小文",nurse:"护士林"}[id];
    toastLog(`你完成了${person}的请求。关系突破，并获得：${reward}。`);
    render();saveGame(false)
  });
}
function buyItem(id,price){return trackAction(()=>{if(S.tokens<price){toastLog("积分不够。");return}S.tokens-=price;S.inventory[id]++;toastLog(`购买：${itemMeta[id].name}。`);render()})}
function useItem(id){return trackAction(()=>{
  if(id==="snack"&&S.inventory.snack>0){S.inventory.snack--;S.energy=clamp(S.energy+18,0,100);toastLog("你吃了点心，体力恢复。")}
  if(id==="soap"&&S.inventory.soap>0){S.inventory.soap--;S.suspicion=Math.max(0,S.suspicion-6);S.trust+=2;toastLog("你整理好个人状态，查房记录变得更稳定。")}
  render();saveGame(false)
})}
function craftEvidencePacket(){return trackAction(()=>{
  if(hasItem(S,"casefile")){toastLog("密封证据包已经整理完成。");return}
  if(evidenceCount(S)<3||!hasItem(S,"carbon")||!hasItem(S,"envelope")){toastLog("还需要三份关键证据、复写纸和防水信封。");return}
  S.inventory.carbon--;S.inventory.envelope--;S.inventory.casefile++;
  toastLog("你用复写纸留下备份，再把三份关键证据封入防水信封。密封证据包已完成。");render();saveGame(false)
})}

function endDay(skipConfirmation=false){
  if($("dayEndModal").classList.contains("hidden")===false)return;
  if(!skipConfirmation&&S.actions>0&&!window.confirm(`今天还剩 ${S.actions} 次行动。确定提前结束今天吗？`))return;
  const beforeRest=captureFeedback();
  S.drug=Math.max(0,S.drug-14);S.suspicion=Math.max(0,S.suspicion-5);S.energy=clamp(S.energy+45,0,100);
  normalizeStats();
  const restChanges=feedbackChanges(beforeRest,captureFeedback());
  let overnight="夜里很安静。你睡了一觉，药物负荷和怀疑都有所下降。";
  if(S.day===2){overnight="你听见走廊里有人说，洗衣房最近在集中整理一批旧档案袋。"}
  if(S.day===4){overnight="公告栏贴出通知：下周会进行一次集中康复评估。表现稳定的人可以申请额外通话。"}
  if(S.day===6){overnight="陈伯提到：旧楼维修间后面的墙，比其他地方薄得多。"}
  if(S.day===9&&!S.externalContact){overnight="倒计时越来越短。只有把证据送到院外，离开才真正有意义。"}
  $("dayEndTitle").textContent=`第 ${S.day} 天结束`;
  $("dayEndText").innerHTML=`今天的选择不会清零。能力、关系、信任、物资和情报都会带到明天。<div class="logChanges">${restChanges.map(change=>`<span class="changeChip ${change.tone}">${change.text}</span>`).join("")}</div>`;
  $("dayEndStats").innerHTML=`<div><b>${S.energy}</b><br><small>明日体力</small></div><div><b>${S.trust}</b><br><small>信任</small></div><div><b>${evidenceCount(S)}</b><br><small>关键证据</small></div><div><b>${progressPct()}%</b><br><small>离院准备</small></div>`;
  $("overnightEvent").textContent=overnight;
  $("dayEndModal").classList.remove("hidden");saveGame(false)
}
function nextDay(){
  S.day++;S.period=0;S.actions=4;S.morningDone=false;
  $("dayEndModal").classList.add("hidden");
  if(S.day>=15&&!S.completed){failGame();return}
  toastLog(`第 ${S.day} 天开始。新的行动与事件会记录在这里。`,false);
  setScreen("gameScreen");render();morningTreatment();saveGame(false)
}
function failGame(){
  $("failTitle").textContent="你被转往高戒备病区";
  $("failText").textContent=`第 15 天到了。你还没有形成可以执行的离院计划。能力、关系、关键物品、证据包和院外联络缺一不可。`;
  setScreen("failScreen");deleteSave()
}
function executeEscape(route){
  if(route==="legal"&&!escapeReadyLegal())return;
  if(route==="tunnel"&&!escapeReadyTunnel())return;
  S.completed=true;saveGame(false);
  $("endingImage").src=route==="legal"?"assets/garden.webp":"assets/hospital.webp";
  if(route==="legal"){
    $("endingTitle").textContent="你从正门走了出去。";
    $("endingText").innerHTML="你把密封证据包交给周言，护士林则递交了正式复核申请。复写备份让院方无法收回唯一原件，补充评估也让所有矛盾进入可核对的程序。下午 4:20，你拿回自己的名字和证件。<br><br><b>你没有证明自己“正常”。你只是终于让事实进入了一套能被核对的程序。</b>";
  }else{
    $("endingTitle").textContent="花园外面，没有铁门。";
    $("endingText").innerHTML="陈伯确认的维修通道仍然可用。你用袖珍手电穿过断电的旧锅炉间，带着防水密封的证据包从花园外侧检修口离开。周言已经等在那里。<br><br><b>真正的逃离不是越过那堵墙，而是让墙外的人知道发生过什么。</b>";
  }
  $("endingStats").innerHTML=`<div><b>${S.day}</b><br><small>离院天数</small></div><div><b>${evidenceCount(S)}/3</b><br><small>关键证据</small></div><div><b>${S.trust}</b><br><small>院方信任</small></div><div><b>${S.suspicion}</b><br><small>最终怀疑</small></div>`;
  setScreen("endingScreen");deleteSave()
}

function newGame(){
  if(localStorage.getItem(SAVE_KEY)&&!window.confirm("开始新游戏会覆盖当前存档，确定继续吗？"))return;
  S=defaultState();deleteSave();setScreen("introScreen")
}
function continueGame(){if(loadGame()){setScreen("gameScreen");render();if(!S.morningDone)morningTreatment();else setTimeout(triggerDailyStory,180)}}
function startFromIntro(){setScreen("gameScreen");render();morningTreatment();saveGame(false)}

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");
  document.querySelectorAll(".contentPanel").forEach(p=>p.classList.remove("active"));$(t.dataset.panel).classList.add("active");render()
});
$("newGameBtn").onclick=newGame;$("continueBtn").onclick=continueGame;$("enterBtn").onclick=startFromIntro;
$("saveBtn").onclick=()=>saveGame(true);$("endDayBtn").onclick=()=>endDay();$("nextDayBtn").onclick=nextDay;
$("closeEventBtn").onclick=closeEvent;$("intelRevealConfirm").onclick=confirmIntelReveal;$("endingRestart").onclick=()=>{deleteSave();location.reload()};$("failRestart").onclick=()=>{deleteSave();location.reload()};
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("intelRevealModal").classList.contains("hidden")){e.preventDefault();return}
  if(e.key==="Escape"&&!$("eventModal").classList.contains("hidden"))closeEvent();
  if(e.altKey&&/^[1-6]$/.test(e.key)){
    e.preventDefault();const tab=document.querySelectorAll(".tab")[Number(e.key)-1];if(tab)activatePanel(tab.dataset.panel);
  }
});

if(localStorage.getItem(SAVE_KEY))$("continueBtn").classList.remove("hidden");
setScreen("titleScreen");
