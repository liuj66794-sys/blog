import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'

const runtime = fs.readFileSync(new URL('../runtime/math-quiz.js', import.meta.url), 'utf8')

function element(textContent = '') {
  const names = new Set()
  const handlers = {}
  return {
    textContent, dataset: {}, style: {}, disabled: false,
    classList: {
      add(name) { names.add(name) },
      contains(name) { return names.has(name) },
      toggle(name, enabled) { if (enabled) names.add(name); else names.delete(name) },
    },
    setAttribute(name, value) { this[name] = value },
    addEventListener(event, handler) { handlers[event] = handler },
    click() { if (!this.disabled) handlers.click?.() },
    cloneNode() { return element(this.textContent) },
    querySelectorAll() { return [] },
    querySelector() { return null },
  }
}

function openLesson({ store = new Map(), session = new Map(), id = '0001', question = '$x+1$ 等于多少？', denied = false } = {}) {
  const events = new Map()
  const options = ['A', 'B'].map(key => Object.assign(element(key === 'A' ? '$2$' : '$3$'), { dataset: { k: key } }))
  const verdict = element()
  const title = typeof question === 'string' ? element(question) : question
  const quiz = Object.assign(element(), {
    dataset: { answer: 'A' },
    querySelectorAll: () => options,
    querySelector: selector => selector === '.quiz-q' ? title : selector === '.quiz-verdict' ? verdict : null,
  })
  const reveal = element(), good = element(), bad = element(), message = element()
  const recallNodes = { '.recall-q': element('回忆 $x^2$ 的导数'), '.reveal-btn': reveal, '.good-btn': good, '.bad-btn': bad, '.self-msg': message }
  const recall = Object.assign(element(), { querySelector: selector => recallNodes[selector] })
  let restart
  let reloaded = false
  const progress = Object.assign(element(), { insertAdjacentElement(_where, button) { restart = button } })
  const document = {
    body: { dataset: { lessonId: id } }, readyState: 'complete',
    dispatchEvent() {},
    createElement: () => element(),
    createTextNode: text => element(text),
    querySelectorAll: selector => ({ '.quiz': [quiz], '.recall': [recall], '.lesson-progress': [progress] })[selector] || [],
  }
  const storage = values => ({
    getItem(key) { if (denied) throw new Error('denied'); return values.get(key) ?? null },
    setItem(key, value) { if (denied) throw new Error('denied'); values.set(key, value) },
  })
  const context = { document, location: { pathname: `/blog/lessons/zsb-math/${id}.html`, reload() { reloaded = true } }, localStorage: storage(store), sessionStorage: storage(session), CustomEvent: class {} }
  context.window = context
  context.addEventListener = (type, listener) => events.set(type, listener)
  vm.runInNewContext(runtime, context)
  return { options, quiz, recall, reveal, good, bad, progress, verdict, message, restart, reloaded: () => reloaded, store, session,
    storageChanged() { events.get('storage')({ type: 'storage', key: `zc-progress-items-v1:${id}` }) } }
}

test('returning to the same lesson restores the solved answer without counting it twice', () => {
  const first = openLesson()
  first.options[0].click()
  const saved = first.store.get('zc-progress-v1')
  const back = openLesson(first)
  assert.equal(back.quiz.classList.contains('done'), true)
  assert.equal(back.options[0].disabled, true)
  assert.equal(back.options[0].classList.contains('correct'), true)
  assert.match(back.progress.textContent, /1\/1 已完成（首次答对 1）/)
  back.options[0].click()
  assert.equal(first.store.get('zc-progress-v1'), saved)
})

test('wrong attempts survive navigation so a later correction is not counted as first-time right', () => {
  const first = openLesson()
  first.options[1].click()
  const back = openLesson(first)
  assert.equal(back.options[1].classList.contains('wrong'), true)
  assert.equal(back.options[0].disabled, false)
  back.options[0].click()
  const record = JSON.parse(back.store.get('zc-progress-v1'))['0001']
  assert.equal(record.quizTotal, 1)
  assert.equal(record.quizRight, 0)
  assert.match(back.progress.textContent, /首次答对 0/)
})

test('another math tab and a backup reset repaint saved answers without adding attempts', () => {
  const first = openLesson(), second = openLesson(first)
  first.options[0].click(); second.storageChanged()
  assert.equal(second.options[0].disabled, true)
  const key = 'zc-progress-items-v1:0001', stored = JSON.parse(first.store.get(key))
  stored.quiz = {}; stored.recall = {}; first.store.set(key, JSON.stringify(stored))
  second.storageChanged()
  assert.equal(second.options[0].disabled, false)
  assert.equal(second.verdict.textContent, '')
})

