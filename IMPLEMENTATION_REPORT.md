# IMPLEMENTATION REPORT — 政治复习 / 闪卡系统

日期：2026-09-21。范围：A → B → C，以及用户后续授权的全量内容审校和发布。基线：`0549017`。实现位于 `deploy-work`。发布提交和 Pages 状态在最终交付消息给出。

## 1. 交付结论与报告更正

已建立 canonical 数据导入、稳定题目 ID 注册表、135 个旧 ID alias、每日闪卡 session、持久化失败保护和翻面生命周期边界。原阶段 A/B/C 完成后，按用户后续指令继续审校 631 张原卡，26 张复合卡拆出 38 张新卡，共 669 张。完成源同步、250 项自动测试、生产构建、站内链接检查和本地真实浏览器验证。

**更正第一阶段的一项判断：**“13 道带顿号的多选答案在当前运行时必然判错”不成立。原 `mountQuiz()` 已在入口去除顿号；第一阶段只检查了内部比较表达式，遗漏入口转换。停止按该错误判断修复判分；本次遵照新的规范，将答案解析前移至导入层，13 道题及其余选择题均输出字母数组，运行时只比较数组。旧用户记录的兼容迁移仍可读取历史字符串，这是记录迁移，不是题库运行时解析。

**未宣称手机“持续空白”已解决。**现有证据只能确认并修复队列越界、完成态误操作、监听器生命周期和长内容布局问题。未获得真实手机持续空白的稳定复现与因果链。

## 2. 修改文件及职责

以下路径均相对本仓库根目录。

| 文件 | 主要改动 |
| --- | --- |
| `scripts/runtime/politics-schema.mjs`（新增） | Flashcard / Question 校验；canonical Question 到统一错题本的单向投影 |
| `scripts/lib/politics-data.mjs`（新增） | 唯一导入边界；答案数组化；原题恢复；metadata 分离；旧模板 ID 生成移除 |
| `scripts/data/politics-question-ids.json`（新增） | 1380 个稳定题目 ID、原始题干及 135 个历史 alias |
| `scripts/data/politics-flashcards.json`（新增） | 631 个显式问句覆盖、26 个拆卡计划、38 个新 ID、原内容留档与事实核验来源 |
| `scripts/sync-prep.mjs` | 镜像与正文转换使用同一规范化入口；增加 `--politics-only`，避免重生成其他课程 |
| `scripts/generate-question-index.mjs`、`scripts/lib/course-question-index.mjs` | 统一题目 ID、题干、答案及 alias 输出 |
| `scripts/lib/lesson-convert.mjs` | 章末题引用 canonical ID，读取 canonical 字段 |
| `scripts/runtime/politics-card-session.mjs`（新增） | 无 DOM 的每日学习状态机 |
| `scripts/runtime/politics-quiz.js` | Quiz 消费 canonical 数据；替换旧 cards/order/pos 实现；SRS 保存事务、同日防重；DOM、键盘、调试、生命周期 |
| `scripts/runtime/lesson-shell.css` | 双面参与高度计算、长文本换行、完成态与禁用态 |
| `scripts/lib/lesson-assets.mjs` | 将同一状态机源文件装配进发布运行时，避免测试与页面各有一套算法 |
| `scripts/runtime/mistake-store.mjs`、`scripts/runtime/lesson-mistakes.mjs` | canonical 字段传递；alias 合并；表示格式变化不重置掌握状态 |
| `docs/.vuepress/components/ReviewNotebook.vue`、`docs/.vuepress/review-session.mjs` | canonical 题干显示；有标签的章节 metadata；旧 ID 会话草稿恢复 |
| `scripts/lib/politics-data.test.mjs`、`scripts/lib/politics-card-session.test.mjs`（新增） | 全量数据、迁移与状态机回归 |
| `scripts/lib/politics-progress.test.mjs`、`scripts/lib/review-session.test.mjs`、`scripts/lib/teaching-flow.test.mjs`、`scripts/lib/lesson-assets.test.mjs` | 持久化、会话草稿、真实运行时代码的 DOM 测试、装配测试 |
| `scripts/browser/politics-layout-probe.js`（新增） | 可重复执行的真实浏览器布局和动画断言，仅允许 localhost，自动清理临时节点与会话 |

生成物通过 `node scripts/sync-prep.mjs --politics-only` 更新：28 个政治课程 HTML、每日卡/刷题/混合测试 3 个工具页、政治 `assets/quiz.js`，以及共享的 `lesson-mistakes.mjs`、`mistake-store.mjs`、`lesson-shell.css`、政治题目索引。没有直接手改生成物。

## 3. Schema 与数据流

