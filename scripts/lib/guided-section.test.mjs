import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { guideKey, freshGuideState, readGuideState, saveGuideState, answerGuide, guideResults, validateGuide } from '../runtime/guided-state.mjs'
import { createStudyBackup, applyStudyImport, validateStudyBackup } from '../../docs/.vuepress/study-backup.mjs'
import { lessonHtmlToMarkdown } from './lesson-convert.mjs'
import { teachingPayloadFor, loadTeachingCatalog, validateSupplement } from './teaching.mjs'

const lesson = JSON.parse(fs.readFileSync(new URL('../data/teaching/zsb-english/lessons/1.json', import.meta.url)))
const guide = lesson.sections[0].guide
const key = guideKey('zsb-english', '1', 'pt-1')
class Storage {
  values = new Map()
  get length() { return this.values.size }
  key(i) { return [...this.values.keys()][i] ?? null }
  getItem(k) { return this.values.get(k) ?? null }
  setItem(k, v) { this.values.set(k, String(v)) }
  removeItem(k) { this.values.delete(k) }
}

test('guided pilot has six complete checks and survives the lesson payload and reading conversion', () => {
  assert.deepEqual(validateGuide(guide), [])
  assert.equal(guide.steps.length, 6)
  const payload = teachingPayloadFor(loadTeachingCatalog(), 'zsb-english', '1', [])
  assert.deepEqual(payload.sections[0].guide, guide)
  const { body } = lessonHtmlToMarkdown('<main><h1>名词</h1><h2 id="pt-1">一、名词的分类</h2><p>原有分类表</p></main>', {
    slug: 'zsb-english', teaching: { sections: lesson.sections, questions: new Map() },
  })
  assert.ok(body.includes(guide.title))
  assert.ok(body.includes('two pieces of advice'))
  assert.ok(body.includes('原有分类表'))
  assert.ok(body.includes('先自己判断，再核对理由'))
})

test('restores step, wrong answer, viewed hint and notes without overwriting first attempt', () => {
  const storage = new Storage()
  let state = answerGuide(freshGuideState(guide), guide.steps[0], 0)
  state.step = 3; state.note = 'advice 为什么不能直接数'; state.recall = '用 piece 计数'
  state.answers.books = { picked: null, hinted: true, revealed: false }
  assert.equal(saveGuideState(key, state, storage, 100), true)
  const restored = readGuideState(guide, key, storage)
  assert.deepEqual(restored, state)
  assert.deepEqual(answerGuide(restored, guide.steps[0], 1), state)
  const newGuide = structuredClone(guide)
  newGuide.steps[0].question.answer = 0
  assert.equal(readGuideState(newGuide, key, storage).step, 0, 'changed question cannot reuse stale grading')
})

test('correct, hinted, revealed and skipped checks have distinct results', () => {
  let state = answerGuide(freshGuideState(guide), guide.steps[0], 1)
  state.answers.books = { picked: null, hinted: true, revealed: false }
  state = answerGuide(state, guide.steps[1], 2)
  state.answers.water = { picked: null, hinted: false, revealed: true }
  state = answerGuide(state, guide.steps[4], 2)
  assert.deepEqual(guideResults(guide, state), { total: 6, answered: 3, correct: 3, independent: 2, revealed: 1, transferCorrect: 1, transferTotal: 2 })
  assert.deepEqual(answerGuide(state, guide.steps[2], 0), state, 'revealed answers stay viewed until a new round')
})

test('storage failure leaves in-memory answers usable and malformed records fall back safely', () => {
  const storage = new Storage()
  storage.setItem(key, '{invalid')
  assert.equal(readGuideState(guide, key, storage).step, 0)
  const state = answerGuide(freshGuideState(guide), guide.steps[0], 1)
  const blocked = { setItem() { throw new Error('full') } }
  assert.equal(saveGuideState(key, state, blocked), false)
  assert.equal(guideResults(guide, state).independent, 1)
})

test('guided state round-trips through existing backup; newer device state wins, malformed input is rejected', () => {
  const storage = new Storage()
  const state = answerGuide(freshGuideState(guide), guide.steps[0], 1)
  state.step = 4; state.note = '手机继续'; state.recall = 'book 是可数名词'
  saveGuideState(key, state, storage, 1000)
  const exported = createStudyBackup(storage, { now: 2000 })
  assert.deepEqual(exported.skipped, [])
  assert.equal(validateStudyBackup(exported.backup).valid, true)
  const target = new Storage()
  assert.equal(applyStudyImport(exported.backup, target).applied, true)
  assert.deepEqual(readGuideState(guide, key, target), state)
  const newer = { ...state, step: 5 }
  saveGuideState(key, newer, target, 3000)
  applyStudyImport(exported.backup, target)
  assert.equal(readGuideState(guide, key, target).step, 5)
  exported.backup.records[key].step = -1
  assert.equal(validateStudyBackup(exported.backup).valid, false)
  exported.backup.records[key].step = 4
  exported.backup.records[key].answers.names.revealed = true
  assert.equal(validateStudyBackup(exported.backup).valid, false, 'cannot import a check as both answered and revealed')
})

test('teaching validation rejects malformed guided answer before publication', () => {
  const invalid = structuredClone(guide)
  invalid.steps[0].question.answer = 50
  assert.ok(validateSupplement({ lessonId: '1', questions: new Map(), sections: [{ id: 'pt-1', title: 'test', guide: invalid }] }, { slug: 'zsb-english', questions: [], knowledgePoints: [] }).some(e => e.includes('答案越界')))
})
