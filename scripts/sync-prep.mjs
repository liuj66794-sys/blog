#!/usr/bin/env node
/**
 * sync-prep：知识库《29周冲刺计划》→ 博客「备考」区（docs/prep/）单向同步。
 *
 * 内容源（唯一编辑地）：
 *   D:/01-Documents/Knowledge/知识库/知识中心/学习区域/专升本/29周冲刺计划.md
 * 生成：
 *   docs/prep/README.md        总览（倒计时/当前周/总则/周次一览/打卡说明/历史学情）
 *   docs/prep/NN-<slug>.md     四科周计划打卡页（勾选状态存浏览器 localStorage，
 *                              由 client.js enhancePrep 持久化，不回写知识库）
 *
 * 幂等：内容无变化跳过写入；createTime 沿用已生成文件的值。
 * 校验：必须解析出连续的 W1..W29、每周四科齐全、阶段名合法，否则 exit 1。
 * CI：源文件不存在时告警并跳过（生成物随仓库提交，deploy 不依赖本机盘）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEST_DIR = path.join(ROOT, 'docs', 'prep')
const SOURCE =
  process.env.ZSB_PLAN_SOURCE ??
  'D:/01-Documents/Knowledge/知识库/知识中心/学习区域/专升本/29周冲刺计划.md'

const SUBJECTS = [
  { key: '高数', slug: 'gaoshu' },
  { key: '英语', slug: 'yingyu' },
  { key: '政治', slug: 'zhengzhi' },
  { key: '计算机', slug: 'jisuanji' },
]
const TOTAL_WEEKS = 29
const PHASES = ['强化刷题', '真题两轮', '冲刺押题']

/* ---------------- 解析 ---------------- */

/** 阶段字段容错归一：「强化刷题 · 国庆半负荷」→ 强化刷题；「考试周」→ 冲刺押题 */
function canonicalPhase(raw) {
  const base = raw.split('·')[0].trim()
  if (PHASES.includes(base)) return base
  const partial = PHASES.find((p) => base.startsWith(p))
  if (partial) return partial
  if (base.includes('考试')) return PHASES[PHASES.length - 1]
  return base
}

