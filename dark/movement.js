// All actors share one cardinal tile-to-tile movement segment across AI state changes.
function openTile(x,y,monster=false){return Number.isInteger(x)&&Number.isInteger(y)&&!!state.grid[y]?.[x]?.open&&(!monster||state.grid[y][x].build?.type!=='kitchen'&&!torchLit(x,y));}
function clearNavigation(a){a.navStep=null;a.navFrom=null;a.combatStep=null;a.target=null;a.patrolTarget=null;a.travelFrom=null;}
function repairActor(a,monster=false){const x=Math.round(a.x),y=Math.round(a.y),onAxis=Math.abs(a.x-x)<1e-7||Math.abs(a.y-y)<1e-7;if(Number.isFinite(a.x)&&Number.isFinite(a.y)&&physicalActorTile(x,y,monster)&&onAxis){if(Math.abs(a.x-x)<1e-7&&Math.abs(a.y-y)<1e-7)a.lastSafeCell=[x,y];return false;}let cell=a.lastSafeCell;if(!cell||!openTile(...cell,monster)){let best=Infinity;cell=null;for(let b=0;b<H;b++)for(let c=0;c<W;c++)if(openTile(c,b,monster)){const d=Number.isFinite(a.x)&&Number.isFinite(a.y)?Math.hypot(c-a.x,b-a.y):Math.hypot(c-2,b);if(d<best){best=d;cell=[c,b];}}}if(!cell)return false;a.x=cell[0];a.y=cell[1];a.lastSafeCell=cell.slice();clearNavigation(a);return true;}
function legalSegment(a,point,monster=false){if(!point||!openTile(point[0],point[1],monster))return false;const[tx,ty]=point,dx=tx-a.x,dy=ty-a.y;if(Math.abs(dx)>1e-7&&Math.abs(dy)>1e-7||Math.hypot(dx,dy)>1.000001)return false;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)*20));for(let i=0;i<=steps;i++)if(!openTile(Math.round(a.x+dx*i/steps),Math.round(a.y+dy*i/steps),monster)&&!(monster&&torchLit(Math.round(a.x),Math.round(a.y))&&Math.round(a.x+dx*i/steps)===Math.round(a.x)&&Math.round(a.y+dy*i/steps)===Math.round(a.y)&&physicalActorTile(Math.round(a.x),Math.round(a.y),true)))return false;return true;}
// Settle an interrupted segment toward a free cardinal endpoint, including backing out.
function settleMonsterStep(a,requested){const points=[requested,[Math.round(a.x),Math.round(a.y)],[Math.floor(a.x),Math.floor(a.y)],[Math.ceil(a.x),Math.ceil(a.y)]].filter(p=>legalSegment(a,p,true)&&(!withinMonsterTether(a,a.x,a.y)||withinMonsterTether(a,...p)));return points[0];}
function safeAdvance(a,requested,speed,dt,monster=false){repairActor(a,monster);if(a.navStep&&!legalSegment(a,a.navStep,monster)){a.navStep=null;a.navFrom=null;}let next=a.navStep;if(!next){const x=Math.round(a.x),y=Math.round(a.y);if(Math.hypot(a.x-x,a.y-y)>1e-7)next=monster?settleMonsterStep(a,requested):settleHeroStep(a,requested);else next=requested;if(!legalSegment(a,next,monster)){a.target=null;a.combatStep=null;a.patrolTarget=null;return false;}a.navStep=next.slice();a.navFrom=[x,y];}const dx=next[0]-a.x,dy=next[1]-a.y,d=Math.hypot(dx,dy),step=Math.max(0,speed*dt*(monster?monsterSpeedMultiplier(a):1)),ratio=d>0?Math.min(1,step/d):0,px=a.x+dx*ratio,py=a.y+dy*ratio;if(monster&&withinMonsterTether(a,a.x,a.y)&&(!withinMonsterTether(a,...next)||!withinMonsterTether(a,px,py))){clearNavigation(a);return false;}if(!monster&&heroSegmentBlocked(a,px,py)){a.blockedFor=(a.blockedFor||0)+dt;if(a.blockedFor>=.6)clearNavigation(a);return false;}if(d<=step+1e-9){a.x=next[0];a.y=next[1];a.lastSafeCell=next.slice();if(!monster&&d>1e-9){a.visits??={};const key=next.join(',');a.visits[key]=(a.visits[key]||0)+1;a.previousTile=a.navFrom;}a.navStep=null;a.navFrom=null;a.combatStep=null;a.target=null;a.travelFrom=null;}else{a.x=px;a.y=py;}a.walk=(a.walk||0)+dt;if(!monster)placeChefTorch(a);return true;}
function moveExplore(h,speed,dt){if(!h.target)h.target=chooseExploreStep(h);return advanceHero(h,h.target,speed,dt);}

