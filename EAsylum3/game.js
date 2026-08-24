const $=id=>document.getElementById(id);
const SAVE_KEY="escape_asylum_v3_final_save";
const LEGACY_V1_KEY="escape_asylum_demo_v1_save";
const LEGACY_V3_KEY="escape_asylum_management_demo_v3";
const VERSION=15;
const WEEK=["周一","周二","周三","周四","周五","周六","周日"];
let S,toastTimer,shopFirst=false,gameStarted=false,pendingClues=[],currentClue=null;

const skillMeta={
  fitness:{name:"体能",icon:"▲"},work:{name:"技能",icon:"⚒"},social:{name:"沟通",icon:"◎"},observe:{name:"洞察",icon:"◆"}
};

const itemMeta={
  tea:{name:"茶包",icon:"🍵",price:8,day:2,desc:"独立包装的普通茶包。"},
  book:{name:"侦探小说",icon:"📘",price:12,day:3,desc:"封面磨损的旧书，缺了最后几页。"},
  snack:{name:"点心",icon:"🍪",price:6,day:2,desc:"一小包独立包装的甜点。"},
  notebook:{name:"笔记本",icon:"📒",price:10,day:3,desc:"还有很多空白页的硬皮笔记本。"},
  battery:{name:"对讲机电池",icon:"🔋",price:10,day:3,desc:"一枚常见型号的备用电池。"},
  phonecard:{name:"电话卡",icon:"☎",price:18,day:4,desc:"院内电话使用的磁卡。"},
  material:{name:"零件材料",icon:"🔩",price:null,day:2,desc:"几枚来源不同的金属零件。"},
  soap:{name:"香皂",icon:"▰",price:8,day:2,desc:"一块没有拆封的日用品。"},
  carbon:{name:"复写纸",icon:"▤",price:14,day:5,desc:"一叠薄而容易留下痕迹的纸。"},
  envelope:{name:"防水信封",icon:"✉",price:16,day:5,desc:"封口严密，纸张不容易受潮。"},
  flashlight:{name:"袖珍手电",icon:"●",price:24,day:5,desc:"电量不多，光线只能照出几步远。"},
  gatepass:{name:"旧门禁牌",icon:"▣",price:null,day:4,desc:"表面磨损严重，编号仍然可辨认。"},
  form:{name:"复核申请表",icon:"▧",price:null,day:4,desc:"带有院方抬头的空白表格。"},
  casefile:{name:"密封证据包",icon:"▥",price:null,day:4,desc:"已经封口的文件包。"}
};

const personMeta={
  nurse:{name:"护士林",short:"林",role:"护士",desc:"大部分时候只是按制度工作。你表现稳定时，她愿意认真听你说话。"},
  zhang:{name:"老张",short:"张",role:"病友 · 曾做过记者",desc:"记性很好，经常注意到别人忽略的细节。"},
  chen:{name:"陈伯",short:"陈",role:"病友 · 原维修工",desc:"熟悉旧楼管线和维修间，讲话不多。"},
  xiaowen:{name:"小文",short:"文",role:"病友 · 图书室志愿者",desc:"喜欢记录故事，和院外公益组织保持过联系。"},
  guard:{name:"赵卫国",short:"赵",role:"保安 · 西侧巡逻岗",desc:"谨慎寡言，熟悉每周巡逻与交班程序。"}
};

const requestMeta={
  zhang:{item:"tea",flag:"zhangTea",gain:22,reward:"复写纸 ×1",rewardItem:"carbon",threshold:15,story:"老张聊起以前写夜稿的日子。他说，病区的白开水总让他想起一杯真正有味道的热茶。"},
  chen:{item:"snack",flag:"chenSnack",gain:24,reward:"袖珍手电 ×1、零件材料 ×1",rewardItem:"flashlight",threshold:10,story:"陈伯看着别人分点心，忽然说维修班过去总会在夜工结束后留一点甜食。"},
  xiaowen:{item:"notebook",flag:"xiaowenNotebook",gain:24,reward:"防水信封 ×1",rewardItem:"envelope",threshold:10,story:"小文把零散纸条夹进书页，说这里没有一本可以长期写东西的本子。"},
  nurse:{item:"book",flag:"nurseBook",gain:24,reward:"复核申请表 ×1",rewardItem:"form",threshold:12,story:"护士林揉了揉眼睛。她说夜班最难熬的时候，只能靠一本没读完的旧侦探小说转移注意。"},
  guard:{item:"battery",flag:"guardBattery",gain:24,reward:"旧门禁牌 ×1、院内巡逻周表",rewardItem:"gatepass",threshold:20,story:"赵卫国拍了拍不断杂音的对讲机：备用电池早就不在配发清单里了。"}
};

const intelMeta={
  wristband:{name:"错误腕带编号",type:"基础线索",layer:1,text:"你的腕带编号与病历页码根本对不上。",impact:"与餐盘编号、停用印章交叉后，可确认身份记录被复用。"},
  rules:{name:"院规与评估漏洞",type:"基础线索",layer:1,text:"“病情稳定”主要由行为记录与主治评估决定。",impact:"可改善复核策略，也是追踪文件流转规则的前提。"},
  trayMark:{name:"重复的餐盘编号",type:"基础线索",layer:1,text:"你的餐盘编号与另一名早已出院的患者完全相同。",impact:"与腕带和印章组成身份替换链。"},
  catalogNote:{name:"旧档案编目便签",type:"基础线索",layer:1,text:"旧档案不按姓名排列；三只文件盒的标签中只有一句真话。",impact:"与身份替换链共同解锁三只档案盒谜题。"},
  foldedNote:{name:"夹在书页里的求助纸条",type:"基础线索",layer:1,text:"纸条记录了一个被改名后转走的患者，以及每周二的异常探视。",impact:"与夜班记录、停用印章交叉后，可定位异常探视时段。"},
  stampMismatch:{name:"不一致的蓝色骑缝章",type:"基础线索",layer:1,text:"转院材料上的蓝章来自已停用的行政印章，日期对不上。",impact:"同时连接身份替换与异常探视两条调查链。"},
  nightRoster:{name:"异常夜班记录",type:"基础线索",layer:1,text:"同一位院外人员每周两次在深夜进入行政区。",impact:"与求助纸条、停用印章交叉后，可解读探视排班。"},
  bagRoute:{name:"被调换的文件袋标签",type:"基础线索",layer:1,text:"洗衣房的三张流转标签被撕下后重新贴过，时间顺序明显不对。",impact:"与院规、编目便签交叉后，解锁文件袋流向谜题。"},
  valveMark:{name:"锅炉阀门刻痕",type:"基础线索",layer:1,text:"红、蓝、绿三只阀门旁各有一道旧刻痕，像是留给检修工的顺序提示。",impact:"取得维修地图后，可解锁压力阀顺序谜题。"},
  patrolSchedule:{name:"院内巡逻周表",type:"周期排班",layer:1,text:"赵卫国依据实际呼叫记录还原了巡逻周期，周二交班存在固定空档。",impact:"参与异常探视链，并为维修通道选择安全离院日。",schedule:["周二 21:00 交班，21:20 西侧巡查","周四 21:10 双人复查","周末花园外墙增巡"]},
  guardTestimony:{name:"缺页的交班证词",type:"人物证词",layer:1,text:"赵卫国承认：周二交班簿总会被行政主任提前撕走一页。",impact:"证明巡逻空档被内部人员刻意利用。"},
  treatmentSchedule:{name:"每周治疗安排",type:"周期排班",layer:1,text:"院方治疗与评估按周循环，护士与主任会在固定时段离开各自岗位。",impact:"与巡逻、后勤周表交叉后，可确认周期性管理盲区。",schedule:["周一上午集中评估","周二晚间个别治疗","周五药品与病历联合清点"]},
  logisticsSchedule:{name:"后勤轮转周表",type:"周期排班",layer:1,text:"文件袋和床单车只在周一、周三、周五进入洗衣房。",impact:"参与文件流转链，并说明何时能够复原标签。",schedule:["周一普通床单","周三床单与行政文件袋","周五归档回收"]},
  identityChain:{name:"身份替换链",type:"交叉印证",layer:2,requires:["wristband","trayMark","stampMismatch"],text:"腕带、餐盘与停用印章指向同一个旧编号：你的身份被一整套旧记录替换。",impact:"解锁档案原件调查，并强化合法复核。"},
  fileRoute:{name:"文件流转链",type:"交叉印证",layer:2,requires:["rules","catalogNote","bagRoute","logisticsSchedule"],text:"院规、编目便签、错序标签和后勤周表共同证明文件只可能在周三被夹进床单车。",impact:"周五洗衣房开放文件袋流向谜题。"},
  visitorPattern:{name:"异常探视链",type:"交叉印证",layer:2,requires:["foldedNote","nightRoster","stampMismatch","patrolSchedule","guardTestimony"],text:"求助纸条、停用印章、夜班名单与缺页证词共同指向周二固定空档。",impact:"与治疗、后勤周表继续交叉后，可锁定付款账页。"},
  weeklyBlindSpot:{name:"周期性管理盲区",type:"交叉印证",layer:2,requires:["visitorPattern","treatmentSchedule","logisticsSchedule"],text:"周二治疗、周三文件外送、周五归档清点形成固定闭环。",impact:"周三档案区开放夜班排班谜题，也是方案 C 的核心逻辑。"},
  transferCopy:{name:"被改动的转院单",type:"关键证据",layer:3,requires:["fileRoute"],text:"转院单副本上的原始姓名被覆盖，日期也被改过。",impact:"方案 A 的关键证据。",evidence:true},
  originalFile:{name:"病历原件",type:"关键证据",layer:3,requires:["identityChain","catalogNote"],text:"原始入院记录显示：送你入院的人并非登记家属。",impact:"连接身份替换链与付款链。",evidence:true},
  paymentRecord:{name:"私人付款记录",type:"关键证据",layer:3,requires:["weeklyBlindSpot","originalFile"],text:"有人持续支付一笔标为“照护费用”的私人款项。",impact:"方案 A 与隐藏方案 C 的核心证据。",evidence:true},
  tunnelMap:{name:"维修通道地图",type:"路线情报",layer:3,text:"旧后勤通道可以绕开正门，出口通向花园外侧。",impact:"还需结合锅炉刻痕破解压力阀顺序。"},
  tunnelSafeRoute:{name:"安全泄压顺序",type:"路线突破",layer:4,requires:["tunnelMap","valveMark"],text:"红阀封蒸汽、蓝阀泄压、最后开启绿阀。",impact:"完成方案 B 的最终路线准备。"},
  mediaPlan:{name:"旧报社公开计划",type:"隐藏离院方案",layer:4,text:"旧报社与公益志愿者可以同步公开记录。",impact:"解锁方案 C，并将人物与证据转化为公共监督。"}
};

const derivedRules=[
  ["identityChain",["wristband","trayMark","stampMismatch"]],
  ["fileRoute",["rules","catalogNote","bagRoute","logisticsSchedule"]],
  ["visitorPattern",["foldedNote","nightRoster","stampMismatch","patrolSchedule","guardTestimony"]],
  ["weeklyBlindSpot",["visitorPattern","treatmentSchedule","logisticsSchedule"]]
];

