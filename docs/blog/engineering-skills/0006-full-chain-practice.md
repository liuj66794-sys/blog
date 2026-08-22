---
title: 主流程四技能已在真实项目完整走通
createTime: 2026-07-25 20:56:03
tags:
  - 工程技能
  - AI 工具链
categories:
  - 工程技能
description: 学到的内容 用户把「妈妈音乐播放器」作为实战对象，在真实项目（D:\00Projects\test\4）里完整跑通了 grillwithdocs → tospec → totickets → implement 全链条：grill 出 7 个领域术语、 合成 6 个用户故事的 spec、拆出 5 个…
permalink: /blog/engineering-skills/0006-full-chain-practice/
---

> 配套讲义：[第六课：使用 diagnosing-bugs 诊断难 bug](/blog/lessons/engineering-skills/lessons/0006-diagnosing-bugs.html){target="_blank"}（含随堂测，新标签页打开）

# 主流程四技能已在真实项目完整走通

## 学到的内容

用户把「妈妈音乐播放器」作为实战对象，在真实项目（`D:\00-Projects\test\4`）里完整跑通了
grill-with-docs → to-spec → to-tickets → implement 全链条：grill 出 7 个领域术语、
合成 6 个用户故事的 spec、拆出 5 个垂直切片 ticket（#1–#4 实现 + #5 真机验证）、
按 frontier 顺序实现并用 TDD + 双轴 code-review 收尾。

我已独立验证：git 三个 commit 属实、vitest 19/19 绿、GitHub issues #1–#4 已关闭 #5 挂起。
架构上正确运用了 seam 思想——纯逻辑在 `src/core/`（测试只打在这层），`uni.*` API 薄适配在
`src/platform/`，音乐源可插拔（换源改一行），正是第 2 课术语「音乐源」和第 5 课 seam 纪律的落地。

## 证据

- 项目 commit `01e8599`（MVP 实现）、`5e4a8d9`（UTS 编译修复 + 工具链对齐）。
- 用户还把 UTS 编译经验沉淀进项目 AGENTS.md 和用户级 uni-app skill——超出了任务要求。

## 对后续教学的影响

- 主流程（idea → ship）已结业，不需要再教。ZPD 移向入口场景与横向技能：
  `/diagnosing-bugs`（#5 真机验证若出问题正好是实战素材）、`/wayfinder`、`/handoff`。
- `#5 真机端到端验证`仍未闭环：BackgroundAudioManager 播包内音频、厂商 ROM 后台行为，
  是真机上才能回答的问题——下次会话可优先跟进。
- 一个小缺口：项目没有 ADR。uni-app x 选型、core/platform 分层都符合 ADR 三条件（难逆转、
  会惊讶、有权衡），下次可以借这个实例教「什么时候补 ADR」。
