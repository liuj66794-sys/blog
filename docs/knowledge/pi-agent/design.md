---
title: design
createTime: 2026/08/14 20:11:42
permalink: /knowledge/pi-agent/design/
---
# Design — PatchPilot 课程页面

本项目的锁定设计系统。每一次页面 redesign 先读本文件再写代码。
不要逐页重新生成——系统需要扩展时,在本文件上修订。

## Genre

editorial(长文阅读,内容为王的课程页面)

## Macrostructure family

- 课程页(lessons/*.html): **Long Document** —— 连续正文流,节标题内联于段落节奏中;
  变化点只在 callout / task / quiz / recall 四种组件 voice。
- 速查表(reference/*.html): 同一 Long Document 家族,允许表格成为主要载体(Tufte 式细线表格)。

## Theme

暖纸 + 赭红(延续原品牌色,OKLCH 化)。锚定色相:纸面 ~90,赭红 ~42。

- `--color-paper`    oklch(97.8% 0.009 90)
- `--color-paper-2`  oklch(99.1% 0.005 95)   /* 卡片浮起面 */
- `--color-paper-3`  oklch(95.6% 0.010 90)   /* 代码块底 */
- `--color-ink`      oklch(25% 0.012 60)
- `--color-ink-2`    oklch(35% 0.010 60)
- `--color-muted`    oklch(46% 0.015 70)
- `--color-rule`     oklch(87% 0.012 80)
- `--color-accent`   oklch(46% 0.095 42)     /* 赭红 */
- `--color-accent-soft` oklch(93.5% 0.020 55)
- `--color-accent-ink`  oklch(98% 0.005 80)
- `--color-focus`    oklch(52% 0.120 45)
- `--color-ok`       oklch(45% 0.090 145)
- `--color-ok-bg`    oklch(94% 0.020 145)
- `--color-bad`      oklch(46% 0.130 25)
- `--color-bad-bg`   oklch(94.5% 0.020 30)

## Typography

- Display: `"Source Han Serif SC", "Noto Serif SC", "Songti SC", serif`,weight 700,仅用于 h1–h3 标题与 blockquote。
- Body: `"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif`,weight 400。
- Mono(outlier,仅一个角色:代码与课程元信息): `"Cascadia Code", "JetBrains Mono", Consolas, monospace`。
- 标题一律正体(roman),禁用斜体标题;斜体只作正文内强调。
- 字阶比例 1.25;正文 1.125rem / 行高 1.8,行长 ≤ 72ch。

## Spacing

4pt 命名标尺,值在 `tokens.css`。页面必须引用命名令牌(`var(--space-md)`),禁止裸数值。

## Motion

- 缓动:`--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`,另备 `--ease-in` / `--ease-in-out`。
- 时长三档:`--dur-micro` 120ms / `--dur-short` 220ms / `--dur-long` 420ms。
- 无滚动 reveal、无页面入场编排(Long Document 家族,静止即品牌)。
- 只动画 transform / opacity / 颜色。
- reduced-motion 回退:全部动画压到 ≤150ms。

## Microinteractions stance

- silent success:答题正误由选项自身的 ✓/✗ 字形 + 底色传达,不弹 toast。
- 正误状态绝不只靠颜色:`.correct` 配 ✓、`.wrong` 配 ✗。
- 按钮按压:`translateY(1px)`,120ms。
- focus ring 即时出现,不做渐入动画。

## CTA voice

本系统无营销 CTA。唯一的"按钮族"是 quiz 选项与 recall 按钮:
- 默认:纸面底 + 细线边框,左对齐,无圆角胶囊。
- hover:暖色浅底(accent-soft),单信号,不同时位移 + 变色 + 加阴影。
- active:下移 1px。

## Per-page allowances

- 课程页与速查表均为内容页:**typography only,禁止 enrichment**(无插画、无装饰图、无表情符号图标)。
- 节标题编号沿用手写的中文编号("1. Node.js 是什么"),不新增 eyebrow/kicker 组件。

## What pages MUST share

- `assets/lesson.css` 单一入口 + 项目根 `tokens.css`。
- 赭红 accent 与其落点(链接、focus ring、h2 短下划线、callout 标签),单屏占比 ≤5%。
- display serif 标题 / sans 正文 / mono 代码的三面孔。
- masthead 式课程信息条(lesson-meta)+ 页脚双细线(further)。

## What pages MAY differ on

- 正文内部的组件组合(callout/task/quiz/recall 的数量与顺序)。
- 表格 vs 代码块哪种是主要载体。

## Exports

### tokens.css

见项目根 `tokens.css`(本系统的唯一令牌源)。
