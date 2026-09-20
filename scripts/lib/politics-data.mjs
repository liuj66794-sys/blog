import fs from 'node:fs'
import path from 'node:path'
import { validateFlashcard, validateQuestion, questionForNotebook } from '../runtime/politics-schema.mjs'

export const questionRegistry = JSON.parse(fs.readFileSync(new URL('../data/politics-question-ids.json', import.meta.url), 'utf8'))
export const questionAliases = Object.fromEntries(questionRegistry.flatMap(q => q.aliases.map(id => [`zsb-politics:bank:${id}`, `zsb-politics:bank:${q.id}`])))
const byOldId = new Map(questionRegistry.flatMap(q => [q.id, ...q.aliases].map(id => [id, q])))
export const flashcardCatalog = JSON.parse(fs.readFileSync(new URL('../data/politics-flashcards.json', import.meta.url), 'utf8'))
const registeredCardIds = new Set(Object.keys(flashcardCatalog.overrides))
for (const [id, split] of Object.entries(flashcardCatalog.splits || {})) {
  if (!registeredCardIds.has(id) || split.retainedId !== id) throw new Error(`Unknown split parent: ${id}`)
  for (const child of split.additions) {
    if (registeredCardIds.has(child.id)) throw new Error(`Duplicate split ID: ${child.id}`)
    registeredCardIds.add(child.id)
  }
}

export function normalizeAnswer(raw) {
  if (raw == null || raw === '') return []
  const letters = Array.isArray(raw) ? raw : raw.normalize('NFKC').toUpperCase().replace(/[、，,\s]+/g, '').split('')
  if (!letters.every(v => typeof v === 'string' && /^[A-F]$/.test(v))) throw new Error('Invalid answer letters')
  return [...new Set(letters)].sort()
}

export function importFlashcard(raw, lessonId) {
  const edit = flashcardCatalog.overrides[raw.id] || {}
  // Editorial history belongs to the source catalog, not the live answer payload.
  const override = Object.fromEntries(['question', 'answer', 'contentVersion', 'editorialStatus'].filter(k => k in edit).map(k => [k, edit[k]]))
  const c = { ...(raw.schemaVersion === 1 ? raw : {
    schemaVersion: 1, id: raw.id, lessonId: raw.lessonId || lessonId,
    question: raw.term, answer: raw.answer, knowledgePoint: raw.term || '', chapter: raw.ctx || '',
    source: { label: raw.src || '' }, contentVersion: 1, editorialStatus: 'legacy',
  }), ...override, id: raw.id }
  const evidence = flashcardCatalog.evidence?.[raw.splitFrom || raw.id]
  if (evidence) c.source = { ...c.source, references: evidence }
  const errors = validateFlashcard(c)
  if (errors.length) throw new Error(`Invalid flashcard ${c.id}: ${errors.join(', ')}`)
  return c
}

export function expandFlashcards(rawCards, lessonId) {
  const cards = new Map()
  for (const raw of rawCards) {
    const parent = importFlashcard(raw, lessonId)
    cards.set(parent.id, parent)
    const split = flashcardCatalog.splits?.[parent.id]
    if (split && split.retainedId !== parent.id) throw new Error(`Invalid retained card ID: ${parent.id}`)
    for (const addition of split?.additions || []) {
      if (addition.id === parent.id) throw new Error(`Split cannot replace parent ID: ${parent.id}`)
      const child = importFlashcard({ ...parent, ...addition, splitFrom: parent.id })
      cards.set(child.id, child)
    }
  }
  for (const c of cards.values()) {
    const errors = validateFlashcard(c, { editorial: true })
    if (errors.length) throw new Error(`Unreviewed flashcard ${c.id}: ${errors.join(', ')}`)
  }
  return [...cards.values()]
}

