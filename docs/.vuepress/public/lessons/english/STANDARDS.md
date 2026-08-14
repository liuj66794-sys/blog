# 教学项目开发规范（STANDARDS）

> 本文件是 AI agent 创建/修改页面时的硬约束。违反 MUST 条目 = bug，必须修复。

---

## §1 硬规则（MUST）

### 1.1 页面结构

- 每个 HTML 页面必须包含 `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `lessons/` 课程页必须在 `<head>` 内联完整 `<style>` 块（内容为 `assets/style.css` 的副本），保证单文件在手机端（微信/文件传输）打开时样式可用；禁止只写 `<link>` 外链
- `reference/` 速查页引用公共样式：`<link rel="stylesheet" href="../assets/style.css">`
- 必须使用统一组件类名：`.card`、`.card-error`、`.card-warning`、`.card-info`、`.card-success`、`.example`、`.tag`、`.quiz`
- 页面必须包含 `<footer>`，含返回链接

### 1.2 响应式规则

- CSS 媒体查询中的布局规则必须使用**通用选择器**（直接作用于 `table`、`.card` 等），禁止用 `body:has(...)` 等条件选择器限定作用域
- 断点设计：
  - `≥ 769px`：桌面增强（纸张浮层、阴影）
  - `≤ 768px`：所有表格折叠为卡片、间距收紧
  - `≤ 480px`：进一步收紧内边距
- 表格在窄屏必须卡片化（`display: block` + 每行独立卡片），不允许横向溢出

### 1.3 可访问性与触控

- 所有可点击区域（链接、按钮、选项）最小尺寸 ≥ 44×44px
- 使用 `:focus-visible` 提供键盘焦点样式
- 尊重 `prefers-reduced-motion: reduce`

### 1.4 验证流程（agent 硬规则）

完成任何页面**新建或修改**后，agent 必须：

1. 用 browser 工具将视口设为 **375px**，截图保存
2. 将视口设为 **1280px**，截图保存
3. 将两张截图输出给用户确认
4. 若截图中出现以下问题，必须自行修复后重新截图：
   - 纯文本无样式（CSS 未加载）
   - 表格横向溢出
   - 元素重叠或不可读
   - 可点击区域明显过小

---

## §2 设计约定（SHOULD）

### 2.1 字体栈（不依赖网络字体）

| 用途 | 字体栈 | 字重 |
|------|--------|------|
| 标题（display） | PingFang SC → Microsoft YaHei → Noto Sans SC → sans-serif | 700–800 |
| 正文（body） | Georgia → Noto Serif SC → Songti SC → serif | 400 |
| 代码（mono） | JetBrains Mono → Fira Code → Consolas → monospace | 400 |

### 2.2 色彩语义

| 语义 | 用途 | 色相锚点 |
|------|------|----------|
| `--color-error` / `.card-error` / `.tag-p1` | P1 最高优先 / 错误 | 红 27° |
| `--color-warning` / `.card-warning` / `.tag-p2` | P2 高优先 / 警告 | 琥珀 62° |
| `--color-accent` / `.card-info` / `.tag-p3` | P3 中优先 / 信息 | 墨蓝 250° |
| `--color-success` / `.card-success` | 方法 / 正确 | 绿 150° |

### 2.3 字号层级

- h1：clamp(1.7rem, 1.25rem + 1.8vw, 2.3rem)，字重 800
- h2：clamp(1.4rem, 1.1rem + 1vw, 1.7rem)，字重 700
- h3：1.125rem，字重 700
- 正文：1rem（16px 基准），行高 1.7
- 代码：0.85em

### 2.4 间距系统

使用 4pt 命名刻度：`--space-3xs`(4px) → `--space-2xs`(8px) → `--space-xs`(12px) → `--space-sm`(16px) → `--space-md`(24px) → `--space-lg`(36px) → `--space-xl`(52px)

---

## §3 页面骨架模板

新建页面时，复制以下骨架：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>页面标题 — 项目名</title>
<style>
/* 内联自 assets/style.css —— 保证单文件在手机端（微信/文件传输）打开时样式可用。
   修改 assets/style.css 后需重新同步本文件与 lessons 内其他页面的 <style> 块。 */
/* …此处粘贴 assets/style.css 完整内容… */
</style>
</head>
<body>

<h1>页面标题</h1>
<p>一句话导语，说明本页用途。</p>

<!-- 内容区：自由使用 h2/h3/table/.card/.example/.tag 等组件 -->

<footer>
  页面描述 · <a href="../lessons/xxx.html">返回课程</a>
</footer>

</body>
</html>
```

---

## §4 文件组织

```
teaching/
├── assets/style.css        ← 唯一公共样式表（lessons 页内联样式的源头）
├── lessons/                ← 课程页面（每个文件内联 style.css 完整副本，保持同步）
├── reference/              ← 速查/参考页面（只引用外部 CSS）
├── learning-records/       ← 学习记录（Markdown）
├── STANDARDS.md            ← 本文件
└── MISSION.md              ← 学习目标
```

> ⚠️ lessons/ 页面内联 CSS 是因为用户常在手机端单文件打开课程页（微信/文件传输场景下相对路径外链会失效，页面退化为纯文本）。
> 修改 `assets/style.css` 后，必须同步更新**所有** lessons 页面的 `<style>` 块。
