import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import {reviewCounts} from '../runtime/study-state.mjs'

const runtime = fs.readFileSync(new URL('../runtime/politics-quiz.js', import.meta.url), 'utf8')

class MemoryStorage {
  constructor(values = new Map()) { this.values = values }
  get length() { return this.values.size }
  key(index) { return [...this.values.keys()][index] ?? null }
  getItem(key) { return this.values.get(key) ?? null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

function dateAt(iso) {
  const NativeDate = Date
  return class TestDate extends NativeDate {
    constructor(...args) { super(args.length ? args[0] : iso) }
    static now() { return new NativeDate(iso).getTime() }
  }
}

function host(value) {
  return JSON.parse(JSON.stringify(value))
}

function boot({ values = new Map(), now = '2026-09-08', pathname = '/blog/lessons/zsb-politics/lessons/srs.html', search = '' } = {}) {
  const localStorage = new MemoryStorage(values)
  const sessionStorage = new MemoryStorage()
  const document = {
    events: [],
    dispatchEvent(event) { this.events.push(event) },
    createElement() { return {} },
  }
  const context = {
    document,
    localStorage,
    sessionStorage,
    location: { pathname, search },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; Object.assign(this, init) } },
    Date: dateAt(now),
    URLSearchParams,
  }
  context.window = context
  vm.runInNewContext(runtime, context)
  return { ...context, values, ZQ: context.ZQ }
}

test('new politics cards stay out of due counts until their first grade', () => {
  const app = boot()
  const ids = ['new-a', 'new-b', 'new-c']
  assert.deepEqual(app.ZQ.srs.dueIds(ids), [])
  assert.deepEqual(app.ZQ.srs.newIds(ids), ids)
  assert.deepEqual(host(app.ZQ.srs.stats(ids)), { total: 3, learned: 0, fresh: 3, new: 3, due: 0 })
  const plan = app.ZQ.srs.plan(ids, { due: 20, fresh: 2 })
  assert.deepEqual(plan.due, [])
  assert.deepEqual(plan.fresh, ['new-a', 'new-b'])
  const bounded = app.ZQ.srs.plan(ids, { due: 20, fresh: 2, total: 1 })
  assert.equal(bounded.due.length + bounded.fresh.length, 1)

  app.ZQ.srs.grade('new-a', true)
  assert.deepEqual(app.ZQ.srs.newIds(ids), ['new-b', 'new-c'])
  assert.deepEqual(app.ZQ.srs.dueIds(ids), [])
})

test('learned cards become due only after their scheduled interval and remain compatible with old records', () => {
  const values = new Map([['zzkk:v2:card:legacy', JSON.stringify({ box: 2, streak: 2, at: '2026-09-05' })]])
  const app = boot({ values })
  assert.equal(app.ZQ.srs.isLearned('legacy'), true)
  assert.equal(app.ZQ.srs.isDue('legacy'), true)
  assert.deepEqual(app.ZQ.srs.newIds(['legacy']), [])

  const tomorrow = boot({ values, now: '2026-09-09' })
  tomorrow.ZQ.srs.grade('legacy', true)
  assert.equal(tomorrow.ZQ.srs.isDue('legacy'), false)
  assert.deepEqual(tomorrow.ZQ.srs.dueIds(['legacy']), [])
})

test('the lesson and daily task dashboard agree across local midnight and legacy cards without a date',()=>{
  const now=new Date(2026,8,8,1)
  const values=new Map([
    ['zzkk:v2:card:yesterday',JSON.stringify({box:1,streak:1,at:'2026-09-07'})],
    ['zzkk:v2:card:legacy',JSON.stringify({box:1})],
  ])
  const app=boot({values,now:now.toISOString()})
  assert.equal(app.ZQ.srs.dueIds(['yesterday','legacy']).length,2)
  assert.equal(reviewCounts(app.localStorage,now).due,2)
  assert.equal(app.ZQ.srs.grade('new',true).at,'2026-09-08')
})

test('politics lesson progress separates visits, exercise completion, and review evidence', () => {
  const app = boot({ pathname: '/blog/lessons/zsb-politics/lessons/mzt00.html' })
  const touched = app.ZQ.progress.touch('mzt00')
  assert.equal(touched.visits, 1)
  assert.equal(touched.done, undefined)
  assert.equal(app.ZQ.progress.summary('mzt00').status, 'in-progress')

  app.ZQ.progress.update('mzt00', {
    quizTotal: 5, quizAnswered: 2, quizCorrect: 1,
    quizComplete: false, exerciseComplete: false,
    quizReviewNeeded: true, reviewNeeded: true,
  })
  const partial = app.ZQ.progress.summary('mzt00')
  assert.equal(partial.status, 'in-progress')
  assert.equal(partial.quizAnswered, 2)
  assert.equal(partial.reviewNeeded, true)

  app.ZQ.progress.update('mzt00', {
    quizAnswered: 5, quizCorrect: 4,
    quizComplete: true, exerciseComplete: true,
    quizAllCorrect: false, quizReviewNeeded: true,
  })
  const complete = app.ZQ.progress.summary('mzt00')
  assert.equal(complete.status, 'exercise-complete')
  assert.equal(complete.quizComplete, true)
  assert.equal(complete.quizAllCorrect, false)
  assert.equal(complete.reviewNeeded, true)
})

test('old completed quiz records remain completed without becoming mastery evidence', () => {
  const values = new Map([['zzkk:v2:lesson:legacy', JSON.stringify({ best: 0, quizTotal: 5 })]])
  const app = boot({ values })
  const summary = app.ZQ.progress.summary('legacy')
  assert.equal(summary.status, 'exercise-complete')
  assert.equal(summary.quizComplete, true)
  assert.equal(summary.quizAllCorrect, false)
})
