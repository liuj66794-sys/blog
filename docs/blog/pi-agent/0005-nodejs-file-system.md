---
title: 0005 Node.js 文件系统：read_file / write_file 真实工具落地
createTime: 2026-08-06T10:56:54.000Z
tags:
  - TypeScript Agent
  - TypeScript
permalink: /blog/pi-agent/0005-nodejs-file-system/
---

# 0005 Node.js 文件系统：read_file / write_file 真实工具落地

学习者完成第 5 课动手任务：注册表新增 `read_file` / `write_file` 两个真实 fs 工具，并在 main 里完成"先写、再读、再读不存在的"三连调用。更重要的是：学习者**独立调试并正确诊断了自己代码里的三个问题**，调试能力第一次有明确证据。

**Evidence（学习者自行定位并修复）**
- `main.ts:15` 单引号 `'...${name}...'` 不替换 → 改成反引号。诊断正确。
- `main.ts:24-25` 工具名拼写 `write_flie` / `read_flie` → 改成 `write_file` / `read_file`。诊断正确。
- 正确识别"读不到 不存在的文件.txt"**不是 bug**，而是 `fileReader` 的 catch 分支按设计把错误作为工具结果返回——第 5 课的核心设计要点（工具失败不崩 Agent，错误原因返回给模型）已被理解，不只是照抄。
- 修复后 `npm run start` 输出与课程设计完全一致：已写入 → 读出 hello.txt 内容 → 不存在文件的错误提示 → "全部完成"，程序未崩。第 5 课验收通过，Buffer / try-catch 已入册 GLOSSARY。

**Recurring gap（第二次出现，需重点干预）**
- 单引号 vs 反引号：LR-0001 已记录过完全相同的错误（普通引号导致 `${name}` 原样输出），第 5 课再次踩中。属于已知薄弱点的复发，spacing 复测必须安排。
- "忘写 await 拿到什么"回忆失败：第 4 课学习者亲手做过该实验（屏幕打出 `Promise { <pending> }`），第 5 课验收时被问却答"忘了"。LR-0004 的 await 解释也曾漏掉"不冻住整个程序"。await/Promise 的提取练习在第 6 课温故区须占两题，且要求默写而非选择。

**Implications for next sessions**
- 第 6 课温故区安排一道模板字符串复测题（单引号/双引号/反引号三选一，考"`${}` 在哪种引号里会被替换"），若再错则单独补一小节三种引号的对比。
- 顺势强化一个已显现的直觉：字符串键注册表对拼写错误零防护，TypeScript 编译器查不出 `"write_flie"`——运行时错误信息（"找不到名为 write_flie 的工具"）直接念出了拼错的字符串。这是"错误信息是调试线索"的最佳案例，第 6 课可点名复用。
- 学习者已具备"读报错 → 定位行号 → 区分真 bug 与设计行为"的调试闭环，第 6 课（进程与子进程）可适当提高独立调试的权重，减少手把手提示。
