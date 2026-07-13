---
name: read
description: 启动本地开发服务器并打开 Paper Reading 页面，方便用户阅读、筛选和标记今天新收集的论文为已读
---

用户每天会用这个命令打开自己的论文阅读页面。目标：把本地环境准备好，让用户可以立刻开始阅读、筛选论文，并且"已读"打勾能真正生效（该功能只在本地服务器下可写入）。

步骤：

1. 用 `preview_start` 工具，参数 `{"name": "static-preview"}`。这会读取本仓库 `.claude/launch.json` 里的配置，在 4173 端口启动（或复用已经在跑的）`scripts/dev_server.py`——这个本地服务器绑定在 127.0.0.1，比普通静态服务器多了几个接口：`POST /api/read`（把两级阅读状态 `read`/`deep_read` 写回）、`POST /api/interest`（把 1-5 星"有意思指数"写回 `paper-reading/data/papers.json`）、`GET /api/pdf?id=`（后端从 arXiv 抓取并缓存论文 PDF，供全文阅读器同源加载，绕开 CORS）、以及 `GET/POST /api/annotations`（读写全文阅读器里的高亮和批注，存到 `paper-reading/data/annotations.json`）。如果启动时发现端口已经被一个正在运行的 `scripts/dev_server.py` 占用（不是别的程序），说明服务器已经在跑了，直接复用即可，不用管报错。

2. 用 `navigate` 工具，把上一步返回的 `tabId` 导航到 `http://localhost:4173/paper-reading/`。

3. 用一条简洁的中文消息告诉用户页面已经打开，可以在 Browser 窗格里：
   - 用顶部筛选器按年份/来源/主题/已读状态筛选，或者搜索标题和关键词
   - 点开每篇论文的"展开"看完整简报
   - 每篇论文右上角有两级阅读标记：点"标记简报已读"记录只读了 AI 简报，点"标记精读原文"记录真正读了论文（精读会自动带上简报已读；取消简报已读也会一并取消精读）
   - 点每篇论文的"阅读原文 →"会在站内打开全文阅读器（PDF.js 渲染），可以选中文字做多色高亮、点高亮加文字批注；打开阅读器会自动把这篇标记为"精读原文"。高亮和批注存到本地 `paper-reading/data/annotations.json`（已 gitignore，不会 push 到公网），PDF 会缓存到本地 `paper-reading/pdfs/`（也 gitignore）。这个阅读器只在本地服务器下可用。
   - 给每篇论文打"有意思指数"（点星星，1-5分，再点一次当前分数可以清除）
   这些操作都会实时写入本地 `paper-reading/data/papers.json`。不需要主动截图，除非用户要求看一下页面长什么样。

4. 提醒用户：这些标记只会改动本地文件，不会自动同步到线上的公开页面。如果用户希望网上的 Paper Reading 页面也显示最新状态，需要之后让你（Claude）在 `/Users/yisong/Desktop/personal/yifei-website` 仓库里执行一次 `git add paper-reading/data/papers.json && git commit -m "Update read status and interest ratings" && git push origin main`（可以直接问用户是否现在要推送，不要没问就自作主张推送）。
