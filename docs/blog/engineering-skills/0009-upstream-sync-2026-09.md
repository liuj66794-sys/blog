---
title: 上游仓库同步（2026-08-07 → 2026-09-09）
createTime: 2026-09-09 13:34:54
tags:
  - 工程技能
  - AI 工具链
categories:
  - 工程技能
description: 学到的内容 对照 mattpocock/skills 仓库（GitHub API，直连 git 不通、本地代理未开）把学习素材同步到最新。正式版三桶（engineering 18 / productivity 7 / misc 4，共 29）无增删；变化集中在 inprogress 和既有 skil…
permalink: /blog/engineering-skills/0009-upstream-sync-2026-09/
---

## 学到的内容

对照 `mattpocock/skills` 仓库（GitHub API，直连 git 不通、本地代理未开）把学习素材同步到最新。正式版三桶（engineering 18 / productivity 7 / misc 4，共 29）**无增删**；变化集中在 in-progress 和既有 skill 的行为微调：

- **新增（都在 in-progress，现共 8 个）**：
  - `implement-spec`（8-21，user-invoked）：把 spec 的 tickets 当带阻塞边的任务图，并行派发 implementer 子 agent（各自 worktree/分支）合并成单个 PR，收尾跑 code-review。frontier 概念与 wayfinder 同源，可视为 implement 的并行放大版。
  - `retro`（8-24，user-invoked）：对一次编码会话做回顾，从导航、自动检查、编码规范、AGENTS.md 瘦身、工具经济、空转指令、信息获取七个维度提出改进 agent 环境的建议，按严重度排序。
- **行为变更**：grilling 同轮问题之间改用水平线 `---` 分隔（8-20）；domain-modeling 触发点明确覆盖"正在写 CONTEXT.md / ADR"、术语触发改为"讨论代码库术语"（8-13）；grill-with-docs 删除"假定单一写者"一节（8-17，我们的素材未提过该假设，无需改）；仓库明令 skill 之间不得调用其他 user-invoked skill（8-15）。
- **格式级**：六个 SKILL.md 的 YAML description 加引号（8-19）、全仓去 em-dash（8-19）、wait-what 修 CONTEXT-MAP 指向（8-19）、code-review 实施步骤措辞（8-21）——对课程内容无影响。
- **工具链**：9-04 起 link-skills 不再把 misc/ 链进本地 skill 目录，只影响安装器行为。

## 证据

- 仓库 commits：`84b5ee5`（implement-spec）、`8fa1886`+`3ec8e23`+`6654f6b`（retro）、`0ab1b63`（grilling HR）、`bd8e81b`+`e12e7ec`（domain-modeling 触发）、`0505536`（grill-with-docs 单写者）、`1dab982`（禁调 user-invoked）、`5c89081`（YAML）、`3216582`（em-dash）、`5b15a47`（code-review 措辞）、`3cca18b`（link-skills）。
- 桶清单经 contents API 核实；grilling/diagnosing-bugs 上游原文经 raw 文件核实（diagnosing-bugs 六阶段结构与 Redact 小节未变）。
- 更新的素材：reference/skill-cheat-sheet.html（第七节 +2 行、grilling 行、domain-modeling 行）、lessons/0002-grill-with-docs.html 与 reference/grill-with-docs-flow.html（HR 分隔）、RESOURCES.md（grilling 条目、+implement-spec/retro 条目、底部本地安装说明）、reference/diagnosing-bugs-reference.html（本地副本警示）、index.html（学习记录 +0009）。

## 本地安装异常（重要）

2026-09-08 本地混入第三方 `claudekit` skill 包：新增 `design`、`design-system`、`ui-styling` 三个**不属于 Matt 仓库**的目录，并覆盖了 Matt 版 `code-review`、`diagnosing-bugs`、`tdd`（内容为重组衍生版，如 diagnosing-bugs 丢了六阶段结构与独立 Redact 小节）。`~/.agents/.skill-lock.json` 仍是 8-07 的 mattpocock 版，可查每个 skill 的 `source` 判断归属。仓库新出的 `retro`、`implement-spec` 未安装。**修复（待网络/代理可用）**：按 NOTES.md 约定重跑 `npx skills@latest add mattpocock/skills -g -y`，再决定是否保留 claudekit 的三个非 Matt 目录；修复前学习一律以上游 GitHub 为准。

## 对后续教学的影响

- 两个新 skill 均为 in-progress，按 ZPD 暂不开课，速查表收录即可；implement-spec 与第 7 课 wayfinder 的 frontier 讲解可互相引用，未来开课时是现成素材。
- grilling 的 HR 分隔已写进第 2 课与 grill 参考的格式描述，后续 grill 系课程的实战任务验收照此执行。
