---
title: CONTEXT
createTime: 2026/08/14 20:11:42
permalink: /knowledge/engineering-skills/context/
---
# CONTEXT

本学习工作区的领域术语表。只收术语与含义，不放实现细节。

## 术语

- **速查表（Cheat Sheet）**：`reference/skill-cheat-sheet.html`。定位是**选 skill 的路由器**——遇到任务时按场景快速定位"该用哪个 skill"，再看对应 SKILL.md 了解完整流程。它不是全量档案，也不是深入手册。
- **触发信号（Trigger Signal）**：速查表每行给出的**用户原话**（用户嘴里会说出的典型句子），用于对号入座。例如"这个 bug 我复现不了" → diagnosing-bugs。
- **收录范围**：Matt Pocock 仓库（github.com/mattpocock/skills）的正式版 skills 全量收录（engineering / misc / productivity 三类，共 29 个；personal 桶已于 2026-08-05 删除）；in-progress 单列一节标注"实验性"；已从仓库删除的 skills 不收录，但文末注明。
- **user-invoked / model-invoked**：速查表已有的调用方式标签。user-invoked 由用户主动 slash 调用；model-invoked 由模型在匹配触发词时自动加载。
- **主源（Primary Source）**：每课推荐用户精读的最权威原始资料。本工作区的主源一律指向 GitHub `mattpocock/skills` 仓库中对应的 `SKILL.md`，并附本地 `~/.agents/skills/` 路径；不引用第三方二手解读。
- **实战任务**：每课末尾的动手环节——在用户自己的真实项目里跑一次本课所学 skill，附明确步骤与自检标准，完成后可向 agent 汇报获取反馈。
- **交错复习（Interleaving）**：第 N 课的测验中混入 1-2 道前序课程的题目，用混合提取练习对抗遗忘。
- **手机版**：`mobile/` 目录下生成的单文件副本，每个 HTML 自带全部样式与脚本，经微信文件助手单传到手机即可完整阅读。定位是**复习用的只读副本**——源文件（桌面版）是唯一事实来源，手机版由脚本重新生成而非手工维护；手机版不保证页面间导航可用，使用方式是一次传一课。