// Chefs have a 0.65-tile body; sweep the entire proposed movement to prevent tunnelling.
function heroTileOccupied(a,x,y){return state.heroes.some(h=>h!==a&&h.hp>0&&!h.escaped&&Math.hypot(h.x-x,h.y-y)<.65-1e-7);}
function heroEntranceClear(){return !state.heroes.some(h=>h.hp>0&&!h.escaped&&(Math.hypot(h.x-2,h.y)<.75||h.fleeing&&Math.abs(h.x-2)<=2&&h.y<=4));}
function heroSegmentBlocked(a,x,y){const dx=x-a.x,dy=y-a.y,length=dx*dx+dy*dy;return state.heroes.some(h=>{if(h===a||h.hp<=0||h.escaped)return false;const before=Math.hypot(h.x-a.x,h.y-a.y),after=Math.hypot(h.x-x,h.y-y);if(before<.65-1e-7)return after<=before+1e-9;const t=length?Math.max(0,Math.min(1,((h.x-a.x)*dx+(h.y-a.y)*dy)/length)):0;return Math.hypot(h.x-a.x-dx*t,h.y-a.y-dy*t)<.65-1e-7;});}
function settleHeroStep(a,requested){return [requested,[Math.round(a.x),Math.round(a.y)],[Math.floor(a.x),Math.floor(a.y)],[Math.ceil(a.x),Math.ceil(a.y)]].find(p=>legalSegment(a,p)&&!heroSegmentBlocked(a,...p));}
function isEntranceLane(x,y){return x===2&&y>=0&&y<=3;}
function chefPriority(h){return (h.fleeing?-1000000:0)+(h.id||0);}
function findHeroParking(h,blocker){const sx=Math.round(h.x),sy=Math.round(h.y),horizontal=Math.abs(blocker.x-h.x)>=Math.abs(blocker.y-h.y),q=[[sx,sy]],seen=new Set([sx+','+sy]);for(let i=0;i<q.length;i++){const [x,y]=q[i];if(!isEntranceLane(x,y)&&(horizontal?Math.abs(y-h.y):Math.abs(x-h.x))>=.9&&!heroTileOccupied(h,x,y))return {x,y};for(const [a,b]of neighbors(x,y)){const key=a+','+b;if(seen.has(key)||!openTile(a,b)||heroTileOccupied(h,a,b))continue;seen.add(key);q.push([a,b]);}}return null;}
function planHeroYield(h,blocker){if(state.time<(h.yieldCooldownUntil||0))return false;if(state.time<(h.yieldUntil||0)&&h.yieldTarget)return true;const point=findHeroParking(h,blocker);if(!point)return false;const horizontal=Math.abs(blocker.x-h.x)>=Math.abs(blocker.y-h.y);h.yieldTarget=point;h.yieldUntil=state.time+Math.hypot(point.x-h.x,point.y-h.y)/Math.max(.1,heroStats(h).speed)+6;h.yieldBlockerId=blocker.id;h.yieldStarted=state.time;h.yieldLastProgress=state.time;h.yieldParkedAt=null;h.yieldOrigin={x:h.x,y:h.y,horizontal,sign:Math.sign(horizontal?blocker.x-h.x:blocker.y-h.y)||1};h.blockedFor=0;clearNavigation(h);return true;}
function cancelHeroYield(h){h.yieldTarget=null;h.yieldUntil=0;h.yieldCooldownUntil=state.time+1;h.yieldParkedAt=null;clearNavigation(h);}
function advanceHero(h,requested,speed,dt){
 if(h.yieldTarget&&state.time<(h.yieldUntil||0)){
  const other=state.heroes.find(o=>o.id===h.yieldBlockerId&&o.hp>0&&!o.escaped),origin=h.yieldOrigin,passed=other&&origin&&((origin.horizontal?other.x-origin.x:other.y-origin.y)*origin.sign<-.65),parked=Math.hypot(h.x-h.yieldTarget.x,h.y-h.yieldTarget.y)<.08;
  if(parked&&h.yieldParkedAt==null)h.yieldParkedAt=state.time;
  const stale=!parked&&state.time-(h.yieldLastProgress??h.yieldStarted??state.time)>=1.25,held=parked&&state.time-(h.yieldParkedAt??state.time)>=1.5;
  if(!other||passed||stale||held){cancelHeroYield(h);return false;}
  const step=heroRoute(h,h.yieldTarget.x,h.yieldTarget.y)[0],x=h.x,y=h.y,moved=safeAdvance(h,step,speed,dt);
  if(Math.hypot(h.x-x,h.y-y)>1e-6)h.yieldLastProgress=state.time;
  return moved;
 }
 if(h.yieldTarget)cancelHeroYield(h);
 const intent=h.navStep||requested;if(intent){const dx=intent[0]-h.x,dy=intent[1]-h.y,d=Math.hypot(dx,dy);if(d>.01)h.moveIntent={x:dx/d,y:dy/d};}
 const x=h.x,y=h.y;
 if(safeAdvance(h,requested,speed,dt)){if(Math.hypot(h.x-x,h.y-y)>1e-6)h.blockedFor=0;return true;}
 if(!requested)h.blockedFor=(h.blockedFor||0)+dt;
 if((h.blockedFor||0)<.6)return false;
 const blocker=state.heroes.filter(o=>o!==h&&o.hp>0&&!o.escaped&&Math.hypot(o.x-h.x,o.y-h.y)<1.6).sort((a,b)=>Math.hypot(a.x-h.x,a.y-h.y)-Math.hypot(b.x-h.x,b.y-h.y))[0];
 if(!blocker)return false;
 if(h.moveIntent&&blocker.moveIntent&&h.moveIntent.x*blocker.moveIntent.x+h.moveIntent.y*blocker.moveIntent.y>.5)return false;
 if(blocker.yieldTarget&&blocker.yieldBlockerId===h.id)return false;
 if(chefPriority(h)<chefPriority(blocker)){if(planHeroYield(blocker,h))return false;if(!planHeroYield(h,blocker))return false;return safeAdvance(h,heroRoute(h,h.yieldTarget.x,h.yieldTarget.y)[0],speed,dt);}
 if(!planHeroYield(h,blocker)){planHeroYield(blocker,h);return false;}
 return safeAdvance(h,heroRoute(h,h.yieldTarget.x,h.yieldTarget.y)[0],speed,dt);
}
function separateLoadedHeroes(){const placed=[];for(const h of state.heroes){if(h.hp<=0||h.escaped)continue;if(placed.some(o=>Math.hypot(o.x-h.x,o.y-h.y)<.65-1e-7)){let best=null,distance=Infinity;for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(openTile(x,y)&&!placed.some(o=>Math.hypot(o.x-x,o.y-y)<.65-1e-7)){const d=Math.hypot(h.x-x,h.y-y);if(d<distance){distance=d;best=[x,y];}}if(best){h.x=best[0];h.y=best[1];h.lastSafeCell=best;clearNavigation(h);}}h.blockedFor=0;h.yieldUntil=0;h.yieldTarget=null;h.yieldCooldownUntil=0;h.moveIntent=null;placed.push(h);}}

