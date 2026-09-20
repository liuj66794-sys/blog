import test from 'node:test'
import assert from 'node:assert/strict'
import { createCardSession } from '../runtime/politics-card-session.mjs'
const day = '2026-09-21'
function fixture(count, { storage = new Map(), records = new Map(), random = () => 0 } = {}) {
  const cards = Array.from({ length: count }, (_, i) => ({ id: String(i), question: `问题${i}？`, answer: `答案${i}` }))
  const srs = { get: id => records.get(id), isDue: id => !records.has(id), isNew: () => false,
    grade(id) { if (this.fail) return { saved: false }; if (!records.has(id)) records.set(id, { at: day, box: 2 }); return { saved: true } } }
  const session = createCardSession({ cards, mode: 'due', limit: 10, srs, storage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) }, key: 'session', day, random })
  return { session, srs, records, storage, cards }
}
function complete(session) { while (session.view().currentCard) { assert.equal(session.flip(), true); assert.equal(session.grade(true), true) } }
for (const n of [0, 1, 9, 10, 11, 20, 47]) test(`${n} due: bounded group and guarded completion`, () => {
  const { session, records } = fixture(n)
  assert.equal(session.view().remainingIds.length, Math.min(10, n))
  complete(session)
  assert.equal(records.size, Math.min(10, n))
  assert.equal(session.view().dueCount, Math.max(0, n - 10))
  assert.equal(session.view().phase, n > 10 ? 'batchComplete' : 'dailyComplete')
  assert.equal(session.flip(), false); assert.equal(session.grade(true), false); assert.equal(session.shuffle(), false)
})
test('47 → 37 → 27 → 17 → 7 → 0 without reloading', () => {
  const { session, records } = fixture(47), counts = [session.view().dueCount]
  while (session.view().currentCard) {
    complete(session); counts.push(session.view().dueCount)
    if (session.view().phase === 'batchComplete') session.nextBatch()
  }
  assert.deepEqual(counts, [47, 37, 27, 17, 7, 0]); assert.equal(records.size, 47)
  assert.equal(new Set(session.view().reviewedIds).size, 47)
})
test('partial shuffle only includes unfinished batch, resets face/index; stale grade rejected', () => {
  const { session } = fixture(20)
  const first = session.view().currentCard.id
  session.flip(); session.grade(true)
  session.move(2); session.flip(); session.shuffle()
  const v = session.view()
  assert.equal(v.currentCardIndex, 0); assert.equal(v.face, 'front'); assert.equal(v.phase, 'front')
  assert.equal(v.remainingIds.length, 9); assert.ok(!v.remainingIds.includes(first))
  assert.ok(v.remainingIds.every(id => v.batchIds.includes(id)))
  session.flip(); assert.equal(session.grade(true, first), false)
})
test('failed durable write stays on back, leaves counts and queue intact, retry succeeds once', () => {
  const { session, srs, records } = fixture(11)
  session.flip(); const before = session.view()
  srs.fail = true
  assert.equal(session.grade(true), false)
  assert.equal(session.view().currentCard.id, before.currentCard.id)
  assert.equal(session.view().phase, 'back'); assert.equal(session.view().dueCount, 11); assert.equal(records.size, 0)
  assert.match(session.view().error, /保存失败/)
  srs.fail = false; assert.equal(session.grade(true), true)
  assert.equal(session.grade(true), false); assert.equal(records.size, 1)
})
test('refresh restores unfinished shuffle/face/index; SRS reconciles crash after durable grade', () => {
  const f = fixture(47)
  f.session.flip(); f.session.grade(true); f.session.move(3); f.session.shuffle(); f.session.flip()
  const resumed = fixture(47, f).session
  assert.deepEqual(resumed.view().remainingIds, f.session.view().remainingIds)
  assert.equal(resumed.view().face, 'back'); assert.equal(resumed.view().dueCount, 46)
  const id = resumed.view().currentCard.id
  f.records.set(id, { at: day, box: 2 }) // durable write succeeded, session write was lost
  const recovered = fixture(47, f).session
  assert.ok(!recovered.view().remainingIds.includes(id)); assert.equal(recovered.view().face, 'front')
  assert.equal(recovered.view().dueCount, 45)
})
test('null cards, broken snapshot and invalid indexes cannot expose undefined currentCard', () => {
  const f = fixture(1); f.storage.set('session', JSON.stringify({ version: 1, day, mode: 'due', batchIds: ['0'], remainingIds: ['0'], reviewedIds: [], currentCardIndex: 999, phase: 'back', face: 'back' }))
  const session = fixture(1, f).session
  assert.equal(session.view().currentCardIndex, 0); assert.equal(session.view().currentCard.id, '0')
  complete(session); session.move(1); assert.equal(session.view().currentCard, null)
  f.storage.set('session', '{broken'); assert.ok(fixture(1, f).session)
})
test('session storage failure never rolls back a saved grade and refresh can reconcile', () => {
  const f = fixture(1)
  const session = createCardSession({ ...f, mode: 'due', srs: f.srs, key: 'x', day, storage: { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') } } })
  session.flip(); assert.equal(session.grade(true), true)
  assert.equal(session.view().phase, 'dailyComplete'); assert.match(session.view().resumeWarning, /暂不能保存/)
})

test('midnight resets face and reviewed IDs, preventing stale back from grading the new day', () => {
  let currentDay = day
  const records = new Map(), cards = [{ id: 'one', question: '独立问题？', answer: '答案' }]
  const srs = { get: id => records.get(id), isNew: () => false, isDue: id => records.get(id)?.at !== currentDay,
    grade(id) { records.set(id, { at: currentDay, box: (records.get(id)?.box || 0) + 1 }); return { saved: true } } }
  const session = createCardSession({ cards, srs, day, getDay: () => currentDay })
  session.flip(); session.grade(true)
  assert.equal(session.view().phase, 'dailyComplete')
  currentDay = '2026-09-22'; session.refresh()
  assert.equal(session.view().phase, 'front'); assert.equal(session.view().dueCount, 1)
  assert.deepEqual(session.view().reviewedIds, [])
  session.flip(); currentDay = '2026-09-23'
  assert.equal(session.grade(true), false)
  assert.equal(records.get('one').box, 1); assert.equal(session.view().face, 'front')
  session.flip(); assert.equal(session.grade(true), true); assert.equal(records.get('one').box, 2)
})
