import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { normalizeAnswer, importFlashcard, importQuestion, normalizePoliticsHtml, readPoliticsPayload, questionRegistry, questionAliases, questionForNotebook, flashcardCatalog, expandFlashcards } from './politics-data.mjs'
import { validateFlashcard, validateQuestion } from '../runtime/politics-schema.mjs'
import { refreshQuestionDefinitions, readMistakes, MISTAKES_KEY, questionSignature } from '../runtime/mistake-store.mjs'
const root = new URL('../../docs/.vuepress/public/lessons/zsb-politics/lessons/', import.meta.url)
const read = f => fs.readFileSync(new URL(f, root), 'utf8')
const memory = () => { const data = new Map(); return { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) } }

test('Flashcard schema: stable IDs, one content source, legacy editorial gate', () => {
  const c = importFlashcard({ id: 'old', term: '七大理论阐述', answer: '刘少奇', ctx: '导论', src: '课1' }, 'mzt00')
  assert.deepEqual(validateFlashcard(c), [])
  assert.deepEqual(validateFlashcard(c, { editorial: true }), ['editorial-review-required', 'independent-question-required'])
  assert.equal(c.question, '七大理论阐述')
  assert.equal(c.id, importFlashcard({ ...c, question: '新问句', answer: '新答案' }).id)
  assert.ok(validateFlashcard({ ...c, question: '' }).includes('question'))
  assert.ok(validateFlashcard({ ...c, front: 'another truth' }).includes('duplicate-content'))
})
test('answer import normalizes separators and full width, rejects invalid content', () => {
  for (const a of ['A、C、D', 'A, C，D', 'Ａ Ｃ Ｄ', ['D', 'C', 'A', 'A']]) assert.deepEqual(normalizeAnswer(a), ['A', 'C', 'D'])
  assert.deepEqual(normalizeAnswer(null), [])
  assert.throws(() => normalizeAnswer('A答案D'))
})

test('all 13 historical delimiter answers publish exact canonical arrays at both entrances', () => {
  const expected = {
    '872104af0d': ['A', 'C', 'D'], '3e9dcb7016': ['B', 'C', 'D'],
    'bcbb066f94': ['A', 'B', 'C', 'D'], '3d66e2e08c': ['A', 'B', 'C', 'D'],
    'e81f48d28e': ['A', 'C', 'D'], '7eb06a5c2b': ['A', 'B', 'C'],
    '6207546645': ['A', 'B', 'C', 'D'], 'a459905b0a': ['B', 'C', 'D'],
    '384e0572d7': ['A', 'D'], 'a1eeffc83b': ['A', 'C', 'D'],
    'a0f4af9b48': ['A', 'B', 'C'], 'fc7eea51bb': ['B', 'C', 'D'], '9b55aa921d': ['A', 'B', 'D'],
  }
  for (const entries of [readPoliticsPayload(read('practice.html'), 'bank').flatMap(p => p.mcqs), readPoliticsPayload(read('review.html'), 'bank')]) {
    for (const [id, answer] of Object.entries(expected)) assert.deepEqual(entries.find(q => q.id === id)?.answer, answer, id)
  }
})

