# -*- coding: utf-8 -*-
s = open(r"C:/Users/YANQU/Doubao/chats/2026-09-01/new-chat/picture-book/小星星的晚安毯.html", encoding="utf-8").read()
checks = {
    "pages(应9)": s.count('class="page'),
    "images(应8)": s.count("data:image/jpeg;base64"),
    "标题": "小星星的晚安毯" in s,
    "页2文字": "月亮妈妈，我睡不着" in s,
    "页3文字": "一起去数星星吧" in s,
    "页4文字": "一、二、三" in s,
    "页5文字": "棉花糖" in s,
    "页6文字": "星星雨" in s,
    "页7文字": "一直陪着你" in s,
    "页8文字": "甜甜地睡着了" in s,
    "封底": "晚安，小月亮" in s,
    "翻页JS": "getElementById('prev')" in s,
}
for k, v in checks.items():
    print(k, "->", v)
