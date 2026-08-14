# 教学笔记

## 用户偏好

- 教学语言：中文。
- 学习策略：先全面概览 Mattpocock Skills，再决定深入哪些。
- 使用场景：独立开发者，多 AI 客户端混用（Kimi Code CLI、Cursor、Claude Code、Codex 等）。
- 目标：提升工作效率，重点在代码审查、方案设计、Bug 诊断、需求拆解、实现、交接等日常任务。

## 中文化与术语处理约定

- 课程、参考文档和 MISSION.md 全部使用中文。
- 代码中的变量名、函数名、skill 名称保持英文。
- 有特殊含义的英文术语首次出现时 inline 中文解释，例如：`seam（测试边界）`。
- 每课末尾附“术语表”，集中解释本课出现的英文术语。

## 工作区约定

- 导航页：`./index.html`（学习地图：页面关系、知识点联系、复习顺序与方法）
- 课程文件：`./lessons/000N-<dash-case-name>.html`
- 参考文件：`./reference/*.html`
- 学习记录：`./learning-records/000N-<dash-case-name>.md`
- 共享样式：`./assets/style.css`
- 页内目录：由 `./assets/toc.js` 自动扫描 h2 生成；新建 HTML 页面时在 `<head>` 加
  `<script src="../assets/toc.js" defer></script>`（根目录页面用 `assets/toc.js`）

## 工程约定（2026-07-29 移动端适配时建立）

- **手机版**：`mobile/` 是 `node tools/build-mobile.js` 的生成物（单文件内联副本），不是事实来源；
  内容改动只改源文件，改完重跑脚本；手工编辑产物会被覆盖。决策背景见 `docs/adr/0001`。
- **测试**：`node --test tools/build-mobile.test.js`。seam 为构建脚本的 CLI；fixture 测试 +
  真实工作区冒烟。工作区约定 tests 零依赖，用 Node 内置 `node:test`。
- **规格与票**：spec 落 `specs/NNNN-<slug>.md`；ticket 落 `.scratch/<feature-slug>/issues/NN-<slug>.md`；
  架构决策落 `docs/adr/NNNN-<slug>.md`（本工作区无 issue tracker，全部本地化）。
- **版本管理**：git 仓库，远程 https://github.com/liuj66794-sys/mattpocock-skills-learning（公开）。
  本机直连 github.com 的 git 端口不通，仓库级配置了 `http.proxy=http://127.0.0.1:7897`（本地代理），
  推送前需确保代理在运行。
- **skills 更新**：`npx skills@latest add mattpocock/skills -g -y`（必须带 `-g` 装到用户级
  `~/.agents/skills/`；不带会装到项目级 `.agents/skills/` 并生成 `skills-lock.json`，需清理）。
  仓库删掉的 skill 要用 `npx skills@latest remove <names> -g -y` 单独卸载。

## 课程撰写约定（2026-07 与 /teach 对齐时确定）

新课程和对旧课的维护都遵循以下约定（术语定义见 CONTEXT.md）：

- **主源推荐**：每课开头介绍段之后放一个「主源推荐（Primary Source）」callout，链接 GitHub
  `mattpocock/skills` 仓库对应的 `skills/engineering/<name>/SKILL.md`，并附本地
  `~/.agents/skills/<name>/SKILL.md` 路径；不引用第三方二手解读。涉及多个 skill 的课可放多个链接；
  若课尾已有「资料来源」callout，则在其中补 GitHub 链接，不重复建块。
- **引用点缀**：正文关键论断（核心定义、规则列表）处给 2-3 个指向主源的链接即可，不要每段都加。
- **实战任务**：每课末尾（术语表之后、结尾 callout 之前）设编号小节「N. 实战任务」，结构为：
  引导语 + 3-5 步具体操作（`<ol>`）+「自检标准」callout（3-4 条可核对的验收标准）+
  末尾一句"完成后回来告诉我结果（贴出产出或描述过程），我会给你反馈。"
  任务须让用户在自己的真实项目里跑本课所学 skill。
- **交错复习**：第 N 课的测验末尾混入 1-2 道前序课程的题，题干前缀「【复习·第X课】」；
  考点须来自对前序课程文件的实际阅读，选项字数对齐、不靠长度泄题。
- **追问提示**：每课结尾 callout 里固定放一句："学习中有任何不清楚的地方，随时直接问我——我是你的老师，可以针对任何一点展开讲。"
- **测验选项**：同一题各选项字数尽量接近；新增题沿用该文件已有的 quiz 写法
  （0001-0003 为内联 `explanations`，0004 起用 `assets/quiz.js` + `window.quizExplanations`，新文件一律用后者）。
