import assert from 'node:assert/strict'
import test from 'node:test'
import { reviewSettings, reviewHref, filterReviewEntries, reviewOverview, createReviewSession, restoreReviewSession, reviewSessionSummary } from '../../docs/.vuepress/review-session.mjs'
import { todayTasks } from '../../docs/.vuepress/study-tasks.mjs'
import { studyPlan } from '../../docs/.vuepress/study-plan-data.mjs'
import { prepCatalog } from '../../docs/.vuepress/prep-catalog.mjs'
import { recordAttempt } from '../runtime/mistake-store.mjs'
import { changeTask } from '../runtime/study-state.mjs'

const questions = Array.from({ length: 12 }, (_, i) => ({
  id: 'zsb-english:1:' + i, slug: 'zsb-english', lessonId: '1', ref: String(i),
  kind: 'choice', stem: 'noun question ' + i, title: '名词', options: [{ value: 'a', text: 'A' }, { value: 'b', text: 'B' }],
  answer: ['b'], explanation: 'because', status: 'pending', dueAt: i * 10, wrongs: 1,
}))
const entries = Object.fromEntries(questions.map(q => [q.id, q]))
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value), key: i => [...data.keys()][i], get length() { return data.size } } }

test('task URLs select a real bounded group and reject invalid preferences', () => {
  for (const limit of [1, 5, 10]) {
    const options = reviewSettings('?practice=1&limit=' + limit)
    assert.equal(options.practice, true)
    assert.equal(createReviewSession(questions, options).ids.length, limit)
  }
  for (const invalid of ['0', '-5', '999999', 'NaN', '1.5']) assert.equal(reviewSettings('?limit=' + invalid).limit, 5)
  assert.equal(reviewSettings('?subject=__proto__&state=bad').subject, 'all')
})

test('review return links preserve filters, amount and safe task context', () => {
  const selected = { subject: 'zsb-english', state: 'scheduled', search: '名词 & 冠词', limit: 1, returnTo: '/blog/prep/#today-tasks' }
  const href = reviewHref(selected, '/blog/', 'resume')
  assert.deepEqual(reviewSettings(new URL(href, 'https://example.test').search), { ...selected, practice: false, resume: true })
  assert.equal(reviewSettings('?returnTo=https://evil.test/').returnTo, '')
  assert.equal(reviewHref({ returnTo: '//evil.test/' }), '/blog/review/')
  assert.equal(reviewHref({}, '/study/', 'practice'), '/study/review/?practice=1')
})

test('resuming keeps selections, reveal state, saved responses and unsaved note drafts', () => {
  const group = createReviewSession(questions, reviewSettings('?limit=5'), 100)
  Object.assign(group.drafts[questions[0].id], { picked: ['b'], submitted: true, correct: true, independent: false, revealed: true, peeked: true, feedback: '订正' })
  Object.assign(group.drafts[questions[1].id], { picked: ['a'], recalled: 'my answer', note: 'remember the rule', noteDirty: true })
  group.position = 1
  const restored = restoreReviewSession(JSON.stringify(group), entries)
  assert.equal(restored.id, group.id)
  assert.equal(restored.position, 1)
  assert.deepEqual(restored.drafts, group.drafts)
  assert.deepEqual(reviewSessionSummary(restored), { total: 5, answered: 1, correct: 1, incorrect: 0, independent: 0, skipped: 4 })
})

test('changed source answers invalidate stale results while preserving the note', () => {
  const group = createReviewSession(questions, reviewSettings('?limit=1'))
  Object.assign(group.drafts[questions[0].id], { picked: ['b'], submitted: true, correct: true, note: 'my draft' })
  group.finished = true
  const changed = { ...entries, [questions[0].id]: { ...questions[0], answer: ['a'] } }
  const restored = restoreReviewSession(JSON.stringify(group), changed)
  assert.equal(restored.revised, 1)
  assert.notEqual(restored.id, group.id, 'updated questions need a fresh attempt ID')
  assert.equal(restored.finished, false)
  assert.equal(restored.drafts[questions[0].id].submitted, false)
  assert.equal(restored.drafts[questions[0].id].note, 'my draft')
  assert.equal(reviewSessionSummary(restored).answered, 0)
})

