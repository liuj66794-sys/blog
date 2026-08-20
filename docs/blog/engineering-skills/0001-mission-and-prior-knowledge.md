---
title: 已确认学习使命与先验知识
createTime: 2026-07-11 14:48:03
tags:
  - 工程技能
  - AI 工具链
description: 使命 用户是独立开发者，在多个 AI 客户端之间切换（Kimi Code CLI、Cursor、Claude Code、Codex 等）。学习 Mattpocock Skills 的动机是提升工作效率，让 AI 在代码审查、方案设计、Bug 诊断、需求拆解等任务上输出更稳定。当前策略是先全面概览，再…
permalink: /blog/engineering-skills/0001-mission-and-prior-knowledge/
---

> 配套讲义：[第一课：Mattpocock Skills 概览与调用方式](/blog/lessons/engineering-skills/lessons/0001-mattpocock-skills-overview.html){target="_blank"}（含随堂测，新标签页打开）

# 已确认学习使命与先验知识

## 使命

用户是**独立开发者**，在多个 AI 客户端之间切换（Kimi Code CLI、Cursor、Claude Code、Codex 等）。学习 Mattpocock Skills 的动机是**提升工作效率**，让 AI 在代码审查、方案设计、Bug 诊断、需求拆解等任务上输出更稳定。当前策略是**先全面概览，再按需深入**。

## 已建立的先验知识

- 用户已经成功运行 `npx skills@latest add mattpocock/skills -y`，本地已安装 39 个 skills。
- 用户对 skills 的调用方式尚无系统认知，但已能自然描述自己的工作场景。
- 用户尚未在真实项目里运行过 `/setup-matt-pocock-skills`，因此后续如涉及工程流程，需要先补这一步。

## 对后续教学的影响

- 优先保持“概览”节奏，不急于深入单一 skill。
- 后续课程应覆盖核心主线（grill → to-spec → to-tickets → implement）和独立常用 skill（code-review、diagnosing-bugs、wayfinder）。
- 由于用户跨客户端使用，课程应强调各客户端调用方式的差异，尤其是 Kimi Code CLI 和 Claude Code。
