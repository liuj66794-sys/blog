---
title: 0002 TypeScript 类型与接口
createTime: 2026-07-23 23:26:39
tags:
  - TypeScript Agent
  - TypeScript
categories:
  - TypeScript Agent
description: 学习者已完成第 2 课：成功用 interface Tool 定义工具形状，实现了 calculator 和 greeter，并通过 Record<string, Tool 注册表 + runTool 调度函数跑出了正确输出。 Evidence 正常运行输出：结果是 30 和 你好, 刘杰 代码结构…
permalink: /blog/pi-agent/0002-types-and-interfaces-for-tools/
---

> 配套讲义：[第 2 课 · TypeScript 类型与接口](/blog/lessons/pi-agent/lessons/0002-types-and-interfaces-for-tools.html){target="_blank"}（含随堂测，新标签页打开）

# 0002 TypeScript 类型与接口

学习者已完成第 2 课：成功用 `interface Tool` 定义工具形状，实现了 `calculator` 和 `greeter`，并通过 `Record<string, Tool>` 注册表 + `runTool` 调度函数跑出了正确输出。

**Evidence**
- 正常运行输出：`结果是 30` 和 `你好, 刘杰!`
- 代码结构包含 interface、两个 Tool 实现、注册表对象。

**Misconceptions corrected**
1. **tsx 不会报类型错误**：把 `runTool("calculator", 10)` 传进去后，程序依然运行并输出 `结果是 NaN`，没有出现 TS 报错。原因是 `npx tsx` 默认只做**转译+运行**，不做**类型检查**；要看到类型错误需用 `npx tsc --noEmit`。这个误解必须在下节课解决。
2. **`Record<string, Tool>` 不是"获取工具有哪些"**：学习者解释为"获取我有哪些工具"。正确含义是："键为字符串、值为 Tool 的对象"，它描述的是注册表这个**容器的形状**，而不是一个动作。

**Implications for next sessions**
- 下节课（模块与 npm）会正式引入 `npx tsc --noEmit`，并解释"编辑器红线 / tsc / tsx"三者的区别。
- 后续所有"类型错误实验"都改用 `tsc --noEmit` 验证，而不是 tsx 的运行结果。
- `Record<string, Tool>` 会反复出现（工具注册表、上下文消息注册表），需在后续课中继续强化。
