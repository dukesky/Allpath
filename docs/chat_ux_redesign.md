# Chat UX Redesign — Design Spec
**日期**: 2026-06-15  
**状态**: 待确认

---

## 问题描述

| 位置 | 现状 | 问题 |
|------|------|------|
| 左侧面板 | Trial状态 + Quick Start + Session Rules + 参与者配置全部堆叠 | 首次用户不知道看哪，信息层级混乱 |
| 右侧聊天区 | Session 未创建或无消息时一片空白 | 缺乏引导，用户不知道下一步 |
| 模式切换 | 右上角一个小 `<select>` 下拉 | 核心功能被隐藏，用户几乎感知不到 |

---

## 改动范围

三个独立改动，各自影响不同组件，可以分步实现：

1. **SetupPanel 三步式流程**（重构 `SetupPanel.tsx`）
2. **ModeSwitcher 分段控件**（新建 `ModeSwitcher.tsx`，修改 `ChatInput.tsx`、`ChatHeader.tsx`）
3. **Session 内空状态**（修改 `MessageFeed.tsx`）

---

## 改动一：SetupPanel 三步式新建流程

### 目标体验

用户打开侧边栏，看到清晰的三步引导，而不是一大堆配置项。

### 新增状态（在 `page.tsx` 中）

```ts
const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1);
const [selectedStory, setSelectedStory] = useState<string>("");
// quickStartModel 已有，复用作"全局模型"
// 移除 setupSections 状态（不再需要分 section 折叠）
```

### 视觉结构

```
┌─────────────────────────────────────────┐
│  [① 选角色组]  [② 选模型]  [③ 开始]    │  ← 步骤指示器（三个圆点 + 连线）
├─────────────────────────────────────────┤
│  Step 1 — 选剧本 / 角色组               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ [头像组] │ │ [头像组] │ │ [头像组] ││  ← 故事卡片，点选高亮
│  │ 西游记   │ │ 历史人物 │ │ 龙珠     ││
│  │ 5人 · … │ │ 5人 · … │ │ 4人 · … ││
│  └──────────┘ └──────────┘ └──────────┘│
│                         [下一步 →]      │
├─────────────────────────────────────────┤
│  Step 2 — 选模型                        │
│  [GPT-5 mini] [Claude Sonnet] [Gemini…] │  ← 滚动芯片，选一个应用到所有角色
│                                         │
│  ▼ 高级设置（折叠）                     │
│    ├ 逐角色模型配置                     │
│    ├ Session Rules / 提示词预设         │
│    ├ API Key 模式                       │
│    └ 启用 Summarizer                   │
│                         [下一步 →]      │
├─────────────────────────────────────────┤
│  Step 3 — 确认 & 开始                  │
│  角色摘要（小头像 + 名字 + 模型）        │
│  [← 返回修改]          [开始对话 ▶]    │
└─────────────────────────────────────────┘
```

### 状态流

```
setupStep=1                  setupStep=2                setupStep=3
[选故事] → 点"下一步"  →   [选模型] → 点"下一步"  →  [确认] → 点"开始对话"
                                                              ↓
                                                     createSession() / quickStartStorySession()
```

### 与现有代码的对接

- **Step 1** 对应现有 Quick Start 故事卡片（`quickStartStories`），选中后 `setSelectedStory(story)`
- **Step 2** 对应现有 `quickStartModel` + `modelPickerCatalog`；展开"高级设置"后露出现有 Session Rules / 参与者配置（复用现有 UI，只折叠）
- **Step 3** 点击"开始对话"调用现有 `quickStartStorySession(selectedStory)`（或 `createSession()`）
- **Trial 状态块**：移到步骤外，放在面板顶部（始终可见，不属于任何步骤）
- **移除** `setupSections` 状态（`quickStart`/`sessionRules`/`participants`/`summarizer` 四个 bool），改为 `setupStep` + `isAdvancedOpen: boolean`

### SetupPanel 新 Props 变化

新增：
```ts
setupStep: 1 | 2 | 3;
selectedStory: string;
isAdvancedOpen: boolean;
onSetupStepChange: (step: 1 | 2 | 3) => void;
onSelectedStoryChange: (story: string) => void;
onAdvancedToggle: () => void;
```

移除：
```ts
setupSections: { quickStart, sessionRules, participants, summarizer };
onToggleSection: ...;
```

