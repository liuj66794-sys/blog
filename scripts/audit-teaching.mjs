/* 教学补充覆盖审计：逐课报告核心概念讲解、前置衔接、练习与来源，
   逐题报告选项解析覆盖，分别输出 已完成 / 待补 / 存疑 数量。
   以生成物为准（互动镜像 + 题目索引 + 阅读版），不以"组件已接入"代替内容完成。

   用法：
     node scripts/audit-teaching.mjs            # 人类可读表格
     node scripts/audit-teaching.mjs --json     # 机器可读 JSON
     node scripts/audit-teaching.mjs --subject zsb-english
*/
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepCatalog } from '../docs/.vuepress/prep-catalog.mjs'
import { extractCourseQuestions } from './lib/course-question-index.mjs'
import { loadTeachingCatalog, supplementsForLesson, resolveQuestionRef } from './lib/teaching.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const PUBLIC = path.join(ROOT, 'docs', '.vuepress', 'public')
const SUBJECTS = ['zsb-english', 'zsb-politics']

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const only = args.includes('--subject') ? args[args.indexOf('--subject') + 1] : null

function readingQuestions(slug, course) {
  const out = {}
  for (const lesson of course.lessons) {
    const file = path.join(PUBLIC, lesson.interactive)
    if (!fs.existsSync(file)) continue
    try {
      out[lesson.id] = extractCourseQuestions(fs.readFileSync(file, 'utf8'), {
        slug, lessonId: lesson.id, source: lesson.interactive, title: lesson.title,
      })
    } catch (err) {
      out[lesson.id] = { error: err.message }
    }
  }
  return out
}

