import { createRequire } from 'node:module'
import { inlineScriptQuizzes } from './lesson-convert.mjs'
import { mistakeId } from '../runtime/mistake-store.mjs'

// Vue already owns the site's HTML parser. No course JavaScript is evaluated.
const require = createRequire(import.meta.resolve('vue/package.json'))
const { parse } = require('@vue/compiler-dom')
const attr = (n, key) => n.props?.find(p => p.type === 6 && p.name === key)?.value?.content || ''
const has = (n, cls) => attr(n, 'class').split(/\s+/).includes(cls)
const nodes = (n, match) => (n.children || []).flatMap(c => [ ...(match(c) ? [c] : []), ...nodes(c, match)])
const first = (n, match) => nodes(n, match)[0]
function plain(n) {
  if (!n) return ''
  if (n.type === 2) return n.content
  if (['script', 'style'].includes(n.tag) || ['quiz-flag', 'qno', 'mtag'].some(c => has(n, c))) return ''
  if (n.tag === 'br') return '\n'
  return (n.children || []).map(plain).join('')
}
function tree(html) { return parse(html, { parseMode: 'html', onError() {} }) }
function hash(text) { let h = 5381; for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0; return h.toString(36) }
const itemText = n => plain(n).replace(/\$/g, '').replace(/\\[()[\]]/g, '').replace(/\s+/g, '')
const text = n => plain(n).trim()

export function extractCourseQuestions(html, { slug, lessonId, source, title }) {
  const doc = tree(slug === 'zsb-english' ? inlineScriptQuizzes(html) : html)
  const common = { slug, lessonId, source, title, legacyHtml: false }
  const result = []
  if (slug === 'zsb-politics') {
    const block = first(doc, n => attr(n, 'id') === 'lesson-data')
    if (!block) return []
    const data = JSON.parse(block.children.map(c => c.content || '').join(''))
    for (const q of data.mcqs || []) result.push({ ...common, ref: q.id || 'h' + hash(`${lessonId}#${q.stem}`), kind: 'choice', stem: q.stem,
      options: q.options.map(o => ({ value: o.letter, text: o.text })), answer: String(q.answer || '').replace(/[、，,\s]+/g, '').split(''), explanation: q.exp || '', sourceLabel: q.src || '', doubt: !!q.doubt })
  } else {
    const groups = new Map()
    const quizzes = nodes(doc, n => has(n, 'quiz') && attr(n, 'data-answer'))
    for (const [index, q] of quizzes.entries()) {
      const stem = first(q, n => has(n, 'quiz-q') || has(n, 'q'))
      const opts = slug === 'zsb-english' ? nodes(q, n => n.tag === 'li') : nodes(first(q, n => has(n, 'quiz-opts')) || {}, n => n.tag === 'button' || n.tag === 'li')
      const answer = attr(q, 'data-answer')
      let ref = `q:${index + 1}`
      if (slug === 'zsb-math') ref = `quiz:${index}-${hash(itemText(stem) + '|' + answer + opts.map(o => '|' + itemText(o)).join(''))}`
      if (slug === 'zsb-english') {
        const group = first(doc, n => !!attr(n, 'id') && nodes(n, c => c === q).length > 0 && /^quiz/.test(attr(n, 'id')))
        const name = attr(group || {}, 'id'); if (!name) throw new Error(`英语题目缺少分组：${source}`)
        const ordinal = groups.get(name) || 0; groups.set(name, ordinal + 1); ref = `${name}:${ordinal}`
      }
      result.push({ ...common, ref, kind: 'choice', stem: text(stem), options: opts.map((o, i) => ({ value: slug === 'zsb-english' ? String(i) : attr(o, 'data-k') || attr(o, 'data-opt'), text: text(o) })),
        answer: [answer], explanation: text(first(q, n => has(n, 'quiz-exp') || has(n, 'quiz-expl') || has(n, 'quiz-explanation'))),
        contextRequired: (slug === 'zsb-english' && Number(lessonId) >= 18 && Number(lessonId) <= 23) || nodes(q, n => ['img', 'svg', 'canvas'].includes(n.tag)).length > 0 })
    }
    if (slug === 'zsb-math') for (const [index, q] of nodes(doc, n => has(n, 'recall')).entries()) {
      const stem = first(q, n => has(n, 'recall-q'))
      result.push({ ...common, ref: `recall:${index}-${hash(itemText(stem) + '|')}`, kind: 'recall', stem: text(stem), options: [], answer: [], explanation: text(first(q, n => has(n, 'recall-a'))) })
    }
  }
  for (const q of result) {
    q.id = mistakeId(q)
    if (!q.stem || (q.kind === 'choice' && (q.options.length < 2 || q.answer.some(a => !q.options.some(o => o.value === a))))) throw new Error(`题目索引字段异常：${q.id}`)
  }
  return result
}
