---
title: design
createTime: 2026/08/14 20:11:42
permalink: /knowledge/engineering-skills/design/
---
# Design — Mattpocock Skills 学习工作区

A locked design system for this site. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

本文件是本工作区的唯一设计事实源。任何页面级改动先读它；与 Hallmark
references 冲突时，以本文件为准。

## Genre

editorial（书卷气变体，Newsprint 方向：纸、墨、衬线、发线）

## Macrostructure family

- 导航页（index.html）：Index-First —— 页面即索引，链接即按钮，无 hero。
  报头 = `.masthead-meta` 日期行 + 双线 h1；课程索引用 `.course-index`
  编号条目（大号期号 + 标题 + 配套 meta），不用表格。
- 内容页（lessons/、reference/）：Long Document —— 单栏长文阅读，
  标题从段落流中浮现，h2 以 1px rule 发线分节，无 reveal。
  宽屏（≥72rem）时页内目录 `.toc` 以 marginalia 形式固定在右页边
  （透明底 + 左发线，fixed），正文栏保持 42rem 居中。

## Theme

Newsprint 方向，暖纸锚点（hue ≈ 80–95），朱砂色 accent（vermilion）。

- `--color-paper`    oklch(97.2% 0.006 95)
- `--color-paper-2`  oklch(94.5% 0.009 95)
- `--color-rule`     oklch(87% 0.008 90)
- `--color-muted`    oklch(46% 0.010 80)
- `--color-ink`      oklch(24% 0.012 75)
- `--color-accent`   oklch(47% 0.120 45)
- `--color-focus`    oklch(55% 0.130 45)

暗色模式只动明度与彩度，不动色相（见 tokens.css）。

Accent 纪律：只用于链接、focus 环、quiz 选中态、callout 标记方块、
skill-tag 的 model-invoked 变体。任何视口内占比 ≤ 5%。
**禁止**整标题染 accent 色（旧版每个 h2 都是橙色，已废除）。

## Typography

- Display + Body：同一衬线栈 `"Newsreader", "Noto Serif SC", "Songti SC",
  "STSong", "SimSun", serif`（拉丁 Newsreader / 中文 Noto Serif SC，
  Google Fonts 按 unicode-range 分包加载；离线回退系统宋体）。
  正文 400，标题 600，页面主标题 700。
- Mono（outlier，仅 code / skill-tag / glossary-term）：
  `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`。
- 标题全部 roman，禁止斜体标题；斜体只允许正文强调。
- Type scale（major third 1.25，基 17px）：h1 = `--text-2xl`，
  h2 = `--text-xl`，h3 = `--text-lg`，正文 1rem / line-height 1.8。
- Lede：h1 后首段（`h1 + p` / `.toc + p`）用 `--text-md` / 1.7，一页只此一段。
- 悬挂标点：`hanging-punctuation: first allow-end`（渐进增强，
  不支持的浏览器静默忽略）。

## Spacing

4pt 命名标尺（`--space-3xs` … `--space-4xl`），值在 `assets/tokens.css`。
页面必须使用命名 token，禁止裸值。

## Motion

- Newsprint 立场：0× —— 页面不动。无 reveal、无 scroll 动画。
- 仅允许颜色/透明度微过渡（hover 链接下划线、按钮背景），
  时长 `--dur-micro`–`--dur-short`，缓动 `--ease-out`。
- `prefers-reduced-motion: reduce`：连平滑滚动也关闭。

## Microinteractions stance

- Silent success：quiz 反馈就地显示，无 toast、无弹窗。
- Focus 环即刻出现（不动画），2px `var(--color-focus)`，offset 2–3px。
- 状态不只靠颜色：quiz 对错反馈带 ✓ / ✗ 符号 + 文字。
- 链接 hover：下划线颜色从 `--color-rule` 变为 `--color-accent`，单一信号。

## CTA voice

- 主要动作（quiz「检查答案」）：墨底纸字方块按钮，无圆角无渐变；
  hover 仅背景换 accent；active `translateY(1px)`。
- 次要动作：排版化链接（accent 文字 + 下划线），不做成按钮。

## Per-page allowances

- 全站无 enrichment —— 排版即设计。不插图、不画装饰。
- 表格用书版式（booktabs）：顶/底粗发线、表头下发线、无竖线无斑马纹。
- h1 下方用双线（double rule）—— 全站唯一的"报头"签名元素。

## What pages MUST share

- tokens.css 的全部 token；新颜色/字体先入 token 再引用。
- 衬线栈 + mono outlier；accent 用法与位置。
- `.toc` 页内目录（toc.js 生成）、`.step` 步骤流、`.callout`、
  `.skill-tag`、`.quiz` 的组件契约（类名不变，只换皮肤）。
- Quiz 试卷化皮肤：题号「第 N 题」与选项字母 A–D 由 CSS 计数器生成，
  HTML 不手写 `Q1.` / `A.`；反馈区为上下发线书注式（颜色 + ✓/✗ + 文字）。
- 导航页专用：`.masthead-meta`（报头日期行）、`.course-index` / `.ci-body` /
  `.ci-title` / `.ci-meta`（编号课程索引）、`.colophon`（页脚参考链接行，
  取代内联样式）。

## What pages MAY differ on

- 内容结构本身（表格密度、步骤流长度、quiz 数量）。
- 不允许新增页面级 `<style>` 块或内联颜色——一律走共享样式。

## Exports

### tokens.css

见 `assets/tokens.css`（唯一事实源，`style.css` 与 `quiz.css` 均 import 它）。

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:   oklch(97.2% 0.006 95);
  --color-paper-2: oklch(94.5% 0.009 95);
  --color-rule:    oklch(87% 0.008 90);
  --color-muted:   oklch(46% 0.010 80);
  --color-ink:     oklch(24% 0.012 75);
  --color-accent:  oklch(47% 0.120 45);
  --font-serif:    "Newsreader", "Noto Serif SC", "Songti SC", serif;
  --font-mono:     ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --spacing-md:    1rem;
  --text-md:       1.125rem;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":  { "$value": "oklch(97.2% 0.006 95)", "$type": "color" },
    "ink":    { "$value": "oklch(24% 0.012 75)",   "$type": "color" },
    "accent": { "$value": "oklch(47% 0.120 45)",   "$type": "color" }
  },
  "font": {
    "serif": { "$value": "Newsreader + Noto Serif SC", "$type": "fontFamily" },
    "mono":  { "$value": "ui-monospace stack",         "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background:         97.2% 0.006 95;  /* paper */
  --foreground:         24% 0.012 75;    /* ink */
  --primary:            47% 0.120 45;    /* accent */
  --primary-foreground: 97.2% 0.006 95;  /* paper */
  --muted:              94.5% 0.009 95;  /* paper-2 */
  --muted-foreground:   46% 0.010 80;    /* muted */
  --border:             87% 0.008 90;    /* rule */
  --input:              87% 0.008 90;    /* rule */
  --ring:               55% 0.130 45;    /* focus */
  --radius:             2px;
}
```
