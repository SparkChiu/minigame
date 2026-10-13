# 铸剑大师 · GitHub Pages 发布包

最新无限关卡版，支持手机竖屏、长按入神挥锤、递增贡品、遗物升级，以及库存剑取回锻造。

## 上传与发布

1. 解压发布包。新建一个公开 GitHub 仓库（例如 **swordmaster**），或使用已有仓库。
2. 将解压后的**全部文件及 assets 文件夹**上传到仓库根目录，提交到 **main** 分支。根目录应该直接看到 **index.html**，不能再套一层文件夹；不要只上传 ZIP。
3. 进入仓库 **Settings → Pages**，在 **Build and deployment → Source** 选择 **Deploy from a branch**。
4. 选择 **main** 分支与 **/(root)**，点击 **Save**。如果仓库使用其他分支名，选择实际上传文件的分支。
5. 等待发布完成，从 Pages 设置页打开显示的网站地址。普通项目仓库通常使用 **https://账号名.github.io/仓库名/**。

手机浏览器直接访问发布后的网址即可。后续更新时覆盖对应文件并提交，Pages 会重新发布。

官方说明：[配置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 文件结构

**index.html** 是网站入口；三个 CSS 文件控制桌面、手机和无限模式界面；两个 JS 文件提供规则和交互；**assets/** 包含像素场景与图标。

**.nojekyll** 让 GitHub Pages 直接提供静态文件，不需要构建命令、依赖安装、服务器或 API 密钥。请一并上传该文件。

完整玩法见 [GAME-RULES.md](GAME-RULES.md)，数值模拟与验证限制见 [BALANCE.md](BALANCE.md)。

本包只包含游戏、图片和说明，不包含临时脚本或账号凭据；尚未上传到任何 GitHub 仓库。
