---
title: 0001 TypeScript 环境搭建与第一个程序
createTime: 2026-07-23 22:05:20
tags:
  - TypeScript Agent
  - TypeScript
categories:
  - TypeScript Agent
description: 学习者已完成第 1 课的动手任务：Node.js v24.17.0 安装成功，使用 npx tsx 运行了第一个 .ts 文件，理解了 TS 类型报错信息的含义。 Evidence 第一次运行输出 你好，${name}欢迎来到 Agent 课程。，说明使用了普通字符串引号而非模板字符串的反引号；随后…
permalink: /blog/pi-agent/0001-typescript-environment-and-first-program/
---

> 配套讲义：[第 1 课 · 搭好环境：第一个 TypeScript 程序](/blog/lessons/pi-agent/lessons/0001-typescript-setup-first-program.html){target="_blank"}（含随堂测，新标签页打开）

# 0001 TypeScript 环境搭建与第一个程序

学习者已完成第 1 课的动手任务：Node.js v24.17.0 安装成功，使用 `npx tsx` 运行了第一个 `.ts` 文件，理解了 TS 类型报错信息的含义。

**Evidence**
- 第一次运行输出 `你好，${name}!欢迎来到 Agent 课程。`，说明使用了普通字符串引号而非模板字符串的反引号；随后成功输出 `你好，刘杰!欢迎来到 Agent 课程。`，说明已掌握模板字符串的写法与作用。
- 正确复述 TS 类型错误：`string` 类型的参数不能赋给 `number` 类型的参数。

**Implications for next sessions**
- 可以进入第 2 课：类型与接口。学习者已能在编译报错中提取关键信息，后续可以多用 TS 编译器反馈作为学习抓手。
- 模板字符串是后续"拼接 System Prompt / 工具描述"时的高频工具，已验证掌握。
- 下次遇到 `${...}` 没展开的情况，可直接反问"是否用了反引号"。
