# -*- coding: utf-8 -*-
"""生成绘本《小星星的晚安毯》自包含 HTML 文件"""
import base64
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SMALL = os.path.join(BASE, "small")
OUT = os.path.join(BASE, "小星星的晚安毯.html")

def b64(name):
    with open(os.path.join(SMALL, name), "rb") as f:
        return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()

img = {i: b64("%02d.jpg" % i) for i in range(1, 9)}

# 页面结构：封面(图1) + 故事7页(图2-8) + 封底
pages = [
    {"img": img[1], "kind": "cover",
     "title": "小星星的晚安毯",
     "sub": "一个关于星星和晚安的小故事 · 送给3岁的小月亮"},
    {"img": img[2], "kind": "story",
     "text": "夜深了，小月亮躺在床上，翻来翻去睡不着。\n“月亮妈妈，我睡不着……”"},
    {"img": img[3], "kind": "story",
     "text": "忽然，一颗亮晶晶的小星星，从窗户悄悄溜了进来。\n“嘿，小月亮，我们一起去数星星吧！”"},
    {"img": img[4], "kind": "story",
     "text": "她们坐在窗台上，一起数：\n“一、二、三……”天上的星星好多好多，数也数不完。"},
    {"img": img[5], "kind": "story",
     "text": "数累了，她们躺进软软的云朵里，\n像躺在棉花糖上，轻轻、软软的。"},
    {"img": img[6], "kind": "story",
     "text": "她们手拉手，在草地上转圈圈。\n小星星洒下亮晶晶的光点，像下了一场星星雨。"},
    {"img": img[7], "kind": "story",
     "text": "天快亮了，小星星要回家啦。她送给小月亮一条会发光的星星布：\n“盖着它，就像我一直陪着你。”"},
    {"img": img[8], "kind": "story",
     "text": "小月亮盖着温暖的星星布，甜甜地睡着了。\n窗外，小星星和月亮妈妈正微笑着守着她。"},
    {"img": None, "kind": "end",
     "title": "晚安",
     "text": "晚安，小月亮。\n晚安，小星星。\n愿每个宝贝，都做个亮晶晶的梦 ★"},
]

def page_html(p, i):
    if p["kind"] == "cover":
        inner = (
            '<div class="cover-img" style="background-image:url(%s)"></div>'
            '<div class="cover-badge">⭐ 亲子共读 · 睡前绘本</div>'
            '<h1 class="cover-title">%s</h1>'
            '<p class="cover-sub">%s</p>'
        ) % (p["img"], p["title"], p["sub"])
    elif p["kind"] == "end":
        inner = (
            '<div class="end-star">🌟</div>'
            '<h1 class="end-title">%s</h1>'
            '<p class="end-text">%s</p>'
            '<div class="end-moon">🌙</div>'
        ) % (p["title"], p["text"].replace("\n", "<br>"))
    else:
        inner = (
            '<div class="story-img"><img src="%s" alt="插画"></div>'
            '<div class="story-text">%s</div>'
        ) % (p["img"], p["text"].replace("\n", "<br>"))
    return '<section class="page %s">%s</section>' % (p["kind"], inner)

body = "\n".join(page_html(p, i) for i, p in enumerate(pages))

