# Focus Console UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将现有专注力训练页面重构为辨识度更高、移动端友好且保持无障碍能力的“专注控制台”界面。

**Architecture:** 保留 `AttentionTrainer.jsx` 中三个训练模块的状态和计分逻辑，只调整页面语义结构与视觉呈现。新增独立样式表集中管理色彩、响应式布局、动效和交互状态，少量运行时数据（进度、高度、反馈状态）继续通过 React 属性或内联 CSS 变量传递。

**Tech Stack:** React 18、CSS、Jest、React Testing Library/JSDOM、Create React App。

---

## 设计方向

界面采用“冷静的认知训练仪表台”概念，而不是游戏大厅。主色为近黑墨绿色，荧光黄绿色只用于当前状态、进度和主要操作；三种训练分别以网格、回环和干扰信号形成不同的视觉标识。首页在桌面端使用三列训练模块，在移动端退化为单列，页面顶部展示系统状态、训练轮次和建议训练时长。训练页保留足够留白，让注意力集中在当前数字、字母或颜色词上。

交互上保留现有按钮文案、键盘快捷键和 `aria-label`，补充清晰的 `focus-visible`、`aria-live` 与减少动态效果支持。所有装饰图形均不承担信息表达，结果、错误和完成状态继续使用文字说明。字体使用偏工程感的等宽标题与清晰的中文正文组合；不新增图片或第三方组件，不依赖远端服务才能完成核心显示。

## Task 1: 锁定首页控制台语义

**Files:**
- Modify: `src/AttentionTrainer.test.js`
- Modify: `src/AttentionTrainer.jsx`

**Step 1: Write the failing test**

新增测试，确认首页包含“专注控制台”“系统就绪”和三种训练的时长标签，同时保留三个训练入口的无障碍名称。

**Step 2: Run test to verify it fails**

Run: `npm test -- --watchAll=false`

Expected: FAIL，因为现有首页尚未包含新的控制台状态和时长信息。

**Step 3: Write minimal implementation**

在游戏元数据中加入编号、时长和能力标签，并重构首页标题、状态区与训练卡片语义结构。

**Step 4: Run test to verify it passes**

Run: `npm test -- --watchAll=false`

Expected: PASS。

## Task 2: 建立专注控制台视觉系统

**Files:**
- Create: `src/AttentionTrainer.css`
- Modify: `src/AttentionTrainer.jsx`

**Step 1: Add the stylesheet**

建立颜色变量、页面网格、控制台外壳、头部指标、训练卡、建议协议和响应式断点。

**Step 2: Replace presentation-only inline styles**

将首页与通用按钮迁移为语义 class；保留依赖实时数值的高度、颜色和变换属性。

**Step 3: Verify the component tests**

Run: `npm test -- --watchAll=false`

Expected: PASS，原有 N-Back 计分与无障碍测试不回归。

## Task 3: 统一三个训练工作区

**Files:**
- Modify: `src/AttentionTrainer.jsx`
- Modify: `src/AttentionTrainer.css`

**Step 1: Refine the training headers**

三个训练页统一使用工作区标题、返回按钮、计时/模式状态和说明区域。

**Step 2: Refine task-specific controls**

优化舒尔特方格、N-Back 字母舞台、Stroop 颜色舞台、进度指示和历史图表，但不修改训练生成与评分逻辑。

**Step 3: Add accessibility polish**

增加 `aria-live`、键盘焦点样式、禁用状态和 `prefers-reduced-motion`。

**Step 4: Verify tests**

Run: `npm test -- --watchAll=false`

Expected: PASS。

## Task 4: 构建与视觉验收

**Files:**
- Verify: `src/AttentionTrainer.jsx`
- Verify: `src/AttentionTrainer.css`

**Step 1: Build production assets**

Run: `npm run build`

Expected: 编译成功，无 ESLint 错误。

**Step 2: Inspect desktop layout**

在本地开发服务中以桌面视口检查首页、训练卡和至少一个训练页。

**Step 3: Inspect mobile layout**

以约 390px 宽度检查单列卡片、按钮触摸区域和训练区不溢出。

**Step 4: Fix any visual defects and rebuild**

若出现溢出、对比度或焦点问题，修复后重新执行测试与构建。

## Task 5: 提交

**Files:**
- Add: `docs/plans/2026-07-31-focus-console-ui-design.md`
- Add: `src/AttentionTrainer.css`
- Modify: `src/AttentionTrainer.jsx`
- Modify: `src/AttentionTrainer.test.js`

**Step 1: Review diff**

Run: `git diff --check` and `git diff --stat`

Expected: 无空白错误，变更仅限 UI、测试和设计计划。

**Step 2: Commit**

Run: `git add docs/plans/2026-07-31-focus-console-ui-design.md src/AttentionTrainer.css src/AttentionTrainer.jsx src/AttentionTrainer.test.js`

Run: `git commit -m "feat: redesign attention trainer as focus console"`

Expected: 创建一个独立 UI 提交，不自动推送。
