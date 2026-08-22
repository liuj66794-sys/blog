---
title: wayfinder 的核心形状：为模糊大项目画一张共享地图
createTime: 2026-08-21 18:00:13
tags:
  - 工程技能
  - AI 工具链
categories:
  - 工程技能
description: 学到的内容 /wayfinder 处理的是「想法太大、一个 session 装不下、从这里到目的地的路还看不见」的入口。 当主流程 grill → tospec 走不动时，它先把「路」本身绘成 issue tracker 上的一张共享地图， 再逐张解决地图上的决策票，直到路清晰、可以交接给 tosp…
permalink: /blog/engineering-skills/0007-wayfinder-understanding/
---

> 配套讲义：[第七课：使用 wayfinder 规划大型模糊项目](/blog/lessons/engineering-skills/lessons/0007-wayfinder.html){target="_blank"}（含随堂测，新标签页打开）

# wayfinder 的核心形状：为模糊大项目画一张共享地图

## 学到的内容

`/wayfinder` 处理的是「想法太大、一个 session 装不下、从这里到目的地的路还看不见」的入口。
当主流程 `grill → to-spec` 走不动时，它先把「路」本身绘成 issue tracker 上的一张共享地图，
再逐张解决地图上的决策票，直到路清晰、可以交接给 `to-spec → to-tickets → implement` 施工。

关键形状：

- **Destination（目的地）** 是地图的第一个钉子。它决定范围、塑造每张票。到达长什么样通常写成
  「一份可交接的 spec」或「一个待锁定的决策」——不是功能上线本身。
- **Shared map** 是 tracker 上带 `wayfinder:map` 标签的单个 issue，作为权威索引：
  Destination、Notes、Decisions so far、Not yet specified、Out of scope。
  决策只住在票里，地图只给 gist + 链接；引用用名字，不用编号墙。
- **决策票** 分四类：research（AFK，可并行 subagent）、prototype（HITL）、grilling（HITL）、
  task（HITL 或 AFK，唯一「做」的类型，必须为某个决策解锁而存在）。
- **Fog of war / Not yet specified**：范围内但还钉不死的问题写进雾里；标准是能否「精确表述」问题，
  而不是能否回答。被阻塞但表述清晰的票照样立票。
- **Out of scope**：被有意识地排除在目的地之外的工作，永不毕业；越界票要关掉，不在 Decisions so far 里。
- **Frontier（前沿）**：打开、未被阻塞、未被认领的票。先认领（assign）再干活；阻塞用 tracker 原生依赖表达。
- **铁律**：绘制地图的 session 一张票都不亲手解决；沿图推进时一个 session 最多解决一张票（research 例外可并行）。

## 证据

- 精读本地主源 `~/.agents/skills/wayfinder/SKILL.md` 的 Ticket Types 与 Fog of war 两节。
- 第七课 `lessons/0007-wayfinder.html` 与速查 `reference/wayfinder-reference.html` 已按此理解完成。

## 对后续教学的影响

- 入口场景系列还差最后一课 `/handoff`：跨 session 交接上下文。
- 学完 handoff 后，主线五课 + 三个入口场景（diagnosing-bugs、wayfinder、handoff）即完整。
- 第七课末尾的实战任务尚未执行：需要在真实项目里为一个大而模糊的想法 chart 一张地图并走通一票。
  可在下一课之前或之后完成，视 ZPD 而定。