TEMPLATE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>小星星的晚安毯 · 睡前绘本</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { height:100%; }
  body {
    font-family:"YouYuan","幼圆","Microsoft YaHei","PingFang SC",sans-serif;
    background:
      radial-gradient(circle at 20% 15%, rgba(255,235,170,.25) 0%, transparent 35%),
      radial-gradient(circle at 80% 85%, rgba(180,160,255,.22) 0%, transparent 35%),
      linear-gradient(160deg,#171236 0%, #241a4e 45%, #37285f 100%);
    display:flex; align-items:center; justify-content:center;
    min-height:100vh; padding:16px;
    overflow:hidden; color:#fff;
  }
  /* 漂浮小星星背景 */
  .star-bg { position:fixed; inset:0; pointer-events:none; overflow:hidden; z-index:0; }
  .star-bg span { position:absolute; color:#ffe9a8; opacity:.55; animation:twinkle 3s infinite ease-in-out; }
  @keyframes twinkle { 0%,100%{opacity:.2; transform:scale(.8);} 50%{opacity:.9; transform:scale(1.15);} }

  .book { position:relative; z-index:2; width:min(92vw, 500px); }
  .pages { position:relative; }
  .page {
    display:none; flex-direction:column; align-items:center;
    background:rgba(255,255,255,.97);
    border-radius:28px; padding:20px 20px 26px;
    box-shadow:0 24px 60px rgba(0,0,0,.45), 0 0 0 6px rgba(255,255,255,.12);
    min-height:78vh; justify-content:center;
  }
  .page.active { display:flex; animation:fadein .45s ease; }
  @keyframes fadein { from{opacity:0; transform:translateY(14px);} to{opacity:1; transform:none;} }

  /* 故事页 */
  .story-img { width:100%; border-radius:20px; overflow:hidden; box-shadow:0 10px 26px rgba(80,50,160,.25); }
  .story-img img { display:block; width:100%; height:auto; }
  .story-text {
    margin-top:18px; color:#4a3f78; font-size:23px; line-height:1.9;
    letter-spacing:.5px; text-align:center; font-weight:600;
    text-shadow:0 1px 0 rgba(255,255,255,.8);
  }

  /* 封面页 */
  .cover-img { width:100%; border-radius:20px; overflow:hidden; box-shadow:0 10px 26px rgba(80,50,160,.25); }
  .cover-img { height:46vh; background-size:cover; background-position:center; }
  .cover-badge { margin-top:14px; font-size:14px; color:#8a7bb8; letter-spacing:2px; }
  .cover-title {
    margin-top:12px; font-size:40px; color:#6a4fd0;
    text-shadow:0 2px 0 rgba(255,255,255,.6); letter-spacing:4px;
  }
  .cover-sub { margin-top:10px; font-size:15px; color:#7a6aa8; line-height:1.7; text-align:center; }

  /* 封底页 */
  .end-star { font-size:44px; }
  .end-title { font-size:40px; color:#6a4fd0; margin-top:8px; letter-spacing:8px; }
  .end-text { margin-top:16px; font-size:23px; color:#4a3f78; line-height:2; text-align:center; font-weight:600; }
  .end-moon { font-size:36px; margin-top:14px; }

  /* 翻页控制 */
  .nav-btn {
    position:fixed; top:50%; transform:translateY(-50%); z-index:5;
    width:52px; height:52px; border-radius:50%; border:none; cursor:pointer;
    background:rgba(255,255,255,.16); color:#ffe9a8; font-size:26px;
    backdrop-filter:blur(4px); box-shadow:0 6px 18px rgba(0,0,0,.3);
    transition:background .2s;
  }
  .nav-btn:hover { background:rgba(255,255,255,.32); }
  .nav-btn.prev { left:16px; }
  .nav-btn.next { right:16px; }
  .pager {
    position:fixed; bottom:18px; left:50%; transform:translateX(-50%); z-index:5;
    background:rgba(0,0,0,.35); color:#fff; font-size:15px; letter-spacing:1px;
    padding:8px 20px; border-radius:30px; backdrop-filter:blur(4px);
  }
  @media (max-width:560px){
    .story-text{ font-size:20px; } .cover-title{ font-size:32px; }
    .nav-btn{ width:44px; height:44px; font-size:20px; }
    .page{ padding:14px 14px 20px; }
  }
</style>
</head>
<body>
<div class="star-bg" id="stars"></div>
<div class="book">
  <div class="pages" id="pages">
__BODY__
  </div>
</div>
<button class="nav-btn prev" id="prev" aria-label="上一页">‹</button>
<button class="nav-btn next" id="next" aria-label="下一页">›</button>
<div class="pager" id="pager"></div>
<script>
  var stars = document.getElementById('stars');
  var glyphs = ['✦','✧','★','·','✩'];
  for (var i=0;i<26;i++){
    var s = document.createElement('span');
    s.textContent = glyphs[Math.floor(Math.random()*glyphs.length)];
    s.style.left = Math.random()*100 + '%';
    s.style.top = Math.random()*100 + '%';
    s.style.fontSize = (8+Math.random()*14) + 'px';
    s.style.animationDelay = (Math.random()*3) + 's';
    stars.appendChild(s);
  }
  var pages = document.querySelectorAll('.page');
  var idx = 0, total = pages.length;
  function show(i){
    idx = (i + total) % total;
    pages.forEach(function(p,k){ p.classList.toggle('active', k===idx); });
    document.getElementById('pager').textContent = (idx+1) + ' / ' + total;
  }
  document.getElementById('prev').onclick = function(){ show(idx-1); };
  document.getElementById('next').onclick = function(){ show(idx+1); };
  document.addEventListener('keydown', function(e){
    if(e.key==='ArrowLeft') show(idx-1);
    if(e.key==='ArrowRight') show(idx+1);
  });
  show(0);
</script>
</body>
</html>
""".replace("__BODY__", body)

html = TEMPLATE.replace("__BODY__", body)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print("OK ->", OUT)
print("size:", os.path.getsize(OUT), "bytes")