const talentMeta={
  steadyBreath:{branch:"生存",name:"稳定呼吸",max:3,cost:[1,1,2],condition:"体能 Lv.2",requires:s=>s.skills.fitness.lv>=2,desc:"病房休息时，每级额外恢复 6 点体力。"},
  conditioned:{branch:"生存",name:"耐力调度",max:3,cost:[1,2,2],condition:"稳定呼吸 Lv.1 · 体能 Lv.3",requires:s=>talentLevel("steadyBreath",s)>=1&&s.skills.fitness.lv>=3,desc:"每级减少 1 点行动体力消耗。"},
  metabolism:{branch:"生存",name:"代谢训练",max:2,cost:[2,3],condition:"耐力调度 Lv.2 · 体能 Lv.4",requires:s=>talentLevel("conditioned",s)>=2&&s.skills.fitness.lv>=4,desc:"正常过夜时，每级额外降低 3 点药物负荷。"},
  nightStride:{branch:"生存",name:"夜间步法",max:1,cost:[3],condition:"代谢训练 Lv.1 · 维修通道地图",requires:s=>talentLevel("metabolism",s)>=1&&s.intel.tunnelMap,desc:"方案 B 的体能要求降低 1 级。"},
  patternSense:{branch:"调查",name:"规律感知",max:3,cost:[1,1,2],condition:"洞察 Lv.2",requires:s=>s.skills.observe.lv>=2,desc:"洞察成长每级提高 10%。"},
  documentReader:{branch:"调查",name:"文件速读",max:1,cost:[2],condition:"规律感知 Lv.1 · 院规线索",requires:s=>talentLevel("patternSense",s)>=1&&s.intel.rules,desc:"档案区准入所需洞察等级降低 1。"},
  riskControl:{branch:"调查",name:"风险控制",max:3,cost:[1,2,2],condition:"文件速读 · 任意交叉印证",requires:s=>talentLevel("documentReader",s)>=1&&derivedCount(s)>=1,desc:"危险行动增加怀疑时，每级减少 1 点。"},
  evidenceMind:{branch:"调查",name:"证据思维",max:2,cost:[2,3],condition:"风险控制 Lv.2 · 任意关键证据",requires:s=>talentLevel("riskControl",s)>=2&&evidenceCount(s)>=1,desc:"取得新关键证据时，每级额外获得 1 点养成点数。"},
  activeListening:{branch:"人脉",name:"主动倾听",max:3,cost:[1,1,2],condition:"沟通 Lv.2",requires:s=>s.skills.social.lv>=2,desc:"关系正常提升时，每级额外增加 1 点。"},
  reciprocity:{branch:"人脉",name:"互惠关系",max:2,cost:[2,2],condition:"主动倾听 · 完成任意人物请求",requires:s=>talentLevel("activeListening",s)>=1&&requestCount(s)>=1,desc:"完成人物请求时获得额外关系，并返还 1 点养成点数。"},
  trustedCircle:{branch:"人脉",name:"可信圈层",max:2,cost:[2,3],condition:"互惠关系 · 任意关系 45",requires:s=>talentLevel("reciprocity",s)>=1&&Math.max(...Object.values(s.relations))>=45,desc:"管理区域信任门槛每级降低 2 点。"},
  outsideBridge:{branch:"人脉",name:"墙外桥梁",max:1,cost:[3],condition:"可信圈层 · 建立院外联络",requires:s=>talentLevel("trustedCircle",s)>=1&&s.externalContact,desc:"方案 A/C 的沟通要求降低 1 级，人物关系要求降低 5。"}
};

const scenes={
  ward:{title:"东区 2 号病房",hint:"床铺恢复状态，床头柜藏着最初的身份矛盾。",day:1,people:["nurse"],hotspots:[["rest","休息",17,62],["locker","储物柜",82,45],["wristband","陌生腕带",50,56],["wardNotice","床尾公告",68,35]]},
  garden:{title:"康复花园",hint:"训练身体，也在日常交谈里慢慢认识病友。",day:1,people:["zhang","chen"],hotspots:[["zhang","老张",27,63],["exercise","康复训练",61,47],["chen","陈伯",83,63]]},
  workshop:{title:"工疗工作坊",hint:"规律工作换取积分与材料，赵卫国负责这里的巡逻。",day:1,people:["guard"],hotspots:[["work","工疗台",28,59],["materials","零件架",61,65],["guard","赵卫国",87,56]]},
  library:{title:"图书室",hint:"院规、旧书和志愿活动让文字里的矛盾开始连成线索。",day:2,weekdays:[1,2,4,5,7],people:["xiaowen"],hotspots:[["rules","院规资料",24,46],["bookSearch","旧书架",58,49],["xiaowen","小文",82,62]]},
  cafeteria:{title:"病区食堂",hint:"帮忙可以赚取积分；编号和餐具也可能留下记录。",day:2,people:["xiaowen"],hotspots:[["cafeteriaWork","配餐台",27,55],["tray","餐盘架",62,51],["xiaowen","小文",84,63]]},
  laundry:{title:"洗衣房",hint:"周三混送行政文件，周五进行标签复核。",day:3,weekdays:[1,3,5],people:[],hotspots:[["laundryWork","洗衣工疗",25,59],["logistics","车次表",55,44],["bagLabel","文件袋",78,57]]},
  station:{title:"护士站与行政走廊",hint:"周四可核对印章并递交正式复核。",day:3,weekdays:[2,4,6],people:["nurse","guard"],hotspots:[["nurse","护士林",83,62],["treatmentSchedule","治疗排班",25,42],["stamp","印章登记",54,43],["legalApply","复核窗口",69,59]]},
  archives:{title:"档案室外围",hint:"周五清点档案盒；周三审计私人付款账页。",day:4,weekdays:[3,5],people:[],hotspots:[["catalog","旧索引",25,45],["archiveBoxes","三只档案盒",55,48],["paymentLedger","付款账页",80,57]]},
  visitor:{title:"访客与电话区",hint:"周二电话、周四审批、周日公益阅读。",day:4,weekdays:[2,4,7],people:["xiaowen"],hotspots:[["phone","付费电话",23,47],["formalCall","申请窗口",55,45],["volunteer","公益志愿者",82,60]]},
  maintenance:{title:"后勤维修间",hint:"周二整理与绘图；周六锅炉测试开放压力阀。",day:5,weekdays:[2,6],people:["chen"],hotspots:[["chen","陈伯",22,61],["repairWork","维修台",46,57],["tunnelMap","旧楼图纸",67,41],["valves","压力阀",84,55]]}
};

function defaultState(){return{
  version:VERSION,day:1,time:8,energy:100,clarity:100,tokens:8,trust:52,suspicion:8,drug:0,actions:5,maxActions:5,scene:"ward",morning:false,dayEnded:false,completed:false,
  skills:{fitness:{lv:1,xp:0},work:{lv:1,xp:0},social:{lv:1,xp:0},observe:{lv:1,xp:0}},
  relations:{nurse:5,zhang:10,chen:0,xiaowen:0,guard:0},
  requests:{zhangTea:false,chenSnack:false,xiaowenNotebook:false,nurseBook:false,guardBattery:false},
  requestKnown:{zhang:false,chen:false,xiaowen:false,nurse:false,guard:false},
  inventory:{tea:0,book:0,snack:1,notebook:0,battery:0,gatepass:0,phonecard:0,material:0,soap:0,carbon:0,envelope:0,flashlight:0,form:0,casefile:0},
  intel:Object.fromEntries(Object.keys(intelMeta).map(id=>[id,false])),
  talents:Object.fromEntries(Object.keys(talentMeta).map(id=>[id,0])),growthPoints:0,growthMilestones:{},rewardedIntel:{},
  storyFlags:{introGift:false,xiaowenNote:false,inspection:false,chenValve:false,guardHandover:false,mediaRoute:false,confinement:false,filePuzzleFails:0,rosterPuzzleFails:0,valvePuzzleFails:0},
  externalContact:false,legalPass:false,
  logs:[{day:1,time:8,text:"你在东区 2 号病房醒来。床头柜上放着一只不属于你的腕带。",changes:[]}]
}}

function clamp(v,a=0,b=100){return Math.max(a,Math.min(b,v))}
function weekday(day=S.day){return WEEK[(Math.max(1,day)-1)%7]}
function weekdayNo(day=S.day){return((Math.max(1,day)-1)%7)+1}
function weekdayIs(...days){return days.includes(weekdayNo())}
function talentLevel(id,s=S){return Number(s?.talents?.[id])||0}
function requestCount(s=S){return Object.values(s.requests||{}).filter(Boolean).length}
function derivedCount(s=S){return ["identityChain","fileRoute","visitorPattern","weeklyBlindSpot"].filter(id=>s.intel?.[id]).length}
function evidenceCount(s=S){return Object.entries(intelMeta).filter(([id,m])=>m.evidence&&s.intel[id]).length}
function intelCount(s=S){return Object.values(s.intel||{}).filter(Boolean).length}
function hasItem(s,id,n=1){return (s.inventory?.[id]||0)>=n}
function effectiveTrust(s=S){return s.trust+talentLevel("trustedCircle",s)*2}
function effectiveObserve(s=S){return s.skills.observe.lv+talentLevel("documentReader",s)}
function effectiveFitness(s=S){return s.skills.fitness.lv+talentLevel("nightStride",s)}
function effectiveSocial(s=S){return s.skills.social.lv+talentLevel("outsideBridge",s)}
function dailyActions(drug=S.drug){if(drug>=90)return 1;if(drug>=80)return 2;if(drug>=50)return 3;if(drug>=25)return 4;return 5}
function drugEffect(drug=S.drug){
  if(drug>=90)return{name:"意识模糊",time:1.65,energy:10,growth:.25};
  if(drug>=80)return{name:"强烈镇静",time:1.5,energy:8,growth:.4};
  if(drug>=65)return{name:"重度镇静",time:1.35,energy:6,growth:.55};
  if(drug>=50)return{name:"明显迟钝",time:1.25,energy:4,growth:.7};
  if(drug>=25)return{name:"轻度迟钝",time:1.12,energy:2,growth:.85};
  return{name:"头脑清醒",time:1,energy:0,growth:1}
}

function normalize(){
  ["energy","clarity","trust","suspicion","drug"].forEach(k=>S[k]=clamp(Number(S[k])||0));
  S.tokens=Math.max(0,Math.round(S.tokens));S.time=clamp(Math.round(S.time),8,22);S.maxActions=dailyActions(S.drug);S.actions=clamp(Math.round(S.actions),0,S.maxActions)
}

function mergeState(saved){
  const b=defaultState(),s={...b,...saved};
  ["relations","requests","requestKnown","inventory","intel","talents","growthMilestones","rewardedIntel","storyFlags"].forEach(k=>s[k]={...b[k],...(saved?.[k]||{})});
  s.skills={...b.skills};
  Object.keys(b.skills).forEach(id=>{const old=saved?.skills?.[id];s.skills[id]=typeof old==="number"?{lv:Math.max(1,Math.floor(old)),xp:Math.round((old%1)*100)}:{...b.skills[id],...(old||{})}});
  if(saved?.morningDone!==undefined)s.morning=Boolean(saved.morningDone);if(saved?.period!==undefined&&!saved?.time)s.time=8+Number(saved.period||0)*3;
  if(saved?.clues){const map={wristband:"wristband",notice:"treatmentSchedule",nightRoster:"nightRoster",records:"originalFile",maintenance:"tunnelMap"};Object.entries(map).forEach(([old,id])=>{if(saved.clues[old])s.intel[id]=true})}
  if(saved?.flags?.guardGift){s.requests.guardBattery=true;s.requestKnown.guard=true;s.inventory.gatepass=Math.max(1,s.inventory.gatepass);s.intel.patrolSchedule=true}
  Object.entries(requestMeta).forEach(([id,m])=>{if(s.requests[m.flag]||s.relations[id]>=m.threshold)s.requestKnown[id]=true});
  s.logs=(Array.isArray(saved?.logs)?saved.logs:b.logs).slice(-60).map(x=>({day:Number(x.day)||s.day,time:Number(x.time)||8,text:x.text||x.message||"行动完成。",changes:Array.isArray(x.changes)?x.changes:[]}));
  s.version=VERSION;s.maxActions=dailyActions(s.drug);s.actions=clamp(saved?.actions??s.maxActions,0,s.maxActions);return s
}

