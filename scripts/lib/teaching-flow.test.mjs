/**
 * teaching-flow.test.mjs —— 教学流运行时（温故知新 / 知识点 1/3/7 复测 / 小节续学）与
 * 逐选项反馈（英语、政治）、今日任务、备份新键的单测。
 *
 * 浏览器运行时用最小 DOM 仿存根 + node:vm 直接跑脚本本身（不复制实现），
 * 存储一律用内存 Map 仿造 localStorage；真实 localStorage 不参与测试。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createCardSession } from '../runtime/politics-card-session.mjs'
import {
  KNOWLEDGE_KEY, KNOWLEDGE_INTERVALS, WARMUP_LIMIT, sectionsKey, readKnowledge, writeKnowledge,
  isDuePoint, dueKnowledge, recordKnowledge, HISTORY_LIMIT, readSections, markSectionDone,
  nextSectionIndex, pickWarmup, warmupBridge,
} from '../runtime/teaching-flow.mjs'
import { mistakeId, readMistakes, recordAttempt } from '../runtime/mistake-store.mjs'
import { createStudyBackup, applyStudyImport, validateStudyBackup, isAllowedStudyKey } from '../../docs/.vuepress/study-backup.mjs'
import { todayTasks } from '../../docs/.vuepress/study-tasks.mjs'
import { studyPlan } from '../../docs/.vuepress/study-plan-data.mjs'
import { prepCatalog } from '../../docs/.vuepress/prep-catalog.mjs'

const DAY = 86400000
const memory = (initial = {}) => {
  const map = new Map(Object.entries(initial))
  return { get length() { return map.size }, getItem: key => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key), key: index => [...map.keys()][index] }
}
const point = (patch = {}) => ({ box: 1, dueAt: 0, learnedAt: 0, lastResult: 'correct', history: [{ at: 0, result: 'correct' }], ...patch })

/* ---------------- 知识点三盒（1/3/7 天晋级） ---------------- */

test('知识点按 1/3/7 天晋级：到期答对才升盒，上限 3 盒', () => {
  const storage = memory()
  recordKnowledge(['kp-a'], { result: 'correct', now: 0 }, storage)
  assert.deepEqual(readKnowledge(storage).points['kp-a'], { box: 1, dueAt: DAY, learnedAt: 0, lastResult: 'correct', history: [{ at: 0, result: 'correct' }] })
  recordKnowledge(['kp-a'], { result: 'correct', now: DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].box, 2)
  assert.equal(readKnowledge(storage).points['kp-a'].dueAt, DAY + 3 * DAY)
  recordKnowledge(['kp-a'], { result: 'correct', now: 2 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].box, 2, '未到期答对不升盒')
  assert.equal(readKnowledge(storage).points['kp-a'].dueAt, 4 * DAY)
  recordKnowledge(['kp-a'], { result: 'correct', now: 4 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].box, 3)
  assert.equal(readKnowledge(storage).points['kp-a'].dueAt, 4 * DAY + 7 * DAY)
  recordKnowledge(['kp-a'], { result: 'correct', now: 11 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].box, 3, '三盒封顶')
  assert.equal(readKnowledge(storage).points['kp-a'].dueAt, 18 * DAY)
  assert.deepEqual(KNOWLEDGE_INTERVALS, [1, 3, 7])
})

