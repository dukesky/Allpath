# AllPath Roadmap — 2026 H2

**日期**: 2026-08-09
**当前版本**: v0.0.21(release notes)/ VERSION 文件仍为 0.0.20,需同步

---

## 一、当前进度快照

### 已完成(对照 allpath_design_doc.docx)

| 设计文档条目 | 状态 |
|---|---|
| Round Table 模式 | ✅ 已上线(roundtable) |
| One-to-One Adviser 模式 | ✅ 已上线(one_to_one) |
| Summarizer 角色(手动触发) | ✅ 已上线 |
| Provider 抽象(OpenRouter + 自定义 OpenAI 兼容端点) | ✅ 已上线 |
| Character/人设系统 + 40+ 预设角色组 | ✅ 已上线(西游记、历史人物、龙珠、Life Coaches 等) |
| SSE 流式输出 | ✅ 已上线 |
| 模型目录(自动更新 CI) | ✅ 已上线 |
| 分享(Firestore 快照 + /share/[id] 只读页) | ✅ 已上线 |
| 游客试用系统(邀请码 + $2 预算 + 加密个人 key) | ✅ 已上线 |
| Chat UX 三步式新建流程 / ModeSwitcher / 空状态 | ✅ 2026-06 完成 |
| 头像体系(全预设覆盖 + 默认头像 fallback) | ✅ v0.0.21 |
| 移动端布局(MobileNav) | ✅ 基本可用 |

### 未完成(设计文档 + 脑暴中已规划)

| 条目 | 来源 | 说明 |
|---|---|---|
| **用户注册/登录** | 设计文档 Phase 4 | 完全没有,当前只有 cookie 游客身份 |
| **会话持久化** | 设计文档 9.6 | Session 在内存里,Cloud Run 重启/缩容即丢失;session 列表只存 localStorage |
| Casual Chat 模式(随机延迟) | 设计文档 2.2 | 未实现 |
| 分享页 "Fork this setup" 按钮 | 2026-04 脑暴(方案 C) | 分享只读页已有,缺一键复制配置开新会话 |
| 成本预览 / 预算护栏(试用之外) | 设计文档 9.4 | 只有 trial 预算,无通用成本显示 |
| 导出 Markdown/PDF | 设计文档 Phase 3 | 未实现 |
| 游戏化玩法(狼人杀等) | 新目标 | 未实现,需要编排层扩展 |

---

## 二、关键技术判断

1. **最大的可用性缺口是"会话会丢"**,不是登录本身。Cloud Run 实例随时可能被回收,`globalThis.__allpathSessions` 里的对话直接消失。登录 + Firestore 持久化要一起做,登录才有意义(登录后能看到自己的历史会话)。
2. **技术选型:留在 GCP,用 Firebase Authentication**。已有 Firestore、Cloud Run、Secret Manager,Firebase Auth 是同一生态(免费额度大,支持 Google 一键登录 + 邮箱注册),集成成本最低。不建议现在迁移 Vercel/Supabase。
3. **游戏(狼人杀)本质是编排规则扩展**:隐藏身份 = 每个参与者可见信息不同(one_to_one 已证明可行);夜晚私聊 = 私有消息通道;回合规则 = orchestrator 的回合脚本化。架构上是现有 `buildPromptForParticipant` 可见性逻辑的推广,不需要重写。

---

## 三、分阶段计划

### Phase 1 — 可正常使用的版本(用户账号 + 会话不丢)⭐ 最优先

目标:一个新用户可以注册、聊天、关掉浏览器第二天回来继续看到自己的会话。

1. **同步远程**:`git pull`(远程领先的 60 个 commit 全是模型目录自动更新)。
2. **Firebase Auth 接入**
   - 前端:Firebase JS SDK,Google 登录 + 邮箱注册两种方式
   - 后端:API 路由验证 Firebase ID token(`firebase-admin`),得到 `uid`
   - 未登录用户保留现有游客试用路径(邀请码不受影响)
3. **会话持久化到 Firestore**
   - 新集合 `users/{uid}/sessions/{sessionId}`:存 SessionConfig + messages(round 结束时写入,而非每个 token)
   - 内存 store 保留作为热缓存;服务重启后从 Firestore 恢复会话
   - session 列表从 localStorage 迁到 Firestore(登录用户),游客保持 localStorage
4. **试用预算绑定账号**:登录用户的 budget/个人 key 挂在 uid 下,不再仅靠 cookie。

验收:重启 Cloud Run 服务后,登录用户刷新页面能看到完整历史会话并继续对话。

### Phase 2 — 增长闭环(分享转化)

1. 分享页加 **"用这套阵容开始你的对话"** 按钮(脑暴方案 C):读 share 快照里的 participants 配置,一键进入 setup 第三步
2. 落地页放 1–2 个精选对话 replay(展示多 agent 争论的"wow moment")
3. 会话导出 Markdown

### Phase 3 — 游戏化(狼人杀先行)

1. 编排层扩展:`visibilityRule`(每参与者可见消息过滤器)、回合脚本(夜晚/白天阶段)、游戏状态(存活、身份)
2. 第一个游戏建议 **谁是卧底** 或 **狼人杀 lite**(纯对话游戏,无棋盘状态,改动最小;大富翁需要棋盘/资产状态机,放后面)
3. 用户可以当玩家或当法官,其余角色由不同模型扮演

### Phase 4 — 打磨与拉新

- Casual Chat 模式(随机延迟,设计文档 2.2)
- 成本预览/每轮花费显示
- 更多预设角色组(脑暴清单:创业顾问团、VC 评审、面试教练、火影/海贼王等)
- 邀请码批量发放 + 简单数据看板(留存、round 数)

---

## 四、备忘

- `VERSION` 文件(0.0.20)与最新 release note(0.0.21)不一致,下次发版时修正
- `.env.local` 未提交(正确),部署走 `deploy.sh` + Cloud Secret Manager
- 模型目录自动更新 CI 在远程持续运行,本地定期 `git pull` 即可