function getSavedRaw(){return localStorage.getItem(SAVE_KEY)||localStorage.getItem(LEGACY_V1_KEY)||localStorage.getItem(LEGACY_V3_KEY)}
function save(show=false){if(!gameStarted)return;localStorage.setItem(SAVE_KEY,JSON.stringify(S));if(show)toast("游戏已保存")}
function load(){try{const raw=getSavedRaw();if(!raw)return false;S=mergeState(JSON.parse(raw));unlockDerived();save();return true}catch{return false}}
function clearSaves(){[SAVE_KEY,LEGACY_V1_KEY,LEGACY_V3_KEY].forEach(k=>localStorage.removeItem(k))}

function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(text){const t=$("toast");t.textContent=text;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2900)}
function close(id){$(id)?.classList.add("hidden")}
function closeTransient(){["actionModal","journalModal","shopModal","escapeModal"].forEach(close)}
function skillProgress(sk){return (sk.lv-1)*100+sk.xp}
function snapshot(){return{
  time:S.time,energy:S.energy,clarity:S.clarity,tokens:S.tokens,trust:S.trust,suspicion:S.suspicion,drug:S.drug,actions:S.actions,growthPoints:S.growthPoints,
  relations:{...S.relations},inventory:{...S.inventory},skills:Object.fromEntries(Object.entries(S.skills).map(([id,sk])=>[id,skillProgress(sk)])),intel:{...S.intel}
}}
function changes(before){
  const out=[],fields={energy:["体力",true],clarity:["清醒",true],tokens:["积分",true],trust:["信任",true],suspicion:["怀疑",false],drug:["药物负荷",false],actions:["剩余行动",true],growthPoints:["养成点数",true]};
  for(const [k,[name,goodHigh]] of Object.entries(fields)){const d=S[k]-before[k];if(d)out.push({text:`${name} ${d>0?"+":""}${d}`,good:(d>0)===goodHigh})}
  const td=S.time-before.time;if(td)out.unshift({text:`时间 +${td} 小时`,good:false});
  for(const [id,p] of Object.entries(personMeta)){const d=S.relations[id]-before.relations[id];if(d)out.push({text:`${p.name}关系 ${d>0?"+":""}${d}`,good:d>0})}
  for(const [id,m] of Object.entries(itemMeta)){const d=(S.inventory[id]||0)-(before.inventory[id]||0);if(d)out.push({text:`${m.name} ${d>0?"+":""}${d}`,good:d>0})}
  for(const [id,m] of Object.entries(skillMeta)){const d=skillProgress(S.skills[id])-before.skills[id];if(d)out.push({text:`${m.name}成长 ${d>0?"+":""}${d}`,good:d>0})}
  for(const [id,m] of Object.entries(intelMeta)){if(!before.intel[id]&&S.intel[id])out.push({text:`获得${m.type}：${m.name}`,good:true})}
  return out
}
function addLog(text,changeList=[]){S.logs.push({day:S.day,time:S.time,text,changes:changeList});S.logs=S.logs.slice(-60);save();renderLog()}
function renderLog(){
  const list=S.logs.filter(x=>x.day===S.day);
  $("log").innerHTML=list.length?list.map(x=>`<article><time>${String(x.time).padStart(2,"0")}:00</time><div><p>${escapeHtml(x.text)}</p>${x.changes?.length?`<div class="changeRow">${x.changes.map(c=>`<span class="${c.good?"good":"bad"}">${escapeHtml(c.text)}</span>`).join("")}</div>`:""}</div></article>`).join(""):`<article><time>08:00</time><p>今天还没有新的记录。</p></article>`;
  requestAnimationFrame(()=>$("log").scrollTop=$("log").scrollHeight)
}

function grantGrowth(n){S.growthPoints=Math.max(0,S.growthPoints+n)}
function awardRelationMilestone(id,before,after){[20,45,65].forEach(mark=>{const key=`${id}-${mark}`;if(before<mark&&after>=mark&&!S.growthMilestones[key]){S.growthMilestones[key]=true;grantGrowth(1)}})}
function gainRelation(id,n,bypass=false){
  const before=S.relations[id],done=S.requests[requestMeta[id].flag];if(n>0)n+=talentLevel("activeListening");
  S.relations[id]=clamp(before+n,0,bypass||done?100:30);awardRelationMilestone(id,before,S.relations[id]);return S.relations[id]-before
}
function gainSkill(id,xp){
  const effect=drugEffect(),bonus=id==="observe"?1+talentLevel("patternSense")*.1:1,actual=Math.max(1,Math.round(xp*effect.growth*bonus)),sk=S.skills[id];sk.xp+=actual;
  while(sk.lv<5&&sk.xp>=(sk.lv===1?60:100)){sk.xp-=sk.lv===1?60:100;sk.lv++;grantGrowth(1)}
}
function addSuspicion(n){if(n>0)n=Math.max(1,n-talentLevel("riskControl"));S.suspicion=clamp(S.suspicion+n)}
function gainIntel(id,skipDerived=false){
  if(S.intel[id])return;S.intel[id]=true;const m=intelMeta[id];
  if(!S.rewardedIntel[id]&&(m.layer===2||m.evidence)){S.rewardedIntel[id]=true;grantGrowth(m.evidence?1+talentLevel("evidenceMind"):1)}
  pendingClues.push(id);if(!skipDerived)unlockDerived()
}
function unlockDerived(){let changed=true;while(changed){changed=false;derivedRules.forEach(([id,needs])=>{if(!S.intel[id]&&needs.every(x=>S.intel[x])){changed=true;gainIntel(id,true)}})}}
function showNextClue(){
  if(currentClue)return;const id=pendingClues.shift();if(!id)return;currentClue=id;const m=intelMeta[id];
  $("clueType").textContent=m.type;$("clueTitle").textContent=m.name;$("clueText").textContent=m.text;$("clueImpact").textContent=`后续影响：${m.impact}`;$("clueModal").classList.remove("hidden")
}
function confirmClue(){close("clueModal");currentClue=null;if(pendingClues.length)setTimeout(showNextClue,100)}

function actionTime(base){return Math.max(1,Math.ceil(base*drugEffect().time))}
function perform(baseHours,energyCost,message,fn=()=>{},options={}){
  if(!S.morning){toast("先完成晨间治疗");return false}
  if(options.spendAction!==false&&S.actions<=0){toast("今天已经没有自由行动了");return false}
  const hours=actionTime(baseHours);if(S.time+hours>22){toast(`今天剩余时间不足：需要 ${hours} 小时`);return false}
  const saved=Math.min(energyCost+drugEffect().energy,talentLevel("conditioned")),need=Math.max(0,energyCost+drugEffect().energy-saved);if(S.energy<need){toast(`体力不足：需要 ${need} 点`);return false}
  const before=snapshot();S.time+=hours;if(options.spendAction!==false)S.actions--;S.energy-=need;fn();normalize();const result=changes(before);addLog(message,result);close("actionModal");render();toast(result.map(x=>x.text).join(" · ")||message);
  if(S.suspicion>=60){triggerConfinement();return true}if(pendingClues.length)setTimeout(showNextClue,170);else setTimeout(triggerDailyStory,210);
  if(S.actions<=0||S.time>=22)setTimeout(()=>{if($("clueModal").classList.contains("hidden")&&$("actionModal").classList.contains("hidden"))endDay(true)},520);return true
}
function freeEvent(message,fn){const before=snapshot();fn();normalize();const result=changes(before);addLog(message,result);close("actionModal");render();toast(result.map(x=>x.text).join(" · ")||message);if(S.suspicion>=60)triggerConfinement();else if(pendingClues.length)setTimeout(showNextClue,150);else setTimeout(triggerDailyStory,180)}

function facilityRestriction(id){
  const trust=effectiveTrust();if(trust<20&&!['ward','garden'].includes(id))return"有效信任不足 20：只允许病房与花园活动";
  if(trust<30&&['library','cafeteria','laundry','station','archives','visitor','maintenance'].includes(id))return"有效信任不足 30：公共与管理设施暂停开放";
  if(trust<45&&['station','archives','visitor','maintenance'].includes(id))return"有效信任不足 45：管理区域禁止进入";return""
}
function sceneStatus(id){
  const m=scenes[id];if(S.day<m.day)return{open:false,reason:`第 ${m.day} 天开放`};const restriction=facilityRestriction(id);if(restriction)return{open:false,reason:restriction};
  if(m.weekdays&&!m.weekdays.includes(weekdayNo()))return{open:false,reason:`仅${m.weekdays.map(d=>WEEK[d-1]).join("、")}开放`};
  if(id==="laundry"&&!(S.skills.work.lv>=2||effectiveTrust()>=55))return{open:false,reason:"需要技能 Lv.2 或有效信任 55"};
  if(id==="station"&&effectiveTrust()<58)return{open:false,reason:"需要有效信任 58"};
  if(id==="archives"&&!(S.intel.identityChain&&effectiveObserve()>=3))return{open:false,reason:"需要身份替换链与有效洞察 Lv.3"};
  if(id==="visitor"&&!(effectiveTrust()>=65||hasItem(S,"phonecard")))return{open:false,reason:"需要有效信任 65 或电话卡"};
  if(id==="maintenance"&&!(S.requests.chenSnack&&S.relations.chen>=45))return{open:false,reason:"需要完成陈伯请求且关系 45"};return{open:true,reason:""}
}
function renderSceneTabs(){
  document.querySelectorAll(".sceneTab[data-scene]").forEach(b=>{const status=sceneStatus(b.dataset.scene),small=b.querySelector("small");b.classList.toggle("locked",!status.open);b.classList.toggle("active",b.dataset.scene===S.scene);if(!status.open)small.textContent=status.reason.length>9?"暂未开放":status.reason;else if(scenes[b.dataset.scene].weekdays)small.textContent=`今日开放 · ${weekday()}`;else small.textContent="今日开放"})
}
function switchScene(id,force=false){
  if(!force&&!S.morning){toast("先完成晨间治疗");return}const status=sceneStatus(id);if(!force&&!status.open){toast(status.reason);return}
  S.scene=id;const meta=scenes[id],stage=$("scene");stage.className=`scene ${id}`;$("sceneTitle").textContent=meta.title;$("sceneHint").textContent=meta.hint;stage.querySelectorAll(".hotspot").forEach(x=>x.remove());
  meta.hotspots.forEach(([action,label,x,y])=>{const b=document.createElement("button");b.className="hotspot";b.dataset.action=action;b.style.left=x+"%";b.style.top=y+"%";b.innerHTML=`<span>${label}</span>`;b.onclick=()=>openAction(action);stage.appendChild(b)});renderPeople();renderSceneTabs();save()
}
function renderPeople(){const list=scenes[S.scene]?.people||[];$("people").innerHTML=list.length?list.map(id=>`<p><span class="avatar">${personMeta[id].short}</span><b>${personMeta[id].name}<small>关系 ${S.relations[id]}</small></b><em>在场</em></p>`).join(""):`<div class="peopleEmpty">当前场景没有可以交谈的人物。</div>`}
function dailyInfo(){
  if(S.suspicion>=50)return["隔离警告",`当前怀疑 ${S.suspicion}/60。达到 60 会立即中断行动并触发强制服药。`];
  const tips=[["行动与时间","每次场景行动同时消耗行动次数与院内时间；切换场景和查看记录不会推进时间。"],["药物影响",`当前为“${drugEffect().name}”：成长效率 ${Math.round(drugEffect().growth*100)}%，行动耗时与体力消耗会随负荷上升。`],["一周循环",`${weekday()}的区域和行动会在下周同一天再次开放，错过不会终止游戏。`],["关系动态","人物只会在交谈过程中说出具体需要；随身物品的说明不会提前提示人物用途。"],["线索层级",`当前已形成 ${derivedCount()} 条交叉印证，取得 ${evidenceCount()} / 3 份关键证据。`]];return tips[(S.day-1)%tips.length]
}
function render(){
  normalize();$("day").textContent=S.day;$("weekday").textContent=weekday();$("time").textContent=`${String(S.time).padStart(2,"0")}:00`;$("energy").textContent=S.energy;$("clarity").textContent=S.clarity;$("actions").textContent=`${S.actions}/${S.maxActions}`;$("tokens").textContent=S.tokens;$("trust").textContent=S.trust;$("suspicion").textContent=S.suspicion;$("drug").textContent=S.drug;
  $("trustBar").style.width=S.trust+"%";$("suspicionBar").style.width=Math.min(100,S.suspicion/60*100)+"%";$("drugBar").style.width=S.drug+"%";$("timeProgress").style.width=Math.max(0,(S.time-8)/14*100)+"%";$("remaining").textContent=`剩余 ${Math.max(0,22-S.time)} 小时 · ${S.actions} 次行动 · ${drugEffect().name}`;
  const [title,text]=dailyInfo();$("objectiveTitle").textContent=title;$("objectiveText").textContent=text;$("objectiveProgress").style.width=intelCount()/Object.keys(intelMeta).length*100+"%";$("objectiveStep").textContent=`调查进度 ${intelCount()} / ${Object.keys(intelMeta).length}`;$("objectiveTitle").closest(".panel").classList.toggle("tipsWarning",S.suspicion>=50);
  $("captionTitle").textContent=S.morning?"今天可以自由安排":"晨间治疗尚未完成";$("captionText").textContent=S.morning?"切换区域不推进时间；点击场景热点才会结算行动。":"护士林正在门口等你。治疗结束后才可以安排今天的行动。";
  renderSceneTabs();renderPeople();renderLog();save()
}

