---
title: 0004 异步与 async/await
createTime: 2026-07-29 22:46:08
tags:
  - TypeScript Agent
  - TypeScript
categories:
  - TypeScript Agent
description: 学习者已完成第 4 课（阶段 0 模块 A 收官）：把 Tool 接口改为异步形态（execute 返回 Promise<string），新增 slowGreeter 模拟网络耗时，并用 async main 壳串起全部调用。 Evidence npm run start 正常输出与课程设计一致：两…
permalink: /blog/pi-agent/0004-async-await/
---

> 配套讲义：[第 4 课 · 异步与 async/await](/blog/lessons/pi-agent/lessons/0004-async-await.html){target="_blank"}（含随堂测，新标签页打开）

# 0004 异步与 async/await

学习者已完成第 4 课（阶段 0 模块 A 收官）：把 `Tool` 接口改为异步形态（`execute` 返回 `Promise<string>`），新增 slowGreeter 模拟网络耗时，并用 `async main()` 壳串起全部调用。

**Evidence**
- `npm run start` 正常输出与课程设计一致：两条即时结果 → 停顿约 1 秒后的 slow-greeter → "全部完成"。
- 忘写 await 实验：greeter 行变成 `Promise { <pending> }`，与预期完全吻合——学习者亲眼看到"小票"而非结果。
- await 一句话解释："等Promise出结果后拿来用结果。"

**Partial gap**
- await 的解释抓住了一半（等结果、取结果），但漏掉了关键区分点：**只暂停当前函数、不冻住整个程序**——这正是 await 与同步等待的本质区别，也是异步存在的意义。已在验收反馈中补齐；第 5 课温故区安排一道复测题（await 的"等"和同步的"等"差在哪）。

**Implications for next sessions**
- 阶段 0 模块 A（TypeScript 起步）四课全部验收通过，进入模块 B（Node.js 核心）。
- 第 5 课（文件系统 fs）的 `readFile` / `writeFile` 返回 Promise——await 立刻在真实 API 上复用，spacing 自然发生；rejected 状态也将在"读不存在的文件"中第一次真实出现，顺势引入 try/catch。
- 三文件骨架 + 注册表继续作为 PatchPilot 工具的生长点：第 5 课新增 `read_file` / `write_file` 两个真实工具，向路线图单元 2 的五工具集迈进。
