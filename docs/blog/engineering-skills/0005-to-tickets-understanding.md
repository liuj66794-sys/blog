---
title: to-tickets 的核心机制
createTime: 2026-07-23 21:57:39
tags:
  - 工程技能
  - AI 工具链
categories:
  - 工程技能
description: 学到的内容 /totickets 把 spec/计划/对话拆成 tracer bullet（曳光弹）式的垂直切片 ticket，每个声明 blocking edges（阻塞边）。 垂直切片四条规则：窄但切穿所有层、独立可验证、适配单个上下文窗口、先 prefactor（预重构）。 按 frontie…
permalink: /blog/engineering-skills/0005-to-tickets-understanding/
---

> 配套讲义：[第五课：使用 implement 完成实现](/blog/lessons/engineering-skills/lessons/0005-implement.html){target="_blank"}（含随堂测，新标签页打开）

# to-tickets 的核心机制

## 学到的内容

- `/to-tickets` 把 spec/计划/对话拆成 tracer bullet（曳光弹）式的垂直切片 ticket，每个声明 blocking edges（阻塞边）。
- 垂直切片四条规则：窄但切穿所有层、独立可验证、适配单个上下文窗口、先 prefactor（预重构）。
- 按 frontier（前沿）推进：只做阻塞项全部完成的 ticket；分叉处可并行。
- wide refactor（大范围重构）是例外：用 expand–contract（扩张-收缩）分阶段，批间保持绿灯。
- ticket 写用户视角行为 + 验收标准，不写文件路径和代码片段（原型决策性代码除外）。
- 发布形式：本地 `.scratch/<feature-slug>/issues/` 或真实 tracker 的原生 blocking 关系，打 `ready-for-agent` 标签。
- 本课起，quiz 组件抽取为共享资源 `assets/quiz.css` + `assets/quiz.js`，后续课程直接引用。

## 对后续教学的影响

- 下一课自然进入 `/implement`：按 frontier 领取 ticket，内部驱动 `/tdd`，最后跑 `/code-review`。
- 用户尚未在真实项目运行 `/setup-matt-pocock-skills`，实战前需要提醒先补这一步。
- 主线 grill → to-spec → to-tickets 已讲完，可以建议用户拿真实想法完整走一遍再学 implement。