function openModalAction(title,text,choices,eyebrow="场景行动"){
  $("actionEyebrow").textContent=eyebrow;$("actionTitle").textContent=title;$("actionText").textContent=text;$("actionChoices").innerHTML="";
  choices.forEach(c=>{const b=document.createElement("button");b.disabled=Boolean(c.disabled);b.innerHTML=`<b>${c.title}</b><span>${c.sub||""}</span>`;b.onclick=c.run;$("actionChoices").appendChild(b)});$("actionModal").classList.remove("hidden")
}
function genericAction(title,text,choices){openModalAction(title,text,choices,"场景行动")}
function actionSub(hours,energy,extra=""){const e=drugEffect(),actual=actionTime(hours),need=Math.max(0,energy+e.energy-Math.min(energy+e.energy,talentLevel("conditioned")));return`${actual} 小时 · 1 行动 · 体力 -${need}${extra?` · ${extra}`:""}`}

function openAction(id){
  if(!S.morning){toast("先完成晨间治疗");return}
  const map={
    rest:restAction,locker:()=>openJournal("items"),wristband:wristbandAction,wardNotice:wardNoticeAction,
    exercise:exerciseAction,zhang:()=>openPerson("zhang"),chen:()=>openPerson("chen"),guard:()=>openPerson("guard"),nurse:()=>openPerson("nurse"),xiaowen:()=>openPerson("xiaowen"),
    work:workAction,materials:materialsAction,rules:rulesAction,bookSearch:bookSearchAction,cafeteriaWork:cafeteriaWorkAction,tray:trayAction,
    laundryWork:laundryWorkAction,logistics:logisticsAction,bagLabel:bagLabelAction,treatmentSchedule:treatmentAction,stamp:stampAction,legalApply:legalApplyAction,
    catalog:catalogAction,archiveBoxes:archiveBoxesAction,paymentLedger:paymentLedgerAction,phone:phoneAction,formalCall:formalCallAction,volunteer:volunteerAction,
    repairWork:repairWorkAction,tunnelMap:tunnelMapAction,valves:valvesAction
  };map[id]?.()
}

function restAction(){const recovery=30+talentLevel("steadyBreath")*6;genericAction("在床铺上休息","休息会推进时间并消耗一次行动，但能恢复体力、清醒并代谢药物。",[
  {title:"休息一会儿",sub:`${actionTime(2)} 小时 · 1 行动 · 体力 +${recovery} · 清醒 +12 · 药物 -6`,run:()=>perform(2,0,"你在病房安静休息，药物带来的迟钝感减轻了一些。",()=>{S.energy+=recovery;S.clarity+=12;S.drug-=6})},
  {title:"整理床位和公共区域",sub:actionSub(2,5,"信任 +5 · 怀疑 -2"),run:()=>perform(2,5,"你主动整理病房，日常评价改善。",()=>{S.trust+=5;S.suspicion-=2})}
])}
function wristbandAction(){if(S.intel.wristband){genericAction("陌生腕带",intelMeta.wristband.text,[]);return}genericAction("床头柜上的陌生腕带","塑料腕带写着另一个名字。编号可以与正式记录交叉核对。",[{title:"逐项核对并记下编号",sub:actionSub(2,6,"洞察成长 · 获得线索"),run:()=>perform(2,6,"你记下腕带姓名、编号与病历页码之间的矛盾。",()=>{gainSkill("observe",35);gainIntel("wristband")})}],"第一条线索")}
function wardNoticeAction(){if(!weekdayIs(1)){genericAction("床尾公告","整周治疗公告只在周一换新。",[]);return}if(S.intel.treatmentSchedule){genericAction("本周治疗公告",intelMeta.treatmentSchedule.text,[]);return}genericAction("本周治疗公告","床尾贴着集中评估、个别治疗与药品清点的固定日期。",[{title:"抄下完整安排",sub:actionSub(2,5,"洞察成长 · 获得周期排班"),run:()=>perform(2,5,"你抄下整周治疗公告，这张表下周仍会重复。",()=>{gainSkill("observe",25);gainIntel("treatmentSchedule")})}],"周期情报")}
function exerciseAction(){genericAction("康复训练","训练能改善身体状态；药物负荷越高，成长效率越低。",[{title:"完成一轮训练",sub:actionSub(3,20,"药物 -4 · 清醒 +6 · 体能成长"),run:()=>perform(3,20,"你完成康复训练，活动和出汗让思路清醒了一些。",()=>{S.drug-=4;S.clarity+=6;S.suspicion-=1;gainSkill("fitness",45)})}])}
function workAction(){genericAction("工疗台","按要求组装病区用品。稳定工作能赚取积分、材料并改善日常评价。",[{title:"认真完成今天的工疗",sub:actionSub(3,18,"药物 -2 · 技能成长 · 积分与材料"),run:()=>perform(3,18,"你完成一轮工疗，领到院内积分和材料。",()=>{gainSkill("work",40);S.tokens+=10+S.skills.work.lv*3;S.inventory.material+=S.skills.work.lv>=2?2:1;S.trust+=3;S.drug-=2})}])}
function materialsAction(){genericAction("零件架","不同型号的零件被混装在几个旧盒子里。",[{title:"按规格整理零件",sub:actionSub(2,12,"技能成长 · 材料 +2"),run:()=>perform(2,12,"你把还能使用的零件重新分类。",()=>{gainSkill("work",30);S.inventory.material+=2})}])}
function rulesAction(){if(S.intel.rules){genericAction("院规与评估流程",intelMeta.rules.text,[]);return}genericAction("院规与评估流程","评估表的措辞比公告更值得注意：行为记录与主治判断决定大部分权限。",[{title:"逐条研究并记下漏洞",sub:actionSub(2,8,"洞察成长 · 获得院规线索"),run:()=>perform(2,8,"你把院规中的评估流程逐条记了下来。",()=>{gainSkill("observe",45);gainIntel("rules")})}],"制度调查")}
function bookSearchAction(){
  if(!S.intel.foldedNote){genericAction("旧书架","一本诗集的书脊里夹着折叠过的纸张。",[{title:"检查夹在书页里的纸条",sub:actionSub(2,7,"小文关系 +8 · 获得基础线索"),run:()=>perform(2,7,"你在书页里找到一张写着陌生姓名与“周二 21:10”的求助纸条。",()=>{gainRelation("xiaowen",8);gainIntel("foldedNote")})}],"人物线索");return}
  if(!S.intel.catalogNote&&S.skills.observe.lv>=2){genericAction("旧编目手册","夹在旧书后的便签记录了档案盒标签规则。",[{title:"抄下编目规则",sub:actionSub(2,6,"洞察成长 · 获得编目线索"),run:()=>perform(2,6,"你记下三只文件盒的特殊编目规则。",()=>{gainSkill("observe",30);gainIntel("catalogNote")})}],"档案线索");return}
  genericAction("旧书架","已经检查过的书页里没有新的信息。提升洞察后，也许能读懂旧编目手册。",[])
}
function cafeteriaWorkAction(){genericAction("食堂配餐台","帮忙配餐可以赚取积分，也能在不引人注意的情况下熟悉编号。",[{title:"完成一轮配餐",sub:actionSub(2,14,"积分 +10 · 沟通成长"),run:()=>perform(2,14,"你完成配餐工作，领到积分。",()=>{S.tokens+=10;gainSkill("social",20);S.trust+=2})}])}
function trayAction(){if(S.intel.trayMark){genericAction("餐盘编号",intelMeta.trayMark.text,[]);return}genericAction("重复的餐盘编号","两只餐盘底部都写着 E2-071，其中一只属于早已出院的人。",[{title:"核对配餐登记",sub:actionSub(2,8,"洞察成长 · 获得线索"),run:()=>perform(2,8,"你在配餐登记上确认，同一编号被重复使用。",()=>{gainSkill("observe",35);gainIntel("trayMark")})}],"身份线索")}
function laundryWorkAction(){genericAction("洗衣工疗","规律完成洗衣工作能赚取积分、材料，并使药物负荷略微降低。",[{title:"正常完成洗衣工疗",sub:actionSub(3,18,"药物 -3 · 技能成长 · 积分 +14 · 材料 +1"),run:()=>perform(3,18,"你完成洗衣工疗，身体活动让药物迟钝略微减轻。",()=>{S.drug-=3;S.tokens+=14;S.inventory.material++;gainSkill("work",38)})}])}
function logisticsAction(){if(!weekdayIs(1)){genericAction("后勤车次表","完整车次表只在周一开始新一轮登记。",[]);return}if(S.intel.logisticsSchedule){genericAction("后勤轮转周表",intelMeta.logisticsSchedule.text,[]);return}genericAction("本周后勤车次","登记表把床单车与行政文件袋的轮转日期写在同一页。",[{title:"抄下本周车次",sub:actionSub(2,10,"技能 / 洞察成长 · 获得周期排班"),run:()=>perform(2,10,"你抄下周一、周三、周五的固定车次。",()=>{gainSkill("work",20);gainSkill("observe",20);gainIntel("logisticsSchedule")})}],"周期情报")}
function bagLabelAction(){
  if(weekdayIs(3)&&!S.intel.bagRoute){genericAction("行政文件袋","三张流转标签被撕下后重新贴过，时间顺序并不合理。",[{title:"检查重贴标签",sub:actionSub(2,12,"怀疑 +4 · 洞察成长 · 获得线索"),run:()=>perform(2,12,"你记下三张错序标签。",()=>{addSuspicion(4);gainSkill("observe",45);gainIntel("bagRoute")})}],"文件调查");return}
  if(weekdayIs(5)&&S.intel.fileRoute&&!S.intel.transferCopy){fileRoutePuzzle();return}
  genericAction("文件袋与标签",weekdayIs(5)?"周五是标签复核日；需要先形成完整文件流转链。":"行政文件只在周三混送，周五进行标签复核。",[])
}
function treatmentAction(){if(!weekdayIs(2)){genericAction("治疗排班","个别治疗调整只在周二公开。",[]);return}if(S.intel.treatmentSchedule){genericAction("每周治疗安排",intelMeta.treatmentSchedule.text,[]);return}genericAction("本周个别治疗调整","周二晚间治疗会延长到巡逻交班开始。",[{title:"询问并记下调整",sub:actionSub(2,8,"护士关系 +4 · 获得周期排班"),run:()=>perform(2,8,"护士林说明了晚间治疗与周五联合清点的固定周期。",()=>{gainRelation("nurse",4);gainSkill("observe",20);gainIntel("treatmentSchedule")})}],"周期情报")}
function stampAction(){if(!weekdayIs(4)){genericAction("印章领用登记","行政印章登记只在周四开放核对。",[]);return}if(S.intel.stampMismatch){genericAction("停用蓝色骑缝章",intelMeta.stampMismatch.text,[]);return}const ready=S.intel.trayMark||S.intel.foldedNote;genericAction("印章领用登记","周四行政登记开放，可以把已有编号与蓝章启用日期交叉核对。",[{title:"核对印章领用日期",sub:ready?actionSub(2,10,"护士关系 +5 · 获得线索"):"需要餐盘编号或求助纸条",disabled:!ready,run:()=>perform(2,10,"记录显示，那枚蓝色骑缝章在转院单日期前已经停用。",()=>{gainSkill("observe",35);gainRelation("nurse",5);gainIntel("stampMismatch")})}],"行政调查")}
function legalApplyAction(){const ready=hasItem(S,"form")&&effectiveTrust()>=75&&S.relations.nurse>=30&&effectiveSocial()>=3;genericAction("正式复核窗口","周四补充复核是把证据写入正式程序的固定窗口。",[{title:S.legalPass?"复核申请已经递交":"递交正式复核申请",sub:S.legalPass?"等待方案 A 的其他条件":ready?actionSub(2,8,"消耗复核申请表"):"需要申请表、有效信任 75、护士关系 30、有效沟通 Lv.3",disabled:S.legalPass||!ready,run:()=>perform(2,8,"护士林把可以核对的矛盾写进正式复核流程。",()=>{S.inventory.form--;S.legalPass=true})}])}