export function importQuestion(raw, context = {}) {
  if (raw.schemaVersion === 1) {
    const errors = validateQuestion(raw)
    if (errors.length) throw new Error(`Invalid question ${raw.id}: ${errors.join(', ')}`)
    return raw
  }
  const identity = byOldId.get(raw.id) || questionRegistry.find(q => q.lessonId === context.lessonId && q.legacyQuestion === raw.stem)
  if (!identity) throw new Error(`Unregistered politics question: ${context.lessonId || ''} / ${raw.id || raw.stem}`)
  const q = { schemaVersion: 1, contentVersion: 1, id: identity.id, lessonId: identity.lessonId,
    kind: 'choice', question: context.question ?? raw.stem,
    options: raw.options.map(o => ({ value: o.value || o.letter, text: o.text })),
    answer: normalizeAnswer(raw.answer), explanation: raw.exp || '',
    chapter: context.chapter || raw.chapter || '', knowledgePoint: '',
    source: { path: context.source || '', label: raw.src || '', paperTitle: context.paperTitle || '', course: context.course || raw.course || '' },
    answerStatus: raw.doubt ? 'doubt' : raw.answer ? 'provided' : 'missing', warn: raw.warn || '',
    grp: context.grp || raw.grp || '章末', legacyQuestion: identity.legacyQuestion,
  }
  const errors = validateQuestion(q)
  if (errors.length) throw new Error(`Invalid question ${q.id}: ${errors.join(', ')}`)
  return q
}

export function readPoliticsPayload(html, id) {
  const match = html.match(new RegExp(`<script[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/script>`))
  return match ? JSON.parse(match[1]) : null
}
function replacePayload(html, id, data) {
  return html.replace(new RegExp(`(<script[^>]+id="${id}"[^>]*>)[\\s\\S]*?(<\\/script>)`),
    (_, open, close) => open + JSON.stringify(data).replace(/</g, '\\u003c') + close)
}

// Invoked by the source synchronizer. A single import boundary for every page.
export function normalizePoliticsHtml(html, file, { base = '/blog/' } = {}) {
  const name = path.posix.basename(file, '.html')
  const source = `${base}lessons/zsb-politics/lessons/${name}.html`
  const chapter = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] || '').replace(/<[^>]+>/g, '').trim()
  if (name === 'index' && readPoliticsPayload(html, 'due-data')) {
    html = replacePayload(html, 'due-data', [...registeredCardIds].map(id => ({ id })))
    const counts = {}
    for (const [id, edit] of Object.entries(flashcardCatalog.overrides)) {
      counts[edit.lessonId] = (counts[edit.lessonId] || 0) + 1 + (flashcardCatalog.splits?.[id]?.additions.length || 0)
    }
    html = html.replace(/<a\b[^>]*data-lesson="([^"]+)"[^>]*>[\s\S]*?<\/a>/g,
      (card, id) => counts[id] ? card.replace(/闪卡 \d+/, `闪卡 ${counts[id]}`) : card)
  }
  for (const id of ['lesson-data', 'sz-data']) {
    const data = readPoliticsPayload(html, id)
    if (!data) continue
    if (data.cards) {
      data.cards = expandFlashcards(data.cards, name)
      html = html.replace(/(闪卡\s*<b>)\d+(<\/b>)/g, `$1${data.cards.length}$2`)
    }
    if (data.mcqs) data.mcqs = data.mcqs.map(q => importQuestion(q, { lessonId: name, chapter, source }))
    html = replacePayload(html, id, data)
  }
  if (name === 'srs') {
    const cards = expandFlashcards(readPoliticsPayload(html, 'cards'))
    html = replacePayload(html, 'cards', cards).replace(/全部 \d+ 张考点闪卡/, `全部 ${cards.length} 张考点闪卡`)
  }
  const bank = readPoliticsPayload(html, 'bank')
  if (bank && name === 'practice') {
    for (const p of bank) p.mcqs = p.mcqs.map(q => importQuestion(q, { lessonId: p.id, chapter: p.name, paperTitle: p.name, course: p.subject, grp: '题库', source }))
    html = replacePayload(html, 'bank', bank)
  }
  if (bank && name === 'review') {
    html = replacePayload(html, 'bank', bank.map(q => {
      if (q.schemaVersion === 1) return importQuestion(q)
      const identity = byOldId.get(q.id)
      // Use the registered original definition, not regex deletion of arbitrary
      // words such as 导论 which can legitimately occur inside the question.
      return importQuestion(q, { question: identity?.legacyQuestion, chapter: q.chapter,
        source: q.grp === '章末' ? `${base}lessons/zsb-politics/lessons/${identity?.lessonId}.html` : `${base}lessons/zsb-politics/lessons/practice.html`,
        paperTitle: q.grp === '题库' ? q.chapter : '' })
    }))
  }
  // Historical inline lesson templates invented IDs. IDs are now embedded.
  html = html.replace(/return Object\.assign\(\{ id: ZQ\.hash\([^\n]+\) \}, q\);/g, 'return q;')
  return html
}

export { questionForNotebook }
