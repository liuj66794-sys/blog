---
title: to-spec 的核心机制
createTime: 2026-07-13T17:32:27.000Z
tags:
  - 工程技能
  - AI 工具链
permalink: /blog/engineering-skills/0003-to-spec-understanding/
---

# to-spec 的核心机制

## 学到的内容

- `/to-spec` 把 grilling 的结果合成为 PRD，不再 interview。
- 前置条件：项目已运行 `/setup-matt-pocock-skills`。
- 模板包含：Problem Statement、Solution、User Stories、Implementation Decisions、Testing Decisions、Out of Scope、Further Notes。
- User Stories 要长且覆盖全面；Out of Scope 要明确。
- 不写具体文件路径和代码片段（原型产出的决策性代码除外）。
- 写完后发布到 issue tracker，应用 `ready-for-agent` 标签。

## 对后续教学的影响

- 下一课自然进入 `/to-tickets`：把 spec 拆成 tracer-bullet tickets。
- 用户已经理解 grill → to-spec 的链条，可以开始实战：找一个真实功能走完 grill → to-spec。
- 需要提醒用户：spec 的质量直接决定 to-tickets 的拆分质量，不要急于进入下一步。