function parseSource(md) {
  const examDate = md.match(/^exam-date:\s*(\d{4}-\d{2}-\d{2})\s*$/m)?.[1]
  if (!examDate) throw new Error('源文件 frontmatter 缺 exam-date')

  const general = md.match(/^## 总则\n([\s\S]*?)^## 周计划\s*$/m)?.[1]?.trim()
  if (!general) throw new Error('缺少「## 总则」节（以 ## 周计划 结尾）')

  const headingRe = /^### (W(\d+)) ｜ (\d{2}-\d{2}) ~ (\d{2}-\d{2}) ｜ (.+)$/gm
  const heads = [...md.matchAll(headingRe)]
  if (heads.length === 0) throw new Error('未解析到任何周标题（格式：### W1 ｜ 09-07 ~ 09-13 ｜ 阶段）')

  const weeks = heads.map((h, i) => {
    const end = heads[i + 1]?.index ?? md.length
    const block = md.slice(h.index + h[0].length, end)
    const items = {}
    for (const line of block.split('\n')) {
      const m = line.match(/^- (高数|英语|政治|计算机|周六|备注|全科)：(.*)\s*$/)
      if (m) items[m[1]] = m[2].trim()
    }
    return { no: Number(h[2]), label: h[1], start: h[3], end: h[4], phase: canonicalPhase(h[5]), items }
  })

  const problems = []
  weeks.forEach((w, i) => {
    if (w.no !== i + 1) problems.push(`${w.label}：周序号应为 ${i + 1}`)
    if (!PHASES.includes(w.phase)) problems.push(`${w.label}：未知阶段「${w.phase}」`)
    for (const s of SUBJECTS) {
      if (!w.items[s.key] && !w.items['全科']) problems.push(`${w.label}：缺「${s.key}」条目（也无「全科」）`)
    }
  })
  if (weeks.length !== TOTAL_WEEKS) problems.push(`周数应为 ${TOTAL_WEEKS}，实际 ${weeks.length}`)
  if (problems.length) throw new Error(`源文件校验失败：\n- ${problems.join('\n- ')}`)

  return { examDate, general, weeks }
}

/* ---------------- 生成 ---------------- */

/** MM-DD → 完整年份（考试年 3 月往前推：9 月及以后属上一年） */
function fullDate(examDate, mmdd) {
  const year = Number(mmdd.slice(0, 2)) >= 6 ? Number(examDate.slice(0, 4)) - 1 : examDate.slice(0, 4)
  return `${year}-${mmdd}`
}

function timestamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function weekFlags(week) {
  const text = Object.values(week.items).join('；')
  const flags = []
  if (text.includes('🏁')) flags.push('🏁 里程碑')
  if (text.includes('⚠️')) flags.push('⚠️ 待补')
  const day = text.match(/国庆|元旦|春节|考试周|半负荷|减负/)
  if (day) flags.push(day[0])
  return flags.join(' · ') || '—'
}

function phaseRanges(weeks) {
  const ranges = []
  for (const phase of PHASES) {
    const inPhase = weeks.filter((w) => w.phase === phase)
    ranges.push({ phase, from: inPhase[0].no, to: inPhase[inPhase.length - 1].no, endDate: inPhase[inPhase.length - 1].end })
  }
  return ranges
}

function renderReadme({ examDate, general, weeks }) {
  const phaseEnds = phaseRanges(weeks)
  const nowAttrs = [
    `data-start="${fullDate(examDate, weeks[0].start)}"`,
    ...phaseEnds.map((p, i) => `data-p${i + 1}="${fullDate(examDate, p.endDate)}" data-p${i + 1}n="${p.phase}"`),
  ].join(' ')

  const subjectLinks = SUBJECTS.map(
    (s, i) => `| ${s.key} | [${s.key} · ${weeks[0].label}-W${TOTAL_WEEKS} 打卡](/prep/${String(i + 1).padStart(2, '0')}-${s.slug}/) |`,
  )

  const table = weeks
    .map((w) => `| ${w.label} | ${w.start} ~ ${w.end} | ${w.phase} | ${weekFlags(w)} |`)
    .join('\n')

  return `---
title: 备考总览
createTime: __CREATE_TIME__
permalink: /prep/
---

# 专升本 29 周冲刺计划

考期：<strong>${examDate}</strong> ｜ <span id="exam-countdown" data-exam="${examDate}"></span> ｜ <span id="prep-now" ${nowAttrs}></span>

## 总则

${general}

## 四科周计划

| 科目 | 周计划页 |
| ---- | -------- |
${subjectLinks.join('\n')}

> [!TIP] 打卡说明
> 勾选状态保存在**当前浏览器**（localStorage），换设备或清理浏览器数据后不保留；学习进度的权威记录仍以知识库笔记与错题本为准。改计划内容请编辑知识库源文件《29周冲刺计划》，然后在博客仓库跑 \`pnpm sync:prep\` 重新生成。

## 周次一览

| 周 | 日期 | 阶段 | 标记 |
| --- | --- | --- | --- |
${table}

## 历史学情

备考系统课程上线前的错题驱动迷你课（已被备考区取代，仅作学情记录，页面保留）：

- [政策学习（已归档）](/courses/policy/)——毛概错题复盘 5 课与错误模式分析
- [英语教学（已归档）](/courses/english/)——英语薄弱点突破 4 课（不定代词 / 介词搭配 / 比较级）
`
}

function renderSubject(subject, { weeks }) {
  const sections = PHASES.map((phase) => {
    const inPhase = weeks.filter((w) => w.phase === phase)
    const blocks = inPhase
      .map((w) => {
        // 该周科目任务；无专属条目时（如考试周）回落到「全科」行
        const task = w.items[subject.key] ?? w.items['全科']
        const lines = [`- ${subject.key}：${task}`]
        const sat = w.items['周六']
        if (sat && (sat.includes(subject.key) || sat.includes('全科') || sat.includes('四科'))) {
          lines.push(`- 周六：${sat}`)
        }
        if (w.items['备注']) lines.push(`- 备注：${w.items['备注']}`)
        return `### ${w.label} ｜ ${w.start} ~ ${w.end}\n\n${lines.join('\n')}\n\n<label class="prep-check"><input type="checkbox" data-key="w${w.no}"> ${w.label} 完成（${w.start} ~ ${w.end}）</label>`
      })
      .join('\n\n')
    return `## ${phase}（W${inPhase[0].no}-W${inPhase[inPhase.length - 1].no}）\n\n${blocks}`
  })

  return `---
title: 备考 · ${subject.key}
createTime: __CREATE_TIME__
permalink: /prep/${subject.slug}/
---

# ${subject.key} · 周打卡

进度：<span id="prep-progress"></span>。每周轮换与每日节奏见 [备考总览](/prep/)；课程内容入口见四科课程站（后续批次收录）。

${sections.join('\n\n')}
`
}

/* ---------------- 写入 ---------------- */

/** 写入（内容无变化跳过）；createTime 沿用已有文件，首次生成为当前时间 */
function writeFileIfChanged(file, rendered) {
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
  const createTime = prev?.match(/^createTime:\s*(.+)$/m)?.[1] ?? timestamp()
  const content = rendered.replace('__CREATE_TIME__', createTime)
  if (prev === content) {
    console.log(`  = ${path.relative(ROOT, file)}（无变化）`)
    return false
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  console.log(`  + ${path.relative(ROOT, file)}`)
  return true
}

/* ---------------- 主流程 ---------------- */

const main = () => {
  if (!fs.existsSync(SOURCE)) {
    console.warn(`[sync-prep] 内容源不存在，跳过（生成物以仓库为准）：${SOURCE}`)
    return
  }
  const parsed = parseSource(fs.readFileSync(SOURCE, 'utf8'))
  console.log(`[sync-prep] 解析 ${parsed.weeks.length} 周，考试日 ${parsed.examDate}`)
  let changed = writeFileIfChanged(path.join(DEST_DIR, 'README.md'), renderReadme(parsed))
  for (const [i, subject] of SUBJECTS.entries()) {
    const file = path.join(DEST_DIR, `${String(i + 1).padStart(2, '0')}-${subject.slug}.md`)
    changed = writeFileIfChanged(file, renderSubject(subject, parsed)) || changed
  }
  console.log(`[sync-prep] 完成${changed ? '' : '（全部无变化）'}`)
}

try {
  main()
} catch (err) {
  console.error(`[sync-prep] 失败：${err.message}`)
  process.exit(1)
}
