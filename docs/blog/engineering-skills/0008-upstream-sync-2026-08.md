---
title: 上游仓库同步（2026-07-28 → 2026-08-07）
createTime: 2026-08-07 18:16:55
tags:
  - 工程技能
  - AI 工具链
categories:
  - 工程技能
description: 学到的内容 对照 mattpocock/skills 仓库（当前 v1.2.3）把学习素材同步到最新，关键变化： 改名：writinggreatskills → writingforagents（20260727，PR 650）。不只是改名——范围从"写 skill"扩到"写给 agent 看的任何…
permalink: /blog/engineering-skills/0008-upstream-sync-2026-08/
---

# 上游仓库同步（2026-07-28 → 2026-08-07）

## 学到的内容

对照 `mattpocock/skills` 仓库（当前 v1.2.3）把学习素材同步到最新，关键变化：

- **改名**：`writing-great-skills` → `writing-for-agents`（2026-07-27，PR #650）。不只是改名——范围从"写 skill"扩到"写给 agent 看的任何文档"（AGENTS.md/CLAUDE.md 等），GLOSSARY 并入 SKILL.md，机制拆到 SKILL-MECHANICS.md，改为 model-invoked。
- **新增正式版**：`wizard`（7-28 毕业，生成带人完成人工步骤的 bash 向导；8-06 删除分钟数预估）、`to-questionnaire`（7-28 毕业，把答不上来的决策做成问卷，/grill-me 的反向操作）、`wait-what`（8-05 新增，没看懂 agent 的话时立刻要求用大白话重解释）。
- **删除**（8-05）：`ubiquitous-language`、`design-an-interface`、`qa`、`request-refactor-plan` 四个 deprecated 彻底移除，`skills/deprecated/` 只剩 README 墓碑；整个 personal 桶（`edit-article`、`obsidian-vault`）删除；`batch-grill-me` 已不在仓库任何分类。
- **行为变更**：grilling 早已改为 round-by-round frontier 采访制（7-16 引入，7-29 固定问题格式 `❓ **Q1** - **标题**:` + `➡️` 推荐答案）——旧素材里"一次只问一个问题"是错的，已修正第 2 课和 grill 流程参考；diagnosing-bugs 新增 Redact 脱敏规则（8-06，Snyk W007 高危修复）；code-review / improve-codebase-architecture / codebase-design 的 subagent 派发改为跨 harness 中性（8-06）——对多客户端混用是直接利好；ask-matt 新增 PHASE-BOUNDARIES.md 决策树（8-05）。

## 证据

- 仓库 commits：`17f22a37`（改名）、`c66bdeee`（删除六个 skill + personal 桶）、`294a2c97`（grill 格式）、`efce4230`+`bda79a3c`（Redact）、`14bfbbd8`+`c0d69015`（harness 中性）、`fa1e3227`（PHASE-BOUNDARIES）、`c0fd1e97`+`cb7db0ee`（wizard 去分钟）。
- 已核实仓库当前分类：engineering 18 个、productivity 7 个、misc 4 个（正式版共 29），in-progress 6 个（claude-handoff、loop-me、setup-ts-deep-modules、writing-beats/fragments/shape）。
- 更新的素材：RESOURCES.md、reference/skill-cheat-sheet.html、reference/diagnosing-bugs-reference.html（新增第五节 Redact）、reference/grill-with-docs-flow.html（纪律改为 round 制）、lessons/0002-grill-with-docs.html（三处"一次一问"修正）、CONTEXT.md、index.html。

## 对后续教学的影响

- **本地安装已同步（2026-08-07 当天完成）**：`npx skills@latest add mattpocock/skills -g -y` 更新了用户级 `~/.agents/skills/`（现 50 个目录，含全部 35 个仓库 skill），并用 `skills remove -g` 卸载了 8 个失效 skill（writing-great-skills、batch-grill-me、ubiquitous-language、design-an-interface、qa、request-refactor-plan、edit-article、obsidian-vault）。已抽查 diagnosing-bugs 含 Redact、grilling 含 ❓ 格式。注意：`skills add` 不加 `-g` 会装到**项目级** `.agents/skills/`（本次误装后已清理 `.agents/`、`.claude/`、`skills-lock.json`）。
- 速查表现覆盖 29 个正式版 + 6 个实验性。第 1 课"39 个 skills"的表述指本地安装快照，未改（历史事实）；index.html 已改为"29 个正式版"。
- 三个新 skill（wizard / to-questionnaire / wait-what）尚未开课；按 ZPD，它们优先级低于已规划的主线（diagnosing-bugs 实战、wayfinder、handoff），需要时再开。
- grilling 的 round 制变更会影响未来所有 grill 系课程的实战任务验收标准——出题和自检标准都要按"每轮问完 frontier"来写。