```ts
type Flashcard = {
  schemaVersion: 1
  id: string
  lessonId: string
  question: string
  answer: string
  knowledgePoint: string
  chapter: string
  source: { label: string }
  contentVersion: number
  editorialStatus?: 'legacy' | 'reviewed'
}

type Question = {
  schemaVersion: 1
  contentVersion: number
  id: string
  lessonId: string
  kind: 'choice'
  question: string
  options: { value: string; text: string }[]
  answer: string[] // 例如 ["A", "C", "D"]
  answerStatus: 'provided' | 'missing' | 'doubt'
  explanation: string
  chapter: string
  knowledgePoint: string
  source: { path: string; label: string; paperTitle: string; course: string }
  legacyQuestion: string // 注册过的原题，用于表示变化兼容校验
  grp: string
  warn: string
}
```

- `question / answer` 是问答内容真值；canonical Flashcard 不再保留 `term/front/back`。
- 631 个旧 `term` 保留为 `knowledgePoint`，question 使用独立审校后的显式问句；新增 38 张拆卡同样经过严格校验。生产数据全部为 `editorialStatus: reviewed`，未审校或标题式问句会阻断同步。
- 明确主体、适用范围、时间/人物/会议条件及回答维度，不运行机械标题补词算法。问答关系逐卡结合原答案和正文审校；27 张代表性样本见 `FLASHCARD_REVIEW_SAMPLE.md`，完整清单及扫描见 `FLASHCARD_CONTENT_AUDIT.md`。
- 当前 Question 覆盖实际进入自动判分、混合测试与错题索引的 **1380 道选择题**。静态展开式主观问答未改写、未新增自动判分。
- 统一错题本为兼容其他学科，仍有 `stem` / 字符串 `source`，它们由 `questionForNotebook()` 单向投影生成；canonical 政治题显示读取 `question`，不建立第二份可编辑正文。
- metadata 独立显示，例如 `章节：导论`；不拼进题干。原文题目自身合法出现的“导论”保留，不做全局删词。

```text
原始课程/题库 HTML payload
  → sync-prep / normalizePoliticsHtml
  → importFlashcard / importQuestion + 稳定 ID 注册表
  → canonical payload
  ├→ 章末测验 / 题库卷 / 混合测试 → mountQuiz
  ├→ questionForNotebook → 统一索引及 alias → ReviewNotebook
  └→ 每日闪卡 → SRS 到期判断 → createCardSession → mountCards → UI
```

遇到未注册题目 ID 时导入失败，要求明确登记身份；不会再由不同入口临时猜算新 ID。

## 4. 每个已确认根因的处理

| 根因 | 实现及边界 |
| --- | --- |
| term 标题直接作为 front，缺乏问答规范 | 增加 canonical contract、兼容导入和 editorial gate；保留 ID。631 张原卡完成问句审校；26 张复合卡保留主问题，独立知识点用 38 个显式新 ID |
| 每日队列只在挂载时截取一组，循环 pos 无完成态 | 替换为独立 session；评分成功移除当前待学 ID，组末显示剩余量与下一组入口；下一组重新查询 SRS |
| 旧洗牌只改顺序，没有“本组未完成队列” | 只打乱 remainingIds，重置 index=0 / face=front；空队列不允许洗牌 |
| UI 可循环重复评分，SRS 写失败仍继续 | 状态机背面才能评分；saving 禁操作；SRS 同日本地日期防重；写入成功后才移除卡，失败保留背面并显示重试提示 |
| 到期数字来自初始快照 | 每次状态变化重新从 SRS 计算 due/new，DOM 同步刷新；跨实例事件刷新 |
| 切卡、越界和完成态缺少统一边界 | 无有效 currentCard 时不渲染、不翻转、不评分；切卡替换卡片节点并原子恢复 front；旧背面不会反转露出新卡内容 |
| mountCards 的 document keydown 缺乏生命周期隔离 | 重挂载先 dispose；只响应活动且在视口内的实例；过滤 repeat/composing/修饰键及输入控件；卸载清理 document/window 监听器；移出 DOM 自动清理 |
| 浏览器往返缓存可能保留页面 DOM | persisted pagehide 保留控制器，pageshow 刷新；真正 pagehide 才 dispose，避免返回后卡片失效 |
| 两个 absolute face 不能撑开容器 | 双面改为同一 grid 单元参与固有高度，长文本换行；保留父卡 3D transform 和普通翻转动画 |
| 导入/混测入口拼接课程与试卷标题 | 从登记的原题恢复题干；chapter/source/course/paperTitle 独立 metadata；ReviewNotebook 明确标注章节 |
| 135 道章末题在不同入口生成两套 ID | 统一使用已存在的章末稳定 ID，MD5 历史 ID 映射到该 ID，迁移统一错题记录及会话草稿 |

