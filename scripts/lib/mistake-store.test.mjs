import test from 'node:test'
import assert from 'node:assert/strict'
import { MISTAKES_KEY, mistakeId, readMistakes, recordAttempt, registerQuestion, migrateLegacy, isDue, exportMistakes, importMistakes, setMistakeNote, reopenMistake, refreshQuestionDefinitions } from '../runtime/mistake-store.mjs'
import { createStudyBackup, applyStudyImport } from '../../docs/.vuepress/study-backup.mjs'
class Storage {
  map = new Map()
  get length() { return this.map.size }
  key(i) { return [...this.map.keys()][i] }
  getItem(k) { return this.map.get(k) || null }
  setItem(k, v) { this.map.set(k, v) }
  removeItem(k) { this.map.delete(k) }
}
const question = (patch = {}) => ({ slug: 'zsb-math', lessonId: '0001', ref: 'quiz:0-abc', kind: 'choice', stem: '1 + 1 = ?', options: [{ value: 'A', text: '2' }, { value: 'B', text: '3' }], answer: ['A'], explanation: '两个一相加。', source: '/blog/lessons/zsb-math/lessons/0001.html', ...patch })
const answer = (q, storage, correct, id, now = 1000000000, independent = true) => recordAttempt(q, { correct, attemptId: id, now, independent }, storage)

test('wrong attempts survive reload and repeat delivery without counting twice; subjects and lessons do not collide', () => {
  const storage = new Storage(), q = question()
  answer(q, storage, false, 'event-1'); answer(q, storage, false, 'event-1')
  registerQuestion(q, storage)
  assert.equal(readMistakes(storage)[mistakeId(q)].wrongs, 1)
  for (const extra of [{ lessonId: '0002' }, { slug: 'zsb-english' }]) answer(question(extra), storage, false, 'event-1')
  assert.equal(Object.keys(readMistakes(storage)).length, 3)
})
test('immediate correction and same-day repeats do not count as spaced mastery', () => {
  const storage = new Storage(), q = question(), id = mistakeId(q), day = 86400000, now = 1000000000
  answer(q, storage, false, 'wrong', now)
  answer(q, storage, true, 'correction', now + 1, false)
  answer(q, storage, true, 'restart-right-after-reading-answer', now + 2, true)
  assert.equal(readMistakes(storage)[id].successDays, 0)
  assert.equal(isDue(readMistakes(storage)[id], now + 10), false)
  answer(q, storage, true, 'day1', now + day)
  answer(q, storage, true, 'day1-again', now + day + 1000)
  assert.equal(readMistakes(storage)[id].successDays, 1)
  answer(q, storage, true, 'day2', now + 2 * day)
  assert.equal(readMistakes(storage)[id].status, 'mastered')
  answer(q, storage, false, 'forgot', now + 3 * day)
  assert.equal(readMistakes(storage)[id].status, 'pending')
  assert.equal(readMistakes(storage)[id].wrongs, 2)
})
test('legacy four-subject migration is additive, idempotent and never resurrects a resolved record', () => {
  const storage = new Storage()
  storage.setItem('zsb-mistakes-v1', JSON.stringify({ '0001': { '1': { wrongs: 2, t: 'C数组', fixed: false } } }))
  storage.setItem('zc-progress-items-v1:0001', JSON.stringify({ quiz: { '0-abc': { attempts: ['B'], done: false } }, recall: {} }))
  storage.setItem('l1uj-english-answers-v1:/blog/lessons/zsb-english/lessons/0001-test.html:quiz', JSON.stringify({ 0: { signature: JSON.stringify(['English?', ['yes', 'no'], 0]), picked: 1 } }))
  storage.setItem('zzkk:v2:wrong:p1', JSON.stringify({ count: 3, stem: '政治题', options: [{ letter: 'A', text: 'a' }, { letter: 'B', text: 'b' }], answer: 'A、B', from: 'mzt00' }))
  const originals = [...storage.map.entries()]
  assert.equal(migrateLegacy(storage).added, 4)
  assert.equal(migrateLegacy(storage).added, 0)
  assert.deepEqual(readMistakes(storage)['zsb-politics:bank:p1'].answer, ['A', 'B'])
  for (const [key, value] of originals) assert.equal(storage.getItem(key), value)
  const q = question(); answer(q, storage, true, 'correct-1'); answer(q, storage, true, 'correct-2', 1000000000 + 86400000)
  migrateLegacy(storage)
  assert.equal(readMistakes(storage)[mistakeId(q)].status, 'mastered')
})
test('reopening legacy lesson fills in original question without losing mistakes or notes', () => {
  const storage = new Storage(), q = question()
  storage.setItem('zc-progress-items-v1:0001', JSON.stringify({ quiz: { '0-abc': { attempts: ['B'], done: false } }, recall: {} }))
  migrateLegacy(storage); setMistakeNote(mistakeId(q), '忽略了题干', storage); registerQuestion(q, storage)
  const item = readMistakes(storage)[mistakeId(q)]
  assert.deepEqual(item.options, q.options); assert.equal(item.note, '忽略了题干'); assert.equal(item.wrongs, 1)
})
test('content revisions invalidate earlier mastery without dropping historical attempts', () => {
  const storage = new Storage(), q = question(), id = mistakeId(q)
  answer(q, storage, false, 'a'); answer(q, storage, true, 'b'); answer(q, storage, true, 'c', 1000000000 + 86400000)
  registerQuestion({ ...q, answer: ['B'] }, storage)
  assert.equal(readMistakes(storage)[id].status, 'pending')
  assert.equal(readMistakes(storage)[id].wrongs, 1)
})
test('backup merges by question, keeps newer local notes and rejects the whole malformed input', () => {
  const source = new Storage(), target = new Storage(), q = question()
  answer(q, source, false, 'a'); importMistakes(exportMistakes(source), target)
  setMistakeNote(mistakeId(q), '本机的新笔记', target)
  assert.equal(importMistakes(exportMistakes(source), target), 0)
  assert.equal(readMistakes(target)[mistakeId(q)].note, '本机的新笔记')
  const before = target.getItem(MISTAKES_KEY)
  const bad = JSON.parse(exportMistakes(source)); bad.entries[`${mistakeId(q)}:invalid`] = {}
  assert.throws(() => importMistakes(JSON.stringify(bad), target))
  assert.equal(target.getItem(MISTAKES_KEY), before)
})
test('full study backup includes new wrong-answer history and uses existing merge flow', () => {
  const source = new Storage(), target = new Storage(), q = question()
  answer(q, source, false, 'a')
  const { backup, skipped } = createStudyBackup(source, { createdAt: 1000000000 })
  assert.deepEqual(skipped, [])
  assert.equal(Object.keys(backup.records[MISTAKES_KEY].entries).length, 1)
  applyStudyImport(backup, target)
  assert.equal(readMistakes(target)[mistakeId(q)].wrongs, 1)
})
test('unreliable answers are not marked wrong and storage failure is reported', () => {
  const storage = new Storage(), q = question({ doubt: true })
  assert.equal(answer(q, storage, false, 'doubt'), false)
  assert.deepEqual(readMistakes(storage), {})
  const broken = { getItem: () => null, setItem: () => { throw new Error('quota') } }
  assert.equal(answer(question(), broken, false, 'quota'), false)
})

