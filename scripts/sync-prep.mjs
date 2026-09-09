#!/usr/bin/env node
/**
 * sync-prep.mjs —— 知识库专升本内容 → 博客「备考」区单向同步。
 *
 * 内容源（唯一编辑地）：
 *   D:/01-Documents/Knowledge/知识库/知识中心/学习区域/专升本/29周冲刺计划.md
 *   D:/01-Documents/Knowledge/知识库/专升本/{高数,英语,政治/课程,计算机}/  （课程站）
 *
 * 三个环节：
 *   1. 计划页   29周计划 → docs/prep/（总览 + 四科周打卡，勾选存浏览器 localStorage）
 *   2. 课程站镜像 四科 lessons/assets 等 → public/lessons/<zsb-slug>/（事务化换入 +
 *               导航条注入，同 sync-learn；原始 PDF/笔记层/题库 md 不进镜像）
 *   3. 全文转换  四科课件 HTML → docs/courses/<zsb-slug>/（README 目录页 + l/ 全文页，
 *               lesson-convert 转换，随堂测折叠核对；政治功能页不转换只保留交互版）
 *
 * 幂等：镜像 staging 每轮全新 + 换入；生成页按内容比对跳过。
 * 校验：计划必须 W1..W29 且四科齐全；课程源目录 <3 文件拒换入。
 * CI：源盘不存在时告警跳过（生成物随仓库提交，deploy 不依赖本机盘）。
 */
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withBase } from '../docs/.vuepress/site-meta.mjs'
import { lessonHtmlToMarkdown } from './lib/lesson-convert.mjs'
import { injectLessonNav } from './lib/lesson-nav.mjs'
import { installLearningAssets, installLessonRuntime, stripMissingFontUrls } from './lib/lesson-assets.mjs'
import { collectPrepLessons } from './lib/prep-catalog.mjs'
import { buildStudyPlan, linkedLessons, linkedTools } from './lib/study-plan.mjs'
import { prepCatalog as previousCatalog } from '../docs/.vuepress/prep-catalog.mjs'
import { patchPoliticsLearning } from './lib/politics-learning-patch.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')
const DEST_DIR = path.join(DOCS, 'prep')
const PUBLIC_LESSONS = path.join(DOCS, '.vuepress', 'public', 'lessons')
const STAGING_DIR = '.staging-prep'
const SOURCE =
  process.env.ZSB_PLAN_SOURCE ??
  'D:/01-Documents/Knowledge/知识库/知识中心/学习区域/专升本/29周冲刺计划.md'
const ZSB_ROOT = process.env.ZSB_COURSES_ROOT ?? 'D:/01-Documents/Knowledge/知识库/专升本'

const SUBJECTS = [
  { key: '高数', slug: 'gaoshu' },
  { key: '英语', slug: 'yingyu' },
  { key: '政治', slug: 'zhengzhi' },
  { key: '计算机', slug: 'jisuanji' },
]
const TOTAL_WEEKS = 29
const PHASES = ['强化刷题', '真题两轮', '冲刺押题']

/** 专升本四科课程站（批次 2 镜像 + 批次 3 全文转换）。
 *  keep：进公开镜像的白名单（同 sync-learn MIRROR_KEEP 思路——笔记层/原始
 *  PDF/题库 md/生成脚本一律不发布）；skip：不转站内全文的课件（总览/功能页），
 *  交互版仍随镜像发布；numeric：文件名 0001-x.html 按课号出 l/<no>/，
 *  否则按文件名出 l/<名>/（政治 mzt00/xg17）。 */
