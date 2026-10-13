(function(root){
'use strict';
const TYPES=[
 {name:'海盐冻',guest:'泡泡兽',color:'#8eb9c7',ink:'#466978',symbol:'○'},
 {name:'莓莓糕',guest:'莓角怪',color:'#ce96a2',ink:'#874e60',symbol:'♡'},
 {name:'叶卷团',guest:'叶耳灵',color:'#a5b887',ink:'#607044',symbol:'⌁'},
 {name:'南瓜盅',guest:'南瓜仔',color:'#d6b16c',ink:'#856233',symbol:'✦'}
];
const LEVELS=[
 {title:'海滩试吃',subtitle:'先看货架底层，再安排客人',rows:16,colors:2,pattern:'wave',seed:17,lanes:[[0,1,0,1,0,1],[1,0,1,0,1,0],[0,1,1,0,0,1]],story:'河狸把试吃料理码上旧货架。泡泡兽只肯吃海盐冻，莓角怪盯着莓莓糕。'},
 {title:'叶耳来访',subtitle:'三种口味，三条独立候客队列',rows:20,colors:3,pattern:'patch',seed:35,lanes:[[0,2,1,0,2,1,0,2,1],[1,0,2,1,0,2,1,0,2],[2,1,0,2,1,0,2,1,0]],story:'菜筐里长出了叶耳灵。新口味加入以后，每列后面的客人也要提前留意。'},
 {title:'三口一桌',subtitle:'三位同类合成大胃王，保留剩余食量',rows:24,colors:3,pattern:'layers',seed:61,lanes:[[1,1,1,0,2,0,1,2,0,1],[2,2,2,1,0,2,0,1,2,0],[1,0,0,2,1,0,2,1,0,2]],story:'三只怪客共用一张凳子，变成大胃王。河狸连忙加固桌腿，空出来的凳子还能招待别的口味。'},
 {title:'夜市拼盘',subtitle:'四色交错，维持连续进食',rows:28,colors:4,pattern:'diagonal',seed:94,lanes:[[0,3,1,2,0,1,3,2,0,3,1,2],[1,2,3,0,1,3,2,0,1,2,3,0],[2,0,3,1,2,0,1,3,2,0,3,1]],story:'南瓜仔循着香味来到夜市。四种料理叠在一起，选对新客，传菜小斗就能一直忙下去。'},
 {title:'整锅开席',subtitle:'数字大餐需要多口，吃完才整块落下',rows:26,colors:3,pattern:'patch',seed:121,big:true,lanes:[[0,1,2,0,1,2,0,1,2,0,1,2],[1,2,0,1,2,0,1,2,0,1,2,0],[2,0,1,2,0,1,2,0,1,2,0,1,2]],story:'货架最深处竟是整锅料理！河狸用回收的空碗修好下层滑轨，大胃王终于派上用场。'}
];
// Authored layouts and queue rhythms for the twenty additional stages.
const EXPANSION=[
 ['回收轨道',24,3,'ribbons',3,[], '空碗轨道修好了。河狸把料理分成长条，先吃哪条会决定接下来露出的口味。'],
 ['错层菜筐',25,3,'stairs',2,[], '旧菜筐被叠成错层货架，叶耳灵每吃掉一格，就让隔壁的料理提前落下来。'],
 ['双锅早餐',24,3,'windows',3,[[1,3,0,30],[6,8,2,30]], '回收的空碗换来了两口新锅。整锅下方的料理吃完后，河狸才推得动上层货架。'],
 ['四味接班',26,4,'ribbons',3,[], '南瓜仔带来第四种口味，旧货架的空位要留给新客，不能把长桌全排成一种颜色。'],
 ['莓角野餐',26,3,'islands',3,[[4,5,1,40]], '莓角怪搬来野餐拼盘，一整块莓糕压在中间；吃掉两侧小菜也会改变后面的出菜顺序。'],
 ['叶耳夹层',28,4,'sandwich',3,[], '叶耳灵把菜叶夹进莓糕之间。之前整齐的货架现在有夹层，要看看哪一列先露出下一味。'],
 ['窄口传菜',28,4,'channels',4,[[1,5,0,30],[7,11,3,30]], '河狸在旧货架下留了窄口。两侧菜列先动，中间的大餐会支撑住上层拼盘。'],
 ['三锅宴客',28,3,'braid',3,[[0,4,0,40],[4,9,1,40],[8,15,2,40]], '三口锅从不同楼层送到长桌。厨房仍用同一套滑轨，怪客得轮流把各段堵点吃开。'],
 ['南瓜斜坡',30,4,'stairs',3,[[3,7,3,40]], '南瓜仔把整盅料理放到斜坡中央。空碗推着旧升降机转起来，上层料理沿错层位置逐步落下。'],
 ['左右两席',30,4,'split',3,[], '两侧货架轮换口味。只招待左边喜欢的怪客，会让右边一直占着整排料理。'],
 ['夹心大锅',28,4,'sandwich',2,[[0,3,1,40],[4,8,2,40],[8,14,0,40]], '之前的夹层货架里藏着整锅料理。下方一小口先吃完，上方几十口才露出，空位要提前准备。'],
 ['河狸试轨',32,4,'channels',3,[[2,5,0,40],[6,12,3,40]], '河狸把回收轨道接到二楼菜架。左右小菜落得快，中间整锅落得慢，餐桌要同时接住两种节奏。'],
 ['交错夜市',32,4,'braid',3,[], '夜市摊主把四味料理编成交错条带。旧口味还没吃完，新口味已经从旁边探出来。'],
 ['四色拼岛',32,4,'islands',4,[[1,4,2,40],[7,10,1,40],[4,19,3,40]], '拼盘被切成一座座小岛，藏在不同深度的整锅会逐个出现。之前腾出的餐位要接住后来的客人。'],
 ['叶卷回廊',34,4,'windows',4,[[0,6,2,40],[4,14,0,40],[8,23,1,40]], '叶耳灵绕着货架吃出回廊。两侧空了，中间仍会被整锅撑住；先看支撑，再看队首。'],
 ['双层开锅',32,4,'split',3,[[1,3,0,40],[6,3,3,40],[1,16,1,40],[6,16,2,40]], '两层货架各有一对整锅。第一对吃完后，原来的空碗滑轨把第二对送下来，旧问题换了新口味。'],
 ['长条晚宴',34,4,'ribbons',4,[[2,5,1,50],[7,13,2,50]], '晚宴的菜条变长了，大胃王能够长时间守住一种口味，但其他餐位仍要留给后补队列。'],
 ['五锅轮席',34,4,'stairs',3,[[0,3,0,40],[4,8,1,40],[8,13,2,40],[1,20,3,40],[6,28,0,40]], '第五口锅用了最初试吃的海盐冻。泡泡兽又回来了，之前的口味会在更深处再次出现。'],
 ['箱庭总动员',36,4,'windows',3,[[0,4,1,50],[4,11,2,50],[8,18,3,50],[3,28,0,50]], '一楼长桌接住各层送来的拼盘；旧升降机和回收轨道一起运行，四种怪客都要参与这次开席。'],
 ['嘿嘿满汉席',36,4,'braid',4,[[0,2,0,60],[4,7,1,60],[8,12,2,60],[1,19,3,60],[6,27,0,60],[3,33,2,60]], '最后一席把旧菜架、整锅和回收轨道串在一起。吃空货架后，河狸发现最深处还有一张尚未填写的菜单。']
];
function makeLanes(colors,length,offset){
 const rhythms=[[0,1,2,3],[1,2,0,3],[2,0,3,1]];
 return rhythms.map((rhythm,lane)=>Array.from({length},(_,i)=>{
  const cycle=rhythm.filter(c=>c<colors);return cycle[(i+offset+lane)%cycle.length];
 }));
}
const QUEUE_ROTATIONS={'夹心大锅':[0,0,1],'河狸试轨':[0,1,0],'叶卷回廊':[0,0,1],'双层开锅':[0,0,3],'长条晚宴':[1,2,1]};
const FINAL_LANES=[
 [3,2,1,0,1,3,0,2,2,0,1,3,1,3,0,2,1,0,3,2,1,0,2,3,3,0],
 [1,2,3,0,3,1,2,0,2,3,0,1,1,2,0,3,0,2,1,3,0,3,2,1,0,1],
 [3,2,1,0,2,3,1,0,1,0,3,2,1,3,2,0,1,2,0,3,2,3,1,0,2,0]
];
EXPANSION.forEach((entry,i)=>{
 const [title,rows,colors,pattern,chunk,pots,story]=entry;
 let lanes=makeLanes(colors,18+Math.floor(i/4)*2,i%colors);
 if(QUEUE_ROTATIONS[title])lanes=lanes.map((q,c)=>{const shift=QUEUE_ROTATIONS[title][c];return q.slice(shift).concat(q.slice(0,shift));});
 if(title==='嘿嘿满汉席')lanes=FINAL_LANES.map(q=>q.slice());
 LEVELS.push({title,subtitle:pots.length?'先看支撑位置，再为整锅预留口味':'预看下一位口味，留出换客餐位',rows,colors,pattern,chunk,
  palette:Array.from({length:colors},(_,c)=>(c+i)%colors),
  giants:pots.map(([x,y,color,hp])=>({x,y,color,hp})),
  lanes,story,
  chapter:i<4?'滑轨接班':i<8?'怪客聚餐':i<12?'整锅压席':i<16?'交错夜市':'箱庭大宴'});
});
function makeFoods(level){
 let id=0;const foods=[];
 const giants=level.giants||(level.big?[{x:1,y:4,color:0},{x:6,y:9,color:1},{x:3,y:15,color:2}]:[]);
 for(let y=0;y<level.rows;y++)for(let x=0;x<10;x++){
  if(giants.some(g=>x>=g.x&&x<g.x+2&&y>=g.y&&y<g.y+2))continue;
  let color;
  if(level.pattern==='layers')color=y<4?0:y<9?1:y<15?2:Math.floor((y-15)/3)%3;
  else if(level.pattern==='diagonal')color=(Math.floor((x+y)/3)+Math.floor(y/7))%level.colors;
  else if(level.pattern==='patch')color=(Math.floor(x/3)+Math.floor(y/3)+(y%6===0?1:0))%level.colors;
  else if(level.pattern==='wave')color=(Math.floor(y/3)+(x>4?1:0)+(y%5===3?Math.floor(x/2):0))%2;
  else {
   const n=level.colors,k=level.chunk||3;
   if(level.pattern==='ribbons')color=(Math.floor(x/k)+Math.floor(y/(k+2)))%n;
   else if(level.pattern==='stairs')color=Math.floor((y+Math.floor(x/2))/k)%n;
   else if(level.pattern==='windows')color=(x%5===0?Math.floor(y/k)+1:Math.floor(x/2)+Math.floor(y/(k+1)))%n;
   else if(level.pattern==='islands')color=(Math.floor(x/2)+2*Math.floor(y/k)+(y%k===0?1:0))%n;
   else if(level.pattern==='sandwich')color=(Math.floor(y/k)+(y%k===k-1?Math.floor(x/3):0))%n;
   else if(level.pattern==='channels')color=(x<2||x>7?Math.floor(y/2):Math.floor(y/(k+2))+Math.floor(x/3))%n;
   else if(level.pattern==='split')color=(Math.floor(y/k)+(x<5?0:2)+Math.floor(x/3))%n;
   else if(level.pattern==='braid')color=(Math.floor((y+(x%4)*2)/k)+Math.floor(x/4))%n;
   else throw new Error(`Unknown pattern: ${level.pattern}`);
   if(level.palette)color=level.palette[color];
  }
  foods.push({id:id++,x,y,w:1,h:1,hp:1,color});
 }
 for(const g of giants)foods.push({id:id++,w:2,h:2,hp:40,...g});
 return foods;
}
const api={TYPES,LEVELS,makeFoods}; if(typeof module!=='undefined')module.exports=api; else Object.assign(root,api);
})(typeof globalThis!=='undefined'?globalThis:this);
