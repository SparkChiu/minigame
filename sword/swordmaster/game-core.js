(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ForgeGame=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TARGETS=[480,850,1400,2200,3600];
  const RELICS=[
    {id:'steady',name:'磐石之锤',icon:'hammer',price:260,desc:'降低碎裂概率，升级收益递减，最多降低 10 个百分点。'},
    {id:'bellows',name:'余烬风箱',icon:'ember',price:180,desc:'减缓冷却并缩短加热；最高减缓 50% 冷却、缩短 60% 加热。'},
    {id:'fortune',name:'龙眼石',icon:'eye',price:420,desc:'提高暴击概率，升级收益递减，额外概率最高 30 个百分点。'},
    {id:'prism',name:'虹彩棱镜',icon:'prism',price:650,desc:'延长入神时间，逐渐接近 7.5 秒。入神时每锤增值较缓。'},
    {id:'seal',name:'旧王印章',icon:'seal',price:380,desc:'降低下一关起的贡品要求，逐渐接近 25% 减免。'},
    {id:'ward',name:'不碎之誓',icon:'shield',price:520,desc:'每关抵挡碎裂；等级 1 / 2 / 4 / 8… 分别拥有 1 / 2 / 3 / 4… 次护盾。'},
    {id:'edge',name:'星铁碎片',icon:'sword',price:300,desc:'增加每锤固定增值，升级收益递减，受炉火共鸣放大。'},
    {id:'sand',name:'漏时沙瓶',icon:'hourglass',price:340,desc:'延长贡品期限，逐渐接近额外 30 秒。升级时补足本关新增时间。'},
    {id:'spark',name:'初火之种',icon:'ember',price:220,desc:'提高新剑胚初值，升级收益递减，受炉火共鸣放大。'}
  ];
  const soft=(level,rate=.65)=>1-Math.pow(rate,level);
  const baseDue=round=>round<=5?TARGETS[round-1]:Math.round(3600*Math.pow(1.24,round-5)*Math.pow(1.20,Math.floor((round-5)/5)));
  class Game {
    constructor(random=Math.random){this.random=random;this.reset();}
    reset(){
      this.mode='ready';this.round=1;this.inventory=[];this.relics=[];this.levels={};this.offer=[];this.shopPurchases=0;this.seq=0;this.wardsSpent=0;
      this.stats={hits:0,broken:0,best:40,tribute:0,cleared:0,upgrades:0};this.events=[];this.heating=0;this.cooldown=0;this.frenzy=0;
      this.sword=this.newSword();this.tributeDue=this.nextDue();this.remaining=this.duration();this.rollShop();
    }
    level(id){return this.levels[id]||0;}
    has(id){return this.level(id)>0;}
    ranks(){return Object.values(this.levels).reduce((a,n)=>a+n,0);}
    resonance(){return Math.pow(1.08,this.ranks());}
    seedValue(){return Math.round((40+120*soft(this.level('spark'),.75))*this.resonance());}
    flatGain(){return (9+48*soft(this.level('edge'),.75))*this.resonance();}
    newSword(){return {id:++this.seq,value:this.seedValue(),hits:0,charge:0,heat:0};}
    isBoss(){return this.round%5===0;}
    danger(){return Math.min(.18,(this.round-1)*.004)+(this.isBoss()?.035:0);}
    heatDuration(){return 1.25*(1-.6*soft(this.level('bellows')));}
    cooling(){return 5.5*(1-.5*soft(this.level('bellows')));}
    frenzyDuration(){return 4.5+3*soft(this.level('prism'));}
    extraTime(){return Math.round(30*soft(this.level('sand')));}
    duration(){return 105-Math.min(35,Math.floor((this.round-1)/5)*3)+this.extraTime();}
    discount(){return .25*soft(this.level('seal'));}
    nextDue(){return Math.round(baseDue(this.round)*(1-this.discount()));}
    due(){return this.tributeDue;}
    price(id){const r=RELICS.find(x=>x.id===id);if(!r)return Infinity;return Math.ceil(r.price*Math.pow(baseDue(this.round)/TARGETS[0],.90)*(1+this.level(id)*.22)/10)*10;}
    wardCapacity(){return this.has('ward')?1+Math.floor(Math.log2(this.level('ward'))):0;}
    wardsLeft(){return Math.max(0,this.wardCapacity()-this.wardsSpent);}
    risk(){if(this.frenzy>0||this.sword.charge>=10)return 0;return Math.max(.025,Math.min(.70,.04+this.danger()+this.sword.hits*.022+Math.max(0,70-this.sword.heat)*.0014-.10*soft(this.level('steady'))));}
    effect(id,level=this.level(id)){
      switch(id){
        case 'steady':return `碎裂概率 −${(10*soft(level)).toFixed(1)} 个百分点`;
        case 'bellows':return `冷却 −${(50*soft(level)).toFixed(0)}% · 加热 ${(1.25*(1-.6*soft(level))).toFixed(2)} 秒`;
        case 'fortune':return `暴击概率 ${(12+30*soft(level)).toFixed(1)}%`;
        case 'prism':return `入神 ${(4.5+3*soft(level)).toFixed(2)} 秒`;
        case 'seal':return `后续贡品 −${(25*soft(level)).toFixed(1)}%`;
        case 'ward':return `每关 ${level?1+Math.floor(Math.log2(level)):0} 次护盾`;
        case 'edge':return `每锤基础固定增值 ${(9+48*soft(level,.75)).toFixed(1)} × 共鸣`;
        case 'sand':return `每关额外 ${Math.round(30*soft(level))} 秒`;
        case 'spark':return `新剑基础价值 ${Math.round(40+120*soft(level,.75))} × 共鸣`;
        default:return '';
      }
    }
    start(){if(this.mode==='ready')this.mode='running';}
    heat(){if(this.mode!=='running'||this.heating>0)return false;this.heating=this.heatDuration();return true;}
    tick(dt){
      if(this.mode!=='running')return;dt=Math.max(0,dt);this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.frenzy=Math.max(0,this.frenzy-dt);
      if(this.heating>0){this.heating-=dt;if(this.heating<=0){this.heating=0;this.sword.heat=100;this.emit('heat','炉火正旺，剑已烧红。');}}
      else this.sword.heat=Math.max(this.frenzy>0?40:0,this.sword.heat-dt*this.cooling());
      if(this.remaining<=0){this.mode='lost';this.emit('lost',`第 ${this.round} 关贡品逾期。巨龙收回了你的生路。`);}
    }
    strike(){
      if(this.mode!=='running'||this.heating>0||this.cooldown>0||this.sword.heat<=20)return null;
      this.cooldown=.32;let entered=false;
      if(this.sword.charge>=10&&this.frenzy<=0){this.frenzy=this.frenzyDuration();this.sword.charge=0;entered=true;this.emit('frenzy','入神！趁虹光未散，尽情挥锤。');}
      const safe=this.frenzy>0;
      if(!safe&&this.random()<this.risk()){
        if(this.wardsLeft()>0){this.wardsSpent++;this.emit('ward',`不碎之誓挡下一次碎裂，本关剩余 ${this.wardsLeft()} 次。`);return {type:'ward',value:this.sword.value};}
        const value=this.sword.value;this.stats.broken++;this.sword=this.newSword();this.frenzy=0;this.heating=0;this.cooldown=.7;this.emit('break',`碎裂！失去了价值 ${value} 的剑。`);return {type:'break',value};
      }
      const crit=this.random()<(.12+.30*soft(this.level('fortune'))),before=this.sword.value;
      // Safe frenzy increases value at a slower rate than risky normal strikes.
      const factor=safe?1.045+this.random()*.05:1.14+this.random()*.10;
      this.sword.value=Math.round(before*factor+this.flatGain());if(crit)this.sword.value+=Math.round(before*(safe?.10:.20));
      this.sword.hits++;if(!safe)this.sword.charge=Math.min(10,this.sword.charge+1);this.sword.heat=Math.max(safe?40:21,this.sword.heat-(safe?1:2));this.stats.hits++;this.stats.best=Math.max(this.stats.best,this.sword.value);
      const result={type:crit?'crit':'hit',gain:this.sword.value-before,value:this.sword.value,entered,safe};this.emit(result.type,`${crit?'完美一锤':'锻造成功'}，剑值 +${result.gain}。`);return result;
    }
    bank(){if(this.mode!=='running'||this.sword.hits<1||this.heating>0||this.inventory.length>=6)return false;const sword={...this.sword};this.inventory.push(sword);this.sword=this.newSword();this.frenzy=0;this.heating=0;this.emit('bank',`价值 ${sword.value} 的剑已入库。`);return sword;}
    take(id){
      if(this.mode!=='running'||this.heating>0)return false;const index=this.inventory.findIndex(s=>s.id===id);if(index<0)return false;
      const stored=this.inventory.splice(index,1)[0];if(this.sword.hits>0)this.inventory.push({...this.sword,heat:0});this.sword={...stored,heat:0};this.frenzy=0;this.cooldown=Math.max(this.cooldown,.32);this.emit('take',`取回价值 ${stored.value} 的剑，重新加热后可继续锻造。`);return true;
    }
    pay(ids){
      if(this.mode!=='running')return false;const unique=new Set(ids),chosen=this.inventory.filter(s=>unique.has(s.id)),total=chosen.reduce((a,s)=>a+s.value,0);
      if(total<this.due())return false;this.inventory=this.inventory.filter(s=>!unique.has(s.id));this.stats.tribute+=total;this.stats.cleared++;this.emit('pay',`第 ${this.round} 关贡品已清，交出 ${total} 剑值。`);
      this.round++;this.tributeDue=this.nextDue();this.remaining=this.duration();this.wardsSpent=0;this.shopPurchases=0;this.rollShop();return true;
    }
    rollShop(){const pool=[...RELICS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}this.offer=pool.slice(0,3).map(r=>r.id);}
    buy(relicId,swordId){
      if(this.mode!=='running'||this.shopPurchases>=2||!this.offer.includes(relicId))return false;
      const r=RELICS.find(x=>x.id===relicId),current=this.sword.id===swordId,s=current?this.sword:this.inventory.find(x=>x.id===swordId);
      if(!r||!s||s.hits<1||s.value<this.price(relicId)||this.heating>0)return false;
      const value=s.value,timeBefore=this.extraTime();this.levels[relicId]=this.level(relicId)+1;if(!this.relics.includes(relicId))this.relics.push(relicId);this.shopPurchases++;this.stats.upgrades++;
      if(current){this.sword=this.newSword();this.frenzy=0;}else this.inventory=this.inventory.filter(x=>x.id!==swordId);
      this.offer=this.offer.filter(x=>x!==relicId);this.remaining+=this.extraTime()-timeBefore;
      this.emit('buy',`交出 ${value} 剑值，${r.name}升至 Lv.${this.level(relicId)}。炉火共鸣 ×${this.resonance().toFixed(2)}。`);return true;
    }
    emit(type,text){this.events.push({type,text});if(this.events.length>100)this.events.shift();}
  }
  return {Game,RELICS,TARGETS,baseDue};
});
