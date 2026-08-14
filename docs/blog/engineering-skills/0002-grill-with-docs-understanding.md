---
title: grill-with-docs 的核心机制
createTime: 2026-07-11T18:41:56.000Z
tags:
  - 工程技能
  - AI 工具链
permalink: /blog/engineering-skills/0002-grill-with-docs-understanding/
---

# grill-with-docs 的核心机制

## 学到的内容

- `grill-with-docs` 是有代码库时的 relentless interview，由 `/grilling` 驱动，并由 `/domain-modeling` 维护文档。
- 和 `grill-me` 的唯一区别：是否把讨论结果持久化到 `CONTEXT.md` 和 `docs/adr/`。
- grilling 的纪律：一次一问、沿设计树走、给推荐答案、事实查代码、决策前不执行。
- CONTEXT.md 只收录项目特有的领域术语，每个术语包含定义和应避免的说法。
- ADR 只记录同时满足“难逆转、会惊讶、有权衡”的架构决策。

## 对后续教学的影响

- 下一课可进入 `/to-spec`：把 grilling 结果合成为 PRD。
- 也可以先让用户在真实项目里跑一次 `/grill-with-docs`，获得一手体验后再学 spec/tickets。
- 需要确保用户理解：grilling 阶段不写代码，只打磨想法和文档。