---

## 改动二：模式切换 — 分段控件（Segmented Control）

### 目标体验

在聊天输入框上方始终可见，用户随时知道当前模式并可一键切换。

### 新组件 `components/ModeSwitcher.tsx`

```tsx
// 视觉草图
┌───────────────────────────────────────────────────────┐
│  [  圆桌  ▌]  [  一对一  ]                            │
│  圆桌：所有角色互相看见彼此的回复                       │
└───────────────────────────────────────────────────────┘

// 或一对一激活时：
┌───────────────────────────────────────────────────────┐
│  [  圆桌  ]  [▌ 一对一  ]                             │
│  一对一：每个角色只看你的消息，不看其他角色的回复         │
└───────────────────────────────────────────────────────┘
```

```tsx
interface ModeSwitcherProps {
  sessionMode: Mode;
  onChangeMode: (mode: Mode) => void;
  disabled?: boolean;  // 无 session 时禁用
}
```

Props 简单，无内部状态。

### 放置位置

- **ChatInput.tsx** 最顶部（`border-t border-slate-200 p-3` div 的最上方），在 starter prompts 之前
- **ChatHeader.tsx** 中移除现有的 `<select>` 模式下拉和 `?` 帮助按钮（`isModeHelpOpen` 状态也随之删除）

### page.tsx 变化

- 删除 `isModeHelpOpen` 状态
- `changeSessionMode` 函数不变，继续传给 `ModeSwitcher` 的 `onChangeMode`
- 新增 `ModeSwitcher` import，传入 `ChatInput`

---

## 改动三：Session 内空状态（有 session 无消息时）

### 目标体验

开启会话后、用户还未发消息时，右侧不再空白，而是展示当前角色组的成员卡片和 starter prompts。

### 视觉结构（替换现有的 `showStarterPrompts` 悬浮块）

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  当前对话阵容                                        │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ [头像] │  │ [头像] │  │ [头像] │  │ [头像] │   │
│  │ 孙悟空 │  │ 猪八戒 │  │ 唐僧   │  │ 沙悟净 │   │
│  │ 大胆挑│  │ 暖心实│  │ 慈悲调│  │ 稳健执│   │
│  │ 战者   │  │ 用主义│  │ 停者   │  │ 行者   │   │
│  └────────┘  └────────┘  └────────┘  └────────┘   │
│                                                     │
│  开始提问                                            │
│  [你们各自是谁？]  [这个团队能帮我做什么？]           │
│  [面对压力时谁最有效？]  [如何解决一个创业冲突？]     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 触发条件

现有 `showStarterPrompts` 逻辑：`!!sessionId && !groupedMessages.some(m => m.sourceRole === "user")`

不改逻辑，只改 UI：把原来的小 starter prompts 块换成上面的全版面空状态。

### MessageFeed.tsx 变化

新增 prop：
```ts
profiles: AgentProfile[];  // 用来查找当前成员的 character/roleTitle
```

在 `showStarterPrompts` 为 `true` 时（session 存在但还没用户消息），渲染成员卡片组 + starter prompt 按钮，而不是原来的小块。

成员卡片内容：
- `activeSessionMembers` 里每个 member 的头像（`avatarUrl`）
- 名字（`label`）
- roleTitle 或 character 的前 30 字（从 `profiles` 里查，或 `activeSessionMembers` 已包含的字段）

> **注**：`activeSessionMembers` 目前只有 `id / label / avatarUrl / model / muted`，不含 `roleTitle / character`。需要在 `SessionMemberMeta` 里加这两个可选字段，并在 `createSessionFromParticipants` 和 `connectStream` 的成员构建处填入。

---

## 实施顺序

建议按以下顺序实现，每个独立可测：

1. **改动三**（最小，只改 MessageFeed + 类型扩展）  
2. **改动二**（新建 ModeSwitcher，ChatInput/ChatHeader 各改几行）  
3. **改动一**（最大，重构 SetupPanel）

---

## 不改变的部分

- 所有 API 路由（`/api/session/*`）
- `lib/` 下所有逻辑（orchestrator、store、providers、trial）
- `page.tsx` 中的所有 state 和 handler 函数（只新增，不删现有的）
- 移动端底部导航（`MobileNav`）
- Session 侧边栏（`SessionSidebar`）
- 分享功能
