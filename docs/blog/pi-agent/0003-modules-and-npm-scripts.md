---
title: 0003 模块与 npm 脚本
createTime: 2026-07-25T15:09:27.000Z
tags:
  - TypeScript Agent
  - TypeScript
permalink: /blog/pi-agent/0003-modules-and-npm-scripts/
---

# 0003 模块与 npm 脚本

学习者已完成第 3 课：把 `tools.ts` 拆成 `tool-types.ts` / `tools.ts` / `main.ts` 三个文件并用 import/export 连接，配置了 `npm start` 脚本与 `tsconfig.json`，并正确产出了预期的 tsc 类型报错。

**Evidence**
- `npm run start` 输出 `结果是 30` 和 `你好, 刘杰!`——拆分后行为与第 2 课一致。
- 类型实验产出预期报错：`error TS2345: Argument of type 'number' is not assignable to parameter of type 'Record<string, any>'`（main.ts:18），与课程设计完全吻合。
- export/import 一句话解释："一个是暴露类可以给别的包使用，一个是引入暴露类来使用。"

**Misconceptions corrected**
1. **（第 2 课遗留，已关闭）tsx 不做类型检查**：学习者已能主动用 `npx tsc --noEmit` 产出类型报错，"运动员/裁判"分工从被动听说变成主动使用。此误解关闭。
2. **（新，部分残留）export/import 的作用范围**：方向正确（暴露 / 引入），但措辞有两处偏差——能 export 的不只是"类"（interface、const、函数、类型都可以）；作用在**模块（文件）**之间，而非"包"之间（包是 npm 的发布单位）。GLOSSARY 按规范措辞入册；第 4 课温故区安排一道精确化回忆题复测。

**Implications for next sessions**
- 第 4 课（异步 async/await，模块 A 收官）将把 `Tool.execute` 改为返回 `Promise<string>`——与真实 Agent 工具的形态一致，异步概念直接长在已验收的代码骨架上。
- 三文件结构（types / tools / main）成为后续所有动手课的默认骨架；PatchPilot 的目录拆分沿用这一心智模型。
- 第 4 课温故区复测 import/export 精确措辞；若再次答成"类/包"，升级为正式误解处理。
