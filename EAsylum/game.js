const $=id=>document.getElementById(id);
const SAVE_KEY="escape_asylum_demo_v1_save";
const SAVE_VERSION=13;
const CONFINEMENT_INTERRUPT=Symbol("confinement-interrupt");
let toastTimer=null;
let lastFocusedElement=null;
let intelRevealQueue=[];
let currentIntelReveal=null;
let shopFirstPurchasePending=false;

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
  battery:{name:"对讲机电池",icon:"🔋",desc:"保安赵卫国的旧对讲机经常断电。帮他换上电池，才能让他愿意谈起真实交班情况。"},
  gatepass:{name:"旧门禁牌",icon:"🪪",desc:"赵卫国保留的旧西侧门禁牌，编号可以避开已经联网的新门禁，是维修通道离院的关键物品。"},
  form:{name:"复核申请表",icon:"📝",desc:"合法离院的关键表格，只能通过帮助护士林获得。"},
  casefile:{name:"密封证据包",icon:"🗂️",desc:"由三份关键证据、复写纸与防水信封整理而成，是合法离院方案 A 的关键物品。"}
};

const requestMeta={
  zhang:{item:"tea",flag:"zhangTea",gain:22,reward:"复写纸 ×1",rewardItem:"carbon"},
  chen:{item:"snack",flag:"chenSnack",gain:24,reward:"袖珍手电 ×1、零件材料 ×1",rewardItem:"flashlight"},
  xiaowen:{item:"notebook",flag:"xiaowenNotebook",gain:24,reward:"防水信封 ×1",rewardItem:"envelope"},
  nurse:{item:"book",flag:"nurseBook",gain:24,reward:"复核申请表 ×1",rewardItem:"form"},
  guard:{item:"battery",flag:"guardBattery",gain:24,reward:"旧门禁牌 ×1、院内巡逻周表",rewardItem:"gatepass"}
};
const shopCatalog=[["tea",8],["book",12],["snack",6],["notebook",10],["battery",10],["phonecard",18],["soap",8],["carbon",14],["envelope",16],["flashlight",24]];
const skillRevealDays={fitness:1,work:1,social:2,observe:3};
const itemRevealDays={tea:2,snack:2,soap:2,material:2,notebook:3,book:3,battery:3,gatepass:4,carbon:3,envelope:3,phonecard:4,form:4,casefile:4,flashlight:5};
const shopRevealDays={tea:2,snack:2,soap:2,notebook:3,book:3,battery:3,phonecard:4,carbon:5,envelope:5,flashlight:5};
const WEEKDAYS=["周一","周二","周三","周四","周五","周六","周日"];
function weekdayNumber(day=S.day){return ((Math.max(1,Number(day)||1)-1)%7)+1}
function weekdayName(day=S.day){return WEEKDAYS[weekdayNumber(day)-1]}
function weekNumber(day=S.day){return Math.floor((Math.max(1,Number(day)||1)-1)/7)+1}
function weekdayIs(...days){return days.includes(weekdayNumber())}
function weekdayList(days=[]){return days.map(day=>WEEKDAYS[day-1]).join("、")}

const intelMeta={
  wristband:{title:"错误腕带编号",icon:"🏷️",type:"基础线索",layer:1,desc:"你的腕带编号与病历页码根本对不上。",impact:"与餐盘编号、停用印章交叉后，可确认身份记录被复用。"},
  rules:{title:"院规与评估漏洞",icon:"📋",type:"基础线索",layer:1,desc:"“病情稳定”主要由行为记录与主治评估决定。",impact:"可改善复核策略，也是追踪文件流转规则的前提。"},
  trayMark:{title:"重复的餐盘编号",icon:"🥣",type:"基础线索",layer:1,desc:"你的餐盘编号与另一名早已出院的患者完全相同。",impact:"与腕带和印章组成身份替换链。"},
  catalogNote:{title:"旧档案编目便签",icon:"🔖",type:"基础线索",layer:1,desc:"旧档案不按姓名排列；三只文件盒的标签中只有一句真话。",impact:"与身份替换链共同解锁三只档案盒谜题。"},
  foldedNote:{title:"夹在书页里的求助纸条",icon:"✉️",type:"基础线索",layer:1,desc:"纸条记录了一个被改名后转走的患者，以及每周二的异常探视。",impact:"与夜班记录、停用印章交叉后，可定位异常探视时段。"},
  stampMismatch:{title:"不一致的蓝色骑缝章",icon:"🔵",type:"基础线索",layer:1,desc:"转院材料上的蓝章来自已停用的行政印章，日期对不上。",impact:"同时连接身份替换与异常探视两条调查链。"},
  nightRoster:{title:"异常夜班记录",icon:"🌙",type:"基础线索",layer:1,desc:"同一位院外人员每周两次在深夜进入行政区。",impact:"与求助纸条、停用印章交叉后，可解读探视排班。"},
  bagRoute:{title:"被调换的文件袋标签",icon:"🏷️",type:"基础线索",layer:1,desc:"洗衣房的三张流转标签被撕下后重新贴过，时间顺序明显不对。",impact:"与院规、编目便签交叉后，解锁文件袋流向谜题。"},
  valveMark:{title:"锅炉阀门刻痕",icon:"♨️",type:"基础线索",layer:1,desc:"红、蓝、绿三只阀门旁各有一道旧刻痕，像是留给检修工的顺序提示。",impact:"取得维修地图后，可解锁压力阀顺序谜题。"},
  patrolSchedule:{title:"院内巡逻周表",icon:"🚨",type:"周期排班",layer:1,desc:"赵卫国凭对讲机里的实际呼叫记录还原了巡逻周期：周二 21:00 交班、21:20 西侧巡查，中间存在固定空档。",impact:"只有取得保安的信任才能获得；参与异常探视链，并为维修通道选择安全离院日。",schedule:[["周一 / 周三","20:50 行政区常规巡查"],["周二","21:00 交班；21:20 西侧巡查"],["周四","21:10 双人复查，无空档"],["周五 / 周末","档案清点或花园外墙增巡"]]},
  guardTestimony:{title:"缺页的交班证词",icon:"🛡️",type:"人物证词",layer:1,desc:"赵卫国承认：周二交班簿总会被行政主任提前撕走一页，K-17 访客因此没有留下正式签名。",impact:"证明巡逻空档曾被院方内部人员刻意利用，是异常探视链不可替代的人证。"},
  treatmentSchedule:{title:"每周治疗安排",icon:"🩺",type:"周期排班",layer:1,desc:"院方治疗与评估按周循环，护士与主任会在固定时段离开各自岗位。",impact:"与巡逻、后勤周表交叉后，可确认周期性管理盲区。",schedule:[["周一","上午集中评估"],["周二","晚间个别治疗延长至 21:00"],["周三","下午团体治疗"],["周五","药品与病历联合清点"],["周日","仅保留值班治疗"]]},
  logisticsSchedule:{title:"后勤轮转周表",icon:"🛒",type:"周期排班",layer:1,desc:"文件袋和床单车只在周一、周三、周五进入洗衣房；周三会把行政文件一并送出。",impact:"参与文件流转链，并说明何时能够复原标签。",schedule:[["周一","普通床单轮转"],["周三","床单 + 行政文件袋"],["周五","归档回收与标签复核"],["其余日期","洗衣房不对病区开放"]]},
  identityChain:{title:"身份替换链",icon:"🧩",type:"交叉印证",layer:2,requires:["wristband","trayMark","stampMismatch"],desc:"腕带、餐盘与停用印章指向同一个旧编号：你的身份不是录错，而是被一整套旧记录替换。",impact:"解锁档案原件调查，并强化合法复核。"},
  fileRoute:{title:"文件流转链",icon:"🧵",type:"交叉印证",layer:2,requires:["rules","catalogNote","bagRoute","logisticsSchedule"],desc:"院规、编目便签、错序标签和后勤周表共同证明：文件只可能在周三被夹进床单车。",impact:"周五洗衣房开放“文件袋流向”谜题，成功后获得被改动的转院单。"},
  visitorPattern:{title:"异常探视链",icon:"🕘",type:"交叉印证",layer:2,requires:["foldedNote","nightRoster","stampMismatch","patrolSchedule","guardTestimony"],desc:"纸条的“周二 21:10”落在交班与西侧巡查之间；停用印章、夜班名单和赵卫国的缺页证词证明有人反复利用同一空档。",impact:"与治疗、后勤周表继续交叉后，可锁定付款账页。"},
  weeklyBlindSpot:{title:"周期性管理盲区",icon:"📅",type:"交叉印证",layer:2,requires:["visitorPattern","treatmentSchedule","logisticsSchedule"],desc:"周二治疗拖延交班、周三行政文件外送、周五归档清点形成固定闭环；异常不是随机，而是每周重复。",impact:"周三档案区开放“夜班排班”谜题，也是方案 C 的核心逻辑。"},
  transferCopy:{title:"被改动的转院单",icon:"🧾",type:"关键证据",layer:3,requires:["fileRoute"],desc:"你复原文件袋流向后找到转院单副本；原始姓名被覆盖，日期也被改过。",impact:"方案 A 的关键证据，也能证明文件篡改不是偶然。",evidence:true},
  originalFile:{title:"病历原件",icon:"📁",type:"关键证据",layer:3,requires:["identityChain","catalogNote"],desc:"三只档案盒谜题指向的原始入院记录显示：送你入院的人并非登记家属。",impact:"连接身份替换链与付款链，是深入追查的前置证据。",evidence:true},
  paymentRecord:{title:"私人付款记录",icon:"💳",type:"关键证据",layer:3,requires:["weeklyBlindSpot","originalFile"],desc:"你依据周循环解开夜班排班，锁定每周三归档的账页：有人持续支付“照护费用”。",impact:"方案 A 与隐藏方案 C 的核心证据。",evidence:true},
  tunnelMap:{title:"维修通道地图",icon:"🗺️",type:"路线情报",layer:3,desc:"旧后勤通道可以绕开正门，出口通向花园外侧。",impact:"还需结合锅炉刻痕破解压力阀顺序，路线才真正安全。"},
  tunnelSafeRoute:{title:"安全泄压顺序",icon:"🔧",type:"路线突破",layer:4,requires:["tunnelMap","valveMark"],desc:"红阀封蒸汽、蓝阀泄压、最后开启绿阀；旧锅炉间可以在不触发警报的情况下通过。",impact:"完成方案 B 的最终路线准备。"},
  mediaPlan:{title:"旧报社公开计划",icon:"📰",type:"隐藏离院方案",layer:4,desc:"老张认出了付款经手人。只要小文的院外志愿者同步公开记录，媒体可以在院方反应前到场。",impact:"解锁方案 C，并将多条证据转化为公开监督。"}
};

const derivedIntelRules=[
  {id:"identityChain",requires:["wristband","trayMark","stampMismatch"]},
  {id:"fileRoute",requires:["rules","catalogNote","bagRoute","logisticsSchedule"]},
  {id:"visitorPattern",requires:["foldedNote","nightRoster","stampMismatch","patrolSchedule","guardTestimony"]},
  {id:"weeklyBlindSpot",requires:["visitorPattern","treatmentSchedule","logisticsSchedule"]}
];

const locations=[
  {id:"ward",name:"病房",img:"ward.webp",cost:0,risk:"低",revealDay:1,desc:"休息和整理床位都会消耗行动；休息可恢复体力并降低药物负荷。",unlock:()=>true},
  {id:"workshop",name:"工疗工作坊",img:"workshop.webp",cost:18,risk:"低",revealDay:1,desc:"完成规律工疗赚取积分和材料，并使药物负荷略微降低。",unlock:()=>true},
  {id:"garden",name:"康复花园",img:"garden.webp",cost:10,risk:"低",revealDay:1,desc:"锻炼可以提升体能并降低药物负荷；第 2 天起也能认识病友。",unlock:()=>true},
  {id:"shop",name:"院内小卖部",img:"shop.png",cost:0,risk:"低",revealDay:2,weekdays:[1,2,4,6,7],desc:"免费进入；每次进入后的第一次成功购买消耗 1 次行动。周三、周五补货休息。",unlock:s=>s.day>=2,reason:"第 2 天起开放"},
  {id:"library",name:"图书室",img:"library-v2.png",cost:12,risk:"低",revealDay:2,weekdays:[1,2,4,5,7],desc:"阅读院规与周表；周二、周日有志愿活动，周四可查巡逻公告。",unlock:s=>s.day>=2,reason:"第 2 天起开放"},
  {id:"cafeteria",name:"食堂",img:"cafeteria-v2.png",cost:14,risk:"低",revealDay:2,desc:"帮忙能赚积分，也容易认识人。",unlock:s=>s.day>=2,reason:"第 2 天起开放"},
  {id:"laundry",name:"洗衣房",img:"laundry-v2.png",cost:18,risk:"中",revealDay:3,weekdays:[1,3,5],desc:"周一、三、五开放；周三文件外送，周五标签复核，选项会随星期变化。",unlock:s=>s.day>=3&&(s.skills.work.lv>=2||s.trust>=55),reason:"第 3 天后，工作 Lv.2 或信任 ≥ 55"},
  {id:"nurse",name:"护士站",img:"nurse-v2.png",cost:10,risk:"低",revealDay:3,weekdays:[2,4,6],desc:"周二、四、六对患者开放；周四可核对印章并递交正式复核。",unlock:s=>s.trust>=58,reason:"院方信任 ≥ 58"},
  {id:"archives",name:"档案室外围",img:"archives-v2.png",cost:20,risk:"高",revealDay:4,weekdays:[3,5],desc:"周三开放账页审计，周五开放索引与档案盒；调查内容按星期轮换。",unlock:s=>s.intel.identityChain&&s.skills.observe.lv>=3,reason:"完成身份替换链 + 观察 Lv.3"},
  {id:"visitor",name:"访客与电话区",img:"visitor-v2.png",cost:8,risk:"低",revealDay:4,weekdays:[2,4,7],desc:"周二可用电话卡、周四可申请正式通话、周日有公益阅读志愿者。",unlock:s=>s.day>=4&&(s.trust>=65||hasItem(s,"phonecard")),reason:"第 4 天后，信任 ≥ 65 或拥有电话卡"},
  {id:"maintenance",name:"后勤维修间",img:"maintenance-v2.png",cost:18,risk:"中",revealDay:5,weekdays:[2,6],desc:"周二整理与绘图，周六进行锅炉测试；压力阀谜题只在周六开放。",unlock:s=>s.day>=5&&s.requests.chenSnack&&s.relations.chen>=45,reason:"第 5 天后，完成陈伯请求且关系 ≥ 45"}
];