function catalogAction(){if(!weekdayIs(5)){genericAction("旧档案索引","旧索引只在周五归档清点时展开。",[]);return}if(S.intel.catalogNote){genericAction("旧档案编目便签",intelMeta.catalogNote.text,[]);return}genericAction("旧档案索引","绿、蓝、灰三只盒子的标签中只有一句真话。",[{title:"核对旧索引",sub:actionSub(2,16,"怀疑 +3 · 洞察成长 · 获得编目线索"),run:()=>perform(2,16,"你在索引背面发现三只档案盒的编目便签。",()=>{addSuspicion(3);gainSkill("observe",35);gainIntel("catalogNote")})}],"档案调查")}
function archiveBoxesAction(){if(!weekdayIs(5)){genericAction("三只档案盒","档案盒只在周五清点时出现在外围。",[]);return}if(S.intel.originalFile){genericAction("病历原件",intelMeta.originalFile.text,[]);return}if(!S.intel.identityChain||!S.intel.catalogNote||effectiveObserve()<3){genericAction("三只档案盒","现在还无法判断哪只标签是真的。",[{title:"检查所需条件",sub:"需要身份替换链、编目便签和有效洞察 Lv.3",disabled:true}]);return}archiveBoxPuzzle()}
function paymentLedgerAction(){if(!weekdayIs(3)){genericAction("付款账页","私人付款账页只在周三审计。",[]);return}if(S.intel.paymentRecord){genericAction("私人付款记录",intelMeta.paymentRecord.text,[]);return}if(!S.intel.weeklyBlindSpot||!S.intel.originalFile||effectiveObserve()<4){genericAction("周三付款归档","账页混在多组访客与值班记录后。",[{title:"检查所需条件",sub:"需要周期性管理盲区、病历原件和有效洞察 Lv.4",disabled:true}]);return}nightRosterPuzzle()}
function phoneAction(){if(!weekdayIs(2)){genericAction("付费电话","电话卡通话只在周二开放。",[]);return}const ready=hasItem(S,"phonecard");genericAction("联系大学同学周言","院内电话只能使用磁卡，通话会被限制在固定时段。",[{title:"使用电话卡拨出",sub:ready?actionSub(2,8,"电话卡 -1 · 建立院外联络"):"需要电话卡",disabled:!ready,run:()=>perform(2,8,"你联系上大学同学周言。他答应保存之后传出的证据。",()=>{S.inventory.phonecard--;S.externalContact=true;gainSkill("social",25)})}],"院外联络")}
function formalCallAction(){if(!weekdayIs(4)){genericAction("正式通话申请","正式通话只在周四审批。",[]);return}const ready=effectiveTrust()>=72&&effectiveSocial()>=2;genericAction("正式通话申请","稳定评价可以让一次通话进入正式流程。",[{title:"提交通话申请",sub:ready?actionSub(2,8,"建立院外联络 · 信任 +2"):"需要有效信任 72、有效沟通 Lv.2",disabled:!ready,run:()=>perform(2,8,"周四通话申请获批。周言确认了你的真实身份。",()=>{S.externalContact=true;S.trust+=2})}],"院外联络")}
function volunteerAction(){if(!weekdayIs(7)){genericAction("公益阅读","公益阅读志愿者只在周日到院。",[]);return}const ready=S.requests.xiaowenNotebook&&S.intel.foldedNote&&S.relations.xiaowen>=45;genericAction("公益阅读志愿者","志愿者离院时，可以把墙内的信息带出去。",[{title:"托志愿者带出口信",sub:ready?actionSub(2,8,"建立院外联络 · 小文关系 +6"):"需要完成小文请求、求助纸条与小文关系 45",disabled:!ready,run:()=>perform(2,8,"志愿者把纸条照片和你的真实姓名带给周言。",()=>{S.externalContact=true;gainRelation("xiaowen",6);gainSkill("social",30)})}],"院外联络")}
function repairWorkAction(){genericAction("维修工作台","整理维修间既能积累材料，也能建立陈伯对你实际能力的判断。",[{title:"和陈伯一起整理维修间",sub:actionSub(3,18,"陈伯关系 +12 · 技能成长 · 材料 +2"),run:()=>perform(3,18,"你帮陈伯整理零件，他开始把你当真正的帮手。",()=>{gainRelation("chen",12);gainSkill("work",30);S.inventory.material+=2})}])}
function tunnelMapAction(){const ready=S.requests.chenSnack&&S.relations.chen>=55&&hasItem(S,"material",3);genericAction("旧楼图纸","陈伯记得旧维修通道，但需要实际材料确认已经废弃的接口。",[{title:S.intel.tunnelMap?"维修通道地图已经完成":"请陈伯画出旧维修通道",sub:S.intel.tunnelMap?intelMeta.tunnelMap.text:ready?actionSub(2,12,"材料 -3 · 获得路线情报"):"需要完成陈伯请求、关系 55、材料 ×3",disabled:S.intel.tunnelMap||!ready,run:()=>perform(2,12,"陈伯画出简图，并提醒你先处理锅炉间压力。",()=>{S.inventory.material-=3;gainIntel("tunnelMap")})}],"路线调查")}
function valvesAction(){
  if(!weekdayIs(6)){genericAction("锅炉压力阀","阀门间只在周六锅炉测试时开放。",[]);return}
  if(!S.intel.valveMark){genericAction("三色压力阀","周六测试让红、蓝、绿三只阀门旁的旧刻痕显露出来。",[{title:"记录阀门刻痕",sub:actionSub(2,12,"怀疑 +3 · 洞察成长 · 获得线索"),run:()=>perform(2,12,"你记下三道从深到浅的旧刻痕。",()=>{addSuspicion(3);gainSkill("observe",30);gainIntel("valveMark")})}],"路线调查");return}
  if(S.intel.tunnelSafeRoute){genericAction("安全泄压顺序",intelMeta.tunnelSafeRoute.text,[]);return}
  if(!S.intel.tunnelMap||S.skills.work.lv<3){genericAction("三色压力阀","刻痕还不足以解释三路管线压力。",[{title:"检查所需条件",sub:"需要维修通道地图与技能 Lv.3",disabled:true}]);return}valveSequencePuzzle()
}

function openPerson(id){
  const p=personMeta[id],m=requestMeta[id],done=S.requests[m.flag],known=S.requestKnown[id],capped=!done&&S.relations[id]>=30,choices=[];
  choices.push({title:"聊一会儿",sub:capped?"关系已停在熟悉阶段；需要回应对方谈到的事情":`${actionTime(2)} 小时 · 1 行动 · 关系与沟通成长`,disabled:capped,run:()=>talkPerson(id)});
  if(known&&!done){const has=hasItem(S,m.item);choices.push({title:"回应谈话中提到的事情",sub:has?`${actionTime(1)} 小时 · 1 行动 · ${itemMeta[m.item].name} -1`: `需要${itemMeta[m.item].name}`,disabled:!has||(id==="guard"&&S.relations.guard<20),run:()=>helpPerson(id)})}
  if(done&&id==="zhang"&&!S.intel.nightRoster)choices.push({title:"核对他记下的夜班时间",sub:`${actionTime(2)} 小时 · 获得夜班线索`,run:()=>perform(2,6,"老张把连续三周记下的异常夜班人员完整讲了出来。",()=>gainIntel("nightRoster"))});
  if(done&&id==="guard"&&!S.intel.patrolSchedule)choices.push({title:"核对真实巡逻时间",sub:`${actionTime(2)} 小时 · 获得巡逻周表`,run:()=>perform(2,6,"赵卫国依据对讲机呼叫记录还原了真实巡逻周期。",()=>gainIntel("patrolSchedule"))});
  openModalAction(p.name,`${p.role}。${p.desc}`,choices,"人物互动")
}
function talkPerson(id){
  const p=personMeta[id],m=requestMeta[id],done=S.requests[m.flag],willReveal=!done&&!S.requestKnown[id]&&Math.min(30,S.relations[id]+10+talentLevel("activeListening"))>=m.threshold;
  perform(2,8,willReveal?m.story:`你和${p.name}聊了一会儿。`,()=>{
    gainRelation(id,done?(S.relations[id]<55?7:3):10);gainSkill("social",25);
    if(willReveal)S.requestKnown[id]=true
  })
}
function helpPerson(id){
  const p=personMeta[id],m=requestMeta[id];if(!S.requestKnown[id]||S.requests[m.flag]||!hasItem(S,m.item))return;
  const story={zhang:"茶香散开以后，老张第一次把自己记录的夜班时间完整讲了出来。",chen:"陈伯慢慢吃完点心，从工具袋里拿出一件一直舍不得交给别人的旧东西。",xiaowen:"小文在新本子的第一页写下日期，把夹在旧书里的求助记录重新誊写了一遍。",nurse:"护士林把书收进值班抽屉，随后从正式文件夹里抽出一张她认为你应该看见的表格。",guard:"对讲机重新亮起时，赵卫国沉默了很久，最后把真实交班时间和一件旧物放到你面前。"}[id];
  perform(1,0,`${story} 你获得：${m.reward}。`,()=>{S.inventory[m.item]--;S.requests[m.flag]=true;gainRelation(id,m.gain+talentLevel("reciprocity")*2);S.trust++;gainSkill("social",15);if(talentLevel("reciprocity"))grantGrowth(1);if(id==="chen")S.inventory.material++;if(id==="guard")gainIntel("patrolSchedule");S.inventory[m.rewardItem]=(S.inventory[m.rewardItem]||0)+1;if(id==="zhang")gainIntel("nightRoster")})
}