const ZSB_COURSES = [
  {
    slug: 'zsb-math', name: '备考·高数', subject: '高数', prepSlug: 'gaoshu',
    src: `${ZSB_ROOT}/高数`,
    keep: ['lessons', 'assets', 'reference', 'index.html', 'MISSION.md', 'RESOURCES.md'],
    entry: '/lessons/zsb-math/',
    lessonsDir: 'lessons', skip: [], numeric: true,
  },
  {
    slug: 'zsb-english', name: '备考·英语', subject: '英语', prepSlug: 'yingyu',
    src: `${ZSB_ROOT}/英语`,
    keep: ['lessons', 'assets', 'MISSION.md', 'RESOURCES.md'],
    entry: '/lessons/zsb-english/lessons/course.html',
    lessonsDir: 'lessons', skip: ['course'], numeric: true,
  },
  {
    slug: 'zsb-politics', name: '备考·政治', subject: '政治', prepSlug: 'zhengzhi',
    src: `${ZSB_ROOT}/政治/课程`,
    keep: ['lessons', 'assets', 'reference', 'index.html', 'MISSION.md', 'RESOURCES.md'],
    entry: '/lessons/zsb-politics/',
    lessonsDir: 'lessons', skip: ['practice', 'review', 'srs', 'wrong'],
    numeric: false, order: ['mzt', 'xg', 'sz'],
    tools: [
      { file: 'practice.html', title: '刷题场' },
      { file: 'srs.html', title: '每日闪卡' },
      { file: 'wrong.html', title: '错题本' },
      { file: 'review.html', title: '混合测试' },
    ],
  },
  {
    slug: 'zsb-cs', name: '备考·计算机', subject: '计算机', prepSlug: 'jisuanji',
    src: `${ZSB_ROOT}/计算机`,
    keep: ['lessons', 'assets', 'reference', 'attachments', 'MISSION.md', 'RESOURCES.md'],
    entry: '/lessons/zsb-cs/lessons/index.html',
    lessonsDir: 'lessons', skip: ['index', 'mistakes'], numeric: true,
    tools: [{ file: 'mistakes.html', title: '错题本' }],
  },
]

/* ---------------- 计划解析 ---------------- */

/** 阶段字段容错归一：「强化刷题 · 国庆半负荷」→ 强化刷题；「考试周」→ 冲刺押题 */
function canonicalPhase(raw) {
  const base = raw.split('·')[0].trim()
  if (PHASES.includes(base)) return base
  const partial = PHASES.find((p) => base.startsWith(p))
  if (partial) return partial
  if (base.includes('考试')) return PHASES[PHASES.length - 1]
  return base
}

