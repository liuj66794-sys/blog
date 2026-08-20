---
title: SPEC-0001-mobile-rendering-and-standards
createTime: 2026/08/21 00:33:53
permalink: /knowledge/english/spec-0001-mobile-rendering-and-standards/
---
# SPEC-0001：移动端渲染修复 + 页面开发规范固化

> 状态：已完成实施 · 标签：ready-for-agent
> 来源：语法速查页 375px 纯文本 bug → grilling 会话 → STANDARDS.md

---

## Problem Statement

在手机端（375px 宽度）打开"语法速查"页面时，页面只显示纯文本——没有卡片、没有色彩、没有表格样式，所有 UI 组件退化为无格式文本流。用户（专升本考生）的主要阅读场景恰恰是手机端长时间阅读，这直接破坏了学习体验。

更深层的问题：这次 bug 暴露了项目缺乏成文的页面开发规范，AI agent 每次创建/修改页面时没有可遵循的硬约束，同类问题会反复出现。

## Solution

1. **修复 CSS 响应式规则**：将表格卡片化从"仅针对特定页面的条件选择器"改为"所有表格在 ≤768px 统一折叠"，确保任何页面（无论包含什么组件）在窄屏下都能正确渲染。
2. **建立 `teaching/STANDARDS.md`**：将全部隐含规范固化为两层文档——硬规则（MUST，违反 = bug）和设计约定（SHOULD，违反 = 不一致），附带页面骨架模板和 agent 截图验证流程。

## User Stories

1. As a 专升本考生（移动端读者）, I want 语法速查页在 375px 手机上显示完整的卡片式 UI, so that 我能在手机上舒适地复习语法知识点。
2. As a 专升本考生, I want 表格在窄屏下自动变成一张张独立卡片, so that 我不需要左右滑动就能读完每一行内容。
3. As a 专升本考生, I want 每张卡片的第一列（词/结构名）加粗显示, so that 快速扫视时能立刻定位要查的词条。
4. As a 专升本考生, I want 例句卡片、易错警告卡片在手机上保持色彩区分, so that 我能一眼分辨“规则”和“易错点”。
5. As a 专升本考生, I want 页脚链接足够大（≥44px）, so that 我的手指能轻松点击“返回学习计划”。
6. As a 开发者（自己）, I want 有一份 STANDARDS.md 写明所有页面开发硬规则, so that 每次让 AI agent 做新页面时不用重复口头交代。
7. As a 开发者, I want 新页面有可直接复制的 HTML 骨架模板, so that agent 生成的页面天然合规，不需要事后逐条检查。
8. As a 开发者, I want agent 每次修改页面后自动截图 375px + 1280px 两个视口, so that 渲染问题在提交前就被发现，而不是等到手机上看才发现。
9. As a 开发者, I want 响应式规则用通用选择器编写, so that 未来新增任何页面都自动获得移动端适配，无需逐页定制。
10. As a 开发者, I want 文档明确标注 lessons/0001 的内联样式是历史债务, so that 修改 style.css 时不会忘记同步，也不会误以为外部 CSS 是唯一样式来源。
11. As a 开发者, I want 色彩语义、字体栈、间距系统写进文档, so that 新页面的视觉设计与现有页面保持一致。
12. As a 开发者, I want 验证流程写成 agent 硬规则而非"建议", so that 截图验证不会因为 agent 遗忘或省略而跳过。

## Implementation Decisions

1. **统一卡片化断点为 768px**：所有 `table` 在 ≤768px 时折叠为卡片（原先语法页表格只在 ≤480px 才处理，且 768px 规则被 `body:has(.quiz)` 条件排除）。
2. **禁止条件选择器限定响应式作用域**：`body:has(...)` 仅保留用于生成特定页面的字段标签（`::before` 内容），不再用于控制布局行为。布局规则一律直接作用于元素本身。
3. **`:has()` 降级安全**：表头行隐藏同时依赖 `th { display: none }` 和 `tr:has(th) { display: none }`，即使浏览器不支持 `:has()`，表头行也因内容为空而自然坍缩。
4. **480px 断点职责收窄**：只负责间距收紧（body padding、card/tr/td 内边距），不再重复定义卡片化逻辑。
5. **规范文档分 MUST / SHOULD 两层**：硬规则（结构、响应式、触控、验证流程）与设计约定（字体、色彩、字号、间距）分开，to-spec 时验收标准天然分两级。
6. **验证流程绑定 agent 动作定义**：写入 STANDARDS.md §1.4，"完成页面修改"这个动作包含截图验证，不是可选步骤。
7. **STANDARDS.md 存放于 `teaching/` 目录**：与页面同级，agent 上下文可直接引用；不放项目根目录（根目录是仓库级，teaching 是应用级）。
8. **lessons/0001 内联样式保留但标注为债务**：本次已同步更新其 §13/§14 与 style.css 一致；新页面禁止内联样式。

## Testing Decisions

1. **唯一测试接缝 = 浏览器渲染输出**：这是纯静态 HTML 项目，没有构建管道、没有 API、没有运行时逻辑。所有验证发生在"页面在真实浏览器中的渲染结果"层。
2. **好的测试 = 双视口截图目视检查**：375px（iPhone SE 级）+ 1280px（桌面），检查项：CSS 是否加载（非纯文本）、表格是否卡片化（无横向溢出）、元素是否可读无重叠、可点击区域是否 ≥44px。
3. **不引入测试框架**：项目规模和性质（教学静态页面）决定了 Playwright/Puppeteer 自动化测试是过度工程。agent 截图 + 人工 3 秒目视确认是成本最优解。
4. **回归基准**：`0001-error-analysis-and-plan.html`（含 quiz + schedule 表）和 `grammar-points.html`（纯表格 + 卡片）作为两个基准页面，任何 CSS 修改后两者都必须通过双视口检查。

## Out of Scope

- 将 lessons/0001 的内联样式迁移为外部 CSS 引用（标注为债务，不本次处理）
- 引入 CI/CD 或自动化视觉回归测试
- 暗色模式支持
- 页面内容变更（语法知识点本身不修改）
- 多语言/国际化

## Further Notes

- 本次修复已实施完毕：`style.css` §13/§14 重写 + lessons 页面内联样式同步 + `STANDARDS.md` 创建。
- STANDARDS.md 是活文档：后续每发现新的"agent 会犯的错"，应追加为 MUST 条目。
- 下次创建新课程页面（如 `lessons/0002-*.html`）时，是验证 STANDARDS.md 实际效果的最佳时机——agent 应自动使用骨架模板 + 截图验证，无需人工提醒。