function bankQuestions() {
  const file = path.join(PUBLIC, 'lessons/zsb-politics/lessons/practice.html')
  if (!fs.existsSync(file)) return []
  const html = fs.readFileSync(file, 'utf8')
  const match = html.match(/<script[^>]+id="bank"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return []
  return JSON.parse(match[1])
}

function readingMarkdown(slug, lessonId) {
  const file = path.join(ROOT, 'docs', 'courses', slug, 'l', `${lessonId}.md`)
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
}

/** 每题判定：complete（选项解析全覆盖）/ partial / missing；存疑单列。 */
function questionStatus(q, supp, slug) {
  if (!supp) return 'missing'
  const optionCount = (q.options || []).length
  const analysis = supp.optionAnalysis || []
  const covered = new Set(analysis.map((oa) => slug === 'zsb-english' ? Number(oa.option) : String(oa.option).toUpperCase()))
  const letters = analysis.map((oa) => oa.verdict)
  const correct = letters.filter((v) => v === 'correct').length
  const answerOk = correct === (q.answer || []).length
  const full = optionCount >= 2 && analysis.length === optionCount && covered.size === optionCount && answerOk
  const doubtful = /存疑/.test(JSON.stringify(supp))
  return { status: full ? 'complete' : analysis.length ? 'partial' : 'missing', doubtful }
}

function auditSubject(slug, catalog) {
  const course = prepCatalog[slug]
  const subject = catalog.subjects[slug]
  const kpIds = new Set(subject.knowledgePoints.points.map((p) => p.id))
  const lessons = []
  const questionsByLesson = readingQuestions(slug, course)

  for (const lesson of course.lessons) {
    const extracted = questionsByLesson[lesson.id]
    const questions = Array.isArray(extracted) ? extracted : []
    const extractError = extracted && !Array.isArray(extracted) ? extracted.error : null
    const merged = supplementsForLesson(catalog, slug, lesson.id)
    const supplement = subject.lessons[String(lesson.id)]
    const entry = {
      slug, lessonId: lesson.id, title: lesson.title,
      sections: 0, sectionsComplete: 0, kpRefs: 0, kpMissing: 0,
      questions: questions.length, complete: 0, partial: 0, missing: 0, doubtful: 0,
      translation: 0, steps: 0, compareTo: 0, sourceContext: 0, subjective: 0,
      readingMarked: false, notes: [],
    }
    if (!supplement && !merged) {
      entry.missing = questions.length
      entry.notes.push('无教学补充')
      lessons.push(entry)
      continue
    }
    if (extractError) entry.notes.push(`抽题失败：${extractError}`)
    const sections = supplement?.sections ?? []
    entry.sections = sections.length
    entry.sectionsComplete = sections.filter((s) => s.goal && s.minutes && (s.teaching ?? []).length).length
    for (const s of sections) {
      for (const id of [...(s.knowledgePoints ?? []), ...(s.prereqs ?? [])]) {
        entry.kpRefs++
        if (!kpIds.has(id)) entry.kpMissing++
      }
    }
    for (const [key, value] of merged?.questions ?? []) {
      if (/^(qa|anchor)[:.]/.test(key)) continue // 问答/锚点支架不进题目覆盖统计
      const ref = resolveQuestionRef(key, questions)
      const target = ref ? questions.find((q) => q.ref === ref) : null
      if (!target) { entry.notes.push(`补充引用未知题目 ${key}`); continue }
      const result = questionStatus(target, value, slug)
      if (typeof result === 'string') entry[result]++
      else {
        entry[result.status]++
        if (result.doubtful) entry.doubtful++
      }
      if (value.translation) entry.translation++
      if (value.steps?.length) entry.steps++
      if (value.compareTo) entry.compareTo++
      if (value.sourceContext) entry.sourceContext++
    }
    entry.missing += Math.max(0, questions.length - entry.complete - entry.partial)
    entry.subjective = Object.keys(supplement?.subjective ?? {}).length
    const md = readingMarkdown(slug, lesson.id)
    entry.readingMarked = !!md && /逐选项解析|本节指引/.test(md)
    lessons.push(entry)
  }

  // 题库卷（政治）
  const banks = []
  if (slug === 'zsb-politics') {
    for (const paper of bankQuestions()) {
      const merged = supplementsForLesson(catalog, slug, paper.id)
      const supplement = subject.bank[String(paper.id)]
      const entry = {
        paperId: paper.id, name: paper.name, zone: paper.zone,
        questions: (paper.mcqs || []).length, complete: 0, partial: 0, missing: 0, doubtful: 0,
        subjective: (paper.subjs || []).length, subjectiveCovered: 0, notes: [],
      }
      if (!supplement && !merged) {
        entry.missing = entry.questions
        entry.notes.push('无教学补充')
        banks.push(entry)
        continue
      }
      for (const [key, value] of merged?.questions ?? []) {
        const target = (paper.mcqs || []).find((q) => q.id === key)
        if (!target) { entry.notes.push(`补充引用未知题目 ${key}`); continue }
        const result = questionStatus({ options: target.options.map((o) => ({ value: o.letter })), answer: String(target.answer || '').split('') }, value, slug)
        if (result.status) entry[result.status]++ 
        else entry[result]++
        if (result.doubtful) entry.doubtful++
      }
      entry.missing = Math.max(0, entry.questions - entry.complete - entry.partial)
      entry.subjectiveCovered = Object.keys(supplement?.subjective ?? {}).length
      banks.push(entry)
    }
  }
  return { lessons, banks }
}

const catalog = loadTeachingCatalog()
const report = { generatedAt: new Date().toISOString(), subjects: {} }
for (const slug of SUBJECTS) {
  if (only && slug !== only) continue
  report.subjects[slug] = auditSubject(slug, catalog)
}

const sum = (list, key) => list.reduce((n, x) => n + (x[key] ?? 0), 0)

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  for (const [slug, data] of Object.entries(report.subjects)) {
    console.log(`\n=== ${slug} ===`)
    console.log('课次  题目  已完成  部分  待补  存疑  小节  讲解块完整  主观题  阅读版标记  备注')
    for (const l of data.lessons) {
      console.log([
        l.lessonId.padEnd(6), String(l.questions).padEnd(5), String(l.complete).padEnd(7), String(l.partial).padEnd(5),
        String(l.missing).padEnd(5), String(l.doubtful).padEnd(5), String(l.sections).padEnd(5),
        String(l.sectionsComplete).padEnd(11), String(l.subjective).padEnd(7),
        l.readingMarked ? '是' : '否', l.notes.join('；'),
      ].join(' '))
    }
    console.log(`小计：题目 ${sum(data.lessons, 'questions')}，已完成 ${sum(data.lessons, 'complete')}，部分 ${sum(data.lessons, 'partial')}，待补 ${sum(data.lessons, 'missing')}，存疑 ${sum(data.lessons, 'doubtful')}`)
    if (data.banks.length) {
      console.log('\n卷名  题目  已完成  部分  待补  存疑  主观题/已覆盖')
      for (const b of data.banks) {
        console.log([
          b.paperId.padEnd(24), String(b.questions).padEnd(5), String(b.complete).padEnd(7), String(b.partial).padEnd(5),
          String(b.missing).padEnd(5), String(b.doubtful).padEnd(5), `${b.subjective}/${b.subjectiveCovered}`,
        ].join(' '))
      }
      console.log(`题库小计：题目 ${sum(data.banks, 'questions')}，已完成 ${sum(data.banks, 'complete')}，部分 ${sum(data.banks, 'partial')}，待补 ${sum(data.banks, 'missing')}，存疑 ${sum(data.banks, 'doubtful')}，主观题覆盖 ${sum(data.banks, 'subjectiveCovered')}/${sum(data.banks, 'subjective')}`)
    }
  }
  const lessons = Object.values(report.subjects).flatMap((s) => s.lessons)
  const banks = Object.values(report.subjects).flatMap((s) => s.banks)
  const total = sum(lessons, 'questions') + sum(banks, 'questions')
  const complete = sum(lessons, 'complete') + sum(banks, 'complete')
  const partial = sum(lessons, 'partial') + sum(banks, 'partial')
  const missing = sum(lessons, 'missing') + sum(banks, 'missing')
  const doubtful = sum(lessons, 'doubtful') + sum(banks, 'doubtful')
  console.log(`\n[audit-teaching] 合计 ${total} 题：已完成 ${complete}，部分解析 ${partial}，待补 ${missing}，存疑 ${doubtful}`)
}