test('revealed and graded recall cards resume with their grade, without repeated votes', () => {
  const first = openLesson()
  first.reveal.click()
  const revealed = openLesson(first)
  assert.equal(revealed.recall.classList.contains('shown'), true)
  revealed.good.click()
  const back = openLesson(revealed)
  assert.equal(back.recall.classList.contains('voted-good'), true)
  assert.equal(back.good.disabled, true)
  assert.equal(back.bad.disabled, true)
  back.good.click()
  assert.equal(JSON.parse(back.store.get('zc-progress-v1'))['0001'].recallOk, 1)
  assert.match(back.progress.textContent, /回忆卡 1\/1 已测/)
})

test('legacy aggregates and other lesson data remain intact and are labeled as historical', () => {
  const legacy = { '0001': { visits: 2, quizRight: 11, quizTotal: 15, recallOk: 4, recallNo: 3, note: 'keep' }, '0002': { quizTotal: 8 } }
  const store = new Map([['zc-progress-v1', JSON.stringify(legacy)]])
  const first = openLesson({ store })
  assert.match(first.progress.textContent, /本轮随堂测 0\/1/)
  assert.match(first.progress.textContent, /历史累计：随堂测 15 次，首次答对 11 次；回忆卡 7 次/)
  first.options[0].click()
  const result = JSON.parse(store.get('zc-progress-v1'))
  assert.deepEqual(result['0002'], legacy['0002'])
  assert.equal(result['0001'].note, 'keep')
  assert.equal(result['0001'].quizRight, 12)
  const back = openLesson(first)
  assert.match(back.progress.textContent, /本轮随堂测 1\/1/)
  assert.match(back.progress.textContent, /历史累计：随堂测 15 次/)
})

test('explicitly restarting a lesson clears only its current round and retains cumulative progress', () => {
  const first = openLesson()
  first.options[0].click()
  first.good.click()
  const cumulative = first.store.get('zc-progress-v1')
  first.restart.click()
  assert.equal(first.reloaded(), true)
  assert.equal(first.store.get('zc-progress-v1'), cumulative)
  const restarted = openLesson(first)
  assert.equal(restarted.options[0].disabled, false)
  assert.equal(restarted.good.disabled, false)
  assert.match(restarted.progress.textContent, /本轮随堂测 0\/1/)
  assert.match(restarted.progress.textContent, /历史累计：随堂测 1 次/)
  restarted.options[0].click()
  assert.equal(JSON.parse(first.store.get('zc-progress-v1'))['0001'].quizTotal, 2)
})

test('a changed question does not inherit an unrelated saved answer', () => {
  const first = openLesson()
  first.options[0].click()
  const changed = openLesson({ ...first, question: '$x+2$ 等于多少？' })
  assert.equal(changed.options[0].disabled, false)
  assert.match(changed.progress.textContent, /0\/1 已完成/)
})

test('KaTeX rendering timing does not change the saved question identity', () => {
  const first = openLesson()
  first.options[0].click()
  const rendered = element()
  rendered.cloneNode = () => {
    const copy = element('duplicate rendered text')
    copy.querySelectorAll = () => [{ querySelector: () => element('x+1'), replaceWith(text) { copy.textContent = text.textContent + ' 等于多少？' } }]
    return copy
  }
  const back = openLesson({ ...first, question: rendered })
  assert.equal(back.options[0].disabled, true)
})

test('disabled browser storage does not prevent answering or showing feedback', () => {
  const lesson = openLesson({ denied: true })
  lesson.options[1].click()
  lesson.options[0].click()
  assert.equal(lesson.quiz.classList.contains('done'), true)
  assert.match(lesson.verdict.textContent, /第一次选错了/)
  assert.match(lesson.progress.textContent, /1\/1 已完成（首次答对 0）/)
})

test('visiting or answering incorrectly stays in learning state and exposes review-needed metadata', () => {
  const visited = openLesson()
  assert.equal(visited.progress.dataset.status, 'in-progress')
  assert.match(visited.progress.textContent, /状态：学习中/)
  assert.equal(visited.quiz.classList.contains('done'), false)

  visited.options[1].click()
  assert.equal(visited.progress.dataset.status, 'in-progress')
  assert.equal(visited.progress.dataset.exerciseComplete, '0')
  assert.equal(visited.progress.dataset.reviewNeeded, '1')
  assert.equal(visited.quiz.dataset.reviewNeeded, '1')
})

test('completed practice is separate from all-correct evidence', () => {
  const corrected = openLesson()
  corrected.options[1].click()
  corrected.options[0].click()
  corrected.reveal.click()
  corrected.good.click()
  assert.equal(corrected.progress.dataset.status, 'exercise-complete')
  assert.equal(corrected.progress.dataset.exerciseComplete, '1')
  assert.equal(corrected.progress.dataset.allCorrect, '0')
  assert.equal(corrected.progress.dataset.reviewNeeded, '1')

  const clean = openLesson({ id: '0002' })
  clean.options[0].click()
  clean.reveal.click()
  clean.good.click()
  assert.equal(clean.progress.dataset.status, 'exercise-complete')
  assert.equal(clean.progress.dataset.allCorrect, '1')
  assert.equal(clean.progress.dataset.reviewNeeded, '0')
})
