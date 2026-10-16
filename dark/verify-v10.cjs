const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const noop=()=>{},els=new Map(),draw=new Proxy({},{get:()=>noop,set:()=>true});
function el(id){if(!els.has(id))els.set(id,{innerHTML:'',textContent:'',style:{},dataset:{},classList:{toggle:noop},addEventListener:noop,getContext:()=>draw,showModal(){this.open=true;},close(){this.open=false;}});return els.get(id);}
let seed=731;const math=Object.create(Math);math.random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const store={};
const c=vm.createContext({console,Math:math,JSON,Number,String,Array,Set,Map,Error,Infinity,document:{getElementById:el,querySelectorAll:()=>[],addEventListener:noop},window:{},localStorage:{setItem:(k,v)=>store[k]=v,getItem:k=>store[k]},requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop});
for(const file of ['render.js','movement.js','combat-ai.js','engine.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);vm.runInContext('confirmQuickStart()',c);
const run=s=>vm.runInContext(s,c),test=(name,fn)=>{fn();console.log('PASS '+name);};
function setup(){run('state=initial();state.wave=1;spawnHero();var h=state.heroes[0];h.x=4;h.y=3;clearNavigation(h);');}
test('mid-step exploration / pursuit / retreat switches stay cardinal and make progress',()=>{
 setup();run('state.grid.forEach(row=>row.forEach(t=>t.open=false));[[2,0],[2,1],[2,2],[2,3],[3,3],[4,3],[5,3],[5,4],[5,5]].forEach(([x,y])=>state.grid[y][x].open=true);h.target=[5,3];safeAdvance(h,h.target,1,.3);h.target=[5,5];h.combatStep=[5,5];var testLast=[h.x,h.y];var arrivals=new Set();for(var i=0;i<240;i++){if(i%3===0)moveCombat(h,5,5,1,.05);else if(i%3===1)moveExplore(h,1,.05);else moveCombat(h,4,3,1,.05);if(Math.abs(h.x-testLast[0])>1e-7&&Math.abs(h.y-testLast[1])>1e-7)throw Error("diagonal movement");if(!state.grid[Math.round(h.y)][Math.round(h.x)].open)throw Error("wall");arrivals.add(Math.round(h.x)+","+Math.round(h.y));testLast=[h.x,h.y];}');
 assert.ok(run('arrivals.size')>=3);
});
test('chase routes around a wall, without cutting its corner',()=>{
 setup();run('h.x=4;h.y=5;state.grid[5][5].open=false;for(var i=0;i<240;i++){moveCombat(h,7,5,1,.05);if(!state.grid[Math.round(h.y)][Math.round(h.x)].open)throw Error("wall");}');
 assert.ok(run('Math.hypot(h.x-7,h.y-5)')<.01);
});
test('invalid diagonal targets are rejected and wall positions recover then move',()=>{
 setup();assert.equal(run('safeAdvance(h,[5,4],1,.1)'),false);assert.equal(run('h.x'),4);
 run('h.lastSafeCell=[4,3];h.x=5;h.y=2;state.grid[2][5].open=false;h.combatStep=[10,8];repairActor(h);moveCombat(h,7,3,1,.2)');
 assert.equal(run('h.y'),3);assert.ok(run('h.x')>4);
 run('h.x=4.3;h.y=3.3;repairActor(h)');assert.equal(run('h.x'),4);assert.equal(run('h.y'),3);
});
test('old saves repair wall occupants and discard stale movement endpoints',()=>{
 setup();run('state.version=9;h.x=5;h.y=2;state.grid[2][5].open=false;h.lastSafeCell=[4,3];h.target=[12,8];h.combatStep=[9,9];save(false);state=initial();load();h=state.heroes[0];');
 assert.ok(run('state.version')>=10);assert.equal(run('h.x'),4);assert.equal(run('h.y'),3);assert.equal(run('h.target'),null);assert.equal(run('h.combatStep'),null);run('update(.05)');assert.ok(run('h.x!==4||h.y!==3'));
});
test('guaranteed level-based gold is paid exactly once, even on unlucky rolls',()=>{
 setup();const original=math.random;math.random=()=>.99;
 run('var before=state.gold;h.level=1;h.hp=0;resolveHeroDeaths();resolveHeroDeaths()');assert.equal(run('state.gold-before'),7);
 setup();run('var before=state.gold;h.level=5;h.hp=0;resolveHeroDeaths()');assert.equal(run('state.gold-before'),19);
 assert.ok(run('Array.from({length:100},(_,i)=>goldReward(i+2)>goldReward(i+1)).every(Boolean)'));math.random=original;
});
test('escape is not a kill and wall vision stays blocked',()=>{
 setup();run('state.stock[0]=1;select("monster0");clickTile(7,3);var m=state.monsters[0];state.grid[3][5].open=false');assert.equal(run('canSee(h,m,10)'),false);
 run('h.escaped=true;var before=state.gold;updateEscapeDepartures();resolveHeroDeaths()');assert.equal(run('state.gold'),run('before'));assert.equal(run('state.kills'),0);
});
test('24 seeded full AI simulations keep every actor on open cardinal corridors',()=>{
 for(let trial=0;trial<24;trial++){
 seed=trial+17;run('state=initial();state.hp=state.maxHp=1e9;state.active=true;state.countdownActive=false;state.wave=3;state.spawnLeft=0;for(var j=0;j<6;j++)spawnHero();state.stock[0]=4;select("monster0");[[4,3],[7,5],[11,8],[17,13]].forEach(([x,y])=>clickTile(x,y));state.heroes.forEach(h=>h.hp=h.maxHp=1e8);state.monsters.forEach((m,i)=>{m.hp=m.maxHp=1e8;m.level=i%2?5:1;});for(var i=0;i<3000;i++){update(.05);for(const a of [...state.heroes,...state.monsters]){if(!Number.isFinite(a.x)||!Number.isFinite(a.y)||!state.grid[Math.round(a.y)]?.[Math.round(a.x)]?.open)throw Error("actor entered wall");if(Math.abs(a.x-Math.round(a.x))>1e-7&&Math.abs(a.y-Math.round(a.y))>1e-7)throw Error("actor off cardinal axis");}}draw();renderUI();');
 }
});
console.log('All v10 checks passed.');
