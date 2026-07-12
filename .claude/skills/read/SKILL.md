---
name: read
description: 启动本地开发服务器并打开 Paper Reading 页面，方便用户阅读、筛选和标记今天新收集的论文为已读
---

用户每天会用这个命令打开自己的论文阅读页面。目标：把本地环境准备好，让用户可以立刻开始阅读、筛选论文，并且"已读"打勾能真正生效（该功能只在本地服务器下可写入）。

步骤：

1. 用 `preview_start` 工具，参数 `{"name": "static-preview"}`。这会读取本仓库 `.claude/launch.json` 里的配置，在 4173 端口启动（或复用已经在跑的）`scripts/dev_server.py`——这个本地服务器绑定在 127.0.0.1，比普通静态服务器多了一个 `POST /api/read` 接口，专门用来把"已读"状态写回 `paper-reading/data/papers.json`。

2. 用 `navigate` 工具，把上一步返回的 `tabId` 导航到 `http://localhost:4173/paper-reading/`。

3. 用一条简洁的中文消息告诉用户页面已经打开，可以在 Browser 窗格里：
   - 用顶部筛选器按年份/来源/主题/已读状态筛选，或者搜索标题和关键词
   - 点开每篇论文的"展开"看完整简报
   - 点击每篇论文右上角的"标记已读"来打卡，这个状态会实时写入本地 `paper-reading/data/papers.json`
   不需要主动截图，除非用户要求看一下页面长什么样。

4. 提醒用户：标记已读只会改动本地文件，不会自动同步到线上的公开页面。如果用户希望网上的 Paper Reading 页面也显示最新的已读状态，需要之后让你（Claude）在 `/Users/yisong/Desktop/personal/yifei-website` 仓库里执行一次 `git add paper-reading/data/papers.json && git commit -m "Update read status" && git push origin main`（可以直接问用户是否现在要推送，不要没问就自作主张推送）。