test('an open review card cannot overwrite a newer note when its answer is submitted', () => {
  const storage = new Storage(), q = question()
  answer(q, storage, false, 'wrong')
  const staleCard = readMistakes(storage)[mistakeId(q)]
  setMistakeNote(mistakeId(q), '刚写下的原因', storage)
  answer(staleCard, storage, true, 'review')
  assert.equal(readMistakes(storage)[mistakeId(q)].note, '刚写下的原因')
})

test('a corrected math question keeps old history once while adopting the current answer and ID', () => {
  const storage = new Storage(), old = question(), current = question({ ref: 'quiz:0-new', answer: ['B'] })
  storage.setItem('zc-progress-items-v1:0001', JSON.stringify({ quiz: { '0-abc': { attempts: ['B'], done: false } }, recall: {} }))
  migrateLegacy(storage); setMistakeNote(mistakeId(old), '旧题错因', storage)
  refreshQuestionDefinitions({ version: 1, entries: { [mistakeId(current)]: current }, aliases: { [mistakeId(old)]: mistakeId(current) } }, storage)
  migrateLegacy(storage)
  assert.equal(Object.keys(readMistakes(storage)).length, 1)
  assert.deepEqual(readMistakes(storage)[mistakeId(current)].answer, ['B'])
  assert.equal(readMistakes(storage)[mistakeId(current)].note, '旧题错因')
  assert.equal(readMistakes(storage)[mistakeId(current)].status, 'pending')
  assert.doesNotThrow(() => importMistakes(exportMistakes(storage), new Storage()))
})

test('merging both an old question ID and an already-practised current ID preserves both histories', () => {
  const storage = new Storage(), old = question(), current = question({ ref: 'quiz:0-new', answer: ['B'] })
  answer(old, storage, false, 'old'); answer(current, storage, false, 'new')
  const index = { version: 1, entries: { [mistakeId(current)]: current }, aliases: { [mistakeId(old)]: mistakeId(current) } }
  refreshQuestionDefinitions(index, storage); refreshQuestionDefinitions(index, storage)
  assert.equal(Object.keys(readMistakes(storage)).length, 1)
  assert.equal(readMistakes(storage)[mistakeId(current)].wrongs, 2)
})

test('course recall notes round-trip with the complete learning backup', () => {
  const source = new Storage(), target = new Storage(), key = 'l1uj-learning-guide-note-v1:/blog/lessons/zsb-math/lessons/0001.html'
  source.setItem(key, '先检查定义域，再求极限。')
  const { backup, skipped } = createStudyBackup(source)
  assert.deepEqual(skipped, [])
  applyStudyImport(backup, target)
  assert.equal(target.getItem(key), source.getItem(key))
})

test('course notes keep their text representation under a custom deployment base', () => {
  const source = new Storage(), target = new Storage(), key = 'l1uj-learning-guide-note-v1:/school/lessons/zsb-math/lessons/0001.html'
  source.setItem(key, '回忆记录')
  const { backup, skipped } = createStudyBackup(source, { base: '/school/' })
  assert.deepEqual(skipped, [])
  applyStudyImport(backup, target, { base: '/school/' })
  assert.equal(target.getItem(key), source.getItem(key))
})