test('Question schema rejects malformed fields, duplicate or missing options and out-of-range answers', () => {
  const q = readPoliticsPayload(read('xg00.html'), 'lesson-data').mcqs[0]
  assert.deepEqual(validateQuestion(q), [])
  for (const broken of [null, {}, { ...q, question: '' }, { ...q, options: null }, { ...q, options: {} },
    { ...q, options: [null, null] }, { ...q, options: [q.options[0], q.options[0]] },
    { ...q, answer: 'A、C' }, { ...q, answer: ['Z'] }, { ...q, stem: '第二真值' }, { ...q, contentVersion: null }]) {
    assert.ok(validateQuestion(broken).length > 0)
  }
})
test('all 631 original IDs plus 38 explicit children and all entry points remain consistent', () => {
  let cards = 0, chapter = 0, papers = 0
  const ids = new Set()
  const canonicalQuestions = new Map(), canonicalCards = new Map()
  for (const f of fs.readdirSync(root).filter(f => /^(mzt|xg|sz)\d+\.html$/.test(f))) {
    const html = normalizePoliticsHtml(read(f), f)
    assert.equal(normalizePoliticsHtml(html, f), html)
    const d = readPoliticsPayload(html, 'lesson-data') || readPoliticsPayload(html, 'sz-data')
    cards += d.cards.length
    for (const c of d.cards) { assert.deepEqual(validateFlashcard(c, { editorial: true }), []); ids.add(c.id); canonicalCards.set(c.id, c) }
    for (const q of d.mcqs || []) { assert.deepEqual(validateQuestion(q), []); assert.equal(q.question, q.legacyQuestion); canonicalQuestions.set(q.id, q); chapter++ }
  }
  assert.equal(Object.keys(flashcardCatalog.overrides).length, 631)
  assert.equal(cards, 669); assert.equal(ids.size, 669); assert.equal(chapter, 135)
  for (const id of Object.keys(flashcardCatalog.overrides)) assert.ok(ids.has(id), `original ID retained: ${id}`)
  for (const p of readPoliticsPayload(normalizePoliticsHtml(read('practice.html'), 'practice.html'), 'bank')) {
    for (const q of p.mcqs) { assert.deepEqual(validateQuestion(q), []); canonicalQuestions.set(q.id, q); papers++ }
  }
  assert.equal(papers, 1245)
  const mixed = readPoliticsPayload(normalizePoliticsHtml(read('review.html'), 'review.html'), 'bank')
  assert.equal(mixed.length, 1380)
  for (const q of mixed) {
    assert.equal(q.question, q.legacyQuestion)
    const canonical = canonicalQuestions.get(q.id)
    assert.ok(canonical, `shared canonical ID: ${q.id}`)
    assert.equal(q.question, canonical.question)
    assert.deepEqual(q.answer, canonical.answer)
    assert.deepEqual(q.options, canonical.options)
  }
  const daily = readPoliticsPayload(normalizePoliticsHtml(read('srs.html'), 'srs.html'), 'cards')
  for (const c of daily) {
    assert.equal(c.question, canonicalCards.get(c.id).question)
    assert.equal(c.answer, canonicalCards.get(c.id).answer)
  }
  assert.equal(Object.keys(questionAliases).length, 135)
  assert.equal(new Set(questionRegistry.map(q => q.id)).size, 1380)
  const index = normalizePoliticsHtml(fs.readFileSync(new URL('../index.html', root), 'utf8'), 'index.html')
  assert.deepEqual(new Set(readPoliticsPayload(index, 'due-data').map(c => c.id)), ids)
  assert.equal(normalizePoliticsHtml(index, 'index.html'), index)
  for (const [, id, count] of index.matchAll(/data-lesson="([^"]+)"[\s\S]*?闪卡 (\d+)/g)) {
    assert.equal(Number(count), [...canonicalCards.values()].filter(c => c.lessonId === id).length)
  }
})

test('explicit splits preserve old SRS identity, create fresh children and never copy mastery', () => {
  const daily = readPoliticsPayload(read('srs.html'), 'cards')
  assert.deepEqual(expandFlashcards(daily), daily)
  const allIds = new Set(daily.map(c => c.id))
  const records = new Map(Object.keys(flashcardCatalog.overrides).map(id => [id, { box: 3, at: '2026-09-20', notes: '保留' }]))
  for (const [id, split] of Object.entries(flashcardCatalog.splits)) {
    assert.equal(split.retainedId, id)
    assert.ok(allIds.has(id)); assert.equal(records.get(id).box, 3)
    assert.ok(split.previousQuestion && split.previousAnswer && split.reason)
    for (const child of split.additions) {
      assert.ok(allIds.has(child.id)); assert.ok(!records.has(child.id))
      assert.equal(daily.find(c => c.id === child.id).splitFrom, id)
    }
  }
  assert.equal(records.size, 631)
})

