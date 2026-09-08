import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

const runtime = fs.readFileSync(new URL('../runtime/english-quiz.js', import.meta.url), 'utf8')
const pathname = '/blog/lessons/zsb-english/lessons/0001-nouns.html'
const key = `l1uj-english-answers-v1:${pathname}:quiz`
const questions = Array.from({ length: 3 }, (_, i) => ({ q: `Question ${i}`, opts: ['A', 'B'], a: 0, why: 'Explanation' }))

function element() {
  const listeners = new Map()
  return {
    children: [], attributes: {}, disabled: false,
    classList: { add() {} },
    set innerHTML(value) { this.html = value; this.children = [] },
    get innerHTML() { return this.html || '' },
    setAttribute(name, value) { this.attributes[name] = value },
    appendChild(node) { this.children.push(node); return node },
    addEventListener(name, listener) { listeners.set(name, listener) },
    click() { if (!this.disabled) listeners.get('click')?.() },
  }
}

function openLesson({ values = new Map(), group = 'quiz', denied = false } = {}) {
  const events = new Map()
  const root = Object.assign(element(), { id: group })
  const context = {
    document: { createElement: element },
    location: { pathname },
    localStorage: {
      getItem(name) { if (denied) throw new Error('denied'); return values.get(name) ?? null },
      setItem(name, value) { if (denied) throw new Error('denied'); values.set(name, value) },
    },
    addEventListener(name, listener) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(listener) },
    removeEventListener(name, listener) { events.get(name)?.delete(listener) },
  }
  context.window = context
  vm.runInNewContext(runtime, context)
  context.Quiz.render(root, questions)
  return {
    values, root, events,
    option(q, choice = 0) { return root.children[q + 1].children[1].children[choice] },
    restart() { root.children.at(-1).click() },
    storageChanged(changedKey = key) { for (const listener of [...events.get('storage')]) listener({ type: 'storage', key: changedKey }) },
  }
}

test('English answers from two already-open tabs survive sequential writes and a reload', () => {
  const first = openLesson(), second = openLesson(first)
  first.option(0).click()
  second.option(1).click()
  const restored = openLesson(first)
  assert.equal(restored.option(0).disabled, true)
  assert.equal(restored.option(1).disabled, true)
  assert.equal(restored.option(2).disabled, false)
  assert.match(second.root.children[0].innerHTML, /已完成 <b>2<\/b>/)
})

test('an old English tab cannot restore answers from a round restarted in another tab', () => {
  const first = openLesson(), second = openLesson(first)
  second.option(0).click()
  first.restart()
  // Deliberately delay storage events: the write itself must use the latest round.
  second.option(1).click()
  const restored = openLesson(first)
  assert.equal(restored.option(0).disabled, false)
  assert.equal(restored.option(1).disabled, true)
  assert.deepEqual(Object.keys(JSON.parse(first.values.get(key))), ['1'])
})

test('English storage events update choices and resets without accumulating listeners', () => {
  const first = openLesson(), second = openLesson(first)
  first.option(0).click()
  second.storageChanged()
  assert.equal(second.option(0).attributes['aria-pressed'], 'true')
  first.restart()
  second.storageChanged()
  assert.equal(second.option(0).disabled, false)
  assert.equal(second.events.get('storage').size, 1)
  assert.equal(second.events.get('pageshow').size, 1)
})

test('English quiz groups retain their independent answers', () => {
  const first = openLesson(), supplement = openLesson({ ...first, group: 'quiz-p22' })
  first.option(0).click()
  supplement.option(1).click()
  first.restart()
  const restored = openLesson({ ...first, group: 'quiz-p22' })
  assert.equal(restored.option(1).disabled, true)
})

test('English practice remains usable when browser storage is unavailable or malformed', () => {
  const denied = openLesson({ denied: true })
  denied.option(0).click()
  denied.option(1).click()
  assert.match(denied.root.children[0].innerHTML, /已完成 <b>2<\/b>/)
  const malformed = openLesson({ values: new Map([[key, '42']]) })
  malformed.option(0).click()
  assert.equal(openLesson(malformed).option(0).disabled, true)
})