export function parseSource(md) {
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

/* ---------------- 生成：计划页 ---------------- */

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

export function renderReadme({ examDate, general, weeks }) {
  const phaseEnds = phaseRanges(weeks)
  const nowAttrs = [
    `data-start="${fullDate(examDate, weeks[0].start)}"`,
    ...phaseEnds.map((p, i) => `data-p${i + 1}="${fullDate(examDate, p.endDate)}" data-p${i + 1}n="${p.phase}"`),
  ].join(' ')

  const table = weeks
    .map((w) => `| ${w.label} | ${w.start} ~ ${w.end} | ${w.phase} | ${weekFlags(w)} |`)
    .join('\n')

  return `---
title: 备考中心
createTime: __CREATE_TIME__
permalink: /prep/
readingTime: false
comments: false
---

<PrepDashboard />

考期：<strong>${examDate}</strong> ｜ <span id="exam-countdown" data-exam="${examDate}"></span> ｜ <span id="prep-now" ${nowAttrs}></span>

<details class="study-full-plan">
<summary>查看完整 29 周计划与背景</summary>

## 29 周学习计划

${general}

> [!TIP] 打卡说明
> 勾选状态保存在**当前浏览器**。换设备前可在本页导出统一学习备份，再在另一设备导入。请同时保留自己的学习笔记与错题记录。

## 周次一览

| 周 | 日期 | 阶段 | 标记 |
| --- | --- | --- | --- |
${table}

## 历史学情

备考系统课程上线前的错题驱动迷你课（已被备考区取代，仅作学情记录，页面保留）：

- [政策学习（已归档）](/courses/policy/)——毛概错题复盘 5 课与错误模式分析
- [英语教学（已归档）](/courses/english/)——英语薄弱点突破 4 课（不定代词 / 介词搭配 / 比较级）

</details>
`
}

export function renderSubject(subject, { weeks }, catalog = previousCatalog) {
  const course = ZSB_COURSES.find((c) => c.subject === subject.key)
  const entry = course
    ? `\n\n[**${subject.key}课程目录**](/courses/${course.slug}/) · [**开始互动学习**](${withBase(course.entry)}) · [返回备考中心](/prep/)\n\n阅读讲义、练习与复习可从课程目录开始；互动页顶部始终保留课程目录和本科目计划入口。`
    : ''
  const sections = PHASES.map((phase) => {
    const inPhase = weeks.filter((w) => w.phase === phase)
    const blocks = inPhase
      .map((w) => {
        // 该周科目任务；无专属条目时（如考试周）回落到「全科」行
        const task = w.items[subject.key] ?? w.items['全科']
        const lines = [`- ${subject.key}：${task}`]
        const linked = course ? linkedLessons(course.slug, task, catalog) : []
        const tools = course ? linkedTools(course.slug, task, catalog) : []
        if (tools.length) lines.push(`- 配套工具：${tools.map(tool=>`[${tool.title}](${withBase(tool.href)}?returnTo=${encodeURIComponent(withBase(`/prep/${subject.slug}/`)+`#w${w.no}`)})`).join(' · ')}`)
        if (linked.length) lines.push(`- 配套课程（不替代原计划的练习卷）：${linked.map(lesson => `[${lesson.label} ${lesson.title.replace(/\[/g, '（').replace(/\]/g, '）')}](${withBase(lesson.interactive)}?returnTo=${encodeURIComponent(withBase(`/prep/${subject.slug}/`) + `#w${w.no}`)})`).join(' · ')}`)
        const sat = w.items['周六']
        if (sat && (sat.includes(subject.key) || sat.includes('全科') || sat.includes('四科'))) {
          lines.push(`- 周六：${sat}`)
        }
        if (w.items['备注']) lines.push(`- 备注：${w.items['备注']}`)
        return `<span id="w${w.no}"></span>\n\n### ${w.label} ｜ ${w.start} ~ ${w.end}\n\n${lines.join('\n')}\n\n<label class="prep-check"><input type="checkbox" data-key="w${w.no}"> ${w.label} 完成（${w.start} ~ ${w.end}）</label>`
      })
      .join('\n\n')
    return `## ${phase}（W${inPhase[0].no}-W${inPhase[inPhase.length - 1].no}）\n\n${blocks}`
  })

  return `---
title: ${subject.key}学习计划
createTime: __CREATE_TIME__
permalink: /prep/${subject.slug}/
readingTime: false
comments: false
---

${entry}

周打卡进度：<span id="prep-progress"></span>。每周轮换与每日节奏见 [备考中心](/prep/)。

${sections.join('\n\n')}
`
}

/* ---------------- 环节 2：课程站镜像 ---------------- */

const EXCLUDE_NAMES = /^(?:\._|\.)/ // 点/下划线开头的工具状态不进镜像

function walkFiles(dir, filter, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) walkFiles(full, filter, out)
    else if (e.isFile() && filter(e.name, full)) out.push(full)
  }
  return out
}

function copyTree(src, dest) {
  let n = 0
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true })
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      if (EXCLUDE_NAMES.test(e.name)) continue
      n += copyTree(path.join(src, e.name), path.join(dest, e.name))
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(src, dest)
    fs.utimesSync(dest, stat.atime, stat.mtime)
    n = 1
  }
  return n
}

/** rename 带重试：Windows 瞬时文件锁（杀毒/索引）会 EPERM（同 sync-learn） */
function renameWithRetry(from, to, attempts = 5) {
  for (let i = 0; ; i++) {
    try {
      fs.renameSync(from, to)
      return
    } catch (err) {
      if (i === attempts - 1) throw err
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200)
    }
  }
}

/** 镜像 HTML 里指向未收录源层（笔记 .md / 原始 PDF / 题库）的 ../ 链接：
 *  Obsidian 里点得动，网页上就是 404——去跳转保文本（白名单内的 ../reference、
 *  ../assets 等照常保留）。与导航条注入同一遍历执行。 */