test('答错回到 1 盒并明天再来，看答案只记 viewed，跳过只补历史', () => {
  const storage = memory({ [KNOWLEDGE_KEY]: JSON.stringify({ version: 1, points: { 'kp-a': point({ box: 3, dueAt: 5 * DAY, learnedAt: DAY }) } }) })
  recordKnowledge(['kp-a'], { result: 'wrong', now: 6 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].box, 1)
  assert.equal(readKnowledge(storage).points['kp-a'].dueAt, 7 * DAY)
  recordKnowledge(['kp-a'], { result: 'viewed', now: 7 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].box, 1, '看答案不晋级')
  assert.equal(readKnowledge(storage).points['kp-a'].dueAt, 7 * DAY)
  assert.equal(readKnowledge(storage).points['kp-a'].lastResult, 'viewed')
  recordKnowledge(['kp-unlearned'], { result: 'skip', now: 7 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-unlearned'], undefined, '跳过不会把没学过的点记成已学')
  recordKnowledge(['kp-a'], { result: 'skip', now: 8 * DAY }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].history.at(-1).result, 'skip')
  assert.equal(readKnowledge(storage).points['kp-a'].box, 1)
})

test('知识点历史封顶 50 条，来源随点记录并可回链到课', () => {
  const storage = memory()
  for (let i = 0; i < 60; i++) recordKnowledge(['kp-a'], { result: 'correct', now: i }, storage)
  assert.equal(readKnowledge(storage).points['kp-a'].history.length, HISTORY_LIMIT)
  recordKnowledge(['kp-b'], { result: 'wrong', now: 100, source: () => ({ slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', name: '名词' }) }, storage)
  const due = dueKnowledge(storage, 2 * DAY)
  assert.deepEqual(due.map(item => item.id), ['kp-a', 'kp-b'])
  assert.deepEqual(due[1].source, { slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', name: '名词' })
  assert.equal(isDuePoint(null), false)
  assert.equal(isDuePoint({ learnedAt: 0, dueAt: 5 }, 4), false)
})

test('损坏或不可用的存储不会抛出，也不清空既有记录', () => {
  const broken = { getItem() { throw Error('denied') }, setItem() { throw Error('denied') } }
  assert.deepEqual(readKnowledge(broken), { points: {}, sources: {} })
  assert.equal(recordKnowledge(['kp-a'], { result: 'correct' }, broken), false)
  assert.deepEqual(dueKnowledge(broken), [])
  const junk = memory({ [KNOWLEDGE_KEY]: JSON.stringify({ version: 2, points: { 'kp-a': point() } }) })
  assert.deepEqual(readKnowledge(junk).points, {}, '版本不符按空处理，不猜测')
})

/* ---------------- 温故知新选题 ---------------- */

const sections = [{ id: 'pt-1', title: '本节', goal: '学会数词', prereqs: ['kp-pre'], knowledgePoints: ['kp-now'] }]
const warmQuestion = (id, lessonId, kps) => ({ id, ref: 'quiz:0', lessonId, knowledgePoints: kps })
const warmPoints = () => ({
  'kp-pre': point({ learnedAt: 1, dueAt: 30 * DAY }),
  'kp-old': point({ learnedAt: 1, dueAt: 30 * DAY }),
  'kp-due': point({ box: 1, learnedAt: 1, dueAt: 2 * DAY }),
})

test('温故题先本节前置已学，再到期薄弱点，最后更早的已学内容', () => {
  const questions = [
    warmQuestion('a', '9', ['kp-pre']),
    warmQuestion('b', '8', ['kp-due']),
    warmQuestion('c', '7', ['kp-old']),
    warmQuestion('d', '1', ['kp-pre']),
  ]
  const plan = pickWarmup({ sections, questions, points: warmPoints(), mistakes: {}, currentLesson: '1', now: 3 * DAY })
  assert.equal(plan.mode, 'questions')
  assert.deepEqual(plan.questions.map(q => q.id), ['a', 'd', 'b'])
  assert.equal(plan.partial, false, '三道刚好满足上限')
})

test('温故题按题目去重、不足三道按实际数量、无可选记录时只给引导语', () => {
  const questions = [warmQuestion('a', '9', ['kp-pre', 'kp-due']), warmQuestion('b', '8', ['kp-old'])]
  const plan = pickWarmup({ sections, questions, points: warmPoints(), mistakes: {}, currentLesson: '1', now: 3 * DAY })
  assert.deepEqual(plan.questions.map(q => q.id), ['a', 'b'])
  assert.equal(plan.partial, true)
  assert.equal(plan.questions.length < WARMUP_LIMIT, true)
  assert.deepEqual(pickWarmup({ sections, questions, points: {}, mistakes: {}, currentLesson: '1', now: 0 }), { mode: 'empty', questions: [] })
  const pending = pickWarmup({ sections, questions: [warmQuestion('x', '5', [])], points: {}, mistakes: { x: { status: 'pending' } }, currentLesson: '1', now: 0 })
  assert.deepEqual(pending.questions.map(q => q.id), ['x'], '没有已学点也先处理错题 pending')
  const mastered = pickWarmup({ sections, questions: [warmQuestion('x', '5', [])], points: {}, mistakes: { x: { status: 'mastered' } }, currentLesson: '1', now: 0 })
  assert.deepEqual(mastered.questions, [])
})

test('温故衔接语用知识点小结托起本节目标', () => {
  const bridge = warmupBridge({ name: '数词', summary: '先分清基数与序数。' }, sections[0])
  assert.match(bridge, /数词/)
  assert.match(bridge, /学会数词/)
  assert.match(bridge, /先分清基数与序数/)
  assert.match(warmupBridge(null, null), /这个旧知识/)
})

/* ---------------- 小节续学 ---------------- */

test('小节完成按 slug:lessonId 记录，续学指向第一个未完成小节', () => {
  const storage = memory()
  const list = [{ id: 'pt-1' }, { id: 'pt-2' }, { id: 'pt-3' }]
  assert.equal(nextSectionIndex(list, {}), 0)
  markSectionDone('zsb-english', '1', 'pt-1', 100, storage)
  markSectionDone('zsb-english', '1', 'pt-1', 999, storage)
  assert.deepEqual(readSections('zsb-english', '1', storage), { 'pt-1': { done: true, at: 100 } }, '重复进入视口不覆盖首次时间')
  assert.equal(nextSectionIndex(list, readSections('zsb-english', '1', storage)), 1)
  assert.equal(sectionsKey('zsb-english', '1'), 'l1uj-sections-v1:zsb-english:1')
  markSectionDone('zsb-english', '1', 'pt-2', 200, storage)
  markSectionDone('zsb-english', '1', 'pt-3', 300, storage)
  assert.equal(nextSectionIndex(list, readSections('zsb-english', '1', storage)), -1, '全部学完不再提示续学')
  assert.deepEqual(readSections('zsb-politics', 'mzt01', storage), {}, '不同课互不影响')
  assert.equal(markSectionDone('zsb-english', '1', 'pt-4', 400, { getItem() { throw Error('denied') }, setItem() { throw Error('denied') } }), false)
})

/* ---------------- 今日任务：到期知识点复测 ---------------- */

const taskStorage = (initial = {}) => memory(initial)
const knowledgeSeed = source => JSON.stringify({ version: 1, points: { 'kp-a': point({ box: 1, learnedAt: 1, dueAt: 1 }) }, sources: { 'kp-a': source } })

test('到期知识点在政治闪卡之后入列，链接对应课互动页，总数仍为三条', () => {
  const source = { slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', name: '名词单复数' }
  const storage = taskStorage({
    'zzkk:v2:card:c1': JSON.stringify({ box: 1, at: '2026-09-07' }),
    [KNOWLEDGE_KEY]: knowledgeSeed(source),
  })
  const tasks = todayTasks(studyPlan, prepCatalog, '/blog/', storage, new Date(2026, 8, 8))
  assert.deepEqual(tasks.map(task => task.id).slice(0, 2), ['review:politics', 'knowledge:due'])
  assert.equal(tasks.length, 3, '最多仍三条')
  const knowledge = tasks[1]
  assert.equal(knowledge.kind, '知识点复测')
  assert.match(knowledge.description, /名词单复数/)
  assert.match(knowledge.description, /1\/3\/7 天复测期/)
  assert.equal(knowledge.href, '/blog/lessons/zsb-english/lessons/0001-nouns.html?returnTo=%2Fblog%2Fprep%2F%23today-tasks')
})

test('到期知识点的题目已在错题任务里时不重复入列，来源缺失也不猜课程', () => {
  const source = { slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', name: '名词单复数' }
  const pending = { slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', kind: 'choice', stem: 's', options: [{ value: '0', text: 'a' }], answer: ['0'], status: 'pending', dueAt: 0, wrongs: 1 }
  const storage = taskStorage({
    [KNOWLEDGE_KEY]: knowledgeSeed(source),
    'zhixu-mistakes-v1': JSON.stringify({ version: 1, entries: { [mistakeId(pending)]: pending } }),
  })
  assert.ok(!todayTasks(studyPlan, prepCatalog, '/blog/', storage, new Date(2026, 8, 8)).some(task => task.id === 'knowledge:due'))
  const orphan = taskStorage({ [KNOWLEDGE_KEY]: JSON.stringify({ version: 1, points: { 'kp-a': point({ learnedAt: 1, dueAt: 1 }) }, sources: {} }) })
  assert.ok(!todayTasks(studyPlan, prepCatalog, '/blog/', orphan, new Date(2026, 8, 8)).some(task => task.id === 'knowledge:due'))
})

test('复习偏好同样作用于到期知识点任务', () => {
  const storage = taskStorage({ [KNOWLEDGE_KEY]: knowledgeSeed({ slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', name: '名词单复数' }) })
  storage.setItem('l1uj-study-tasks-v1', JSON.stringify({ version: 1, entries: { 'knowledge:due': { deferUntil: '2026-09-09' } } }))
  assert.ok(!todayTasks(studyPlan, prepCatalog, '/blog/', storage, new Date(2026, 8, 8)).some(task => task.id === 'knowledge:due'))
  assert.ok(todayTasks(studyPlan, prepCatalog, '/blog/', storage, new Date(2026, 8, 10)).some(task => task.id === 'knowledge:due'))
})

/* ---------------- 备份：新键导出/导入/校验 ---------------- */

const backupPayload = records => ({ format: 'l1uj-study-backup', version: 1, base: '/blog/', createdAt: 1000, records })

test('知识点与小节完成进入学习备份并可整体恢复', () => {
  const source = memory({
    [KNOWLEDGE_KEY]: JSON.stringify({ version: 1, points: { 'kp-a': point({ learnedAt: 7 }) }, sources: { 'kp-a': { slug: 'zsb-english', lessonId: '1', ref: 'quiz:0', name: '名词' } } }),
    [sectionsKey('zsb-english', '1')]: JSON.stringify({ 'pt-1': { done: true, at: 7 } }),
  })
  const { backup, skipped, includedKeys } = createStudyBackup(source, { createdAt: 1000 })
  assert.deepEqual(skipped, [])
  assert.deepEqual(includedKeys, [KNOWLEDGE_KEY, 'l1uj-sections-v1:zsb-english:1'])
  const target = memory()
  assert.equal(applyStudyImport(backup, target).applied, true)
  assert.deepEqual(JSON.parse(target.getItem(KNOWLEDGE_KEY)), JSON.parse(source.getItem(KNOWLEDGE_KEY)))
  assert.deepEqual(JSON.parse(target.getItem(sectionsKey('zsb-english', '1'))), { 'pt-1': { done: true, at: 7 } })
})

test('导入按知识点与小节合并：本机新的保留，导入较新的覆盖，导入独有补齐', () => {
  const local = memory({
    [KNOWLEDGE_KEY]: JSON.stringify({ version: 1, points: { 'kp-old': point({ box: 2, learnedAt: 5000 }), 'kp-keep': point({ box: 3, learnedAt: 9000 }) }, sources: {} }),
    [sectionsKey('zsb-english', '1')]: JSON.stringify({ 'pt-1': { done: true, at: 50 } }),
  })
  const payload = backupPayload({
    [KNOWLEDGE_KEY]: { version: 1, points: { 'kp-old': point({ box: 1, learnedAt: 9000 }), 'kp-keep': point({ box: 1, learnedAt: 1000 }), 'kp-new': point({ box: 1, learnedAt: 2000 }) }, sources: { 'kp-new': { slug: 'zsb-politics', lessonId: 'mzt01', ref: 'm1', name: '活的灵魂' } } },
    [sectionsKey('zsb-english', '1')]: { 'pt-1': { done: true, at: 20 }, 'pt-2': { done: true, at: 60 } },
  })
  assert.equal(applyStudyImport(payload, local).applied, true)
  const points = JSON.parse(local.getItem(KNOWLEDGE_KEY))
  assert.equal(points.points['kp-old'].learnedAt, 9000, '导入较新时覆盖')
  assert.equal(points.points['kp-keep'].box, 3, '本机较新时保留')
  assert.equal(points.points['kp-new'].learnedAt, 2000)
  assert.equal(points.sources['kp-new'].name, '活的灵魂')
  assert.deepEqual(JSON.parse(local.getItem(sectionsKey('zsb-english', '1'))), { 'pt-1': { done: true, at: 50 }, 'pt-2': { done: true, at: 60 } })
})

test('备份校验拒绝坏知识点、坏小节与不安全键，导出时跳过本地坏值', () => {
  const good = point({ learnedAt: 1 })
  assert.equal(validateStudyBackup(backupPayload({ [KNOWLEDGE_KEY]: { version: 1, points: { 'kp-a': good } } })).valid, true)
  const cases = [
    { version: 1, points: { 'kp-a': { ...good, box: 4 } } },
    { version: 1, points: { 'kp-a': { ...good, lastResult: 'guessed' } } },
    { version: 1, points: { 'kp-a': { ...good, history: Array.from({ length: 51 }, (_, i) => ({ at: i, result: 'correct' })) } } },
    { version: 1, points: { 'kp-a': { ...good, history: [{ at: 0, result: 'maybe' }] } } },
    { version: 1, points: {}, sources: { 'kp-a': { slug: 'zsb-unknown' } } },
  ]
  for (const bad of cases) assert.equal(validateStudyBackup(backupPayload({ [KNOWLEDGE_KEY]: bad })).valid, false, JSON.stringify(bad).slice(0, 60))
  assert.equal(validateStudyBackup(backupPayload({ [sectionsKey('zsb-english', '1')]: { 'pt-1': { done: 'yes', at: 1 } } })).valid, false)
  assert.equal(validateStudyBackup(backupPayload({ [sectionsKey('zsb-english', '1')]: { 'pt-1': { done: true, at: 'now' } } })).valid, false)
  assert.equal(isAllowedStudyKey('l1uj-sections-v1:zsb-english:1'), true)
  assert.equal(isAllowedStudyKey('l1uj-sections-v1:../evil'), false)
  const storage = memory({ [KNOWLEDGE_KEY]: JSON.stringify({ version: 1, points: { 'kp-a': { box: 4 } } }) })
  const { backup, skipped } = createStudyBackup(storage, { createdAt: 1 })
  assert.deepEqual(backup.records, {})
  assert.equal(skipped.length, 1)
  assert.equal(writeKnowledge({ points: { 'kp-a': good }, sources: {} }, memory()), true)
})

/* ---------------- 最小 DOM 仿存根：够两个 quiz 运行时用 ---------------- */

const stripTags = html => String(html).replace(/<[^>]*>/g, '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const escapeHtml = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase()
    this.children = []
    this.attributes = {}
    this.listeners = {}
    this.dataset = {}
    this.style = {}
    this.className = ''
    this.parentNode = null
    this.html = ''
    this.text = ''
    this.hidden = false
    this.disabled = false
    const node = this
    this.classList = {
      add: (...names) => { node.className = [...new Set([...node.className.split(/\s+/).filter(Boolean), ...names])].join(' ') },
      remove: (...names) => { node.className = node.className.split(/\s+/).filter(name => name && !names.includes(name)).join(' ') },
      contains: name => node.className.split(/\s+/).includes(name),
      toggle: (name, force) => { const on = force === undefined ? !node.classList.contains(name) : force; if (on) node.classList.add(name); else node.classList.remove(name); return on },
    }
  }
  get textContent() { return stripTags(this.html) + this.text + this.children.map(child => child.textContent).join('') }
  get firstChild() { return this.children[0] || null }
  removeChild(child) { child.remove(); return child }
  get isConnected() { return this.tagName === 'BODY' || !!this.parentNode?.isConnected }
  getBoundingClientRect() { return { top: 0, bottom: 500 } }
  closest(selector) { if (matchesSelector(this, selector)) return this; return this.parentNode?.closest(selector) || null }
  set textContent(value) { this.children = []; this.html = ''; this.text = value == null ? '' : String(value) }
  get innerHTML() { return this.html + escapeHtml(this.text) + this.children.map(child => child.innerHTML).join('') }
  set innerHTML(value) { this.children = []; this.text = ''; this.html = value == null ? '' : String(value) }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child }
  append(...nodes) { for (const node of nodes) this.appendChild(node) }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null }
  setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'id') this.id = String(value) }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null }
  removeAttribute(name) { delete this.attributes[name] }
  addEventListener(type, handler) { (this.listeners[type] = this.listeners[type] || []).push(handler) }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter(item => item !== handler) }
  dispatch(type, detail) { for (const handler of [...(this.listeners[type] || [])]) handler({ type, detail, target: this }) }
  scrollIntoView() { this.scrolled = true }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null }
  querySelectorAll(selector) {
    const found = []
    const walk = node => { for (const child of node.children) { if (matchesSelector(child, selector)) found.push(child); walk(child) } }
    walk(this)
    return found
  }
}

function matchesSelector(node, selector) {
  return String(selector).split(',').some(part => matchesChain(node, part.trim().split(/\s+/)))
}

/* 简单选择器（tag/.class/#id/[attr]）按祖先链匹配，够运行时里的 '.qteach-steps li' 这类后代选择器用。 */
function matchesChain(node, parts) {
  if (!node || !matchesSimple(node, parts[parts.length - 1])) return false
  let current = node.parentNode
  for (let index = parts.length - 2; index >= 0; index--) {
    while (current && !matchesSimple(current, parts[index])) current = current.parentNode
    if (!current) return false
    current = current.parentNode
  }
  return true
}

function matchesSimple(node, value) {
  const attr = value.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/)
  if (attr) return attr[2] === undefined ? attr[1] in node.attributes : node.attributes[attr[1]] === attr[2]
  if (value.startsWith('#')) return node.attributes.id === value.slice(1)
  if (value.startsWith('.')) return node.className.split(/\s+/).includes(value.slice(1))
  return node.tagName === value.toUpperCase()
}

class FakeCustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail } }

function loadRuntime(name, { pathname = '/blog/lessons/zsb-english/lessons/0001-nouns.html', teaching = null, storage = memory() } = {}) {
  const nodes = new Map(), documentListeners = {}, windowListeners = {}
  const body = new FakeNode('body'), head = new FakeNode('head')
  const add = (type, handlers, handler) => { (handlers[type] = handlers[type] || []).push(handler) }
  const drop = (type, handlers, handler) => { handlers[type] = (handlers[type] || []).filter(item => item !== handler) }
  const fire = (event, handlers) => { for (const handler of [...(handlers[event.type] || [])]) handler(event) }
  const container = new FakeNode('div')
  container.setAttribute('id', 'quiz')
  body.appendChild(container)
  nodes.set('quiz', container)
  if (teaching) {
    const data = new FakeNode('script')
    data.setAttribute('id', 'teaching-data')
    data.textContent = JSON.stringify(teaching)
    body.appendChild(data)
    nodes.set('teaching-data', data)
  }
  const document = {
    body, head, documentElement: new FakeNode('html'),
    createElement: tag => new FakeNode(tag),
    createTextNode: text => { const node = new FakeNode('#text'); node.text = String(text); return node },
    getElementById: id => nodes.get(id) || null,
    querySelector: selector => {
      if (matchesSelector(body, selector)) return body
      return body.querySelector(selector)
    },    querySelectorAll: selector => body.querySelectorAll(selector),
    addEventListener: (type, handler) => add(type, documentListeners, handler),
    removeEventListener: (type, handler) => drop(type, documentListeners, handler),
    dispatchEvent: event => fire(event, documentListeners),
  }
  const location = { pathname, search: '', hash: '', href: pathname }
  const window = {
    localStorage: storage, location, document, innerHeight: 900, PoliticsSession: { createCardSession },
    addEventListener: (type, handler) => add(type, windowListeners, handler),
    removeEventListener: (type, handler) => drop(type, windowListeners, handler),
    dispatchEvent: event => fire(event, windowListeners),
  }
  const sandbox = {
    window, document, location, localStorage: storage, sessionStorage: memory(), CustomEvent: FakeCustomEvent, URLSearchParams,
    setTimeout, clearTimeout, console, JSON, Object, Array, String, Number, Boolean, Math, Date, Error, Promise, RegExp, Map, Set,
  }
  vm.runInContext(fs.readFileSync(new URL(`../runtime/${name}`, import.meta.url), 'utf8'), vm.createContext(sandbox), { filename: name })
  return { window, document, sandbox, container, body, nodes, storage, documentListeners, windowListeners }
}

const textOf = node => node.textContent
const click = node => node.dispatch('click')

const cardFixtures = Array.from({ length: 3 }, (_, i) => ({ schemaVersion: 1, id: 'fixture-' + i, lessonId: 'test', question: '第' + i + '个独立问题？', answer: '答案' + i, chapter: '', source: { label: '' }, contentVersion: 1 }))
const cardButton = (node, text) => node.querySelectorAll('button').find(b => b.textContent === text)
function cardKey(env, target, code, extras = {}) { env.document.dispatchEvent({ type: 'keydown', target, code, key: code, preventDefault() {}, ...extras }) }

test('flashcard keyboard is scoped, ignores repeat and editable targets, and disposes on remount', () => {
  const env = loadRuntime('politics-quiz.js')
  const a = env.container, b = new FakeNode('div'); b.id = 'second'; env.body.appendChild(b)
  const one = env.window.ZQ.mountCards(a, cardFixtures), two = env.window.ZQ.mountCards(b, cardFixtures)
  one.activate(); cardKey(env, a, 'Space')
  assert.equal(one.getState().face, 'back'); assert.equal(two.getState().face, 'front')
  cardKey(env, a, 'Space', { repeat: true }); assert.equal(one.getState().face, 'back')
  cardKey(env, new FakeNode('textarea'), 'Space'); assert.equal(one.getState().face, 'back')
  two.activate(); cardKey(env, b, 'Space'); assert.equal(two.getState().face, 'back')
  assert.equal(env.documentListeners.keydown.length, 2)
  const replacement = env.window.ZQ.mountCards(a, cardFixtures)
  assert.equal(env.documentListeners.keydown.length, 2)
  assert.equal(a.querySelectorAll('.cards-shell').length, 1)
  two.dispose(); replacement.dispose()
  assert.equal(env.documentListeners.keydown.length, 0)
  assert.equal(env.windowListeners.storage.length, 0)
  assert.equal(env.windowListeners.pagehide.length, 0)
  assert.equal(env.windowListeners.pageshow.length, 0)
})

test('flashcard rapid events cannot grade front/completed cards; switching resets face atomically', () => {
  const env = loadRuntime('politics-quiz.js'), box = env.container
  const ctrl = env.window.ZQ.mountCards(box, cardFixtures, { debug: true })
  const yes = cardButton(box, '✓ 记住了（1）'), flip = cardButton(box, '翻转 空格')
  click(yes); assert.equal(ctrl.getState().queueLength, 3)
  click(flip); click(flip); click(flip)
  assert.equal(ctrl.getState().face, 'back')
  const oldNode = box.querySelector('.flashcard')
  click(cardButton(box, '下一张 ›'))
  assert.equal(ctrl.getState().face, 'front')
  assert.notEqual(box.querySelector('.flashcard'), oldNode)
  for (let i = 0; i < 3; i++) { click(flip); click(yes); click(yes) }
  assert.equal(ctrl.getState().phase, 'dailyComplete')
  assert.equal(yes.disabled, true); assert.equal(flip.disabled, true)
  assert.equal(cardButton(box, '🔀 洗牌').disabled, true)
  click(flip); click(yes); assert.equal(ctrl.getState().queueLength, 0)
  for (const c of cardFixtures) assert.equal(env.window.ZQ.srs.get(c.id).box, 1)
  assert.equal(box.flashcardDebug.cardId, null)
  assert.ok(box.flashcardDebugHistory.some(e => e.flipStart && e.questionLength > 0))
})

test('flashcard cached navigation stays interactive; final pagehide disposes listeners', () => {
  const env = loadRuntime('politics-quiz.js'), box = env.container
  const ctrl = env.window.ZQ.mountCards(box, cardFixtures)
  env.window.dispatchEvent({ type: 'pagehide', persisted: true })
  env.window.dispatchEvent({ type: 'pageshow', persisted: true })
  click(cardButton(box, '翻转 空格')); assert.equal(ctrl.getState().face, 'back')
  assert.equal(env.documentListeners.keydown.length, 1)
  env.window.dispatchEvent({ type: 'pagehide', persisted: false })
  assert.equal(env.documentListeners.keydown.length, 0)
})

/* ---------------- 英语逐选项反馈 ---------------- */

const englishTeaching = {
  version: 1, lessonId: '1', sections: [{ id: 'pt-1', knowledgePoints: ['kp-a'] }], knowledgePoints: [{ id: 'kp-a', name: '现在完成时', summary: 'have/has + 过去分词' }],
  questions: {
    'quiz:0': {
      knowledgePoints: ['kp-a'],
      optionAnalysis: [
        { option: 0, verdict: 'correct', why: '主语 she 用 has' },
        { option: 1, verdict: 'wrong', why: 'have 不配三单' },
        { option: 2, verdict: 'wrong', why: 'had 是过去完成' },
      ],
      steps: ['先看主语人称', '再看时间状语'],
      translation: '她已经完成了作业。',
      phrases: [{ text: 'finish homework', meaning: '完成作业' }],
      sourceContext: { label: '讲义例句', quote: 'She has finished her homework.' },
      compareTo: 'quiz:1',
      subjective: { keyPoints: ['点明时态'], derivation: '从时间状语反推时态', selfEval: ['能说清为什么选它'] },
    },
    'quiz:1': { knowledgePoints: ['kp-a'], optionAnalysis: [{ option: 0, verdict: 'wrong', why: '选项 A 不合语境' }, { option: 1, verdict: 'correct', why: '选项 B 承接上文' }] },
  },
}

const EnglishLesson = () => loadRuntime('english-quiz.js', { teaching: englishTeaching })

test('英语错项反馈：错项原因 + 分步判断 + 正确项理由 + 其余选项折叠 + 翻译词组与原文定位', () => {
  const env = EnglishLesson()
  env.window.Quiz.render('#quiz', [
    { q: 'She ___ finished.', opts: ['has', 'have', 'had'], a: 0, why: '三单用 has' },
    { q: '下一题', opts: ['A 项', 'B 项'], a: 1, why: '承接上文' },
  ])
  const cards = env.container.querySelectorAll('.qcard')
  assert.equal(cards.length, 2)
  click(cards[0].querySelectorAll('.opt')[1])
  const card = textOf(cards[0])
  assert.match(card, /✗ 你选 B 为什么错/)
  assert.match(card, /have 不配三单/)
  assert.match(card, /✓ 正确答案 A 为什么成立/)
  assert.match(card, /主语 she 用 has/)
  assert.match(card, /分步判断/)
  assert.deepEqual(cards[0].querySelectorAll('.qteach-steps li').map(textOf), ['先看主语人称', '再看时间状语'])
  assert.match(textOf(cards[0].querySelector('.qteach-rest')), /其余选项解析/)
  assert.match(textOf(cards[0].querySelector('.qteach-rest')), /C（错误）：had 是过去完成/)
  assert.match(card, /整句翻译：她已经完成了作业。/)
  assert.match(card, /finish homework 完成作业/)
  assert.match(card, /原文定位 · 讲义例句/)
  assert.match(card, /She has finished her homework\./)
  assert.match(card, /作答要点与自评/)
  assert.match(card, /从时间状语反推时态/)
  assert.equal(cards[0].studyQuestion.knowledgePoints.join(','), 'kp-a')
  assert.equal(cards[0].studyQuestion.teaching.translation, '她已经完成了作业。')
  assert.equal(cards[0].querySelector('.qteach-compare').hidden, false)
  click(cards[0].querySelector('.qteach-compare'))
  assert.equal(cards[1].scrolled, true, '对比自测跳到同页同 ref 题目')
  assert.equal(cards[1].classList.contains('quiz-flash'), true)
})

test('英语选对时不再显示错项块，但正确项理由与对比自测仍在', () => {
  const env = EnglishLesson()
  env.window.Quiz.render('#quiz', [
    { q: 'She ___ finished.', opts: ['has', 'have', 'had'], a: 0, why: '三单用 has' },
    { q: '下一题', opts: ['A 项', 'B 项'], a: 1, why: '承接上文' },
  ])
  const cards = env.container.querySelectorAll('.qcard')
  click(cards[1].querySelectorAll('.opt')[1])
  const card = textOf(cards[1])
  assert.doesNotMatch(card, /✗ 你选/)
  assert.match(card, /✓ 正确答案 B 为什么成立/)
  assert.match(card, /选项 B 承接上文/)
  assert.match(card, /A（错误）：选项 A 不合语境/)
})

test('对比自测目标不在本组时按钮隐藏', () => {
  const teaching = { version: 1, lessonId: '1', sections: [], knowledgePoints: [], questions: { 'quiz:0': { compareTo: 'quiz:9' } } }
  const env = loadRuntime('english-quiz.js', { teaching })
  env.window.Quiz.render('#quiz', [{ q: '只有一题', opts: ['对', '错'], a: 0, why: '因为' }])
  click(env.container.querySelectorAll('.qcard')[0].querySelectorAll('.opt')[0])
  const button = env.container.querySelector('.qteach-compare')
  assert.ok(button)
  assert.equal(button.hidden, true)
})

test('无 teaching-data 的英语课保持旧反馈，不出现教学区块', () => {
  const env = loadRuntime('english-quiz.js')
  env.window.Quiz.render('#quiz', [{ q: '旧题', opts: ['对', '错'], a: 0, why: '旧解析' }])
  const cards = env.container.querySelectorAll('.qcard')
  click(cards[0].querySelectorAll('.opt')[1])
  assert.equal(env.container.querySelectorAll('.qteach').length, 0)
  assert.equal(env.container.querySelectorAll('.qteach-subjective').length, 0)
  assert.match(textOf(cards[0]), /✗ 正确答案：对。 旧解析/)
  assert.equal(cards[0].studyQuestion.teaching, undefined)
})

/* ---------------- 政治逐选项反馈 ---------------- */

const politicsTeaching = {
  version: 1, lessonId: 'mzt01', sections: [], knowledgePoints: [{ id: 'kp-p', name: '活的灵魂', summary: '实事求是、群众路线、独立自主' }],
  questions: {
    m1: {
      knowledgePoints: ['kp-p'],
      optionAnalysis: [
        { option: 'A', verdict: 'correct', why: '实事求是是精髓' },
        { option: 'B', verdict: 'correct', why: '群众路线是根本工作路线' },
        { option: 'C', verdict: 'correct', why: '独立自主是基本立足点' },
        { option: 'D', verdict: 'wrong', why: '改革开放不属于活的灵魂' },
      ],
      steps: ['先回忆三个基本方面', '再逐项排除'],
      wrongPick: '把“改革开放”误当成活的灵魂。',
      missedPick: '漏选了“独立自主”。',
      sourceContext: { label: '教材', quote: '实事求是、群众路线、独立自主' },
      compareTo: 'm2',
    },
    m2: { optionAnalysis: [{ option: 'A', verdict: 'correct', why: '第二题答案' }, { option: 'B', verdict: 'wrong', why: '第二题干扰项' }] },
  },
}
const canonicalFixture = q => ({ schemaVersion: 1, contentVersion: 1, id: q.id, lessonId: 'mzt01', kind: 'choice', question: q.stem, options: q.options.map(o => ({ value: o.letter, text: o.text })), answer: q.answer.split(''), explanation: q.exp, chapter: '第一章', knowledgePoint: '', source: { label: '', path: '/blog/lessons/zsb-politics/lessons/mzt01.html' }, answerStatus: 'provided' })
const politicsQuestions = () => [
  { id: 'm1', stem: '毛泽东思想活的灵魂不包括？', options: [{ letter: 'A', text: '实事求是' }, { letter: 'B', text: '群众路线' }, { letter: 'C', text: '独立自主' }, { letter: 'D', text: '改革开放' }], answer: 'ABC', exp: '活的灵魂是前三者' },
  { id: 'm2', stem: '第二题', options: [{ letter: 'A', text: '对项' }, { letter: 'B', text: '错项' }], answer: 'A', exp: '第二题解析' },
].map(canonicalFixture)

test('政治多选：错选项、漏选项、分步判断、正确项理由与其余选项分别渲染', () => {
  const env = loadRuntime('politics-quiz.js', { pathname: '/blog/lessons/zsb-politics/lessons/mzt01.html', teaching: politicsTeaching })
  const container = new FakeNode('div')
  container.setAttribute('id', 'politics-quiz')
  env.body.appendChild(container)
  env.window.ZQ.mountQuiz(container, politicsQuestions(), { lessonId: 'mzt01' })
  const items = container.querySelectorAll('.q-item')
  click(items[0].querySelectorAll('.opt')[3])
  click(items[0].querySelector('.confirm'))
  const card = textOf(items[0])
  assert.match(card, /✗ 你选 D 为什么错/)
  assert.match(card, /改革开放不属于活的灵魂/)
  assert.match(card, /漏选 A、B、C 为什么/)
  assert.match(card, /群众路线是根本工作路线/)
  assert.match(card, /把“改革开放”误当成活的灵魂。/)
  assert.match(card, /漏选了“独立自主”。/)
  assert.match(card, /✓ 正确答案 A、B、C 为什么成立/)
  assert.match(card, /实事求是是精髓/)
  assert.deepEqual(items[0].querySelectorAll('.qteach-steps li').map(textOf), ['先回忆三个基本方面', '再逐项排除'])
  assert.match(textOf(items[0].querySelector('.qteach-source')), /实事求是、群众路线、独立自主/)
  assert.equal(items[0].querySelector('.qteach-compare').hidden, false)
  click(items[0].querySelector('.qteach-compare'))
  assert.equal(items[1].scrolled, true)
  assert.equal(items[0].studyQuestion.ref, 'm1')
  assert.equal(items[0].studyQuestion.knowledgePoints[0], 'kp-p')
  assert.equal(items[0].studyQuestion.teaching.steps.length, 2)
})

test('政治单选：其余选项折叠，错题入库时带上教学补充', () => {
  const env = loadRuntime('politics-quiz.js', { pathname: '/blog/lessons/zsb-politics/lessons/mzt01.html', teaching: politicsTeaching })
  const container = new FakeNode('div')
  env.body.appendChild(container)
  env.window.ZQ.mountQuiz(container, [
    { id: 'm2', stem: '第二题', options: [{ letter: 'A', text: '对项' }, { letter: 'B', text: '错项' }], answer: 'A', exp: '第二题解析' },
  ].map(canonicalFixture), { lessonId: 'mzt01' })
  const item = container.querySelectorAll('.q-item')[0]
  click(item.querySelectorAll('.opt')[1])
  const card = textOf(item)
  assert.match(card, /✗ 你选 B 为什么错/)
  assert.match(card, /✓ 正确答案 A 为什么成立/)
  assert.match(card, /第二题干扰项/)
  const question = item.studyQuestion
  assert.equal(recordAttempt(question, { correct: false, attemptId: 'politics-1' }, env.storage), true)
  const saved = readMistakes(env.storage)[mistakeId(question)]
  assert.equal(saved.teaching.optionAnalysis.length, 2, '错题条目保留 teaching')
  assert.equal(saved.subjective, undefined)
})

test('政治主观题支架随题卡渲染，无 teaching-data 时保持旧判分与解析', () => {
  const teaching = { version: 1, lessonId: 'mzt01', sections: [], knowledgePoints: [], questions: { m1: { subjective: { keyPoints: ['实事求是', '群众路线'], derivation: '从定义出发逐项排除', selfEval: ['能默写三个要点'] } } } }
  const env = loadRuntime('politics-quiz.js', { pathname: '/blog/lessons/zsb-politics/lessons/mzt01.html', teaching })
  const container = new FakeNode('div')
  env.body.appendChild(container)
  env.window.ZQ.mountQuiz(container, politicsQuestions(), { lessonId: 'mzt01' })
  const subjective = textOf(container.querySelectorAll('.q-item')[0].querySelector('.qteach-subjective'))
  assert.match(subjective, /作答要点与自评/)
  assert.match(subjective, /实事求是/)
  assert.match(subjective, /从定义出发逐项排除/)
  assert.match(subjective, /能默写三个要点/)

  const plain = loadRuntime('politics-quiz.js', { pathname: '/blog/lessons/zsb-politics/lessons/mzt01.html' })
  const box = new FakeNode('div')
  plain.body.appendChild(box)
  plain.window.ZQ.mountQuiz(box, politicsQuestions(), { lessonId: 'mzt01' })
  const item = box.querySelectorAll('.q-item')[0]
  click(item.querySelectorAll('.opt')[0])
  click(item.querySelector('.confirm'))
  assert.equal(box.querySelectorAll('.qteach').length, 0)
  assert.equal(box.querySelectorAll('.qteach-subjective').length, 0)
  assert.match(textOf(item), /✗ 正确答案：/)
  assert.match(textOf(item), /活的灵魂是前三者/)
  assert.equal(item.studyQuestion.teaching, undefined)
})