// Torch light blocks entry for monsters, never chef movement or sight.
function torchLit(x,y){return (state.torches||[]).some(t=>t.x===x&&t.y===y&&t.expiresAt>state.time);}
function physicalActorTile(x,y,monster){return !!state.grid[y]?.[x]?.open&&(!monster||state.grid[y][x].build?.type!=='kitchen');}
function expireTorches(){state.torches=(state.torches||[]).filter(t=>t.expiresAt>state.time);}
function placeChefTorch(h){if(!h.torchAvailable||h.hp<=0||h.escaped||h.fleeing)return false;h.torchCheckAt??=state.time+8+Math.random()*6;if(state.time<h.torchCheckAt)return false;const x=Math.round(h.x),y=Math.round(h.y);if(Math.hypot(h.x-x,h.y-y)>1e-7)return false;h.torchCheckAt=state.time+8;if(!outsideEntranceZone(x,y)||!openTile(x,y)||state.grid[y][x].build||x===20&&y===13||state.time-(state.lastTorchAt??-Infinity)<6||(state.torches||[]).some(t=>t.expiresAt>state.time&&Math.hypot(t.x-x,t.y-y)<=3)||Math.random()>=.25)return false;state.torches??=[];state.torches.push({x,y,ownerId:h.id,expiresAt:state.time+30});state.lastTorchAt=state.time;h.torchAvailable=false;fx(x,y,'火把 · 30秒','#f6cd79');return true;}
function escapeTorchLight(m,dt){const x=Math.round(m.x),y=Math.round(m.y);if(!torchLit(x,y))return false;clearNavigation(m);const choices=neighbors(x,y).filter(p=>openTile(...p,true)&&withinMonsterTether(m,...p)&&legalSegment(m,p,true));if(choices.length)safeAdvance(m,choices[0],.75,dt,true);return true;}
