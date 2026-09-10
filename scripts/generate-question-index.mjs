import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepCatalog } from '../docs/.vuepress/prep-catalog.mjs'
import { withBase } from '../docs/.vuepress/site-meta.mjs'
import { extractCourseQuestions } from './lib/course-question-index.mjs'
import { beforeCourseCorrections } from './lib/course-corrections.mjs'

const root = fileURLToPath(new URL('../docs/.vuepress/public/', import.meta.url))
for (const [slug, course] of Object.entries(prepCatalog)) {
  const entries = {}, aliases = {}
  for (const lesson of course.lessons) {
    const html = fs.readFileSync(path.join(root, lesson.interactive), 'utf8')
    const context = { slug, lessonId: lesson.id, source: withBase(lesson.interactive), title: lesson.title }
    const questions = extractCourseQuestions(html, context)
    questions.forEach(q => { entries[q.id] = q })
    if (slug === 'zsb-math') {
      const rel = decodeURIComponent(lesson.interactive.split(`/${slug}/`)[1])
      const before = extractCourseQuestions(beforeCourseCorrections(html, slug, rel), context)
      before.forEach((q, i) => { if (questions[i] && q.id !== questions[i].id) aliases[q.id] = questions[i].id })
    }
  }
  if (slug === 'zsb-politics') {
    const html = fs.readFileSync(path.join(root, 'lessons/zsb-politics/lessons/practice.html'), 'utf8')
    const bank = JSON.parse(html.match(/<script[^>]+id="bank"[^>]*>([\s\S]*?)<\/script>/)[1])
    for (const paper of bank) for (const q of paper.mcqs || []) {
      const id = `${slug}:bank:${q.id}`
      entries[id] = { id, slug, ref: q.id, lessonId: paper.id, kind: 'choice', stem: q.stem,
        options: q.options.map(o => ({ value: o.letter, text: o.text })), answer: String(q.answer || '').replace(/[、，,\s]+/g, '').split(''),
        explanation: q.exp || '', sourceLabel: q.src || '', doubt: !!q.doubt, title: paper.name, legacyHtml: false,
        source: withBase('/lessons/zsb-politics/lessons/practice.html') }
    }
  }
  const file = path.join(root, 'learning', `questions-${slug}.json`)
  const output = JSON.stringify({ version: 1, entries, aliases }) + '\n'
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== output) fs.writeFileSync(file, output)
  console.log(`[question-index] ${slug}: ${Object.keys(entries).length} questions, ${Object.keys(aliases).length} prior IDs`)
}