function archiveBoxPuzzle(){openModalAction("只有一句标签是真的","绿盒写着“病历不在绿盒”；蓝盒写着“病历在灰盒”；灰盒写着“蓝盒标签是假的”。三句话中只有一句真话。病历藏在哪只盒子里？",[
  {title:"打开绿盒",sub:"选择绿盒",run:()=>perform(3,20,"答案正确：病历就在绿盒。",()=>{addSuspicion(4);gainSkill("observe",45);gainIntel("originalFile")})},
  {title:"打开蓝盒",sub:"错误会消耗行动并增加怀疑",run:()=>perform(2,15,"蓝盒是空的。若病历在蓝盒，绿盒与灰盒会同时为真。",()=>addSuspicion(6))},
  {title:"打开灰盒",sub:"错误会消耗行动并增加怀疑",run:()=>perform(2,15,"灰盒只有旧处方。若病历在灰盒，绿盒与蓝盒会同时为真。",()=>addSuspicion(6))}
],"线索谜题 · 三只档案盒")}
function fileRoutePuzzle(){openModalAction("找出唯一存在行政文件的轮转日","院规要求材料先在洗衣房签收，再送行政区。周一只有床单，周三混送行政文件，周五只回收归档。真实记录是哪一条？",[
  {title:"周三：病房 07:40 → 洗衣房 09:20 → 行政区 11:10",sub:"星期、地点和时间全部吻合",run:()=>perform(3,18,"推断正确。你找到被覆盖姓名的转院单副本。",()=>{addSuspicion(5);gainSkill("observe",50);gainIntel("transferCopy")})},
  {title:"周一：相同顺序",sub:"顺序正确但轮转内容错误",run:()=>perform(2,14,"周一只运送普通床单，你查错了车次。",()=>{S.storyFlags.filePuzzleFails++;addSuspicion(7)})},
  {title:"周五：绕过洗衣房直接送行政区",sub:"日期与流程都不符合院规",run:()=>perform(2,14,"周五是归档回收，而且材料不能绕过洗衣房。",()=>{S.storyFlags.filePuzzleFails++;addSuspicion(7)})}
],"周期谜题 1 · 文件袋流向")}
function nightRosterPuzzle(){openModalAction("找出每周重复的管理盲区","纸条写着“周二 21:10”；周二治疗延长到 21:00，巡逻 21:20 才到西侧；周四 21:10 则有双人复查。付款账页最可能藏在哪组记录后？",[
  {title:"周二 21:10 · 西侧行政门 · 访客 K-17",sub:"时间、门区和代号同时吻合",run:()=>perform(3,22,"三项完全吻合。你在 K-17 的临时访客页后找到连续付款账单。",()=>{addSuspicion(8);gainSkill("observe",55);gainIntel("paymentRecord")})},
  {title:"周二 21:00 · 东门 · 夜班护士",sub:"只依据交班时间",run:()=>perform(2,16,"21:00 有两名护士同时签字，不是空档。",()=>{S.storyFlags.rosterPuzzleFails++;addSuspicion(9)})},
  {title:"周四 21:10 · 西侧行政门 · K-17",sub:"代号吻合，但周四没有空档",run:()=>perform(2,16,"周四 21:10 是双人复查。",()=>{S.storyFlags.rosterPuzzleFails++;addSuspicion(9)})}
],"周期谜题 2 · 夜班排班")}
function valveSequencePuzzle(){openModalAction("利用周六锅炉测试完成泄压","红阀切断进汽；蓝阀只能在进汽关闭后泄压；绿阀连接出口门，压力归零后才能开启。正确顺序是什么？",[
  {title:"关闭红阀 → 开启蓝阀泄压 → 开启绿阀",sub:"依次隔绝、泄压、开门",run:()=>perform(3,20,"压力表归零，绿灯没有报警。",()=>{addSuspicion(4);gainSkill("work",55);gainIntel("tunnelSafeRoute")})},
  {title:"先开绿阀 → 再关红阀 → 最后开蓝阀",sub:"带压开门",run:()=>perform(2,16,"高温蒸汽从门缝喷出，惊动走廊值班员。",()=>{S.storyFlags.valvePuzzleFails++;S.energy-=10;addSuspicion(8)})},
  {title:"先开蓝阀 → 再开绿阀 → 最后关红阀",sub:"进汽未断",run:()=>perform(2,16,"进汽仍在持续，蓝阀无法泄压。",()=>{S.storyFlags.valvePuzzleFails++;S.energy-=10;addSuspicion(8)})}
],"周期谜题 3 · 三色压力阀")}

function storyChoice(title,text,choices,eyebrow){openModalAction(title,text,choices.map(c=>({...c,run:()=>freeEvent(c.message,c.effect)})),eyebrow)}
function hiddenMediaReady(){return S.intel.guardTestimony&&S.intel.visitorPattern&&S.intel.weeklyBlindSpot&&S.intel.originalFile&&S.intel.paymentRecord&&S.requests.zhangTea&&S.requests.xiaowenNotebook&&S.relations.zhang>=55&&S.relations.xiaowen>=50&&S.skills.social.lv>=3&&S.skills.observe.lv>=3}
function triggerDailyStory(){
  if(!S.morning||!$("actionModal").classList.contains("hidden")||!$("clueModal").classList.contains("hidden")||S.storyFlags.confinement)return;
  if(S.day>=3&&!S.storyFlags.xiaowenNote){storyChoice("夹在书页里的纸条","小文把一本旧诗集推到你面前。书脊里夹着求助纸条，上面写着一个陌生姓名和“每周二 21:10”。",[
    {title:"收下纸条并替她保密",sub:"获得线索 · 小文关系上升 · 怀疑上升",message:"你把纸条藏进衣袖，小文第一次说出了那名患者的原名。",effect:()=>{S.storyFlags.xiaowenNote=true;addSuspicion(4);gainRelation("xiaowen",14);gainIntel("foldedNote")}},
    {title:"把纸条交给护士林核对",sub:"信任与护士关系上升 · 小文关系下降",message:"护士林没有收走纸条，而是指出纸上的蓝章早已停用。",effect:()=>{S.storyFlags.xiaowenNote=true;S.trust+=7;gainRelation("nurse",10);gainRelation("xiaowen",-6,true);gainIntel("stampMismatch")}},
    {title:"把书原样还给小文",sub:"小文关系小幅上升 · 不获得线索",message:"你没有追问。小文记住了你没有逼她表态。",effect:()=>{S.storyFlags.xiaowenNote=true;gainRelation("xiaowen",7);S.trust++}}
  ],"剧情分支 · 小文");return}
  if(S.day>=6&&!S.storyFlags.inspection){storyChoice("主任查房提前了","主任临时检查病区，问你是否仍然坚持“病历写错了”。护士林站在一旁。",[
    {title:"提交完整身份替换链",sub:"已形成线索链时获得显著改善",message:"你只陈述能够互相印证的编号与日期。",effect:()=>{S.storyFlags.inspection=true;if(!S.intel.identityChain){addSuspicion(4);return}S.trust+=10;S.suspicion-=4;gainRelation("nurse",8);gainSkill("social",35)}},
    {title:"展示腕带与蓝章矛盾",sub:"需要错误腕带编号",message:"护士林核对了腕带登记日与印章启用日期。",effect:()=>{S.storyFlags.inspection=true;if(!S.intel.wristband){addSuspicion(3);return}addSuspicion(2);S.trust+=3;gainSkill("observe",25);gainIntel("stampMismatch")}},
    {title:"保持沉默，观察他们如何记录",sub:"怀疑下降 · 洞察成长",message:"你没有争辩，只记住主任把评估表放回哪只文件夹。",effect:()=>{S.storyFlags.inspection=true;S.suspicion-=4;gainSkill("observe",20)}}
  ],"剧情分支 · 临时检查");return}
  if(S.day>=9&&!S.storyFlags.chenValve){storyChoice("维修间少了一只阀门","陈伯发现旧通道的检修阀被拆走。库房有备用件，但领用会留下名字。",[
    {title:"拿出材料一起修好",sub:"材料 -1 · 陈伯关系与技能成长 · 获得阀门线索",message:"阀门重新转动，三道刻痕显露出来。",effect:()=>{S.storyFlags.chenValve=true;if(!hasItem(S,"material"))return;S.inventory.material--;gainRelation("chen",16);gainSkill("work",35);gainIntel("valveMark")}},
    {title:"报告护士站",sub:"信任上升 · 陈伯关系下降",message:"库房补发了阀门，但陈伯整晚没有再和你说话。",effect:()=>{S.storyFlags.chenValve=true;S.trust+=8;gainRelation("nurse",5);gainRelation("chen",-8,true)}},
    {title:"藏起附近的备用工具",sub:"材料 +2 · 怀疑上升",message:"你留下两件可能有用的零件，工具清点多出一处缺口。",effect:()=>{S.storyFlags.chenValve=true;addSuspicion(7);S.inventory.material+=2}}
  ],"剧情分支 · 陈伯");return}
  if(weekdayIs(4)&&S.requests.guardBattery&&S.relations.guard>=45&&S.intel.patrolSchedule&&!S.intel.guardTestimony){storyChoice("交班簿里少了一页","周四复查后，赵卫国承认每到周二，行政主任都会取走登记簿，归还时恰好少一页。",[
    {title:"拍下缺页与装订痕迹",sub:"获得人物证词 · 关系 +10 · 怀疑 +6",message:"照片保留了连续页码和被撕开的线头。",effect:()=>{S.storyFlags.guardHandover=true;addSuspicion(6);gainRelation("guard",10);gainIntel("guardTestimony")}},
    {title:"请他写下完整交班经过",sub:"获得人物证词 · 信任 +4 · 关系 +12",message:"赵卫国签下姓名，也写明登记簿由谁取走。",effect:()=>{S.storyFlags.guardHandover=true;S.trust+=4;gainRelation("guard",12);gainSkill("social",35);gainIntel("guardTestimony")}},
    {title:"不留照片，只记住时间和代号",sub:"获得人物证词 · 怀疑 +2 · 洞察成长",message:"他的口述与巡逻周表完全吻合。",effect:()=>{S.storyFlags.guardHandover=true;addSuspicion(2);gainRelation("guard",6);gainSkill("observe",40);gainIntel("guardTestimony")}}
  ],"关系剧情 · 保安赵卫国");return}
  if(hiddenMediaReady()&&!S.storyFlags.mediaRoute){storyChoice("付款单上的名字，老张见过","老张认出付款经手人曾是旧报社调查过的中间人。小文说，周日可以同步把材料发到院外。",[
    {title:"建立周日双重公开计划",sub:"开启隐藏离院方案 C · 怀疑 +10",message:"旧报社、志愿者和周言约定在周日同时公开材料。",effect:()=>{S.storyFlags.mediaRoute=true;addSuspicion(10);gainRelation("zhang",10);gainRelation("xiaowen",10);gainIntel("mediaPlan")}}
  ],"隐藏剧情 · 旧报社")}
}