test('damaged or empty drafts are recoverable without changing existing records', () => {
  const before = JSON.stringify(entries)
  for (const raw of [null, '{bad', '{}', JSON.stringify({ version: 1, id: 'bad', ids: [questions[0].id], position: -1 })]) assert.equal(restoreReviewSession(raw, entries), null)
  const group = createReviewSession(questions, reviewSettings('?limit=5'))
  const remaining = { [questions[2].id]: questions[2] }
  const restored = restoreReviewSession(JSON.stringify(group), remaining)
  assert.deepEqual(restored.ids, [questions[2].id])
  assert.equal(restored.position, 0)
  assert.equal(JSON.stringify(entries), before)
})

test('politics alias migration preserves an in-progress answer and unsaved note', () => {
  const old = { ...questions[0], id: 'zsb-politics:bank:old', slug: 'zsb-politics',
    stem: '【导论】教材由（ ）组成。', options: [{ value: 'A', text: '导论和章' }, { value: 'B', text: '结语' }], answer: ['A'] }
  const group = createReviewSession([old], reviewSettings('?limit=1'))
  Object.assign(group.drafts[old.id], { picked: ['A'], submitted: true, correct: true, note: '尚未保存的笔记', noteDirty: true })
  const canonical = { ...old, id: 'zsb-politics:bank:stable', schemaVersion: 1,
    question: '教材由（ ）组成。', stem: '教材由（ ）组成。', legacyQuestion: '教材由（ ）组成。', legacyIds: [old.id] }
  const restored = restoreReviewSession(JSON.stringify(group), { [canonical.id]: canonical })
  assert.equal(restored.revised, 0)
  assert.equal(restored.id, group.id)
  assert.deepEqual(restored.ids, [canonical.id])
  assert.deepEqual(restored.drafts[canonical.id], group.drafts[old.id])
})

test('group summaries count actual submissions and leave skipped questions unfinished', () => {
  const group = createReviewSession(questions, reviewSettings('?limit=5'))
  group.finished = true
  assert.equal(reviewSessionSummary(group).answered, 0)
  assert.equal(reviewSessionSummary(group).skipped, 5)
  Object.assign(group.drafts[questions[0].id], { submitted: true, correct: false })
  assert.deepEqual(reviewSessionSummary(group), { total: 5, answered: 1, correct: 0, incorrect: 1, independent: 0, skipped: 4 })
})

test('overview and combined filters separate due, future and mastered records', () => {
  const sample = { a: { ...questions[0], note: '冠词', dueAt: 1 }, b: { ...questions[1], status: 'scheduled', dueAt: 300 }, c: { ...questions[2], status: 'mastered', dueAt: 0 } }
  assert.deepEqual(reviewOverview(sample, 100), { total: 3, due: 1, scheduled: 1, mastered: 1, nextAt: 300 })
  assert.deepEqual(filterReviewEntries(sample, { subject: 'zsb-english', state: 'due', search: '冠词' }, 100).map(q => q.id), [questions[0].id])
  assert.equal(filterReviewEntries(sample, { subject: 'zsb-math', state: 'all', search: '' }, 100).length, 0)
})

test('today tasks launch five questions and shrinking really requests one with the same return path', () => {
  const storage = memory()
  recordAttempt(questions[0], { correct: false, attemptId: 'wrong', now: 100 }, storage)
  const options = () => {
    const task = todayTasks(studyPlan, prepCatalog, '/blog/', storage, new Date(2026, 8, 13)).find(t => t.id === 'wrong:all')
    assert.ok(task)
    return reviewSettings(new URL(task.href, 'https://example.test').search)
  }
  assert.equal(options().practice, true)
  assert.equal(options().limit, 5)
  changeTask('wrong:all', { limit: 1 }, storage)
  assert.equal(options().limit, 1)
  assert.equal(options().returnTo, '/blog/prep/#today-tasks')
})