## 5. Migration 策略与数据保护

1. **闪卡**：631 个旧 ID 原样保留，继续读取 `zzkk:v2:card:<id>`。question/answer 字段调整不重新计算 ID，也不清空 SRS。26 个显式 `splits` 计划声明 retainedId / additions / reason / previousQuestion / previousAnswer；旧 ID 继续代表原卡主问题，38 个新 ID 从未学状态开始，不复制旧卡掌握程度。原合并内容完整留档；aliases 暂为空，因为不存在旧 ID 更名。重复同步不会再添加一轮子卡。
2. **题目**：135 个旧 mixed ID → canonical 章末 ID；题库卷的 1245 个 ID 保留。章末/试卷/混测/索引一致性已逐题检查。
3. **历史合并**：错误次数相加；保留两侧不同笔记；合并 attempt IDs；状态采用更新时间较新的记录；原记录完整保存在 `migrationHistory`，旧 ID 进入 `legacyIds`。重复执行不再次累计。
4. **格式变化不降级掌握状态**：只有原题、选项、答案确实相同，且差异仅来自登记过的前缀/答案表示时，才判为等价。真正答案内容改变仍触发既有的重新复习机制。
5. **草稿**：旧会话中的题目 ID、signature、已选答案、提交结果及未保存笔记映射到 canonical ID。
6. **写入失败**：迁移在内存准备完成后一次性写入；失败不覆盖原 store。旧 `zzkk:v2:wrong:*` 等历史存储保持不动，不执行清空。
7. **新 session**：存 sessionStorage；持久 SRS 仍是 localStorage 真值。若 session 写入丢失，恢复时剔除已经由 SRS 成功记录的卡。刷新不会再次推进 box。

## 6. Session 状态机

核心字段：`mode / batchIds / remainingIds / currentCardIndex / reviewedIds / face / phase`；另有会话版本、日期和错误信息。

```text
idle → front ↔ back
                 └─ grade → saving
                              ├─ 保存失败 → back（原卡、原数量）
                              └─ 保存成功 → 移除 ID → next front
                                                   └─ 当前组清空
                                                        ├─ 仍有可学卡 → batchComplete
                                                        │                └─ 学习下一组 → 新 due queue → front
                                                        └─ 无可学卡 → dailyComplete
```

`batchIds` 是本组初始名单，`remainingIds` 是本组尚未完成的名单；下一组不从旧数组分页，而是重新查询 canonical 卡片与 SRS。每日默认 10 张；原有 limit 参数继续有界支持。新卡与随机加练共用状态机，同日已经评分的卡不再推进 box。

调试入口：页面参数 `?debugFlashcards=1`。在卡组容器上读取 `flashcardDebug` / `flashcardDebugHistory`（最多 100 条），包含 `cardId / phase / currentCardIndex / queueLength / questionLength / answerLength / flipStart / flipEnd`。减少动态效果时立即记录 flipEnd，普通模式由 transform transitionend 记录。未上传任何日志。

## 7. 测试结果

各阶段均执行了针对性测试与 diff 检查。最终结果：

| 检查 | 结果 |
| --- | --- |
| `node --test` | **250 passed，0 failed** |
| 全量数据检查 | 669 个唯一闪卡 ID（631 个原 ID + 38 个新 ID）；135 章末 + 1245 题库选择题；1380 canonical ID；135 alias；各入口题干/答案/选项一致 |
| schema / 导入 | 空值、坏字段、重复选项、选项外答案、字符串答案拒绝；旧顿号答案导入成数组；metadata 不污染 question |
| ID 与记录迁移 | 错误次数、两份笔记、掌握状态、历史快照和草稿保留；重复迁移幂等；失败不覆盖 |
| 每日数量边界 | 0 / 1 / 9 / 10 / 11 / 20 / 47 全覆盖 |
| 连续复习 | 单测及真实浏览器均验证 **47 → 37 → 27 → 17 → 7 → 0**，无刷新 |
| 评分边界 | 同日重复调用/重载不重复升盒；背面以外和完成态不能评分；快速翻面/评分/切卡；保存失败原卡保留、重试成功才前进 |
| 队列与恢复 | 部分完成洗牌仅含本组未完成卡；index=0 / front；刷新恢复顺序；坏快照和越界保护；跨日和重新可见时重建新一天队列，旧背面不能误评分 |
| DOM 生命周期 | 两实例仅活动实例响应；repeat/textarea 过滤；重挂载不叠加监听器；dispose 清零；浏览器往返缓存边界 |
| 浏览器窄屏 | 320 / 390px × 普通 / reduced-motion，四组布局断言通过；195 字问题、480 字答案无裁切和横向溢出 |
| 动画与调试 | 普通 transition=0.5s；reduced-motion=0s；两种模式都有有效 flipStart/flipEnd |
| `pnpm typecheck` | 通过 |
| `pnpm docs:build` | 通过，252 页；有构建体积/插件耗时提示，不影响完成 |
| `node scripts/check-links.mjs` | 20,040 个站内链接有效 |
| `git diff --check` | 通过 |