function resolveTreatment(kind,roll=Math.random()){
  const before=snapshot();let msg="",penalty=0;
  if(kind==="full"){S.trust+=6;S.suspicion-=4;S.drug+=18;S.clarity-=12;S.energy-=5;gainRelation("nurse",2);msg="你按医嘱服药，院方评价改善，但思路变得迟钝。"}
  else if(kind==="half"){
    if(roll<.45){S.trust+=3;S.suspicion-=2;S.drug+=8;S.clarity-=5;gainRelation("nurse",1);msg="你只服下一半，护士没有察觉。"}
    else if(roll<.8){S.trust-=2;S.drug+=8;S.clarity-=5;addSuspicion(4);msg="护士注意到吞咽动作，记录上多了一个问号。"}
    else{S.trust-=6;S.drug+=12;S.clarity-=9;S.energy-=3;addSuspicion(9);msg="藏起的半片药被发现，护士重新核对了药杯。"}
  }else{
    if(S.day<2){toast("设法避开从第 2 天开始解锁");return}
    if(roll<.5){S.trust-=2;addSuspicion(6);S.clarity+=3;msg="你避开服药，但异常表现被写进记录。"}
    else if(roll<.8){S.trust-=7;addSuspicion(12);msg="护士发现药片没有减少，你被列为重点观察。"}
    else{S.trust-=10;S.drug+=36;S.clarity-=25;S.energy-=10;penalty=2;addSuspicion(20);msg="你被当场发现并遭到强制服药，同时失去 2 次行动。"}
  }
  S.morning=true;S.maxActions=dailyActions(S.drug);S.actions=Math.max(0,S.maxActions-penalty);normalize();close("morningModal");addLog(msg,changes(before));render();if(S.suspicion>=60)triggerConfinement();else{toast(msg);setTimeout(triggerDailyStory,230)}
}
function showMorning(){S.morning=false;$("avoidTreatment").disabled=S.day<2;$("morningModal").classList.remove("hidden");render()}
function endDay(auto=false){
  if(S.dayEnded||S.storyFlags.confinement)return;if(!auto&&S.time<18&&S.actions>0&&!confirm("现在结束今天，会放弃剩余时间与行动。确定继续吗？"))return;
  S.dayEnded=true;const overnight=10+talentLevel("metabolism")*3;$("dayEndTitle").textContent=`第 ${S.day} 天 · ${weekday()}结束`;$("dayEndText").textContent=`正常过夜恢复体力与清醒，并降低 ${overnight} 点药物负荷；信任、怀疑、关系、物品和线索保持不变。`;$("dayEndStats").innerHTML=`<div><b>+45</b><br><small>体力</small></div><div><b>+20</b><br><small>清醒</small></div><div><b>-${overnight}</b><br><small>药物</small></div><div><b>${S.suspicion}</b><br><small>怀疑不变</small></div>`;closeTransient();$("dayEndModal").classList.remove("hidden");save()
}
function nextDay(){
  const overnight=10+talentLevel("metabolism")*3;S.day++;S.time=8;S.energy+=45;S.clarity+=20;S.drug-=overnight;S.dayEnded=false;S.morning=false;S.scene="ward";S.maxActions=dailyActions(S.drug);S.actions=S.maxActions;normalize();
  if(S.day===2&&!S.storyFlags.introGift){S.storyFlags.introGift=true;S.inventory.tea++;S.logs.push({day:S.day,time:8,text:"活动室发来一包茶，已经放进随身记录。",changes:[]})}
  close("dayEndModal");S.logs.push({day:S.day,time:8,text:`第 ${S.day} 天（${weekday()}）开始。今日开放区域已经更新。`,changes:[]});switchScene("ward",true);showMorning();save()
}
function triggerConfinement(){
  currentClue=null;pendingClues=[];S.storyFlags.confinement=true;S.time=22;S.actions=0;S.trust-=8;S.drug+=36;S.clarity-=30;S.energy-=10;S.suspicion=50;normalize();closeTransient();close("clueModal");addLog("怀疑达到 60，当前行动被中断。你被带进小黑屋并强制服药。",[]);$("confinementModal").classList.remove("hidden");render()
}
function finishConfinement(){close("confinementModal");S.storyFlags.confinement=false;S.day++;S.time=8;S.energy+=30;S.clarity+=8;S.dayEnded=false;S.morning=false;S.scene="ward";S.maxActions=dailyActions(S.drug);S.actions=S.maxActions;normalize();S.logs.push({day:S.day,time:8,text:`隔离结束。第 ${S.day} 天（${weekday()}）开始。`,changes:[]});switchScene("ward",true);showMorning();save()}

