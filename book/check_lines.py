# -*- coding: utf-8 -*-
s = open(r"C:/Users/YANQU/Doubao/chats/2026-09-01/new-chat/picture-book/小星星的晚安毯.html", encoding="utf-8").read()
lines = s.splitlines()
for i, l in enumerate(lines):
    if 'class="page' in l:
        print(i + 1, "|", l[:100])