const defaultState=()=>({
  day:1, period:0, actions:5, maxActions:5, energy:100, trust:52, suspicion:8, drug:0, tokens:8,
  skills:{
    fitness:{lv:1,xp:0},work:{lv:1,xp:0},social:{lv:1,xp:0},observe:{lv:1,xp:0}
  },
  relations:{zhang:10,chen:0,xiaowen:0,nurse:5,guard:0},
  requests:{zhangTea:false,chenSnack:false,xiaowenNotebook:false,nurseBook:false,guardBattery:false},
  inventory:{tea:0,book:0,snack:1,notebook:0,battery:0,gatepass:0,phonecard:0,material:0,soap:0,carbon:0,envelope:0,flashlight:0,form:0,casefile:0},
  intel:{wristband:false,rules:false,trayMark:false,catalogNote:false,foldedNote:false,stampMismatch:false,nightRoster:false,bagRoute:false,valveMark:false,patrolSchedule:false,guardTestimony:false,treatmentSchedule:false,logisticsSchedule:false,identityChain:false,fileRoute:false,visitorPattern:false,weeklyBlindSpot:false,transferCopy:false,originalFile:false,paymentRecord:false,tunnelMap:false,tunnelSafeRoute:false,mediaPlan:false},
  storyFlags:{xiaowenNote:false,inspection:false,chenValve:false,guardHandover:false,mediaRoute:false,introGift:false,confinementActive:false,confinementCount:0,filePuzzleFails:0,rosterPuzzleFails:0,valvePuzzleFails:0},
  externalContact:false,
  legalPass:false,
  morningDone:false,
  logs:[{day:1,message:"你进入东区 2 号病房。先熟悉这里的日程，再慢慢找回自己的名字。",changes:[]}],
  lastUnlockNoticeDay:1,
  storyStage:0,
  lastEvent:"",
  completed:false,
  saveVersion:SAVE_VERSION
});
let S=defaultState();

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function dailyActionAllowance(value=S.drug){return value>=90?1:(value>=80?2:(value>=50?3:(value>=25?4:5)))}
function normalizeStats(){S.energy=clamp(S.energy,0,100);S.trust=clamp(S.trust,0,100);S.suspicion=clamp(S.suspicion,0,100);S.drug=clamp(S.drug,0,100);S.maxActions=clamp(Number(S.maxActions)||dailyActionAllowance(S.drug),1,5);S.actions=clamp(Number(S.actions)||0,0,S.maxActions)}
function reduceDrugLoad(amount){const before=S.drug;S.drug=Math.max(0,S.drug-amount);return before-S.drug}
function addSuspicion(amount){
  S.suspicion=clamp(S.suspicion+amount,0,100);
  if(amount>0&&triggerConfinementIfNeeded())throw CONFINEMENT_INTERRUPT;
  return S.suspicion;
}
function drugEffect(value=S.drug){
  if(value>=90)return {name:"近乎失去行动能力",className:"drug-critical",energyPenalty:10,xpRate:.25,dailyActions:1,desc:"每日只有 1 次行动；每次行动额外消耗 10 点体力；能力成长只有 25%。"};
  if(value>=80)return {name:"意识模糊",className:"drug-critical",energyPenalty:8,xpRate:.4,dailyActions:2,desc:"每日只有 2 次行动；每次行动额外消耗 8 点体力；能力成长只有 40%。"};
  if(value>=65)return {name:"重度镇静",className:"drug-strong",energyPenalty:6,xpRate:.55,dailyActions:3,desc:"每日有 3 次行动；每次行动额外消耗 6 点体力；能力成长只有 55%。"};
  if(value>=50)return {name:"明显迟钝",className:"drug-strong",energyPenalty:4,xpRate:.7,dailyActions:3,desc:"每日有 3 次行动；每次行动额外消耗 4 点体力；能力成长只有 70%。"};
  if(value>=25)return {name:"轻度迟钝",className:"drug-mild",energyPenalty:2,xpRate:.85,dailyActions:4,desc:"每日有 4 次行动；每次行动额外消耗 2 点体力；能力成长只有 85%。"};
  return {name:"头脑清醒",className:"drug-clear",energyPenalty:0,xpRate:1,dailyActions:5,desc:"每日有 5 次行动，行动与能力成长不受药物影响。"};
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
  merged.maxActions=savedVersion<11?dailyActionAllowance(merged.drug):(Object.prototype.hasOwnProperty.call(saved,"maxActions")?clamp(Number(merged.maxActions)||dailyActionAllowance(merged.drug),1,5):dailyActionAllowance(merged.drug));
  merged.actions=clamp(Number(merged.actions)||0,0,merged.maxActions);
  merged.day=Math.max(1,Math.floor(Number(merged.day)||1));
  if(savedVersion<12){
    if(merged.intel.fileRoute||merged.intel.transferCopy)merged.intel.logisticsSchedule=true;
    if(merged.intel.visitorPattern||merged.intel.paymentRecord||merged.intel.tunnelSafeRoute)merged.intel.patrolSchedule=true;
    if(merged.intel.paymentRecord||merged.intel.mediaPlan||merged.legalPass||merged.inventory.casefile>0)merged.intel.treatmentSchedule=true;
    if(merged.intel.paymentRecord||merged.intel.mediaPlan){merged.intel.logisticsSchedule=true;merged.intel.weeklyBlindSpot=true}
  }
  if(savedVersion<13){
    if(merged.intel.visitorPattern||merged.intel.paymentRecord||merged.intel.mediaPlan){merged.intel.guardTestimony=true;merged.requests.guardBattery=true;merged.relations.guard=Math.max(merged.relations.guard,50)}
    if(merged.intel.tunnelSafeRoute){merged.intel.patrolSchedule=true;merged.requests.guardBattery=true;merged.relations.guard=Math.max(merged.relations.guard,45);merged.inventory.gatepass=Math.max(1,merged.inventory.gatepass||0)}
  }
  merged.lastUnlockNoticeDay=Object.prototype.hasOwnProperty.call(saved,"lastUnlockNoticeDay")?Math.max(1,Number(saved.lastUnlockNoticeDay)||1):merged.day;
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
function loadGame(){const raw=localStorage.getItem(SAVE_KEY);if(!raw)return false;try{S=mergeState(JSON.parse(raw));unlockDerivedIntel();saveGame(false);return true}catch(e){showToast("存档损坏，无法继续","danger");return false}}
function deleteSave(){localStorage.removeItem(SAVE_KEY)}
function hasItem(s,id,n=1){return (s.inventory[id]||0)>=n}
function countIntel(s){return Object.values(s.intel).filter(Boolean).length}
function evidenceCount(s){return ["transferCopy","originalFile","paymentRecord"].filter(k=>s.intel[k]).length}
function facilityRestriction(s,id){
  if(s.trust<20&&!['ward','garden'].includes(id))return "院方信任低于 20：只允许病房与花园活动";
  if(s.trust<30&&!['ward','workshop','garden'].includes(id))return "院方信任低于 30：公共与管理设施暂停开放";
  if(s.trust<45&&['nurse','archives','visitor'].includes(id))return "院方信任低于 45：管理设施禁止进入";
  return "";
}
function hiddenMediaBranchReady(s=S){
  return s.day>=8&&s.intel.guardTestimony&&s.intel.weeklyBlindSpot&&s.intel.originalFile&&s.intel.paymentRecord&&s.requests.zhangTea&&s.requests.xiaowenNotebook&&s.relations.zhang>=50&&s.relations.xiaowen>=45&&s.skills.social.lv>=3;
}
function progressPct(){
  const discovered=routeDiscoveries(),scores=[],score=checks=>Math.round(checks.filter(Boolean).length/checks.length*100);
  if(discovered.legal)scores.push(score([S.intel.identityChain,S.intel.guardTestimony,S.intel.visitorPattern,S.intel.treatmentSchedule,evidenceCount(S)>=3,hasItem(S,"casefile"),S.externalContact,S.legalPass,S.trust>=80,S.relations.nurse>=40,S.skills.social.lv>=4,S.drug<50,weekdayIs(4)]));
  if(discovered.tunnel)scores.push(score([hasItem(S,"flashlight"),hasItem(S,"gatepass"),S.externalContact,S.intel.patrolSchedule,S.intel.tunnelMap,S.intel.tunnelSafeRoute,S.skills.fitness.lv>=4,S.skills.work.lv>=3,S.skills.observe.lv>=3,S.suspicion<50,S.drug<30,weekdayIs(6)]));
  if(discovered.media)scores.push(score([S.intel.mediaPlan,S.intel.guardTestimony,S.intel.weeklyBlindSpot,S.intel.originalFile,S.intel.paymentRecord,S.externalContact,S.relations.zhang>=65,S.relations.xiaowen>=60,S.skills.social.lv>=4,S.skills.observe.lv>=4,S.suspicion<50,S.drug<45,weekdayIs(7)]));
  if(scores.length)return Math.max(...scores);
  return score([countIntel(S)>0,S.day>=5,S.externalContact,Object.values(S.skills).some(sk=>sk.lv>=2)]);
}
function relationHearts(v){const full=Math.min(5,Math.floor(v/20));return "♥".repeat(full)+"♡".repeat(5-full)}
function gainRelation(id,amount,bypass=false){
  const current=S.relations[id]||0,meta=requestMeta[id],done=meta?S.requests[meta.flag]:true;
  S.relations[id]=clamp(current+amount,0,bypass||done?100:30);
  return S.relations[id]-current;
}
function skillXpNeeded(sk){return sk.lv===1?60:100}
function skillProgressValue(sk){return sk.lv<=1?sk.xp:60+(sk.lv-2)*100+sk.xp}
function gainSkill(id,xp){const effect=drugEffect(),actualXp=Math.max(1,Math.round(xp*effect.xpRate));let sk=S.skills[id];sk.xp+=actualXp;while(sk.lv<5&&sk.xp>=skillXpNeeded(sk)){sk.xp-=skillXpNeeded(sk);sk.lv++;toastLog(`${skillsMeta[id].name}提升到 Lv.${sk.lv}！新的工作或调查方式可能已经开放。`)}}
function showToast(message,tone="info"){
  const el=$("toast");
  if(!el)return;
  el.textContent=message;el.className=`toast show ${tone}`;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
}
function addIntel(id,skipDerived=false){
  if(!S.intel[id]){
    S.intel[id]=true;
    toastLog(`获得：${intelMeta[id].title}`,false);
    setTimeout(()=>showToast(`${intelMeta[id].icon} 获得${intelMeta[id].type}：${intelMeta[id].title}`,intelMeta[id].evidence?"evidence":"info"),120);
    queueIntelReveal(id);
    if(!skipDerived)unlockDerivedIntel();
  }
}
function unlockDerivedIntel(){
  let found=true;
  while(found){
    found=false;
    derivedIntelRules.forEach(rule=>{
      if(!S.intel[rule.id]&&rule.requires.every(id=>S.intel[id])){found=true;addIntel(rule.id,true)}
    });
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
  S.actions--;S.energy=clamp(S.energy-totalCost,0,100);S.period=Math.min(3,Math.floor((S.maxActions-S.actions)*4/Math.max(1,S.maxActions)));
  if(effect.energyPenalty>0)toastLog(`${effect.name}：这次行动额外消耗 ${effect.energyPenalty} 点体力，能力成长按 ${Math.round(effect.xpRate*100)}% 计算。`,false);
  return true;
}
function captureFeedback(){
  return {
    energy:S.energy,trust:S.trust,suspicion:S.suspicion,drug:S.drug,tokens:S.tokens,actions:S.actions,
    skills:Object.fromEntries(Object.keys(skillsMeta).map(id=>[id,skillProgressValue(S.skills[id])])),
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
  const relationNames={zhang:"老张关系",chen:"陈伯关系",xiaowen:"小文关系",nurse:"护士林关系",guard:"赵卫国关系"};
  Object.keys(relationNames).forEach(id=>addNumber(id,relationNames[id],before.relations[id],after.relations[id]));
  Object.keys(itemMeta).forEach(id=>addNumber(id,itemMeta[id].name,before.inventory[id]||0,after.inventory[id]||0));
  Object.keys(intelMeta).forEach(id=>{if(!before.intel[id]&&after.intel[id])changes.push({text:`获得${intelMeta[id].type}：${intelMeta[id].title}`,tone:intelMeta[id].evidence?"good":"neutral"})});
  if(!before.externalContact&&after.externalContact)changes.push({text:"院外联络 已建立",tone:"good"});
  if(!before.legalPass&&after.legalPass)changes.push({text:"复核资格 已获得",tone:"good"});
  return changes;
}
function trackAction(fn){
  const before=captureFeedback(),logStart=S.logs.length;
  let result,interrupted=false;
  try{result=fn()}catch(error){if(error!==CONFINEMENT_INTERRUPT)throw error;interrupted=true}
  normalizeStats();
  const changes=feedbackChanges(before,captureFeedback());
  if(changes.length){
    if(S.logs.length>logStart)S.logs[S.logs.length-1].changes=changes;
    else S.logs.push({day:S.day,message:"行动完成。",changes});
    S.logs=S.logs.slice(-20);renderLog();saveGame(false);
  }
  if(!interrupted)triggerConfinementIfNeeded();
  return result;
}
function toastLog(msg,notify=true,changes=[]){S.logs.push({day:S.day,message:msg,changes});S.logs=S.logs.slice(-20);renderLog();saveGame(false);if(notify)showToast(msg)}

function setDayActionVisibility(ready=S.morningDone){
  const content=$("dayActionContent"),visible=Boolean(ready);
  content.dataset.ready=String(visible);content.setAttribute("aria-hidden",String(!visible));content.style.display=visible?"block":"none";
  if(visible)content.classList.remove("hidden");else content.classList.add("hidden");
}
function panelUnlockDay(panelId){return {lifePanel:1,growthPanel:1,relationsPanel:2,bagPanel:2,intelPanel:3,escapePanel:5}[panelId]||1}
function isPanelUnlocked(panelId){return S.day>=panelUnlockDay(panelId)}
function renderProgressiveNavigation(){
  let activeLocked=false;
  document.querySelectorAll(".tab").forEach(tab=>{
    const unlocked=isPanelUnlocked(tab.dataset.panel);
    tab.classList.toggle("progressiveHidden",!unlocked);tab.disabled=!unlocked;tab.setAttribute("aria-hidden",String(!unlocked));
    if(!unlocked&&tab.classList.contains("active"))activeLocked=true;
  });
  if(activeLocked){
    document.querySelectorAll(".tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.panel==="lifePanel"));
    document.querySelectorAll(".contentPanel").forEach(panel=>panel.classList.toggle("active",panel.id==="lifePanel"));
  }
}
function currentPhase(){
  if(S.day===1)return "适应日程";
  if(S.day===2)return "认识人与物品";
  if(S.day<=4)return "观察院内规律";
  return "自主准备离院";
}
function applyDayStartProgression(){
  const before=captureFeedback(),messages=[];
  if(S.day===2&&!S.storyFlags.introGift){S.storyFlags.introGift=true;S.inventory.tea++;messages.push("关系与物品系统开放；活动室送来一包茶，可用于第一次人物请求")}
  if(S.lastUnlockNoticeDay<S.day){
    if(S.day===3)messages.push("情报系统开放：从今天开始，发现的矛盾会被整理到调查板");
    if(S.day===5)messages.push("离院系统开放：已经发现的方案会逐步显示，游戏不设逃离期限");
    S.lastUnlockNoticeDay=S.day;
  }
  if(messages.length){const changes=feedbackChanges(before,captureFeedback());toastLog(messages.join("。")+"。",true,changes)}
}
function render(){
  normalizeStats();
  setDayActionVisibility(S.morningDone);
  $("day").textContent=S.day;$("weekday").textContent=weekdayName();$("tokens").textContent=S.tokens;
  $("mobileDay").textContent=S.day;$("mobileWeekday").textContent=weekdayName();$("mobileTokens").textContent=S.tokens;
  renderProgressiveNavigation();renderActions();renderLocations();renderGrowth();renderRelations();renderIntel();renderBag();renderEscape();renderConditions();renderLog();renderDailyHint();
}
function renderActions(){$("actionPips").innerHTML=Array.from({length:S.maxActions},(_,i)=>`<i class="${i>=S.actions?'used':''}"></i>`).join("")}
function renderDailyHint(){
  const tips=[
    ["行动与体力","病房休息等院内活动会消耗行动；小卖部免费进入，但每次进入后的第一次成功购买消耗 1 次行动。"],
    ["晨间治疗","药物负荷达到 25/50/65/80/90 会逐级降低成长效率；达到 80/90 时每天只剩 2/1 次行动。正常过夜降低 10。"],
    ["技能成长","技能经验会跨天保留。等级提升后，会出现更高收益的工作或新的调查方式。"],
    ["信任与怀疑","信任低于 45/30/20 会逐级封锁设施；怀疑达到 60 会触发隔离、跳过 1 天并强制服药。"],
    ["关系与请求","聊天只能把关系推进到熟悉阶段；完成角色的物品请求，才能突破关系瓶颈并获得专属资源。"],
    ["保安赵卫国","先把关系提升到 20，再交付对讲机电池。取得巡逻周表后，周四可能触发缺页交班事件。"],
    ["四层线索链","基础发现会自动形成交叉印证；交叉印证解锁地点行动与谜题，谜题产出深层证据，最后转化为离院方案。"],
    ["一周循环","第 1 天是周一，每 7 天循环。地点卡会显示固定开放日；错过限定行动，只需等到下一周。"],
    ["地点开放","区域同时受星期、天数、技能、信任或关系影响。同一地点在不同星期可能出现不同选项。"],
    ["院外联络","证据留在院内仍可能被收回；院外联络是一项独立的离院条件。"],
    ["物品用途","茶包、点心、笔记本和侦探小说用于关系突破；复写纸与防水信封可组合成密封证据包。"],
    ["剧情分支","同一事件的选择可能影响不同人物的关系，也可能让某条线索以另一种方式出现。"],
    ["四个线索谜题","档案盒之外，还有周五文件袋流向、周三夜班排班和周六压力阀。错误答案会消耗行动并提高怀疑。"],
    ["三种离院挑战","方案 A 在周四复核，方案 B 在周六锅炉测试，隐藏方案 C 在周日公益阅读；准备完成后可等下周执行。"],
    ["每日结算","正常结束一天恢复体力、药物负荷 -10，并在新一天恢复行动次数；怀疑、信任及成长进度不变。"],
    ["离院期限","游戏不设强制结束日期。你可以按自己的节奏成长、调查，并在准备充分时选择离院方案。"]
  ];
  const [title,text]=tips[(S.day-1)%tips.length];
  const phaseInfo=S.day===1?"今天只开放基础生活内容，先熟悉行动、体力与安全恢复。":(S.day===2?"关系、物品和更多生活区域已经开放。":(S.day<=4?"调查内容会逐渐出现，但离院方案尚未要求立刻决定。":"所有核心系统均已开放，可以按自己的节奏准备离院。"));
  $("dailyHint").textContent=`第 ${weekNumber()} 周 · ${weekdayName()} · ${phaseInfo}`;
  $("dayGoal").textContent=`${weekdayName()} · 当前阶段：${currentPhase()} · 剩余 ${S.actions}/${S.maxActions} 次行动`;
  const isolationWarning=S.suspicion>=50;
  $("tipsCard").classList.toggle("warning",isolationWarning);
  $("tipTitle").textContent=isolationWarning?"⚠ 隔离警告":title;
  $("tipText").textContent=isolationWarning?`当前怀疑 ${S.suspicion}/60。再增加 ${Math.max(0,60-S.suspicion)} 点就会立即触发小黑屋：中断行动、失去当天剩余行动并被强制服药。优先选择低风险活动。`:text;
}
function activatePanel(panelId){
  const tab=document.querySelector(`.tab[data-panel="${panelId}"]`);
  if(!tab||!isPanelUnlocked(panelId)){showToast(`这个系统会在第 ${panelUnlockDay(panelId)} 天开放。`);return}
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===tab));
  document.querySelectorAll(".contentPanel").forEach(p=>p.classList.toggle("active",p.id===panelId));
  window.scrollTo({top:0,behavior:"smooth"});
}
function forceTodayPanel(){
  document.querySelectorAll(".tab").forEach(tab=>tab.classList.toggle("active",tab.dataset.panel==="lifePanel"));
  document.querySelectorAll(".contentPanel").forEach(panel=>panel.classList.toggle("active",panel.id==="lifePanel"));
  window.scrollTo({top:0,behavior:"auto"});
}
function locationScheduleOpen(location,s=S){return !location.weekdays||location.weekdays.includes(weekdayNumber(s.day))}
function locationScheduleReason(location,s=S){return locationScheduleOpen(location,s)?"":`本周开放：${weekdayList(location.weekdays)}；今天是${weekdayName(s.day)}`}
function renderLocations(){
  $("locationGrid").innerHTML="";
  locations.filter(l=>S.day>=(l.revealDay||1)).forEach(l=>{
    const restriction=facilityRestriction(S,l.id),scheduleReason=locationScheduleReason(l),unlocked=l.unlock(S),open=unlocked&&!restriction&&!scheduleReason,effect=drugEffect(),shownCost=l.cost+effect.energyPenalty;
    const card=document.createElement("button");card.className="locationCard"+(open?"":" locked");card.dataset.location=l.id;
    const reason=[restriction,!unlocked?l.reason:"",scheduleReason].filter(Boolean).join("；")||"尚未开放",baseCost=l.id==="shop"?"免费进入 · 首购消耗 1 行动":(l.cost?`体力约 -${shownCost}${effect.energyPenalty?`（药物 +${effect.energyPenalty}）`:""}`:(l.id==="ward"?"休息：1 行动 · 药物 -6":"可恢复体力")),costText=`风险${l.risk||"低"} · ${baseCost}`,scheduleText=l.weekdays?`开放：${weekdayList(l.weekdays)}`:"每日开放";
    card.disabled=!open;card.setAttribute("aria-label",open?`${l.name}，${l.desc}`:`${l.name}，未开放：${reason}`);
    card.innerHTML=`<img src="assets/${l.img}" alt="${l.name}"><div class="locationBody"><div class="locationTitle">${l.name}</div><div class="locationSchedule">📅 ${scheduleText}</div><p>${l.desc}</p><div class="locationMeta"><span>${costText}</span><span>${open?"进入 →":"未开放"}</span></div></div>${open?"":`<div class="lockReason">🔒 ${reason}</div>`}`;
    if(open)card.onclick=()=>openLocation(l.id);
    $("locationGrid").appendChild(card);
  });
}
function renderGrowth(){
  $("skillCards").innerHTML="";
  Object.entries(skillsMeta).filter(([id])=>S.day>=(skillRevealDays[id]||1)).forEach(([id,m])=>{
    const sk=S.skills[id],d=document.createElement("div");d.className="skillCard";
    const needed=skillXpNeeded(sk),pct=sk.lv>=5?100:Math.round(sk.xp/needed*100);
    d.innerHTML=`<div class="skillIcon">${m.icon}</div><h3>${m.name} Lv.${sk.lv}</h3><div class="skillBar"><i style="width:${pct}%"></i></div><small>${sk.lv>=5?"已达到最高等级":`${sk.xp}/${needed} · Lv.2 起每级需要 100`}</small><p>${m.desc}</p>`;
    $("skillCards").appendChild(d);
  });
  $("gEnergy").textContent=S.energy+"/100";$("drug").textContent=S.drug;$("gTrust").textContent=S.trust;$("gSuspicion").textContent=S.suspicion;
  const effect=drugEffect();$("drugEffect").className=`drugEffect ${effect.className}`;$("drugEffect").textContent=`${effect.name}：${effect.desc}`;
  document.querySelectorAll(".growthGuideItem[data-reveal-day]").forEach(item=>item.classList.toggle("progressiveHidden",S.day<Number(item.dataset.revealDay||1)));
}
function renderRelations(){
  const data=[
    ["zhang","老张","🧓","病友 · 曾做过记者","喜欢喝茶，记性非常好。经常注意到别人忽略的细节。",2],
    ["chen","陈伯","🧰","病友 · 原维修工","熟悉旧楼管线和维修间，讲话不多。",2],
    ["xiaowen","小文","👩","病友 · 图书室志愿者","喜欢记录故事，和院外公益组织保持过联系。",3],
    ["nurse","护士林","👩‍⚕️","护士","大部分时候只是按制度工作。你表现稳定时，她愿意认真听你说话。",3],
    ["guard","赵卫国","🛡️","保安 · 西侧巡逻岗","谨慎寡言，熟悉每周巡逻和交班漏洞。先让他相信你不会把责任推给他，他才会交出真实记录。",3]
  ];
  $("relationsGrid").innerHTML="";
  data.filter(([, , , , ,day])=>S.day>=day).forEach(([id,name,ico,role,desc])=>{
    const v=S.relations[id],c=document.createElement("div"),meta=requestMeta[id],done=S.requests[meta.flag],capped=!done&&v>=30;c.className="relationCard";
    const req=done?`<div class="request">✓ 请求已完成 · 关系可以继续深入</div>`:`<div class="request">想要：${itemMeta[meta.item].name} ×1<br><small>完成后获得：${meta.reward}</small></div>`;
    const gate=capped?`<div class="relationGate">关系停留在熟悉阶段。需要完成物品请求，才能继续提升并取得专属资源。</div>`:"";
    const guardStory=id==="guard"?`<div class="relationStory"><b>关系剧情</b>${!done?(v<20?`先把关系提升到 20，赵卫国才会接受电池。`:`现在可以交付电池，换取真实巡逻周表和旧门禁牌。`):(!S.intel.guardTestimony?`巡逻周表已取得。关系达到 45 后，在周四等待“交班簿缺页”事件。`:`缺页证词已取得；关系达到 55 后，继续交谈还能改善当日巡逻评价。`)}</div>`:"";
    const helpLocked=id==="guard"&&v<20;
    c.innerHTML=`<div class="relationHead"><div class="npcAvatar">${ico}</div><div><b>${name}</b><small>${role}</small></div></div><div class="hearts">${relationHearts(v)}</div><p>${desc}</p>${req}${gate}${guardStory}<button class="actionBtn" data-talk="${id}" ${capped?"disabled":""}>${capped?"等待完成请求":"聊一会儿"}</button>${done?"":`<button class="actionBtn" data-help="${id}" ${helpLocked?"disabled":""}>${helpLocked?"关系 20 后可交付":`交付${itemMeta[meta.item].name}`}</button>`}`;
    $("relationsGrid").appendChild(c);
  });
  document.querySelectorAll("[data-talk]").forEach(b=>b.onclick=()=>talkNPC(b.dataset.talk));
  document.querySelectorAll("[data-help]").forEach(b=>b.onclick=()=>helpNPC(b.dataset.help));
}
function renderIntel(){
  $("intelBoard").innerHTML="";
  const layers={1:["第一层 · 基础发现","从生活、关系和地点中取得的独立信息"],2:["第二层 · 交叉印证","集齐指定基础线索后自动形成，负责解锁调查与谜题"],3:["第三层 · 深层证据","完成谜题或高风险调查后取得，直接影响离院路线"],4:["第四层 · 路线突破","把证据、人物与环境信息转化为可执行计划"]};
  Object.entries(layers).forEach(([layer,[title,desc]])=>{
    const section=document.createElement("section");section.className=`intelLayer layer-${layer}`;
    section.innerHTML=`<div class="intelLayerHead"><div><span>线索层级 ${layer}</span><h3>${title}</h3></div><p>${desc}</p></div>`;
    const grid=document.createElement("div");grid.className="intelLayerGrid";
    Object.entries(intelMeta).filter(([,m])=>Number(m.layer||1)===Number(layer)).forEach(([id,m])=>{
      const got=S.intel[id],requires=m.requires||[],met=requires.filter(req=>S.intel[req]).length,d=document.createElement("div");d.className="intelCard"+(got?"":" locked");
      const requirement=requires.length?`<div class="intelPrereq">前置 ${met}/${requires.length}：${requires.map(req=>`<span class="${S.intel[req]?"met":""}">${S.intel[req]?"✓":"○"} ${intelMeta[req]?.title||req}</span>`).join("")}</div>`:"";
      const schedule=got&&m.schedule?`<div class="intelSchedule"><b>固定周表</b>${m.schedule.map(([day,task])=>`<div><span>${day}</span><em>${task}</em></div>`).join("")}</div>`:"";
      d.innerHTML=`<div class="pin">${got?m.icon:"❓"}</div><h3>${got?m.title:(requires.length?"待交叉 / 待破解":"未知")}</h3>${got&&m.evidence?`<span class="evidenceBadge">关键证据</span>`:""}<p>${got?m.desc:(requires.length?"集齐前置信息后，新的调查行动会在对应地点出现。":"继续生活、工作和建立关系，线索会逐渐浮现。")}</p>${schedule}${got&&m.impact?`<div class="intelImpact"><b>后续影响</b>${m.impact}</div>`:requirement}`;
      grid.appendChild(d);
    });
    section.appendChild(grid);
    $("intelBoard").appendChild(section);
  });
}
function renderBag(){
  $("inventoryGrid").innerHTML="";
  Object.entries(itemMeta).filter(([id])=>S.day>=(itemRevealDays[id]||1)||(S.inventory[id]||0)>0).forEach(([id,m])=>{
    const n=S.inventory[id]||0,d=document.createElement("div");d.className="inventoryItem";
    const relationItem=["tea","book","snack","notebook","battery"].includes(id),routeItem=["phonecard","material","carbon","envelope","flashlight","gatepass","form","casefile"].includes(id);
    const critical=relationItem?`<span class="itemKeyBadge">关系物品</span>`:(routeItem?`<span class="itemKeyBadge">关键物品</span>`:"");
    let action="";
    if(id==="snack"&&n>0)action=`<button class="actionBtn" data-use="${id}">吃掉（体力 +18）</button>`;
    if(id==="soap"&&n>0)action=`<button class="actionBtn" data-use="${id}">使用（怀疑 -6 · 信任 +2）</button>`;
    if(id==="casefile"&&n===0){const ready=evidenceCount(S)>=3&&hasItem(S,"carbon")&&hasItem(S,"envelope");action=`<div class="craftRequirements">需要：关键证据 ${evidenceCount(S)}/3 · 复写纸 ${S.inventory.carbon}/1 · 防水信封 ${S.inventory.envelope}/1</div><button class="actionBtn" data-craft="casefile" ${ready?"":"disabled"}>整理密封证据包</button>`}
    d.innerHTML=`<div class="itemTop"><span class="itemIcon">${m.icon}</span><b>× ${n}</b></div><strong>${m.name}</strong><small>${m.desc}</small>${critical}${action}`;
    $("inventoryGrid").appendChild(d);
  });
  document.querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>useItem(b.dataset.use));
  document.querySelectorAll("[data-craft]").forEach(b=>b.onclick=()=>craftEvidencePacket());
}
function renderShopModal(){
  $("shopModalTokens").textContent=S.tokens;$("modalShopGrid").innerHTML="";
  $("shopActionRule").textContent=shopFirstPurchasePending?"本次进入的第一次成功购买将消耗 1 次行动；完成首购后，继续购买不再消耗行动。":"本次进入已经完成首购扣费；继续购买不再消耗行动。";
  shopCatalog.filter(([id])=>S.day>=(shopRevealDays[id]||2)).forEach(([id,price])=>{
    const m=itemMeta[id],d=document.createElement("div");d.className="shopItem";
    d.innerHTML=`<div class="itemTop"><span class="itemIcon">${m.icon}</span><b>${price} 积分</b></div><strong>${m.name}</strong><small>${m.desc}</small><button class="actionBtn" data-modal-buy="${id}" data-price="${price}">购买</button>`;
    $("modalShopGrid").appendChild(d);
  });
  $("modalShopGrid").querySelectorAll("[data-modal-buy]").forEach(b=>b.onclick=()=>buyItem(b.dataset.modalBuy,+b.dataset.price));
}
function shopEvent(){
  shopFirstPurchasePending=true;lastFocusedElement=document.activeElement;renderShopModal();$("shopModal").classList.remove("hidden");toastLog("你免费进入院内小卖部。本次第一次成功购买会消耗 1 次行动。",false);render();saveGame(false)
}
function closeShop(){shopFirstPurchasePending=false;$("shopModal").classList.add("hidden");render();saveGame(false);lastFocusedElement?.focus?.();checkAutoEnd()}
function escapeReadyLegal(){
  return evidenceCount(S)>=3&&S.intel.identityChain&&S.intel.guardTestimony&&S.intel.visitorPattern&&S.intel.treatmentSchedule&&hasItem(S,"casefile")&&S.externalContact&&S.legalPass&&S.trust>=80&&S.relations.nurse>=40&&S.skills.social.lv>=4&&S.drug<50&&weekdayIs(4);
}
function escapeReadyTunnel(){
  return hasItem(S,"flashlight")&&hasItem(S,"gatepass")&&S.externalContact&&S.intel.patrolSchedule&&S.intel.tunnelMap&&S.intel.tunnelSafeRoute&&S.skills.fitness.lv>=4&&S.skills.work.lv>=3&&S.skills.observe.lv>=3&&S.suspicion<50&&S.drug<30&&weekdayIs(6);
}
function escapeReadyMedia(){
  return S.intel.mediaPlan&&S.intel.guardTestimony&&S.intel.weeklyBlindSpot&&S.intel.originalFile&&S.intel.paymentRecord&&S.externalContact&&S.relations.zhang>=65&&S.relations.xiaowen>=60&&S.skills.social.lv>=4&&S.skills.observe.lv>=4&&S.suspicion<50&&S.drug<45&&weekdayIs(7);
}
function escapeReadyAny(){return escapeReadyLegal()||escapeReadyTunnel()||escapeReadyMedia()}
function routeDiscoveries(s=S){
  return {
    legal:Boolean(s.intel.rules||s.intel.transferCopy||s.intel.originalFile||s.legalPass),
    tunnel:Boolean(s.intel.tunnelMap||(s.requests.chenSnack&&s.relations.chen>=35)),
    media:Boolean(s.intel.mediaPlan)
  };
}
function renderEscape(){
  const discovered=routeDiscoveries(),known=Object.values(discovered).filter(Boolean).length;
  const checks=[
    ["已发现离院方向",`${known} 条`,known>=1],
    ["院外联络",S.externalContact?"已建立":"未建立",S.externalContact],
    ["交叉印证",`${["identityChain","fileRoute","visitorPattern","weeklyBlindSpot"].filter(id=>S.intel[id]).length}/4`,["identityChain","fileRoute","visitorPattern","weeklyBlindSpot"].every(id=>S.intel[id])],
    ["深层证据",`${evidenceCount(S)}/3`,evidenceCount(S)>=3],
    ["方案 A：密封证据包",hasItem(S,"casefile")?"已整理":"尚未整理",hasItem(S,"casefile")],
    ["观察能力","Lv."+S.skills.observe.lv,S.skills.observe.lv>=3],
    ["社会支持","社交 Lv."+S.skills.social.lv,S.skills.social.lv>=3],
    ["保安协助",S.intel.guardTestimony?"证词已取得":(S.requests.guardBattery?"已建立信任":"尚未建立"),S.intel.guardTestimony],
    ["行动能力","体能 Lv."+S.skills.fitness.lv,S.skills.fitness.lv>=3],
    ["清醒程度",`药物负荷 ${S.drug}`,S.drug<60]
  ];
  $("escapeChecklist").innerHTML=known?checks.map(([a,b,ok])=>`<div class="checkItem ${ok?"done":""}"><b>${ok?"✓ ":""}${a}</b><span>${b}</span></div>`).join(""):`<div class="routeDiscoveryNotice"><b>尚未发现具体离院方案</b><p>离院没有时间限制。随着院规、关系和环境情报逐渐出现，可执行的方案会在这里自动展开。</p></div>`;
  const legal=escapeReadyLegal(),tunnel=escapeReadyTunnel(),media=escapeReadyMedia();
  const req=(ok,text)=>`<li class="${ok?"met":"missing"}">${ok?"✓":"○"} ${text}</li>`;
  const routes=[];
  if(discovered.legal)routes.push(`<div class="routeCard ${legal?"ready":""}">
      <div class="eyebrow">方案 A</div><h3>合法离院 · 申诉复核</h3>
      <p>周四是补充复核日。把证据交给院外联系人，并利用稳定的院方评价从正门离开；错过可等下周四。</p>
      <ul>${req(S.intel.identityChain,"身份替换链")}${req(S.intel.guardTestimony,"赵卫国的缺页交班证词")}${req(S.intel.visitorPattern,"异常探视链")}${req(S.intel.treatmentSchedule,"每周治疗安排")}${req(evidenceCount(S)>=3,`关键证据 ${evidenceCount(S)}/3`)}${req(hasItem(S,"casefile"),"密封证据包")}${req(S.externalContact,"已联系院外")}${req(S.legalPass,"已提交复核申请表")}${req(S.trust>=80,`信任 ${S.trust}/80`)}${req(S.relations.nurse>=40,`护士林关系 ${S.relations.nurse}/40`)}${req(S.skills.social.lv>=4,`社交 Lv.${S.skills.social.lv}/4`)}${req(S.drug<50,`药物负荷 ${S.drug}/50`)}${req(weekdayIs(4),`今天是周四（当前${weekdayName()}）`)}</ul>
      <button class="routeBtn" id="legalEscape" ${legal?"":"disabled"}>${legal?"执行合法离院":"条件未满足"}</button>
    </div>`);
  if(discovered.tunnel)routes.push(`<div class="routeCard ${tunnel?"ready":""}">
      <div class="eyebrow">方案 B</div><h3>夜间离院 · 维修通道</h3>
      <p>周六锅炉测试会掩盖旧通道的动静。依靠地图、泄压顺序与照明直接离开；错过可等下周六。</p>
      <ul>${req(hasItem(S,"flashlight"),"袖珍手电")}${req(hasItem(S,"gatepass"),"赵卫国交出的旧门禁牌")}${req(S.externalContact,"已联系院外接应")}${req(S.intel.patrolSchedule,"院内巡逻周表")}${req(S.intel.tunnelMap,"维修通道地图")}${req(S.intel.tunnelSafeRoute,"已破解安全泄压顺序")}${req(S.skills.fitness.lv>=4,`体能 Lv.${S.skills.fitness.lv}/4`)}${req(S.skills.work.lv>=3,`工作 Lv.${S.skills.work.lv}/3`)}${req(S.skills.observe.lv>=3,`观察 Lv.${S.skills.observe.lv}/3`)}${req(S.suspicion<50,`怀疑 ${S.suspicion}/50`)}${req(S.drug<30,`药物负荷 ${S.drug}/30`)}${req(weekdayIs(6),`今天是周六（当前${weekdayName()}）`)}</ul>
      <button class="routeBtn" id="tunnelEscape" ${tunnel?"":"disabled"}>${tunnel?"今晚执行计划":"条件未满足"}</button>
    </div>`);
  if(discovered.media)routes.push(`<div class="routeCard mediaRouteCard ${media?"ready":""}">
      <div class="eyebrow">隐藏方案 C</div><h3>媒体护送 · 公开曝光</h3>
      <p>周日公益阅读时，老张的旧报社与小文的志愿者可以同步公开记录，以公共监督迫使院方停止转移。</p>
      <ul>${req(S.intel.mediaPlan,"已触发旧报社隐藏剧情")}${req(S.intel.guardTestimony,"赵卫国愿意提供人证")}${req(S.intel.weeklyBlindSpot,"周期性管理盲区")}${req(S.intel.originalFile,"病历原件")}${req(S.intel.paymentRecord,"私人付款记录")}${req(S.externalContact,"已联系院外")}${req(S.relations.zhang>=65,`老张关系 ${S.relations.zhang}/65`)}${req(S.relations.xiaowen>=60,`小文关系 ${S.relations.xiaowen}/60`)}${req(S.skills.social.lv>=4,`社交 Lv.${S.skills.social.lv}/4`)}${req(S.skills.observe.lv>=4,`观察 Lv.${S.skills.observe.lv}/4`)}${req(S.suspicion<50,`怀疑 ${S.suspicion}/50`)}${req(S.drug<45,`药物负荷 ${S.drug}/45`)}${req(weekdayIs(7),`今天是周日（当前${weekdayName()}）`)}</ul>
      <button class="routeBtn" id="mediaEscape" ${media?"":"disabled"}>${media?"启动公开计划":"尚未发现该方案"}</button>
    </div>`);
  $("escapeRoutes").innerHTML=routes.join("");
  if(discovered.legal&&legal)$("legalEscape").onclick=()=>executeEscape("legal");
  if(discovered.tunnel&&tunnel)$("tunnelEscape").onclick=()=>executeEscape("tunnel");
  if(discovered.media&&media)$("mediaEscape").onclick=()=>executeEscape("media");
  const pct=progressPct();
  $("progressPct").textContent=pct+"%";
  document.querySelector(".escapeProgressCard .progressRing").style.setProperty("--pct",(pct*3.6)+"deg");
}
function renderConditions(){
  const effect=drugEffect();
  const tags=[`🎯 行动 ${S.actions}/${S.maxActions}`,`⚡ 体力 ${S.energy}`,`💊 药物 ${S.drug}`,`🧠 ${effect.name}`,`🙂 信任 ${S.trust}`,`👁 怀疑 ${S.suspicion}`];
  if(S.externalContact)tags.push("☎️ 已联络");
  const chainCount=["identityChain","fileRoute","visitorPattern","weeklyBlindSpot"].filter(id=>S.intel[id]).length;
  if(chainCount)tags.push(`🧩 线索 ${chainCount}/4`);
  if(S.requests.guardBattery)tags.push("🛡️ 保安协助");
  if(S.legalPass)tags.push("📄 复核资格");
  if(hasItem(S,"casefile"))tags.push("🗂️ 证据已封");
  if(S.trust<45)tags.push("🔒 设施受限");
  if(S.suspicion>=45)tags.push(`⚠️ 警戒 ${S.suspicion}`);
  $("conditionTags").innerHTML=tags.map(x=>`<span>${x}</span>`).join("");
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

function resolveMorningTreatment(kind,roll=Math.random()){
  let message="",actionPenalty=0;
  if(kind==="full"){
    S.trust+=6;S.suspicion=Math.max(0,S.suspicion-4);S.drug+=18;S.energy-=5;gainRelation("nurse",2);
    message="你按医嘱完成治疗。记录评价改善，但药物开始累积。";
  }
  if(kind==="half"){
    if(roll<.45){S.trust+=3;S.suspicion=Math.max(0,S.suspicion-2);S.drug+=8;gainRelation("nurse",1);message="你只服下一半，护士没有察觉，还把你的平静表现记入记录。"}
    else if(roll<.8){S.trust-=2;S.drug+=8;addSuspicion(4);message="护士注意到你的吞咽动作有些迟疑，记录上多了一处问号。"}
    else{S.trust-=6;S.drug+=12;S.energy-=3;addSuspicion(9);message="藏起的半片药被发现。护士重新核对药杯，你的评价明显下降。"}
  }
  if(kind==="avoid"){
    if(roll<.5){S.trust-=2;addSuspicion(6);message="你避开了服药。护士暂时没有证据，但异常表现被记入了观察记录。"}
    else if(roll<.8){S.trust-=7;addSuspicion(12);message="护士发现药片没有减少。你的拒绝被写进重点评估记录。"}
    else{S.trust-=10;S.drug+=36;S.energy-=10;actionPenalty=2;addSuspicion(20);message="你被当场发现并遭到强制服药：双倍药物与体力代价，同时失去 2 次当日行动。"}
  }
  normalizeStats();S.maxActions=dailyActionAllowance(S.drug);S.actions=Math.max(0,S.maxActions-actionPenalty);
  return {message,actionPenalty,effect:drugEffect().name};
}
function morningTreatment(){
  if(S.morningDone)return;
  setDayActionVisibility(false);
  const box=$("morningEvent");box.classList.remove("hidden");
  const effect=drugEffect();
  const firstDayNote=S.day===1?"第一天先熟悉治疗记录；高风险的“设法避开”会从第 2 天开放。":"冒险处理药片的结果并不固定，怀疑达到 60 会立即中断并触发处分。";
  box.innerHTML=`<h3>晨间治疗</h3><p>药物状态会分段影响行动与成长：负荷低于 25 有 5 次行动；达到 25/50/80/90 后分别为 4/3/2/1 次，65 以上还会进一步压低成长效率。${firstDayNote}</p><div class="drugImpact">当前药物状态：${effect.name}。${effect.desc}</div><div class="morningChoices">
    <button class="secondary" data-med="full"><b>按医嘱服用</b><br><small>固定：信任 +6 · 怀疑 -4 · 药物 +18 · 体力 -5</small></button>
    <button class="secondary" data-med="half"><b>只服一半</b><br><small>45% 蒙混过关；35% 引起注意；20% 被发现。信任与怀疑可能改善或恶化。</small></button>
    ${S.day>=2?`<button class="secondary" data-med="avoid"><b>设法避开</b><br><small>50% 怀疑 +6；30% 怀疑 +12；20% 怀疑 +20、强制服药并失去 2 次行动。</small></button>`:""}
  </div>`;
  box.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>trackAction(()=>{
    const outcome=resolveMorningTreatment(b.dataset.med);S.morningDone=true;setDayActionVisibility(true);box.classList.add("hidden");toastLog(`${outcome.message} 当前状态：${outcome.effect}，今日 ${S.actions}/${S.maxActions} 次行动。`);render();saveGame(false);
    requestAnimationFrame(()=>{setDayActionVisibility(S.morningDone);if(window.matchMedia?.("(max-width: 760px)")?.matches)$("dayActionContent").scrollIntoView({behavior:"smooth",block:"start"})});
    setTimeout(triggerDailyStory,180);
  }));
}
function openLocation(id){
  if(!S.morningDone){toastLog("先处理晨间治疗。");return}
  if(S.actions<=0&&id!=="shop"){toastLog("今天没有自由行动了。");return}
  const location=locations.find(x=>x.id===id),restriction=facilityRestriction(S,id);
  const scheduleReason=location?locationScheduleReason(location):"";
  if(!location||S.day<(location.revealDay||1)||!location.unlock(S)||restriction||scheduleReason){toastLog(restriction||scheduleReason||location?.reason||"这个地点尚未开放。");return}
  const map={
    ward:wardEvent,shop:shopEvent,workshop:workshopEvent,garden:gardenEvent,library:libraryEvent,cafeteria:cafeteriaEvent,
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
function checkAutoEnd(){if(S.storyFlags.confinementActive)return;if(S.actions<=0&&!S.completed)setTimeout(()=>endDay(),250)}

function triggerDailyStory(){
  if(!$("eventModal").classList.contains("hidden"))return;
  if(S.day===3&&!S.storyFlags.xiaowenNote){
    S.storyFlags.xiaowenNote=true;saveGame(false);
    openEvent({eyebrow:"剧情分支 · 小文",title:"夹在书页里的纸条",text:"小文把一本旧诗集推到你面前。书脊里夹着一张求助纸条，上面写着一个陌生姓名和“每周二 21:10”。走廊另一头，护士林正朝这里走来。",img:"library-v2.png",choices:[
      {title:"收下纸条并替她保密",sub:"获得线索 · 小文关系上升 · 怀疑上升",fn:()=>{addSuspicion(4);gainRelation("xiaowen",14);addIntel("foldedNote");toastLog("你把纸条藏进衣袖，小文第一次说出了那名患者的原名。")}},
      {title:"把纸条交给护士林核对",sub:"信任与护士关系上升 · 小文关系下降",fn:()=>{S.trust+=7;gainRelation("nurse",10);gainRelation("xiaowen",-6,true);addIntel("stampMismatch");toastLog("护士林没有收走纸条，而是指出纸上的蓝章早已停用。")}},
      {title:"把书原样还给小文",sub:"小文关系小幅上升 · 不获得线索",fn:()=>{gainRelation("xiaowen",7);S.trust+=1;toastLog("你没有追问。小文记住了你没有逼她表态。")}}
    ]});
    return;
  }
  if(S.day===6&&!S.storyFlags.inspection){
    S.storyFlags.inspection=true;saveGame(false);
    openEvent({eyebrow:"剧情分支 · 临时检查",title:"主任查房提前了",text:"主任临时检查病区，桌上放着你的评估表。他问你是否仍然坚持“病历写错了”。护士林站在一旁，没有替任何人说话。",img:"nurse-v2.png",choices:[
      {title:"提交完整的身份替换链",sub:"需要：身份替换链 · 成功时信任、护士关系和社交成长上升",fn:()=>{if(!S.intel.identityChain){addSuspicion(4);toastLog("零散矛盾还没有形成可以复核的因果链，主任把它记成了反复申诉。");return}S.trust+=10;S.suspicion=Math.max(0,S.suspicion-4);gainRelation("nurse",8);gainSkill("social",35);toastLog("腕带、餐盘和停用印章互相印证。主任无法再用“单次录入错误”解释整条替换链。")}},
      {title:"展示腕带与蓝章的矛盾",sub:"需要错误腕带编号 · 可获得印章线索",fn:()=>{if(!S.intel.wristband){addSuspicion(3);toastLog("你还拿不出具体编号，谈话很快结束。");return}addSuspicion(2);S.trust+=3;gainSkill("observe",25);addIntel("stampMismatch");toastLog("护士林确认：腕带登记日与蓝章启用日期不可能同时成立。")}},
      {title:"保持沉默，观察他们如何记录",sub:"怀疑下降 · 观察成长",fn:()=>{S.suspicion=Math.max(0,S.suspicion-4);gainSkill("observe",20);toastLog("你没有争辩，只记住了主任把评估表放回哪一只文件夹。")}}
    ]});
    return;
  }
  if(S.day===9&&!S.storyFlags.chenValve){
    S.storyFlags.chenValve=true;saveGame(false);
    openEvent({eyebrow:"剧情分支 · 陈伯",title:"维修间少了一只阀门",text:"陈伯发现旧通道的检修阀被拆走了。库房还有备用件，但领用记录会留下名字。护士站也在追查丢失的工具。",img:"maintenance-v2.png",choices:[
      {title:"拿出材料和陈伯一起修好",sub:"材料 -1 · 陈伯关系与工作成长上升 · 获得阀门线索",fn:()=>{if(!hasItem(S,"material")){toastLog("你没有合适的材料，陈伯只能暂时封住接口。");return}S.inventory.material--;gainRelation("chen",16);gainSkill("work",35);addIntel("valveMark");toastLog("阀门重新转动。你也确认三道刻痕记录的是旧检修顺序。")}},
      {title:"把缺件情况报告护士站",sub:"信任上升 · 陈伯关系下降",fn:()=>{S.trust+=8;gainRelation("nurse",5);gainRelation("chen",-8,true);toastLog("库房补发了阀门，但陈伯整晚没有再和你说话。")}},
      {title:"藏起附近的备用工具",sub:"材料 +2 · 怀疑上升",fn:()=>{addSuspicion(7);S.inventory.material+=2;toastLog("你留下了两件可能有用的零件，工具清点却多出了一处缺口。")}}
    ]});
    return;
  }
  if(weekdayIs(4)&&S.requests.guardBattery&&S.relations.guard>=45&&S.intel.patrolSchedule&&!S.intel.guardTestimony){
    openEvent({eyebrow:"关系剧情 · 保安赵卫国",title:"交班簿里少了一页",text:"周四复查结束后，赵卫国把你叫到西侧岗亭。他承认每到周二，行政主任都会在 21:00 交班前取走登记簿，归还时恰好少了 K-17 对应的一页。公开巡逻表没有写这件事；一旦说出来，他也可能失去工作。",img:"hospital.webp",choices:[
      {title:"拍下缺页与装订痕迹",sub:"获得关键人物证词 · 赵卫国关系 +10 · 怀疑 +6",fn:()=>{addSuspicion(6);gainRelation("guard",10);S.storyFlags.guardHandover=true;addIntel("guardTestimony");toastLog("照片保留了连续页码和被撕开的线头。赵卫国补充了 K-17 每周二出现的准确时间。")}},
      {title:"请他写下完整交班经过",sub:"获得关键人物证词 · 信任 +4 · 赵卫国关系 +12 · 社交成长",fn:()=>{S.trust+=4;gainRelation("guard",12);gainSkill("social",35);S.storyFlags.guardHandover=true;addIntel("guardTestimony");toastLog("赵卫国签下姓名，也写明登记簿由谁取走。你的调查第一次有了愿意承担后果的人证。")}},
      {title:"不留下照片，只记住时间和代号",sub:"获得关键人物证词 · 怀疑 +2 · 观察成长 +40",fn:()=>{addSuspicion(2);gainRelation("guard",6);gainSkill("observe",40);S.storyFlags.guardHandover=true;addIntel("guardTestimony");toastLog("你记住装订孔、缺页页码和 K-17 代号。赵卫国的口述与巡逻周表完全吻合。")}}
    ]});
    return;
  }
  const mediaReady=hiddenMediaBranchReady(S);
  if(mediaReady&&!S.storyFlags.mediaRoute){
    openEvent({eyebrow:"隐藏剧情 · 旧报社",title:"付款单上的名字，老张见过",text:"老张把周期盲区、病历原件和周三付款单并排放好，认出经手人曾是旧报社调查过的中间人。小文说，周日公益阅读时志愿者可以同步把材料发到院外。只要两边同时公开，医院就来不及悄悄转移你。",img:"visitor-v2.png",choices:[
      {title:"建立周日双重公开计划",sub:"开启离院方案 C · 怀疑 +10 · 老张与小文关系上升",fn:()=>{addSuspicion(10);S.storyFlags.mediaRoute=true;gainRelation("zhang",10);gainRelation("xiaowen",10);addIntel("mediaPlan");toastLog("周期盲区、身份原件和付款账页形成完整报道结构。周日可执行的第三条离院路线已经出现。")}}
    ]});
  }
}

function archiveBoxPuzzle(){
  openEvent({eyebrow:"线索谜题 · 三只档案盒",title:"只有一句标签是真的",text:"绿盒写着“病历不在绿盒”；蓝盒写着“病历在灰盒”；灰盒写着“蓝盒标签是假的”。编目便签说明：三句话中只有一句真话。病历藏在哪只盒子里？",img:"archives-v2.png",choices:[
    {title:"打开绿盒",sub:"选择绿盒",fn:()=>{if(!useAction(20))return;addSuspicion(4);gainSkill("observe",45);addIntel("originalFile");toastLog("答案正确：蓝盒与灰盒的标签互相否定，必有一句为真；所以绿盒标签必须为假，病历就在绿盒。")}},
    {title:"打开蓝盒",sub:"选择蓝盒 · 错误会消耗行动并增加怀疑",fn:()=>{if(!useAction(15))return;addSuspicion(6);toastLog("蓝盒是空的。若病历在蓝盒，绿盒与灰盒会同时为真，不符合“只有一句真话”。")}},
    {title:"打开灰盒",sub:"选择灰盒 · 错误会消耗行动并增加怀疑",fn:()=>{if(!useAction(15))return;addSuspicion(6);toastLog("灰盒只有旧处方。若病历在灰盒，绿盒与蓝盒会同时为真。")}}
  ]});
}

function fileRoutePuzzle(){
  openEvent({eyebrow:"周期谜题 1 · 文件袋流向",title:"找出唯一存在行政文件的轮转日",text:"院规要求材料先在洗衣房消毒签收，再送行政区。后勤周表说明：周一只有床单，周三混送行政文件，周五只回收归档。标签时间为病房 07:40、洗衣房 09:20、行政区 11:10。真实记录是哪一条？",img:"laundry-v2.png",choices:[
    {title:"周三：病房 07:40 → 洗衣房 09:20 → 行政区 11:10",sub:"星期、地点和时间全部吻合",fn:()=>{if(!useAction(18))return;addSuspicion(5);gainSkill("observe",50);addIntel("transferCopy");toastLog("推断正确。你在周三行政文件袋的签收夹层里找到被覆盖姓名的转院单副本。")}},
    {title:"周一：病房 07:40 → 洗衣房 09:20 → 行政区 11:10",sub:"顺序正确但轮转内容错误",fn:()=>{if(!useAction(14))return;S.storyFlags.filePuzzleFails++;addSuspicion(7);toastLog("周一只运送普通床单，没有行政签收页。你查错了车次，值班员开始留意你的动作。")}},
    {title:"周五：病房 07:40 → 行政区 11:10 → 洗衣房 09:20",sub:"日期与流程都不符合院规",fn:()=>{if(!useAction(14))return;S.storyFlags.filePuzzleFails++;addSuspicion(7);toastLog("周五是归档回收，而且材料不能绕过洗衣房消毒签收。这是伪造者留下的假路线。")}}
  ]});
}

function nightRosterPuzzle(){
  openEvent({eyebrow:"周期谜题 2 · 夜班排班",title:"找出每周重复的管理盲区",text:"纸条写着“周二 21:10”；周二个别治疗延长到 21:00，迫使巡逻交班准时开始、21:20 才到西侧。赵卫国证明 K-17 对应的交班页每周被提前撕走；周四 21:10 则有双人复查。停用蓝章只在西侧行政门留有残印。付款账页最可能藏在哪组记录后？",img:"archives-v2.png",choices:[
    {title:"周二 21:10 · 西侧行政门 · 访客 K-17",sub:"把时间、门区和经手代号同时交叉",fn:()=>{if(!useAction(22))return;addSuspicion(8);gainSkill("observe",55);addIntel("paymentRecord");toastLog("三项完全吻合。你在 K-17 的临时访客页后找到了连续付款账单。")}},
    {title:"周二 21:00 · 东门 · 夜班护士",sub:"只依据交班时间 · 错误代价较高",fn:()=>{if(!useAction(16))return;S.storyFlags.rosterPuzzleFails++;addSuspicion(9);toastLog("21:00 有两名护士同时签字，不可能是无人交接的空档。你的查阅痕迹被记录下来。")}},
    {title:"周四 21:10 · 西侧行政门 · 访客 K-17",sub:"代号吻合，但周四没有空档",fn:()=>{if(!useAction(16))return;S.storyFlags.rosterPuzzleFails++;addSuspicion(9);toastLog("周四 21:10 是双人复查。日期看似接近，却不可能让访客无人登记。")}}
  ]});
}

function valveSequencePuzzle(){
  openEvent({eyebrow:"周期谜题 3 · 三色压力阀",title:"利用周六锅炉测试完成泄压",text:"周六测试会暂时关闭主楼蒸汽警报。陈伯的图纸标明：红阀切断进汽；蓝阀只能在进汽关闭后泄压；绿阀连接出口门，压力归零后才能开启。刻痕从深到浅依次是红、蓝、绿。正确顺序是什么？",img:"maintenance-v2.png",choices:[
    {title:"关闭红阀 → 开启蓝阀泄压 → 开启绿阀",sub:"依次隔绝、泄压、开门",fn:()=>{if(!useAction(20))return;addSuspicion(4);gainSkill("work",55);addIntel("tunnelSafeRoute");toastLog("压力表归零，绿灯没有报警。维修通道现在具备安全通过条件。")}},
    {title:"先开绿阀 → 再关红阀 → 最后开蓝阀",sub:"带压开门 · 错误会额外损失体力",fn:()=>{if(!useAction(16))return;S.storyFlags.valvePuzzleFails++;S.energy=clamp(S.energy-10,0,100);addSuspicion(8);toastLog("高温蒸汽从门缝喷出。你及时退开，但声响惊动了走廊值班员。")}},
    {title:"先开蓝阀 → 再开绿阀 → 最后关红阀",sub:"进汽未断 · 错误会额外损失体力",fn:()=>{if(!useAction(16))return;S.storyFlags.valvePuzzleFails++;S.energy=clamp(S.energy-10,0,100);addSuspicion(8);toastLog("进汽仍在持续，蓝阀无法完成泄压。压力警示灯短暂亮起。")}}
  ]});
}

function wardEvent(){
  const choices=[
    {title:"休息一会儿",sub:"消耗 1 行动 · 体力 +30 · 药物负荷 -6",fn:()=>{if(!useAction(0))return;S.energy=clamp(S.energy+30,0,100);reduceDrugLoad(6);toastLog("你在病房安静休息，体力恢复，药物带来的迟钝感减轻了一些。")}},
    {title:"整理床位和公共区域",sub:"消耗 1 行动 · 体力 -5 · 信任 +5",fn:()=>{if(!useAction(5))return;S.trust+=5;S.suspicion=Math.max(0,S.suspicion-2);toastLog("你主动整理了病房，日常评价改善。")}}
  ];
  if(weekdayIs(1)&&!S.intel.treatmentSchedule)choices.push({title:"抄下本周治疗公告",sub:"周一限定 · 1 行动 · 观察 XP +25 · 获得治疗排班",fn:()=>{if(!useAction(5))return;gainSkill("observe",25);addIntel("treatmentSchedule");toastLog("你抄下集中评估、个别治疗与药品清点的固定日期。这张表下周仍会重复。")}});
  openEvent({title:`回到病房 · ${weekdayName()}`,text:weekdayIs(1)?"周一床尾会更新整周治疗公告。你的床位也能用来休息，让药物作用逐渐减弱。":"你的床位是少数真正属于自己的空间。治疗公告只在周一换新，但休息每天都可以进行。",img:"ward.webp",choices});
}
function workshopEvent(){
  const choices=[
    {title:"认真完成今天的工疗",sub:"1 行动 · 体力 -18 · 药物负荷 -2 · 工作 XP +40 · 积分与材料",fn:()=>{if(!useAction(18))return;gainSkill("work",40);const earn=10+S.skills.work.lv*3;S.tokens+=earn;S.inventory.material+=S.skills.work.lv>=2?2:1;S.trust+=3;reduceDrugLoad(2);toastLog(`完成规律工疗：积分 +${earn}，材料 +${S.skills.work.lv>=2?2:1}，药物带来的迟钝感略有减轻。`) }},
    {title:"趁空档锻炼搬运",sub:"1 行动 · 体力 -22 · 体能 XP +40",fn:()=>{if(!useAction(22))return;gainSkill("fitness",40);toastLog("你把搬运工作当成训练，体能提高。")}}
  ];
  if(weekdayIs(1)&&!S.intel.logisticsSchedule)choices.push({title:"帮师傅登记本周后勤车次",sub:"周一限定 · 1 行动 · 工作 / 观察 XP · 获得后勤周表",fn:()=>{if(!useAction(12))return;gainSkill("work",20);gainSkill("observe",20);addIntel("logisticsSchedule");toastLog("登记表显示：周三混送行政文件，周五只做归档回收。车次每周循环。")}});
  openEvent({title:`作业疗法工作坊 · ${weekdayName()}`,text:weekdayIs(1)?"周一需要登记整周后勤车次；日常木工、维修和包装仍是最稳定的积分来源。":"木工、简单维修和包装工作每天进行；整周后勤车次只在周一登记。",img:"workshop.webp",choices});
}
function gardenEvent(){
  const choices=[{title:"锻炼身体",sub:"低风险 · 1 行动 · 体力 -20 · 药物负荷 -4 · 体能 XP +45 · 怀疑 -1",fn:()=>{if(!useAction(20))return;gainSkill("fitness",45);reduceDrugLoad(4);S.suspicion=Math.max(0,S.suspicion-1);toastLog("完成一轮康复训练，活动和出汗让药物负荷降低了一些。")}}];
  if(S.day>=2)choices.push(
    {title:"找老张聊天",sub:"低风险 · 1 行动 · 体力 -10 · 老张关系 +10 · 社交 XP",fn:()=>{if(!useAction(10))return;gainRelation("zhang",10);gainSkill("social",30);if(S.requests.zhangTea&&S.relations.zhang>=35&&!S.intel.nightRoster)addIntel("nightRoster");toastLog("你和老张聊了很久。")}},
    {title:"找陈伯聊天",sub:"低风险 · 1 行动 · 体力 -10 · 陈伯关系 +10",fn:()=>{if(!useAction(10))return;gainRelation("chen",10);gainSkill("social",25);toastLog("陈伯对你说起旧楼维修间。")}}
  );
  if(S.day>=2&&weekdayIs(2)&&!S.intel.foldedNote)choices.push({title:"拆开长椅下的纸鹤",sub:"周二限定 · 需要小文关系 ≥ 35 · 获得求助纸条",fn:()=>{if(S.relations.xiaowen<35){toastLog("纸鹤只有一半编号，你还不知道另一半在哪里。");return}if(!useAction(8))return;gainSkill("observe",25);addIntel("foldedNote");toastLog("纸鹤内侧写着同一个姓名和每周二的探视时间。下周二还会有人来取纸鹤。")}});
  openEvent({title:`康复花园 · ${weekdayName()}`,text:S.day===1?"第一天先熟悉环境。这里暂时只开放简单、安全的康复训练。":(weekdayIs(2)?"周二是病友交换纸条的日子。日常锻炼与聊天也照常开放。":"这里每天都能锻炼、聊天；长椅下的纸鹤只在周二更换。"),img:"garden.webp",choices});
}
function libraryEvent(){
  const choices=[{title:"研究院规和评估流程",sub:"1 行动 · 体力 -12 · 观察 XP +45",fn:()=>{if(!useAction(12))return;gainSkill("observe",45);if(S.skills.observe.lv>=2&&!S.intel.rules)addIntel("rules");if(!S.intel.wristband)addIntel("wristband");toastLog("你把腕带编号、病历编号和院规逐条记了下来。")}}];
  if(weekdayIs(2,7))choices.push({title:"陪小文整理公益书架",sub:`${weekdayName()}限定 · 1 行动 · 小文关系 +12 · 社交 XP`,fn:()=>{if(!useAction(10))return;gainRelation("xiaowen",12);gainSkill("social",30);toastLog("公益阅读日前后，小文总会来整理书架。她对你的来历越来越好奇。")}});
  if(weekdayIs(1,5))choices.push({title:"整理旧档案编目卡",sub:`${weekdayName()}限定 · 1 行动 · 观察 XP +35 · 获得编目线索`,fn:()=>{if(!useAction(12))return;gainSkill("observe",35);addIntel("catalogNote");toastLog("你在退色的卡片背面读到：三只文件盒的标签中只有一句真话。")}});
  if(weekdayIs(4))choices.push({title:"用公开公告核对真实巡逻周表",sub:"周四限定 · 需要赵卫国提供巡逻周表 · 观察 XP +30 · 怀疑 -2",fn:()=>{if(!S.intel.patrolSchedule){toastLog("公告只写了模糊的“加强巡查”，无法还原实际交班。先取得保安赵卫国的信任。");return}if(!useAction(10))return;gainSkill("observe",30);S.suspicion=Math.max(0,S.suspicion-2);toastLog("公开公告刻意省略了周二交班空档，反而印证赵卫国提供的周表来自真实对讲记录。")}});
  openEvent({title:`图书室 · ${weekdayName()}`,text:weekdayIs(4)?"周四公告栏会贴出模糊的巡逻调整；只有和赵卫国的真实记录对照，才能看出被故意省略的时段。":"图书室的常规资料始终可查；志愿活动、旧卡片与公开公告会按星期轮换。",img:"library-v2.png",choices});
}
function cafeteriaEvent(){
  const choices=[
    {title:"参加食堂帮工",sub:"1 行动 · 体力 -14（结束后 +8）· 工作 XP +30 · 积分 +10",fn:()=>{if(!useAction(14))return;gainSkill("work",30);S.tokens+=10;S.energy=clamp(S.energy+8,0,100);S.trust+=2;toastLog("食堂帮工结束，你顺便吃了点热食。")}},
    {title:"坐下来和大家吃饭",sub:"1 行动 · 体力 -6 · 社交 XP +35 · 随机关系 +8",fn:()=>{if(!useAction(6))return;gainSkill("social",35);const ids=["zhang","chen","xiaowen"];const id=ids[Math.floor(Math.random()*ids.length)];gainRelation(id,8);toastLog("一顿普通的饭，让你和病友更熟了。")}}
  ];
  if(weekdayIs(3,6)&&!S.intel.trayMark)choices.push({title:"核对餐盘消毒批次编号",sub:`${weekdayName()}批次盘点 · 1 行动 · 观察 XP +30 · 获得编号线索`,fn:()=>{if(!useAction(8))return;addSuspicion(2);gainSkill("observe",30);addIntel("trayMark");toastLog("周三、周六盘点会翻看盘底。你的餐盘和旧出院照片都刻着 E2-071。")}});
  openEvent({title:`食堂帮工 · ${weekdayName()}`,text:weekdayIs(3,6)?"今天会清点餐盘消毒批次，盘底编号短暂可见。日常帮工与吃饭也照常开放。":"食堂每天都开放帮工与吃饭；周三、周六会额外清点餐盘编号。",img:"cafeteria-v2.png",choices});
}
function laundryEvent(){
  const choices=[
    {title:"正常完成洗衣工疗",sub:"1 行动 · 体力 -18 · 药物负荷 -3 · 工作 XP +38 · 积分 +14 · 材料 +1",fn:()=>{if(!useAction(18))return;gainSkill("work",38);S.tokens+=14;S.inventory.material++;S.trust+=3;reduceDrugLoad(3);toastLog("你完成规律的后勤工疗，药物负荷有所下降，也熟悉了本日轮转内容。")}}
  ];
  if(weekdayIs(3)&&!S.intel.bagRoute)choices.push({title:"检查行政文件袋的重贴标签",sub:"周三限定 · 1 行动 · 观察 XP +45 · 怀疑 +4 · 获得基础线索",fn:()=>{if(!useAction(16))return;addSuspicion(4);gainSkill("observe",45);addIntel("bagRoute");toastLog("只有周三混送行政文件。三张标签的胶痕方向相反，说明有人故意打乱顺序。")}});
  if(weekdayIs(5)&&S.intel.fileRoute&&!S.intel.transferCopy)choices.push({title:"在归档复核时复原文件袋流向",sub:"周五限定 · 需要文件流转链、观察 Lv.3 · 周期谜题",fn:()=>{if(S.skills.observe.lv<3){toastLog("线索已经凑齐，但还无法在标签复核结束前记住所有时刻。需要观察 Lv.3。");return}setTimeout(fileRoutePuzzle,0)}});
  const text=weekdayIs(3)?"周三会混送行政文件，是检查错序标签的唯一机会。":(weekdayIs(5)?"周五只做归档回收与标签复核；完整文件流转链可以在此转化为证据。":"周一只轮转普通床单，适合工疗和熟悉路线，不会出现行政文件袋。");
  openEvent({title:`洗衣房 · ${weekdayName()}`,text,img:"laundry-v2.png",choices});
}
function nurseEvent(){
  const choices=[
    {title:"帮忙整理活动用品",sub:"1 行动 · 体力 -10 · 信任 +6 · 护士林关系 +8",fn:()=>{if(!useAction(10))return;S.trust+=6;gainRelation("nurse",8);gainSkill("social",15);toastLog("护士林对你的评价明显改善。")}},
    {title:"提交可核对的线索链",sub:"1 行动 · 体力 -10 · 需要任意 1 条交叉印证",fn:()=>{const chains=["identityChain","fileRoute","visitorPattern","weeklyBlindSpot"].filter(id=>S.intel[id]);if(!chains.length){toastLog("零散线索还不能排除巧合。先在情报页形成至少一条交叉印证。");return}if(!useAction(10))return;gainRelation("nurse",12);S.trust+=4+chains.length;gainSkill("social",25+chains.length*5);toastLog(`你只陈述可以互相验证的事实。${chains.length} 条线索链让护士林开始正式记录。`)}}
  ];
  if(weekdayIs(2)&&!S.intel.treatmentSchedule)choices.push({title:"询问本周个别治疗调整",sub:"周二限定 · 1 行动 · 获得每周治疗安排",fn:()=>{if(!useAction(8))return;gainRelation("nurse",4);gainSkill("observe",20);addIntel("treatmentSchedule");toastLog("护士林说明了集中评估、晚间治疗和周五联合清点的固定周期。")}});
  if(weekdayIs(4))choices.push({title:"核对印章领用登记",sub:"周四限定 · 需要餐盘编号或求助纸条 · 获得印章线索",fn:()=>{if(!S.intel.trayMark&&!S.intel.foldedNote){toastLog("你还没有能与领用日期交叉核对的编号。");return}if(!useAction(10))return;gainSkill("observe",35);gainRelation("nurse",5);addIntel("stampMismatch");toastLog("周四行政登记开放。记录显示，那枚蓝色骑缝章在转院单日期前已经停用。")}});
  if(weekdayIs(4))choices.push({title:"递交正式复核申请",sub:"周四限定 · 需要复核申请表、信任 75、护士关系 30、社交 Lv.3",fn:()=>{if(S.legalPass){toastLog("正式复核申请已经递交。");return}if(!hasItem(S,"form")||S.trust<75||S.relations.nurse<30||S.skills.social.lv<3){toastLog("申请条件不足：需要复核申请表、信任 75、护士林关系 30 和社交 Lv.3。");return}if(!useAction(8))return;S.inventory.form--;S.legalPass=true;toastLog("你赶上周四补充复核。护士林把三项可核对矛盾写进正式流程。")}});
  openEvent({title:`护士站 · ${weekdayName()}`,text:weekdayIs(4)?"周四开放行政登记和补充复核，是核对印章、递交申请的固定窗口。":"护士站今天可以处理日常活动；行政登记与正式复核只在周四开放。",img:"nurse-v2.png",choices});
}
function archivesEvent(){
  const choices=[];
  if(weekdayIs(5))choices.push(
    {title:"核对旧档案索引",sub:"周五限定 · 1 行动 · 观察 XP +35 · 获得编目线索",fn:()=>{if(!useAction(16))return;addSuspicion(3);gainSkill("observe",35);addIntel("catalogNote");toastLog("周五归档清点展开旧索引。绿、蓝、灰三只盒子的标签中只有一句真话。")}},
    {title:"破解三只档案盒",sub:"周五限定 · 身份替换链 + 编目便签 + 观察 Lv.3",fn:()=>{if(S.intel.originalFile){toastLog("病历原件已经取得，不必再次打开档案盒。");return}if(!S.intel.identityChain||!S.intel.catalogNote||S.skills.observe.lv<3){toastLog("需要身份替换链、编目便签和观察 Lv.3。");return}setTimeout(archiveBoxPuzzle,0)}}
  );
  if(weekdayIs(3))choices.push({title:"按周期盲区解读付款归档",sub:"周三限定 · 周期性管理盲区 + 病历原件 + 观察 Lv.4",fn:()=>{if(S.intel.paymentRecord){toastLog("私人付款记录已经取得，不必再次解读排班。");return}if(!S.intel.weeklyBlindSpot||!S.intel.originalFile||S.skills.observe.lv<4){toastLog("还需要周期性管理盲区、病历原件和观察 Lv.4，才能锁定周三账页。");return}setTimeout(nightRosterPuzzle,0)}});
  openEvent({title:`档案室外围 · ${weekdayName()}`,text:weekdayIs(3)?"周三审计付款账页：只有把巡逻、治疗和后勤周表交叉起来，才能找出固定盲区。":"周五清点旧索引与档案盒，适合取得病历原件；付款账页要等周三审计。",img:"archives-v2.png",choices});
}
function visitorEvent(){
  const choices=[];
  if(weekdayIs(2))choices.push({title:"使用电话卡联系大学同学",sub:"周二电话时段 · 消耗电话卡 ×1 · 建立院外联络",fn:()=>{if(!hasItem(S,"phonecard")){toastLog("你没有电话卡。");return}if(!useAction(8))return;S.inventory.phonecard--;S.externalContact=true;gainSkill("social",25);toastLog("周二电话时段，你联系上大学同学周言。他答应保存之后传出的证据。")}});
  if(weekdayIs(4))choices.push({title:"申请一次正式通话",sub:"周四审批时段 · 需要信任 72、社交 Lv.2",fn:()=>{if(S.trust<72||S.skills.social.lv<2){toastLog("你的当前评估还不足以批准这次通话。");return}if(!useAction(8))return;S.externalContact=true;S.trust+=2;toastLog("周四通话申请获批。周言在电话另一头确认了你的真实身份。")}});
  if(weekdayIs(7))choices.push({title:"托公益阅读志愿者带出口信",sub:"周日限定 · 完成小文请求、求助纸条、小文关系 45",fn:()=>{if(!S.requests.xiaowenNotebook||!S.intel.foldedNote||S.relations.xiaowen<45){toastLog("还需要完成小文的请求，并取得求助纸条与足够关系。");return}if(!useAction(8))return;S.externalContact=true;gainRelation("xiaowen",6);gainSkill("social",30);toastLog("周日公益阅读结束，志愿者把纸条照片和你的真实姓名带给周言。")}});
  openEvent({title:`访客与电话区 · ${weekdayName()}`,text:weekdayIs(2)?"周二开放付费电话。":(weekdayIs(4)?"周四处理正式通话申请。":"周日公益阅读志愿者到院，可以把信息带到墙外。"),img:"visitor-v2.png",choices});
}
function maintenanceEvent(){
  const choices=[
    {title:"和陈伯一起整理维修间",sub:"1 行动 · 体力 -18 · 陈伯关系 +12 · 工作 XP",fn:()=>{if(!useAction(18))return;gainRelation("chen",12);gainSkill("work",30);S.inventory.material+=2;toastLog("你帮陈伯整理零件，他开始把你当真正的朋友。")}},
    {title:"请陈伯画出旧维修通道",sub:"需要：完成陈伯请求 · 关系 ≥55 · 材料 ×3",fn:()=>{if(!S.requests.chenSnack||S.relations.chen<55||!hasItem(S,"material",3)){toastLog("还需要先完成陈伯的请求、建立足够关系，并准备 3 份材料。");return}if(!useAction(12))return;S.inventory.material-=3;addIntel("tunnelMap");toastLog("陈伯画出简图，但提醒你：锅炉间不先泄压就会触发蒸汽警报。")}}
  ];
  if(weekdayIs(6)&&!S.intel.valveMark)choices.push({title:"记录锅炉测试后的阀门刻痕",sub:"周六限定 · 1 行动 · 观察 XP +30 · 获得阀门线索",fn:()=>{if(!useAction(12))return;addSuspicion(3);gainSkill("observe",30);addIntel("valveMark");toastLog("周六测试让三只阀门显露出来。刻痕是老检修工留下的操作顺序。")}});
  if(weekdayIs(6)&&S.intel.tunnelMap&&S.intel.valveMark&&!S.intel.tunnelSafeRoute)choices.push({title:"借锅炉测试破解三色压力阀",sub:"周六限定 · 维修地图 + 锅炉刻痕 + 工作 Lv.3",fn:()=>{if(S.skills.work.lv<3){toastLog("你能看懂刻痕，却还无法判断三路管线压力。需要工作 Lv.3。");return}setTimeout(valveSequencePuzzle,0)}});
  openEvent({title:`后勤维修间 · ${weekdayName()}`,text:weekdayIs(6)?"周六锅炉测试会打开阀门间并屏蔽短时警报，是记录刻痕、验证泄压顺序的唯一窗口。":"周二适合整理维修间和绘制通道地图；三色阀门要等周六锅炉测试。",img:"maintenance-v2.png",choices});
}
function talkNPC(id){
  return trackAction(()=>{
    if(!S.morningDone){toastLog("先处理晨间治疗。");return}
    const meta=requestMeta[id],done=S.requests[meta.flag];
    if(!done&&S.relations[id]>=30){toastLog(`你们已经熟悉，但关系没有继续深入。先帮对方找到${itemMeta[meta.item].name}。`);return}
    if(!useAction(8))return;
    const intendedGain=done?(S.relations[id]<55?7:3):10,gain=gainRelation(id,intendedGain);gainSkill("social",25);
    if(id==="zhang"&&done&&S.day>=3&&S.relations.zhang>=35&&!S.intel.nightRoster)addIntel("nightRoster");
    if(id==="xiaowen"&&S.relations.xiaowen>=45&&!S.externalContact&&S.skills.social.lv>=2){toastLog("小文说：她认识一个每周来院里做公益阅读的人，也许能帮你带话。")} 
    if(id==="guard"&&done&&!S.intel.patrolSchedule)addIntel("patrolSchedule");
    if(id==="guard"&&S.intel.guardTestimony&&S.relations.guard>=55){S.suspicion=Math.max(0,S.suspicion-2);S.trust+=1;toastLog(`赵卫国把你当天的合规行动写进巡逻记录。关系提升 ${gain}，信任 +1，怀疑 -2。`)}
    else if(id==="guard"&&done&&!S.intel.guardTestimony)toastLog(`赵卫国和你核对了本周巡逻时间。关系提升 ${gain}。他暗示周四复查后再谈交班簿缺页。`);
    else toastLog(`你们聊了一会儿，关系提升 ${gain}。${done?"之前的帮助让谈话更有分量。":"再深入需要用实际帮助建立信任。"}`);render();if(S.actions>0)setTimeout(triggerDailyStory,180);checkAutoEnd()
  });
}
function helpNPC(id){
  return trackAction(()=>{
    if(!S.morningDone){toastLog("先处理晨间治疗。");return}
    const meta=requestMeta[id],{item,flag,gain,rewardItem,reward}=meta;
    if(S.requests[flag]){toastLog("这个请求已经完成了。");return}
    if(id==="guard"&&S.relations.guard<20){toastLog("赵卫国还不愿接受你的帮助。先和他聊到关系 20，再交付对讲机电池。");return}
    if(!hasItem(S,item)){toastLog(`你没有${itemMeta[item].name}。`);return}
    S.inventory[item]--;S.requests[flag]=true;gainRelation(id,gain);S.trust+=1;gainSkill("social",15);
    if(id==="zhang"&&S.day>=3&&!S.intel.nightRoster)addIntel("nightRoster");
    if(id==="chen")S.inventory.material+=1;
    if(id==="guard")addIntel("patrolSchedule");
    S.inventory[rewardItem]=(S.inventory[rewardItem]||0)+1;
    const person={zhang:"老张",chen:"陈伯",xiaowen:"小文",nurse:"护士林",guard:"赵卫国"}[id];
    toastLog(`你完成了${person}的请求。关系突破，并获得：${reward}。`);
    render();saveGame(false);if(S.actions>0)setTimeout(triggerDailyStory,180)
  });
}
function buyItem(id,price){return trackAction(()=>{
  if(S.tokens<price){toastLog("积分不够。首次成功购买才会扣除行动。",false);return}
  if(shopFirstPurchasePending){if(!useAction(0))return;shopFirstPurchasePending=false}
  S.tokens-=price;S.inventory[id]++;toastLog(`购买：${itemMeta[id].name}。`,false);render();if(!$("shopModal").classList.contains("hidden"))renderShopModal()
})}
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

function showConfinementModal(changes=[]){
  $("confinementText").textContent="怀疑达到 60，院方启动隔离处分。剩余行动全部取消，隔离占用 1 天，并执行强制服药。";
  $("confinementChanges").innerHTML=changes.map(change=>`<span class="changeChip ${change.tone}">${escapeText(change.text)}</span>`).join("");
  $("confinementModal").classList.remove("hidden");$("finishConfinementBtn").focus();
}
function triggerConfinementIfNeeded(){
  if(S.completed||S.suspicion<60||S.storyFlags.confinementActive)return false;
  const before=captureFeedback();S.storyFlags.confinementActive=true;S.storyFlags.confinementCount=(S.storyFlags.confinementCount||0)+1;
  S.actions=0;S.trust-=8;S.drug+=36;S.energy-=10;S.suspicion=50;normalizeStats();S.maxActions=dailyActionAllowance(S.drug);
  shopFirstPurchasePending=false;["eventModal","shopModal","dayEndModal","intelRevealModal"].forEach(id=>$(id).classList.add("hidden"));$("morningEvent").classList.add("hidden");setDayActionVisibility(false);
  const changes=feedbackChanges(before,captureFeedback());toastLog("怀疑达到警戒线。当前行动被中断，你被关进小黑屋，剩余行动全部取消并遭到强制服药。",false,changes);render();saveGame(false);showConfinementModal(changes);return true;
}
function finishConfinement(){
  if(!S.storyFlags.confinementActive)return;
  $("confinementModal").classList.add("hidden");S.storyFlags.confinementActive=false;S.day++;
  S.period=0;S.energy=clamp(S.energy+30,0,100);S.maxActions=dailyActionAllowance(S.drug);S.actions=S.maxActions;S.morningDone=false;
  toastLog(`第 ${S.day} 天（${weekdayName()}）开始。隔离已经结束，但强制服药的影响仍然存在。`,false);setScreen("gameScreen");forceTodayPanel();applyDayStartProgression();render();morningTreatment();saveGame(false)
}

function endDay(skipConfirmation=false){
  if(S.storyFlags.confinementActive)return;
  if($("dayEndModal").classList.contains("hidden")===false)return;
  if(!skipConfirmation&&S.actions>0&&!window.confirm(`今天还剩 ${S.actions} 次行动。确定提前结束今天吗？`))return;
  const beforeRest=captureFeedback();
  S.energy=clamp(S.energy+45,0,100);reduceDrugLoad(10);
  normalizeStats();
  const restChanges=feedbackChanges(beforeRest,captureFeedback());
  let overnight="夜里很安静。你睡了一觉，体力得到恢复，药物负荷降低 10；怀疑和其他状态保持不变。";
  if(S.day===2){overnight="你听见走廊里有人说，洗衣房最近在集中整理一批旧档案袋。"}
  if(S.day===4){overnight="公告栏贴出通知：下周会进行一次集中康复评估。表现稳定的人可以申请额外通话。"}
  if(S.day===6){overnight="陈伯提到：旧楼维修间后面的墙，比其他地方薄得多。"}
  if(S.day===9&&!S.externalContact){overnight="你开始意识到：离院没有硬性期限，但把信息送到院外仍然是保护证据的重要一步。"}
  $("dayEndTitle").textContent=`第 ${S.day} 天 · ${weekdayName()}结束`;
  $("dayEndText").innerHTML=`正常结束一天恢复体力，并使药物负荷降低 10；进入下一天后恢复行动次数。信任、怀疑、能力、关系、物资和情报保持不变。<div class="logChanges">${restChanges.map(change=>`<span class="changeChip ${change.tone}">${change.text}</span>`).join("")}</div>`;
  $("dayEndStats").innerHTML=`<div><b>${S.energy}</b><br><small>明日体力</small></div><div><b>${S.trust}</b><br><small>信任</small></div><div><b>${evidenceCount(S)}</b><br><small>关键证据</small></div><div><b>${progressPct()}%</b><br><small>离院准备</small></div>`;
  $("overnightEvent").textContent=overnight;
  $("dayEndModal").classList.remove("hidden");saveGame(false)
}
function nextDay(){
  S.day++;S.period=0;S.maxActions=dailyActionAllowance(S.drug);S.actions=S.maxActions;S.morningDone=false;
  $("dayEndModal").classList.add("hidden");
  toastLog(`第 ${S.day} 天（${weekdayName()}）开始。新的行动与事件会记录在这里。`,false);
  setScreen("gameScreen");forceTodayPanel();applyDayStartProgression();render();morningTreatment();saveGame(false)
}
function executeEscape(route){
  if(route==="legal"&&!escapeReadyLegal())return;
  if(route==="tunnel"&&!escapeReadyTunnel())return;
  if(route==="media"&&!escapeReadyMedia())return;
  S.completed=true;saveGame(false);
  $("endingImage").src=route==="legal"?"assets/garden.webp":(route==="media"?"assets/visitor.webp":"assets/hospital.webp");
  if(route==="legal"){
    $("endingTitle").textContent="你从正门走了出去。";
    $("endingText").innerHTML="你把密封证据包交给周言，护士林递交正式复核申请，赵卫国则为缺失的交班页签下证词。文件、程序与人证彼此印证，院方无法再把整条链解释成录入错误。下午 4:20，你拿回自己的名字和证件。<br><br><b>你没有证明自己“正常”。你只是终于让事实进入了一套能被核对的程序。</b>";
  }else if(route==="tunnel"){
    $("endingTitle").textContent="花园外面，没有铁门。";
    $("endingText").innerHTML="赵卫国交出的旧门禁牌避开了联网门禁，陈伯确认的维修通道仍然可用。你用袖珍手电穿过断电的旧锅炉间，从花园外侧检修口离开。周言已经等在那里。你获得了自由，但身份记录仍需要在院外慢慢解决。<br><br><b>这是一条更快的路，也是一条把未完成问题带到墙外的路。</b>";
  }else{
    $("endingTitle").textContent="镜头打开时，铁门不能再悄悄关上。";
    $("endingText").innerHTML="旧报社、公益志愿者和周言在同一分钟公开夜班记录、付款文件与赵卫国的证词。记者来到门口，院方无法再把你的转移处理成内部流程。你在公开监督下离院，调查随后正式启动。<br><br><b>你不是独自证明一切，而是让足够多的人同时看见同一件事。</b>";
  }
  $("endingStats").innerHTML=`<div><b>${S.day}</b><br><small>离院天数</small></div><div><b>${evidenceCount(S)}/3</b><br><small>关键证据</small></div><div><b>${S.trust}</b><br><small>院方信任</small></div><div><b>${S.suspicion}</b><br><small>最终怀疑</small></div>`;
  setScreen("endingScreen");deleteSave()
}

function newGame(){
  if(localStorage.getItem(SAVE_KEY)&&!window.confirm("开始新游戏会覆盖当前存档，确定继续吗？"))return;
  S=defaultState();deleteSave();setScreen("introScreen")
}
function continueGame(){if(loadGame()){setScreen("gameScreen");applyDayStartProgression();render();if(S.storyFlags.confinementActive)showConfinementModal();else if(S.suspicion>=60)triggerConfinementIfNeeded();else if(!S.morningDone)morningTreatment();else setTimeout(triggerDailyStory,180)}}
function startFromIntro(){setScreen("gameScreen");render();morningTreatment();saveGame(false)}

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{activatePanel(t.dataset.panel);render()});
$("newGameBtn").onclick=newGame;$("continueBtn").onclick=continueGame;$("enterBtn").onclick=startFromIntro;
$("saveBtn").onclick=()=>saveGame(true);$("endDayBtn").onclick=()=>endDay();$("nextDayBtn").onclick=nextDay;
$("closeEventBtn").onclick=closeEvent;$("closeShopBtn").onclick=closeShop;$("finishConfinementBtn").onclick=finishConfinement;$("intelRevealConfirm").onclick=confirmIntelReveal;$("endingRestart").onclick=()=>{deleteSave();location.reload()};
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!$("confinementModal").classList.contains("hidden")){e.preventDefault();return}
  if(e.key==="Escape"&&!$("intelRevealModal").classList.contains("hidden")){e.preventDefault();return}
  if(e.key==="Escape"&&!$("shopModal").classList.contains("hidden")){closeShop();return}
  if(e.key==="Escape"&&!$("eventModal").classList.contains("hidden"))closeEvent();
  if(e.altKey&&/^[1-6]$/.test(e.key)){
    e.preventDefault();const tab=document.querySelectorAll(".tab")[Number(e.key)-1];if(tab)activatePanel(tab.dataset.panel);
  }
});

if(localStorage.getItem(SAVE_KEY))$("continueBtn").classList.remove("hidden");
setScreen("titleScreen");