test('legacy mixed-page import removes only registered prefixes; legitimate chapter words remain', () => {
  const r = questionRegistry.find(q => q.aliases.length)
  const raw = { id: r.aliases[0], stem: '【课程名 章节名】' + r.legacyQuestion,
    options: [{ letter: 'A', text: '甲' }, { letter: 'C', text: '丙' }, { letter: 'D', text: '丁' }],
    answer: 'A、C、D', chapter: '章节名', course: '课程名', grp: '章末', src: '课件页码' }
  const html = '<script id="bank" type="application/json">' + JSON.stringify([raw]) + '</script>'
  const [q] = readPoliticsPayload(normalizePoliticsHtml(html, 'review.html'), 'bank')
  assert.equal(q.id, r.id)
  assert.equal(q.question, r.legacyQuestion)
  assert.equal(q.chapter, '章节名'); assert.equal(q.source.label, '课件页码')
  assert.deepEqual(q.answer, ['A', 'C', 'D'])
})
test('aliases preserve mastery, histories, both notes and wrong counts; migration is idempotent', () => {
  const q = questionForNotebook(importQuestion(readPoliticsPayload(read('xg00.html'), 'lesson-data').mcqs.at(-1), { lessonId: 'xg00', chapter: '导论', source: '/blog/lessons/zsb-politics/lessons/xg00.html' }))
  const alias = Object.keys(questionAliases).find(k => questionAliases[k] === q.id)
  const store = memory()
  const old = { ...q, id: alias, ref: alias.split(':').at(-1), schemaVersion: undefined, question: undefined,
    stem: '【习概 导论】' + q.stem, wrongs: 3, status: 'mastered', note: '旧笔记', updatedAt: 20,
    successDays: 2, lastSuccessAt: 19, dueAt: 100, recentAttempts: ['old-attempt'] }
  old.signature = questionSignature(old)
  const current = { ...q, wrongs: 2, note: '新笔记', status: 'scheduled', updatedAt: 10, recentAttempts: ['new-attempt'] }
  store.setItem(MISTAKES_KEY, JSON.stringify({ version: 1, entries: { [alias]: old, [q.id]: current } }))
  const index = { version: 1, entries: { [q.id]: q }, aliases: questionAliases }
  assert.equal(refreshQuestionDefinitions(index, store), true)
  const result = readMistakes(store)[q.id]
  assert.equal(result.status, 'mastered'); assert.equal(result.wrongs, 5)
  assert.equal(result.successDays, 2); assert.equal(result.dueAt, 100)
  assert.match(result.note, /旧笔记/); assert.match(result.note, /新笔记/)
  assert.equal(result.migrationHistory[alias].stem, old.stem)
  assert.deepEqual(result.recentAttempts, ['old-attempt', 'new-attempt'])
  const once = store.getItem(MISTAKES_KEY)
  assert.equal(refreshQuestionDefinitions(index, store), true)
  assert.equal(store.getItem(MISTAKES_KEY), once)
  const changed = { ...q, answer: ['A'] }
  assert.equal(refreshQuestionDefinitions({ ...index, entries: { [q.id]: changed } }, store), true)
  assert.equal(readMistakes(store)[q.id].status, 'pending')
})
test('failed alias write preserves the entire previous store', () => {
  const store = memory(); const before = JSON.stringify({ version: 1, entries: { old: { id: 'old', stem: 'x', options: [], answer: [], wrongs: 9 } } })
  store.setItem(MISTAKES_KEY, before)
  store.setItem = () => { throw new Error('quota') }
  assert.equal(refreshQuestionDefinitions({ version: 1, aliases: { old: 'new' }, entries: { new: { id: 'new', stem: 'x', options: [], answer: [] } } }, store), false)
  assert.equal(store.getItem(MISTAKES_KEY), before)
})