function growthDimensions(){const network=Object.values(S.relations).reduce((a,b)=>a+b,0)/Object.keys(S.relations).length/20;return[{name:"体能",value:S.skills.fitness.lv,color:"#c96e5d"},{name:"技能",value:S.skills.work.lv,color:"#d5a650"},{name:"沟通",value:S.skills.social.lv,color:"#76a46d"},{name:"洞察",value:S.skills.observe.lv,color:"#6c9baa"},{name:"人脉",value:clamp(network,1,5),color:"#9c7daf"}]}
function drawRadar(){const canvas=$("growthRadar");if(!canvas)return;const ctx=canvas.getContext?.("2d");if(!ctx)return;const dims=growthDimensions(),cx=canvas.width/2,cy=canvas.height/2,r=105,point=(i,scale)=>{const a=-Math.PI/2+i*Math.PI*2/5;return[cx+Math.cos(a)*r*scale,cy+Math.sin(a)*r*scale]};ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle="#50594e";for(let ring=1;ring<=5;ring++){ctx.beginPath();dims.forEach((_,i)=>{const [x,y]=point(i,ring/5);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.stroke()}ctx.beginPath();dims.forEach((d,i)=>{const[x,y]=point(i,d.value/5);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle="rgba(209,169,80,.3)";ctx.strokeStyle="#d6ae59";ctx.lineWidth=3;ctx.fill();ctx.stroke()}
function renderSkillTree(){return["生存","调查","人脉"].map(branch=>{const nodes=Object.entries(talentMeta).filter(([id,m])=>m.branch===branch&&(talentLevel(id)>0||m.requires(S)));return`<section class="talentBranch"><h3>${branch}分支</h3>${nodes.length?nodes.map(([id,m])=>{const lv=talentLevel(id),maxed=lv>=m.max,cost=maxed?0:m.cost[lv],available=m.requires(S);return`<article class="talentNode ${available?"":"locked"} ${maxed?"maxed":""}"><b>${m.name} · Lv.${lv}/${m.max}</b><span>${m.desc}</span><small>${available?m.condition:`尚未满足：${m.condition}`}</small><button data-talent="${id}" ${maxed||!available||S.growthPoints<cost?"disabled":""}>${maxed?"已掌握":`投入 ${cost} 点`}</button></article>`}).join(""):`<div class="talentNode locked"><span>继续进行相关行动，新的节点会在条件满足后出现。</span></div>`}</section>`}).join("")}
function upgradeTalent(id){const m=talentMeta[id],lv=talentLevel(id);if(!m||lv>=m.max||!m.requires(S))return;const cost=m.cost[lv];if(S.growthPoints<cost){toast("养成点数不足");return}S.growthPoints-=cost;S.talents[id]=lv+1;addLog(`技能树：${m.name}提升到 Lv.${lv+1}。`,[]);openJournal("growth");render()}

function openJournal(tab="clues"){
  document.querySelectorAll("[data-journal]").forEach(b=>b.classList.toggle("active",b.dataset.journal===tab));let html="";
  if(tab==="clues")html=`<div class="recordGrid">${Object.entries(intelMeta).map(([id,m])=>{const got=S.intel[id];return`<article class="record layer${m.layer} ${m.evidence?"evidence":""} ${got?"":"locked"}"><b>${got?m.name:m.requires?"待交叉 / 待破解":"尚未取得"}</b><span>${got?m.text:"继续生活与调查，信息会在正确的前置条件下出现。"}</span>${got?`<div class="recordMeta">${m.type} · 层级 ${m.layer}</div>${m.schedule?`<div class="recordSchedule">${m.schedule.map(x=>`<i>${x}</i>`).join("")}</div>`:""}`:""}</article>`}).join("")}</div>`;
  if(tab==="items"){
    const owned=Object.entries(itemMeta).filter(([id])=>(S.inventory[id]||0)>0);html=`<div class="recordGrid">${owned.length?owned.map(([id,m])=>`<article class="record"><b>${m.icon} ${m.name} ×${S.inventory[id]}</b><span>${m.desc}</span>${["soap","snack"].includes(id)?`<div class="itemActions"><button data-use="${id}">使用</button></div>`:""}</article>`).join(""):`<div class="inventoryEmpty">目前没有随身物品。只有实际获得的物品才会出现在这里。</div>`}${!hasItem(S,"casefile")&&(evidenceCount()>0||hasItem(S,"carbon")||hasItem(S,"envelope"))?`<article class="record"><b>整理调查材料</b><span>关键证据 ${evidenceCount()}/3 · 复写纸 ${S.inventory.carbon}/1 · 防水信封 ${S.inventory.envelope}/1</span><div class="itemActions"><button data-craft="casefile" ${evidenceCount()>=3&&hasItem(S,"carbon")&&hasItem(S,"envelope")?"":"disabled"}>开始整理</button></div></article>`:""}</div>`
  }
  if(tab==="relations")html=`<div class="recordGrid">${Object.entries(personMeta).map(([id,p])=>{const m=requestMeta[id],known=S.requestKnown[id],done=S.requests[m.flag];return`<article class="record relationCard"><b>${p.name} · ${S.relations[id]}</b><span>${p.role}。${p.desc}</span><div class="meter"><i style="width:${S.relations[id]}%"></i></div><div class="relationRequest">${done?"✓ 已回应这次私人请求":known?`交谈中提到：${itemMeta[m.item].name} ×1`:"继续交谈，了解对方最近在意什么。"}</div></article>`}).join("")}</div>`;
  if(tab==="growth"){const dims=growthDimensions();html=`<div class="growthWrap"><section class="radarCard"><div class="eyebrow">角色五维</div><canvas id="growthRadar" width="300" height="250"></canvas><div class="radarLegend">${dims.map(d=>`<span style="color:${d.color}">${d.name}<b>${d.value.toFixed(1)}</b></span>`).join("")}</div><div class="growthPoints">可投入养成点数：<b>${S.growthPoints}</b><br><small>能力升级、关系里程碑、交叉印证与关键证据会提供点数。</small></div></section><div class="skillTree">${renderSkillTree()}</div></div>`}
  if(tab==="rules")html=`<div class="recordGrid"><article class="record"><b>体力</b><span>执行场景行动需要体力。休息、点心和过夜可以恢复。</span></article><article class="record"><b>清醒</b><span>药物与强制事件会降低清醒；精细调查需要保持清醒。</span></article><article class="record"><b>药物负荷</b><span>达到 25/50/80/90 后，每天行动分别降为 4/3/2/1，并逐级降低成长、增加耗时与体力消耗。</span></article><article class="record"><b>信任</b><span>低于 45、30、20 时逐级封锁设施；技能树的人脉分支可以改善有效信任。</span></article><article class="record"><b>怀疑</b><span>达到 60 会立即中断当前行动、取消当天剩余时间并触发强制服药。</span></article><article class="record"><b>一周循环</b><span>不同区域和行动按星期重复开放；游戏没有总天数限制。</span></article></div>`;
  $("journalContent").innerHTML=html;$("journalContent").querySelectorAll("[data-use]").forEach(b=>b.onclick=()=>useItem(b.dataset.use));$("journalContent").querySelectorAll("[data-craft]").forEach(b=>b.onclick=craftCasefile);$("journalContent").querySelectorAll("[data-talent]").forEach(b=>b.onclick=()=>upgradeTalent(b.dataset.talent));$("journalModal").classList.remove("hidden");if(tab==="growth")requestAnimationFrame(drawRadar)
}
function useItem(id){const before=snapshot();if(id==="soap"&&S.inventory.soap){S.inventory.soap--;S.trust+=2;S.suspicion-=6;addLog("你整理好个人状态，查房记录变得稳定。",changes(before))}if(id==="snack"&&S.inventory.snack){S.inventory.snack--;S.energy+=18;normalize();addLog("你吃了点心，体力恢复。",changes(before))}render();openJournal("items")}
function craftCasefile(){if(hasItem(S,"casefile")||evidenceCount()<3||!hasItem(S,"carbon")||!hasItem(S,"envelope"))return;const before=snapshot();S.inventory.carbon--;S.inventory.envelope--;S.inventory.casefile++;addLog("你用复写纸留下备份，再把三份关键证据封入防水信封。",changes(before));render();openJournal("items")}

function openShop(){if(!S.morning){toast("先完成晨间治疗");return}if(S.day<2){toast("小卖部从第 2 天开放");return}const restriction=facilityRestriction("library");if(restriction){toast(restriction);return}shopFirst=true;renderShop();$("shopModal").classList.remove("hidden")}
function renderShop(){$("shopRule").textContent=shopFirst?"本次第一次成功购买会消耗 1 次行动并推进 1 小时；继续购买不再消耗行动或时间。":"本次首购已经结算；继续购买不再消耗行动或时间。";$("shopGrid").innerHTML=Object.entries(itemMeta).filter(([,m])=>m.price!==null&&S.day>=m.day).map(([id,m])=>`<article class="shopItem"><b>${m.icon} ${m.name} · ${m.price} 积分</b><small>${m.desc}</small><button data-buy="${id}">购买</button></article>`).join("");$("shopGrid").querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buyItem(b.dataset.buy))}
function buyItem(id){const m=itemMeta[id];if(S.tokens<m.price){toast("积分不够");return}if(shopFirst&&(S.actions<=0||S.time>=22)){toast("今天没有行动完成本次首购");return}const before=snapshot();if(shopFirst){S.time++;S.actions--;shopFirst=false}S.tokens-=m.price;S.inventory[id]++;normalize();addLog(`你在小卖部购买了${m.name}。`,changes(before));renderShop();render();if(S.actions<=0||S.time>=22){close("shopModal");setTimeout(()=>endDay(true),350)}}

function routeDiscoveries(){return{legal:Boolean(S.intel.rules||S.intel.transferCopy||S.intel.originalFile||S.legalPass),tunnel:Boolean(S.intel.tunnelMap||(S.requests.chenSnack&&S.relations.chen>=35)),media:Boolean(S.intel.mediaPlan)}}
function escapeReadyLegal(){const offset=talentLevel("outsideBridge")*5;return evidenceCount()>=3&&S.intel.identityChain&&S.intel.guardTestimony&&S.intel.visitorPattern&&S.intel.treatmentSchedule&&hasItem(S,"casefile")&&S.externalContact&&S.legalPass&&effectiveTrust()>=80&&S.relations.nurse>=40-offset&&effectiveSocial()>=4&&S.drug<50&&weekdayIs(4)}
function escapeReadyTunnel(){return hasItem(S,"flashlight")&&hasItem(S,"gatepass")&&S.externalContact&&S.intel.patrolSchedule&&S.intel.tunnelMap&&S.intel.tunnelSafeRoute&&effectiveFitness()>=4&&S.skills.work.lv>=3&&effectiveObserve()>=3&&S.suspicion<50&&S.drug<30&&weekdayIs(6)}
function escapeReadyMedia(){const offset=talentLevel("outsideBridge")*5;return S.intel.mediaPlan&&S.intel.guardTestimony&&S.intel.weeklyBlindSpot&&S.intel.originalFile&&S.intel.paymentRecord&&S.externalContact&&S.relations.zhang>=65-offset&&S.relations.xiaowen>=60-offset&&effectiveSocial()>=4&&effectiveObserve()>=4&&S.suspicion<50&&S.drug<45&&weekdayIs(7)}
function req(ok,text){return`<li class="${ok?"met":""}">${ok?"✓":"○"} ${text}</li>`}
function openEscape(){
  const d=routeDiscoveries(),offset=talentLevel("outsideBridge")*5,routes=[];
  if(d.legal){const ready=escapeReadyLegal();routes.push(`<article class="routeCard ${ready?"ready":""}"><b>A · 合法离院 / 申诉复核</b><span>周四补充复核时，把证据、人证与稳定评价写入正式程序。</span><ul>${req(S.intel.identityChain,"身份替换链")}${req(S.intel.guardTestimony,"缺页交班证词")}${req(S.intel.visitorPattern,"异常探视链")}${req(S.intel.treatmentSchedule,"治疗安排")}${req(evidenceCount()>=3,`关键证据 ${evidenceCount()}/3`)}${req(hasItem(S,"casefile"),"密封证据包")}${req(S.externalContact,"院外联络")}${req(S.legalPass,"正式复核资格")}${req(effectiveTrust()>=80,`有效信任 ${effectiveTrust()}/80`)}${req(S.relations.nurse>=40-offset,`护士关系 ${S.relations.nurse}/${40-offset}`)}${req(effectiveSocial()>=4,`有效沟通 Lv.${effectiveSocial()}/4`)}${req(S.drug<50,`药物 ${S.drug}/50`)}${req(weekdayIs(4),`今天是周四（当前${weekday()}）`)}</ul><button data-route="legal" ${ready?"":"disabled"}>${ready?"执行合法离院":"条件未满足"}</button></article>`)}
  if(d.tunnel){const ready=escapeReadyTunnel();routes.push(`<article class="routeCard ${ready?"ready":""}"><b>B · 夜间离院 / 维修通道</b><span>周六锅炉测试时，依靠地图、照明、门禁牌和泄压顺序从旧通道离开。</span><ul>${req(hasItem(S,"flashlight"),"袖珍手电")}${req(hasItem(S,"gatepass"),"旧门禁牌")}${req(S.externalContact,"院外接应")}${req(S.intel.patrolSchedule,"巡逻周表")}${req(S.intel.tunnelMap,"维修通道地图")}${req(S.intel.tunnelSafeRoute,"安全泄压顺序")}${req(effectiveFitness()>=4,`有效体能 Lv.${effectiveFitness()}/4`)}${req(S.skills.work.lv>=3,`技能 Lv.${S.skills.work.lv}/3`)}${req(effectiveObserve()>=3,`有效洞察 Lv.${effectiveObserve()}/3`)}${req(S.suspicion<50,`怀疑 ${S.suspicion}/50`)}${req(S.drug<30,`药物 ${S.drug}/30`)}${req(weekdayIs(6),`今天是周六（当前${weekday()}）`)}</ul><button data-route="tunnel" ${ready?"":"disabled"}>${ready?"今晚执行计划":"条件未满足"}</button></article>`)}
  if(d.media){const ready=escapeReadyMedia();routes.push(`<article class="routeCard ${ready?"ready":""}"><b>C · 媒体护送 / 公开曝光</b><span>周日公益阅读时，由旧报社、志愿者和院外联系人同步公开材料。</span><ul>${req(S.intel.mediaPlan,"旧报社公开计划")}${req(S.intel.guardTestimony,"赵卫国提供人证")}${req(S.intel.weeklyBlindSpot,"周期性管理盲区")}${req(S.intel.originalFile,"病历原件")}${req(S.intel.paymentRecord,"私人付款记录")}${req(S.externalContact,"院外联络")}${req(S.relations.zhang>=65-offset,`老张关系 ${S.relations.zhang}/${65-offset}`)}${req(S.relations.xiaowen>=60-offset,`小文关系 ${S.relations.xiaowen}/${60-offset}`)}${req(effectiveSocial()>=4,`有效沟通 Lv.${effectiveSocial()}/4`)}${req(effectiveObserve()>=4,`有效洞察 Lv.${effectiveObserve()}/4`)}${req(S.suspicion<50,`怀疑 ${S.suspicion}/50`)}${req(S.drug<45,`药物 ${S.drug}/45`)}${req(weekdayIs(7),`今天是周日（当前${weekday()}）`)}</ul><button data-route="media" ${ready?"":"disabled"}>${ready?"启动公开计划":"条件未满足"}</button></article>`)}
  $("routeGrid").innerHTML=routes.length?routes.join(""):`<article class="routeCard locked"><b>尚未发现具体离院方案</b><span>随着院规、关系和环境情报逐渐出现，可执行方案会在这里展开。游戏没有逃离期限。</span></article>`;$("routeGrid").querySelectorAll("[data-route]").forEach(b=>b.onclick=()=>executeEscape(b.dataset.route));$("escapeModal").classList.remove("hidden")
}
function executeEscape(route){if(route==="legal"&&!escapeReadyLegal()||route==="tunnel"&&!escapeReadyTunnel()||route==="media"&&!escapeReadyMedia())return;S.completed=true;save();close("escapeModal");$("endingArt").className=`endingArt ${route}`;
  if(route==="legal"){$("endingTitle").textContent="你从正门走了出去。";$("endingText").innerHTML="密封证据包、正式申请与赵卫国的证词彼此印证，院方无法再把整条链解释成录入错误。你拿回自己的名字和证件。<br><br><b>你没有证明自己“正常”。你只是终于让事实进入一套能被核对的程序。</b>"}
  if(route==="tunnel"){$("endingTitle").textContent="花园外面，没有铁门。";$("endingText").innerHTML="旧门禁牌避开联网门禁，陈伯确认的维修通道仍然可用。周言已经等在花园外侧。<br><br><b>这是一条更快的路，也是一条把未完成问题带到墙外的路。</b>"}
  if(route==="media"){$("endingTitle").textContent="镜头打开时，铁门不能再悄悄关上。";$("endingText").innerHTML="旧报社、公益志愿者和周言在同一分钟公开记录、付款文件与赵卫国的证词。你在公开监督下离院。<br><br><b>你不是独自证明一切，而是让足够多的人同时看见同一件事。</b>"}
  $("endingStats").innerHTML=`<div><b>${S.day}</b><br><small>离院天数</small></div><div><b>${evidenceCount()}/3</b><br><small>关键证据</small></div><div><b>${S.trust}</b><br><small>最终信任</small></div><div><b>${S.suspicion}</b><br><small>最终怀疑</small></div>`;$("endingModal").classList.remove("hidden")
}

function startGame(){gameStarted=true;close("titleScreen");const start=sceneStatus(S.scene).open?S.scene:"ward";switchScene(start,true);render();if(S.storyFlags.confinement)$("confinementModal").classList.remove("hidden");else if(S.suspicion>=60)triggerConfinement();else if(!S.morning&&!S.dayEnded)setTimeout(showMorning,170);else if(S.dayEnded)endDay(true)}
function newGame(){if(getSavedRaw()&&!confirm("开始新游戏会覆盖当前存档，确定继续吗？"))return;S=defaultState();clearSaves();startGame()}
function continueGame(){if(load())startGame();else toast("没有可用存档")}

document.querySelectorAll(".sceneTab[data-scene]").forEach(b=>b.onclick=()=>switchScene(b.dataset.scene));
document.querySelectorAll("[data-treatment]").forEach(b=>b.onclick=()=>resolveTreatment(b.dataset.treatment));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>close(b.dataset.close));
document.querySelectorAll("[data-journal]").forEach(b=>b.onclick=()=>openJournal(b.dataset.journal));
$("newGameBtn").onclick=newGame;$("continueBtn").onclick=continueGame;$("closeAction").onclick=()=>close("actionModal");$("shopBtn").onclick=openShop;$("journalBtn").onclick=()=>openJournal("clues");$("relationBtn").onclick=()=>openJournal("relations");$("growthBtn").onclick=()=>openJournal("growth");$("escapeBtn").onclick=openEscape;$("saveBtn").onclick=()=>save(true);$("endDayBtn").onclick=()=>endDay(false);$("nextDayBtn").onclick=nextDay;$("finishConfinementBtn").onclick=finishConfinement;$("clueConfirm").onclick=confirmClue;$("restartBtn").onclick=()=>{clearSaves();location.reload()};
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if(!$("clueModal").classList.contains("hidden")||!$("confinementModal").classList.contains("hidden")||!$("endingModal").classList.contains("hidden"))return;["actionModal","journalModal","shopModal","escapeModal"].forEach(id=>close(id))});

S=defaultState();if(!getSavedRaw())$("continueBtn").classList.add("hidden");switchScene("ward",true);render();
window.__escapeV3={getState:()=>JSON.parse(JSON.stringify(S)),reset(){S=defaultState();clearSaves();render()},resolveTreatment:(k,r)=>resolveTreatment(k,r),openAction,perform,buyItem,nextDay,switchScene,openJournal,openEscape,escapeReadyLegal,escapeReadyTunnel,escapeReadyMedia};
