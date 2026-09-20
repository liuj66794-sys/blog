import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { extractCourseQuestions } from './course-question-index.mjs'
import { exportMistakes, importMistakes, mistakeId, questionSignature, readMistakes, recordAttempt, refreshQuestionDefinitions, registerQuestion, setMistakeNote } from '../runtime/mistake-store.mjs'
import { createStudyBackup, applyStudyImport } from '../../docs/.vuepress/study-backup.mjs'
import { createReviewSession, restoreReviewSession } from '../../docs/.vuepress/review-session.mjs'

const context = { slug: 'zsb-english', lessonId: '1' }
const source = fs.readFileSync(new URL('../../docs/.vuepress/public/lessons/zsb-english/lessons/0001-nouns.html', import.meta.url), 'utf8')
const sample = () => extractCourseQuestions(source, context).find(q => q.stem.includes('focus your attention'))
class Storage {
  data = new Map()
  get length() { return this.data.size }
  key(index) { return [...this.data.keys()][index] }
  getItem(key) { return this.data.get(key) || null }
  setItem(key, value) { this.data.set(key, value) }
}

test('the reported noun question retains the emphasis on work in the review index', () => {
  const q = sample()
  assert.equal(q.id, 'zsb-english:1:quiz:8')
  assert.match(q.stemHtml || '', /<strong>work<\/strong>/)
  assert.equal(q.stem, 'You are supposed to focus your attention on your own work. —— 句中加粗的名词充当什么成分？')
})

test('review definitions preserve underlines, nested emphasis, options and explanations without active HTML', () => {
  const html = `<div id="quiz"><div class="quiz" data-answer="0"><p class="quiz-q">Choose <u><b>the word</b></u><br><span style="text-decoration: underline">next</span> &amp; &lt;end&gt;<img src="x" onerror="alert(1)"><script>alert(1)</script></p><ul><li>A. <u>word</u></li><li>B. other</li></ul><div class="quiz-exp"><em>Reason</em> <a href="javascript:alert(1)">here</a></div></div></div>`
  const [q] = extractCourseQuestions(html, context)
  assert.equal(q.stemHtml, 'Choose <u><strong>the word</strong></u><br><u>next</u> &amp; &lt;end&gt;')
  assert.equal(q.options[0].html, 'A. <u>word</u>')
  assert.equal(q.explanationHtml, '<em>Reason</em> here')
})

test('new wrong answers retain formatting across review submission, definition refresh and backup import', () => {
  const q = sample(), storage = new Storage(), id = mistakeId(q)
  assert.equal(recordAttempt(q, { correct: false, attemptId: 'lesson' }, storage), true)
  assert.match(readMistakes(storage)[id].stemHtml || '', /<strong>work<\/strong>/)
  recordAttempt(readMistakes(storage)[id], { correct: true, attemptId: 'review' }, storage)
  registerQuestion(q, storage)
  refreshQuestionDefinitions({ version: 1, entries: { [id]: q } }, storage)
  const restored = new Storage()
  importMistakes(exportMistakes(storage), restored)
  assert.equal(readMistakes(restored)[id].stemHtml, q.stemHtml)
  assert.equal(readMistakes(restored)[id].wrongs, 1)
  const { backup, skipped } = createStudyBackup(storage)
  assert.deepEqual(skipped, [])
  const fullRestore = new Storage()
  applyStudyImport(backup, fullRestore)
  assert.equal(readMistakes(fullRestore)[id].stemHtml, q.stemHtml)
})

test('old plain-text mistakes recover formatting without resetting review history or question identity', () => {
  const q = sample(), storage = new Storage(), id = mistakeId(q)
  const old = { ...q, options: q.options.map(({ value, text }) => ({ value, text })) }
  delete old.stemHtml; delete old.explanationHtml
  recordAttempt(old, { correct: false, attemptId: 'wrong', now: 1000 }, storage)
  recordAttempt(old, { correct: true, attemptId: 'day1', now: 86401000 }, storage)
  recordAttempt(old, { correct: true, attemptId: 'day2', now: 172801000 }, storage)
  setMistakeNote(id, '注意介词后的名词', storage)
  const before = readMistakes(storage)[id]
  const session = createReviewSession([before], { limit: 1 })
  session.drafts[id].picked = ['0']
  assert.equal(questionSignature(q), questionSignature(old))
  refreshQuestionDefinitions({ version: 1, entries: { [id]: q } }, storage)
  const after = readMistakes(storage)[id]
  assert.match(after.stemHtml || '', /<strong>work<\/strong>/)
  for (const key of ['status', 'successDays', 'dueAt', 'wrongs', 'note', 'updatedAt', 'signature']) assert.equal(after[key], before[key], key)
  const resumed = restoreReviewSession(JSON.stringify(session), { [id]: after })
  assert.equal(resumed.revised, 0)
  assert.deepEqual(resumed.drafts[id].picked, ['0'])
})

test('invalid optional formatting in a backup is rejected before changing any records', () => {
  const q = sample(), storage = new Storage()
  recordAttempt(q, { correct: false, attemptId: 'wrong' }, storage)
  const before = exportMistakes(storage), backup = JSON.parse(before)
  backup.entries[q.id].stemHtml = { invalid: true }
  assert.throws(() => importMistakes(JSON.stringify(backup), storage), /题目格式无效/)
  assert.equal(readMistakes(storage)[q.id].stemHtml, q.stemHtml)
})