浏览器使用隔离的 localhost 预览；测试前保存并在结束时恢复该来源的 localStorage/sessionStorage，未触碰线上用户记录。模拟 Storage 写入失败实测得到：同一 cardId、phase=back、持久记录仍为 null；重试成功后 pending 数才减少。真实 xg00 教材题现在显示独立 `章节：导论`，题干不再夹入该标签。

浏览器布局探针需在真实浏览器开发者工具执行；它不包含在 Node 的 250 项计数中。用设备工具分别设置 320/390px，再切换 prefers-reduced-motion，执行 `scripts/browser/politics-layout-probe.js` 即可复测。临时长问答仅为测试夹具，不写入题库。

## 8. 内容核验与可重复审计

执行 `node scripts/audit-politics-content.mjs`，输出审计报告和 27 张样本。新增 `scripts/lib/politics-content-audit.mjs` 及其测试；生产的 669 张闪卡和 1380 道选择题结构错误为 0。

577 条提示是：348 道原卷缺答案、2 道原卷标记存疑、226 道选择题没有疑问词或填空符号、1 道短选择题“科学发展观（ ）。”。这些提示不能一概视为坏题；合法陈述式选题及原文短题保留。另检测到 50 对相同问答，主要来自不同试卷；保留卷归属和旧记录，不通过删题消除统计。报告逐项列出，缺答案/存疑继续禁止无依据自动判分。

发现并依据权威来源纠正三处课程事实：百团大战对应战略相持阶段；将“探索三号/奋斗者”与“深海一号/蛟龙”的北极任务分别归属；电竞奥运会的原定时间明确为历史计划，并补充 2025-10-30 合作终止信息。来源链接在 flashcard catalog 和内容审计报告。更正通过 `course-corrections.json` 维护并同步正文，未手工 patch 发布 HTML。

目录首页的 due-data 清单、每课卡数及每日卡使用同一注册表，共 669 个 ID。新增卡不会被目录漏算。改变 question/answer 不改变旧学习键；显式拆卡子卡不继承掌握状态。

固定脚本 URL 还存在升级缓存兼容风险：新 schema 页面可能复用旧 renderer。同步层现为政治 quiz.js 和 lesson-shell.css 添加由实际内容生成的版本参数；JS 或 CSS 变化都会变更 URL，且重复同步幂等。新增回归检查覆盖该边界。这是发布可靠性补充，不作为手机持续空白的已证实根因。

## 9. Git diff 与发布范围

包含数据规范、导入及稳定 ID、记录迁移、状态机、运行时/CSS、测试、内容源目录、三个报告以及由源同步生成的政治页面和共享学习资产。生成的大 JSON 差异是 canonical payload 与审校内容正常产出。未改其他学科内容。原有未跟踪 `.tmp*` / `.tmpwork` 全部保留并排除在提交之外。

本地验证：250 项测试、typecheck、252 页生产构建、20,040 个站内链接、git diff --check 均通过；最终浏览器实测再次通过五组连续路径、保存失败保护、部分洗牌和刷新恢复，以及 320/390px 的长问答和普通/reduced-motion 布局。GitHub Pages 仍须以对应发布工作流完成为上线凭据，不能只以 git push 成功代替上线验证。

## 10. 尚未证明或仍有边界的问题

- 手机“持续空白”尚未稳定复现，不能声称该特定故障根因已证明。已修复可确定的状态/生命周期/布局边界并保留调试信息；本地 Chromium 通过不等于覆盖用户手机 GPU、系统和后台恢复环境。
- 原卷 348 道缺答案、2 道答案存疑继续透明提示，未猜造权威答案。226 条陈述式题干提示和跨卷重复题保留原考试来源。
- 自动检查能阻断结构错误，不能证明所有政治事实或问答语义正确。全量内容审校与事实证据独立于 schema 校验，报告保留人工复核入口。
- 本次未删除任何旧学习记录。部署仅更新代码与内容；真实用户本机数据须在访问新版后由兼容层按需迁移。