export function stripUnmirroredLinks(html, c) {
  const keep = new Set(c.keep)
  return html.replace(/<a\b[^>]*?\bhref=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (m, quote, href, text) => {
    if (/^(?:obsidian:|file:|[a-z]:[\\/])/i.test(href)) return text
    if (!href.startsWith('../')) return m
    const target = href.slice(3).split(/[/#]/)[0]
    if (target && keep.has(target)) return m
    return text
  })
}

function syncZsbMirror(c, examDate) {
  const dest = path.join(PUBLIC_LESSONS, c.slug)
  const staging = path.join(DOCS, '.vuepress', STAGING_DIR, c.slug)
  fs.rmSync(staging, { recursive: true, force: true })
  fs.mkdirSync(staging, { recursive: true })

  let count = 0
  for (const name of c.keep) {
    const s = path.join(c.src, name)
    if (!fs.existsSync(s)) {
      console.warn(`[sync-prep] ${c.slug} 缺少 ${name}，跳过该条目`)
      continue
    }
    count += copyTree(s, path.join(staging, name))
  }
  if (count < 3) throw new Error(`[sync-prep] ${c.slug} 镜像仅 ${count} 个文件，疑似源路径异常，已中止换入：${c.src}`)

  // 高数镜像补足逐题续学能力，网站运行时由仓库维护，源课程和历史存储均保留。
  installLessonRuntime(staging, c.slug)

  // 镜像改写点：HTML 注入导航条 + 摘除未收录源层死链；CSS 剔除缺失字体格式
  // （/lessons/ 静态页加载不到站点 JS，只能写入时处理，见 lib/lesson-nav.mjs）
  for (const f of walkFiles(staging, (n) => n.endsWith('.html') || n.endsWith('.css'))) {
    let raw = fs.readFileSync(f, 'utf8')
    if (c.slug === 'zsb-politics' && path.relative(staging,f) === 'index.html') raw = patchPoliticsLearning(raw)
    const patched = f.endsWith('.html')
      ? injectLessonNav(stripUnmirroredLinks(raw, c), {
          backUrl: withBase(`/courses/${c.slug}/`),
          backLabel: `${c.subject}课程目录`,
          planUrl: withBase(`/prep/${c.prepSlug}/`),
          planLabel: `${c.subject}学习计划`,
          examDate,
        })
      : stripMissingFontUrls(raw, path.dirname(f))
    fs.writeFileSync(f, patched)
  }

  // 三步事务换入：dest → backup → staging → dest，失败回滚（同 sync-learn）
  const backup = path.join(DOCS, '.vuepress', STAGING_DIR, `${c.slug}.bak`)
  fs.rmSync(backup, { recursive: true, force: true })
  const hadDest = fs.existsSync(dest)
  if (hadDest) renameWithRetry(dest, backup)
  try {
    renameWithRetry(staging, dest)
  } catch (err) {
    if (hadDest && fs.existsSync(backup)) {
      try {
        renameWithRetry(backup, dest)
      } catch {
        fs.cpSync(backup, dest, { recursive: true })
      }
      console.warn(`[sync-prep] ${c.slug} 镜像换入失败，已回滚为旧镜像：${err instanceof Error ? err.message : err}`)
    }
    throw err
  }
  fs.rmSync(backup, { recursive: true, force: true })
  return count
}

/* ---------------- 环节 3：全文转换 ---------------- */

function fmtMtime(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

/** 内容无变化跳过（生成模板改动靠内容比对落地，与 syncBlog 同理） */
function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, content)
  fs.renameSync(tmp, file)
  return true
}

function syncZsbCourse(c, entries) {
  const lessonsDir = path.join(c.src, c.lessonsDir)
  if (!fs.existsSync(lessonsDir)) throw new Error(`[sync-prep] ${c.slug} 课件目录不存在：${lessonsDir}`)
  const readmeFile = path.join(DOCS, 'courses', c.slug, 'README.md')
  const readmeCreateTime =
    (fs.existsSync(readmeFile)
      ? fs.readFileSync(readmeFile, 'utf8').match(/^createTime:\s*(.+)$/m)?.[1]
      : null) ?? timestamp()


  const cardsDir = path.join(DOCS, 'courses', c.slug, 'l')
  const cover = `/images/covers/${c.slug}.png`
  const hasCover = fs.existsSync(path.join(DOCS, '.vuepress', 'public', 'images', 'covers', `${c.slug}.png`))
  const permalinkOf = (e) => `/courses/${c.slug}/l/${e.id}/`
  const catalogLessons = []
  const warnings = []
  const warnTypes = new Map()
  const tally = (m) => {
    warnings.push(m)
    const type = m.match(/class="[^"]*"|<[^>]+>/)?.[0] ?? m
    warnTypes.set(type, (warnTypes.get(type) ?? 0) + 1)
  }
  let changed = 0

  entries.forEach((e, i) => {
    const conv = e.conversion
    e.warnings.forEach((warning) => tally(`${e.name}: ${warning}`))
    const headline = conv.headline || e.name
    catalogLessons.push({
      id: e.id,
      label: c.numeric ? `第 ${e.no} 课` : e.name,
      title: headline,
      group: c.numeric ? '' : ({ mzt: '毛中特', xg: '习概', sz: '时政' }[e.name.match(/^[a-z]+/)[0]]),
      href: permalinkOf(e),
      interactive: `/lessons/${c.slug}/lessons/${e.file}`,
    })
    const title = c.numeric ? `第 ${e.no} 课 · ${headline}` : headline
    const createTime = fmtMtime(fs.statSync(path.join(lessonsDir, e.file)).mtime)
    const prev = entries[i - 1]
    const next = entries[i + 1]
    const navParts = [
      prev ? `[← ${c.numeric ? `第 ${prev.no} 课` : prev.name}](${permalinkOf(prev)})` : '',
      `[课程目录](/courses/${c.slug}/)`,
      next ? `[${c.numeric ? `第 ${next.no} 课` : next.name} →](${permalinkOf(next)})` : '',
    ]
    const metaLine = conv.metaLine ? `> ${conv.metaLine}\n\n` : ''
    const interactive = withBase(`/lessons/${c.slug}/lessons/${e.file}`)
    const body = `${metaLine}> 这是本课阅读版。[**打开互动课程**](${interactive})即可在同一页阅读、作答与复习，学习记录保存在此设备。

${conv.body}

---

${navParts.filter(Boolean).join(' · ')}
`
    const fm = [
      '---',
      `title: ${title}`,
      `createTime: ${createTime}`,
      `permalink: ${permalinkOf(e)}`,
      ...(hasCover ? [`banner: ${cover}`] : []),
      '---',
    ].join('\n')
    changed += writeIfChanged(path.join(cardsDir, `${e.id}.md`), `${fm}\n\n${body}\n`) ? 1 : 0
  })

  // Only remove obsolete generated lesson pages inside this course's l/ directory.
  const expected = new Set(entries.map((e) => `${e.id}.md`))
  for (const file of fs.readdirSync(cardsDir).filter((f) => f.endsWith('.md') && !expected.has(f))) {
    const target = path.resolve(cardsDir, file)
    if (!target.startsWith(path.resolve(cardsDir) + path.sep)) throw new Error(`讲义路径越界：${file}`)
    const content = fs.readFileSync(target, 'utf8')
    if (!content.includes(`permalink: /courses/${c.slug}/l/`)) throw new Error(`拒绝删除非生成讲义：${file}`)
    fs.unlinkSync(target)
    changed++
  }

  // Keep the accidentally published old wrong-answer URL usable, outside lesson/search counts.
  if (c.slug === 'zsb-cs') {
    const destination = withBase('/lessons/zsb-cs/lessons/mistakes.html')
    writeIfChanged(path.join(DOCS, '.vuepress', 'public', 'courses', c.slug, 'l', 'NaN', 'index.html'),
      `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${destination}"><title>计算机错题本</title><p><a href="${destination}">打开计算机错题本</a></p></html>\n`)
  }

  // Course page and learning cards use the same generated catalog.
  const readme = `---
title: ${c.subject}课程目录
createTime: ${readmeCreateTime}
permalink: /courses/${c.slug}/
readingTime: false
comments: false
${hasCover ? `banner: ${cover}\n` : ''}---

<PrepCourseCatalog slug="${c.slug}" />
`
  changed += writeIfChanged(readmeFile, `${readme}\n`) ? 1 : 0
  const updatedAt = fmtMtime(new Date(Math.max(...entries.map((e) => fs.statSync(path.join(lessonsDir, e.file)).mtimeMs)))).slice(0, 10)
  const catalog = {
    subject: c.subject, count: entries.length, interactive: c.entry, prep: c.prepSlug, updatedAt,
    tools: (c.tools ?? []).map((tool) => ({ title: tool.title, href: `/lessons/${c.slug}/lessons/${tool.file}` })),
    lessons: catalogLessons,
  }
  return { lessons: entries.length, changed, warnings, warnTypes, catalog }
}

/* ---------------- 写入（计划页） ---------------- */

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
  installLearningAssets(path.dirname(PUBLIC_LESSONS))
  // 环节 1：计划页（内容源缺失只跳过计划页，课程站镜像/转换照常）
  let parsed = null
  if (fs.existsSync(SOURCE)) {
    parsed = parseSource(fs.readFileSync(SOURCE, 'utf8'))
    console.log(`[sync-prep] 计划：${parsed.weeks.length} 周，考试日 ${parsed.examDate}`)
  } else {
    console.warn(`[sync-prep] 计划内容源不存在，跳过计划页（生成物以仓库为准）：${SOURCE}`)
  }

  // 环节 2+3：课程站镜像 + 全文转换（课程站目录缺失才整体跳过）
  if (!fs.existsSync(ZSB_ROOT)) {
    console.warn(`[sync-prep] 课程站源不存在，跳过镜像与转换（生成物以仓库为准）：${ZSB_ROOT}`)
    publishPlan(parsed, previousCatalog)
    console.log(execFileSync(process.execPath, [path.join(ROOT,'scripts/generate-lesson-search.mjs')], {cwd:ROOT,encoding:'utf8'}).trim())
    return
  }
  // Validate every course before the first mirror is replaced.
  const prepared = ZSB_COURSES.map((c) => {
    const lessonsDir = path.join(c.src, c.lessonsDir)
    const entries = collectPrepLessons(fs.readdirSync(lessonsDir), c)
    const lessonUrls = new Map(entries.map((e) => [e.name, `/courses/${c.slug}/l/${e.id}/`]))
    for (const entry of entries) {
      entry.warnings = []
      try {
        entry.conversion = lessonHtmlToMarkdown(fs.readFileSync(path.join(lessonsDir, entry.file), 'utf8'), {
          slug: c.slug, lessonUrls, onWarn: (warning) => entry.warnings.push(warning),
        })
      } catch (error) {
        throw new Error(`${c.subject}/${entry.file}：${error.message}`)
      }
    }
    return { c, entries }
  })
  const catalog = {}
  for (const { c, entries } of prepared) {
    const files = syncZsbMirror(c, parsed?.examDate)
    const { lessons, changed, warnings, warnTypes, catalog: courseCatalog } = syncZsbCourse(c, entries)
    catalog[c.slug] = courseCatalog
    const types = [...warnTypes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([t, n]) => `${t}×${n}`).join('、')
    console.log(`[sync-prep] ${c.name}：镜像 ${files} 文件 · 全文 ${lessons} 课（更新 ${changed}，告警 ${warnings.length}${types ? `：${types}` : ''}）`)
    for (const w of warnings.slice(0, 3)) console.warn(`  ⚠ ${w}`)
  }
  writeIfChanged(path.join(DOCS, '.vuepress', 'prep-catalog.mjs'),
    `// Generated by pnpm sync:prep. Edit the original courses, then sync.\nexport const prepCatalog = ${JSON.stringify(catalog, null, 2)}\n`)
  publishPlan(parsed, catalog)
  console.log(execFileSync(process.execPath, [path.join(ROOT,'scripts/generate-lesson-search.mjs')], {cwd:ROOT,encoding:'utf8'}).trim())
  console.log('[sync-prep] 完成')
}

function publishPlan(parsed, catalog) {
  if (!parsed) return
  writeFileIfChanged(path.join(DEST_DIR, 'README.md'), renderReadme(parsed))
  for (const [i, subject] of SUBJECTS.entries()) {
    writeFileIfChanged(path.join(DEST_DIR, `${String(i + 1).padStart(2, '0')}-${subject.slug}.md`), renderSubject(subject, parsed, catalog))
  }
  writeIfChanged(path.join(DOCS, '.vuepress', 'study-plan-data.mjs'), `// Generated by sync:prep from the existing study plan.\nexport const studyPlan = ${JSON.stringify(buildStudyPlan(parsed,catalog),null,2)}\n`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (err) {
    console.error(`[sync-prep] 失败：${err.message}`)
    process.exit(1)
  }
}
