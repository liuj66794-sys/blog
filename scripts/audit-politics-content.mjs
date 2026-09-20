import fs from 'node:fs'
import { readPoliticsPayload, flashcardCatalog } from './lib/politics-data.mjs'
import { auditPoliticsContent } from './lib/politics-content-audit.mjs'
const root = new URL('../docs/.vuepress/public/lessons/zsb-politics/lessons/', import.meta.url)
const read = name => fs.readFileSync(new URL(name, root), 'utf8')
const cards = readPoliticsPayload(read('srs.html'), 'cards')
const questions = readPoliticsPayload(read('review.html'), 'bank')
const audit = auditPoliticsContent(cards, questions)
const clean = text => String(text ?? '').replace(/\|/g, '／').replace(/\n/g, '<br>')
const splits = Object.entries(flashcardCatalog.splits)
const lines = ['# FLASHCARD CONTENT AUDIT', '', '执行：`node scripts/audit-politics-content.mjs`。报告由源目录及同步后的全部政治数据生成。', '',
  `- 原卡 ${Object.keys(flashcardCatalog.overrides).length} 张全部有显式审校问句，旧 ID 全部保留。`,
  `- ${splits.length} 张复合卡保留主问题，另设 ${splits.reduce((n, [, s]) => n + s.additions.length, 0)} 个显式新 ID；当前 ${cards.length} 张。`,
  `- 选择题 ${questions.length} 道；结构错误 ${audit.errors.length} 项；需复核提示 ${audit.warnings.length} 项；相同问答 ${audit.duplicates.length} 对。`, '',
  '结构检查覆盖 schema、空字段、ID、问句标题、metadata 前缀、选项、答案归属及异常换行。缺少标点或疑问词只是提示；选择题的完整陈述句也可能合法。相同题目可能在不同卷重复，保留卷归属和既有学习 ID，并在下表列出。', '',
  '问答语义经逐卡结合原答案和课程正文审校；自动脚本不能证明政治事实全部正确，也不把简单关键词相交当作主题匹配证据。时政按明确年份提问，不将历史计划改称当前事实。', '',
  '## 显式拆卡清单', '', '| 原 ID（保留） | 新 ID | 原因 |', '| --- | --- | --- |',
  ...splits.map(([id, s]) => `| ${id} | ${s.additions.map(c => c.id).join('<br>')} | ${clean(s.reason)} |`), '',
  '旧 ID 保留主问题及原 SRS；新增卡独立从未学状态开始。原始合并题干/答案保存在 source catalog 的 previousQuestion / previousAnswer 中；不复制旧卡掌握程度到新知识点，不删除旧记录。跨课相似考点保留旧 ID，避免丢失复习历史。', '',
  '## 扫描结果', '', '| 引用 | 类型 | 文本或对应 ID |', '| --- | --- | --- |',
  ...audit.errors.concat(audit.warnings, audit.duplicates).map(x => `| ${x.ref} | ${x.reason} | ${clean(x.text || x.sameAs)} |`), '',
  '## 事实纠正的核验来源', '',
  ...Object.entries(flashcardCatalog.evidence || {}).flatMap(([id, refs]) => [`- 卡片 ${id}：`, ...refs.map(r => `  - [${clean(r.note)}](${r.url})`)]), '',
  '## 仍需明确的边界', '',
  '- 原始题库中标记缺答案或存疑的题，不猜答案，不进入无依据的自动判分；上述扫描会持续列出。',
  '- 手机持续空白尚未稳定复现；已有浏览器布局、状态、监听器测试与调试字段，不能据此宣称特定手机故障根因已证明。', '']
fs.writeFileSync(new URL('../FLASHCARD_CONTENT_AUDIT.md', import.meta.url), lines.join('\n'))
const selected = ['七大理论阐述', '活的灵魂', '三大法宝', '两大历史任务', '报告制度', '两个大局', '加入世贸组织', '现代化经济体系定位', '社会主义核心价值体系', '总体方略十定位', '四唯', '二十届四中全会', '蛟龙', '百团大战', '电竞', '宁夏', '金砖', '海南', '诺贝尔', '青春', '首次', '三个务必', '核心价值观', '根本政治制度', '六个必须坚持']
const chosen = []
for (const term of selected) {
  const card = cards.find(c => !chosen.includes(c) && (flashcardCatalog.overrides[c.id]?.previousQuestion || '').includes(term))
  if (card) chosen.push(card)
}
for (const c of cards) if (chosen.length < 27 && !chosen.includes(c) && c.lessonId === 'sz00') chosen.push(c)
fs.writeFileSync(new URL('../FLASHCARD_REVIEW_SAMPLE.md', import.meta.url), ['# FLASHCARD REVIEW SAMPLE', '',
  '用户后续已授权继续全量修复与发布；此表保留 27 张代表性样本供检查。完整内容与历史字段见 `scripts/data/politics-flashcards.json`。', '',
  '| 旧 term | 新 question | answer | 是否拆卡 | ID 是否变化 | 修改理由 |', '| --- | --- | --- | --- | --- | --- |',
  ...chosen.map(c => { const e = flashcardCatalog.overrides[c.id], s = flashcardCatalog.splits[c.id]; return `| ${clean(e.previousQuestion)} | ${clean(c.question)} | ${clean(c.answer)} | ${s ? '是：' + s.additions.map(a => a.id).join('<br>') : '否'} | 主卡保留 ${c.id} | ${clean(s?.reason || '明确主体、适用范围及预期回答维度；依据原答案限定问题，避免仅展示知识点标题。')} |` }), ''].join('\n'))
console.log(JSON.stringify({ ...audit, warnings: audit.warnings.length, duplicates: audit.duplicates.length }, null, 2))
if (audit.errors.length) process.exitCode = 1
