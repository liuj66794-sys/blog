import test from 'node:test'
import assert from 'node:assert/strict'
import { recentLessons, deskProgress } from '../../docs/.vuepress/study-desk.mjs'
import { todayTasks } from '../../docs/.vuepress/study-tasks.mjs'
import { studyPlan } from '../../docs/.vuepress/study-plan-data.mjs'
import { prepCatalog } from '../../docs/.vuepress/prep-catalog.mjs'
import { safeReturnTo, STUDY_KEY, changeTask } from '../runtime/study-state.mjs'

function storage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return { get length() { return map.size }, key: i => [...map.keys()][i], getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) }
}
function history(entries) { return JSON.stringify({ version: 1, entries: entries.map((item, i) => ({ title: '旧标题', y: 100, updatedAt: i + 1, ...item })) }) }
const first = prepCatalog['zsb-english'].lessons[0]

test('recent lessons merge reading and practice, retain latest mode, and never mutate saved history', () => {
  const saved = history([
    { path: '/blog/courses/zsb-english/l/1/' },
    { path: '/blog' + first.interactive, chapter: '名词分类' },
    { path: '/blog/courses/zsb-math/l/2/' },
  ])
  const source = storage({ 'l1uj-reading-v1': saved })
  const recent = recentLessons(prepCatalog, '/blog/', source)
  assert.equal(recent.length, 2)
  assert.equal(recent[0].slug, 'zsb-math')
  assert.equal(recent[1].mode, 'interactive')
  assert.equal(recent[1].title, first.title)
  assert.match(recent[1].href, /0001-nouns.html\?resume=1/)
  assert.equal(recent[1].chapter, '名词分类')
  assert.equal(source.getItem('l1uj-reading-v1'), saved)
})

test('renamed courses resolve current routes, removed courses disappear, and topic learning stays resumable', () => {
  const source = storage({ 'l1uj-reading-v1': history([
    { path: '/blog/lessons/pi-agent/lessons/0001-typescript-setup-first-program.html', title: 'TypeScript' },
    { path: '/blog/lessons/zsb-english/lessons/0001-old.html', chapter: '旧位置' },
    { path: '/blog/courses/zsb-english/l/999/' },
    { path: 'https://evil.test/blog/courses/zsb-english/l/1/' },
  ]) })
  const recent = recentLessons(prepCatalog, '/blog/', source)
  assert.equal(recent.length, 2)
  assert.equal(recent[0].href, '/blog' + first.interactive)
  assert.equal(recent[0].restored, false)
  assert.equal(recent[0].chapter, '')
  assert.equal(recent[1].slug, 'pi-agent')
  assert.match(recent[1].href, /\?resume=1$/)
})

test('new students start with first lessons even in the middle of the calendar; week mode remains explicit', () => {
  const date = new Date(2026, 8, 23)
  const source = storage()
  const tasks = todayTasks(studyPlan, prepCatalog, '/blog/', source, date)
  assert.equal(tasks.length, 3)
  for (const task of tasks) {
    const slug = task.id.split(':')[1]
    assert.equal(task.id, `lesson:${slug}:${prepCatalog[slug].lessons[0].id}`)
    assert.equal(task.kind, '从基础开始')
  }
  const weekly = todayTasks(studyPlan, prepCatalog, '/blog/', source, date, { pace: 'week' })
  assert.ok(weekly.some(task => task.id === 'lesson:zsb-cs:4'))
})

test('a completed recent lesson gives way to unfinished learning without losing its review needs or history', () => {
  const source = storage({
    'l1uj-reading-v1': history([{ path: '/blog' + first.interactive }]),
    [STUDY_KEY]: JSON.stringify({ version: 1, entries: { 'zsb-english:1': { total: 3, answered: 3, reviewNeeded: 1 } } }),
  })
  const tasks = todayTasks(studyPlan, prepCatalog, '/blog/', source, new Date(2026, 8, 23))
  assert.equal(tasks[0].id, 'lesson:zsb-english:2')
  assert.ok(!tasks.some(task => task.id === 'lesson:zsb-english:1'))
  const progress = deskProgress(prepCatalog, '/blog/', source)['zsb-english']
  assert.equal(progress.continueLesson.id, '2')
  assert.equal(progress.review, 1)
  assert.equal(recentLessons(prepCatalog, '/blog/', source)[0].title, first.title)
})

test('recommendations remain usable after the calendar ends, including week mode and unavailable storage', () => {
  const blocked = { getItem() { throw Error('blocked') } }
  for (const pace of ['progress', 'week']) {
    assert.equal(todayTasks(studyPlan, prepCatalog, '/blog/', blocked, new Date(2028, 0, 1), { pace }).length, 3)
  }
  assert.deepEqual(recentLessons(prepCatalog, '/blog/', blocked), [])
  assert.equal(deskProgress(prepCatalog, '/blog/', blocked)['zsb-english'].continueLesson.id, '1')
})

test('due review is not crowded out by continuing a lesson; deferral still applies', () => {
  const source = storage({
    'l1uj-reading-v1': history([{ path: '/blog' + first.interactive }]),
    'zzkk:v2:card:due': JSON.stringify({ box: 1, at: '2026-09-01' }),
  })
  const date = new Date(2026, 8, 23)
  const tasks = todayTasks(studyPlan, prepCatalog, '/blog/', source, date)
  assert.equal(tasks[0].id, 'review:politics')
  assert.equal(tasks[1].id, 'lesson:zsb-english:1')
  changeTask('review:politics', { deferUntil: '2026-09-24' }, source)
  assert.ok(!todayTasks(studyPlan, prepCatalog, '/blog/', source, date).some(task => task.id === 'review:politics'))
})

test('home workbench is a valid return destination at both project and root bases; foreign origins stay rejected', () => {
  assert.equal(safeReturnTo('/blog/#study-desk'), '/blog/#study-desk')
  assert.equal(safeReturnTo('/#study-desk', '/'), '/#study-desk')
  for (const href of ['//evil.test/blog/', '/blog/../', '/blog2/', 'https://evil.test/blog/']) assert.equal(safeReturnTo(href), null)
})

test('all-finished courses offer review without a fictional next lesson', () => {
  const course = prepCatalog['zsb-english']
  const source = storage({ [STUDY_KEY]: JSON.stringify({ version: 1, entries: Object.fromEntries(course.lessons.map(item => [`zsb-english:${item.id}`, { total: 1, answered: 1, reviewNeeded: 0 }])) }) })
  assert.equal(deskProgress(prepCatalog, '/blog/', source)['zsb-english'].continueLesson, null)
  assert.ok(todayTasks(studyPlan, prepCatalog, '/blog/', source).every(task => !task.id.startsWith('lesson:zsb-english:')))
})

test('task round trips retain the selected pace and the originating page', () => {
  const source = storage(), date = new Date(2026, 8, 23)
  const origin = '/blog/?pace=week#today-tasks'
  const tasks = todayTasks(studyPlan, prepCatalog, '/blog/', source, date, { pace: 'week', returnTo: origin })
  for (const task of tasks) assert.equal(new URL(task.href, 'https://study.test').searchParams.get('returnTo'), origin)
  changeTask(tasks[0].id, { limit: 1 }, source)
  const [small] = todayTasks(studyPlan, prepCatalog, '/blog/', source, date, { pace: 'week', returnTo: origin })
  const url = new URL(small.href, 'https://study.test')
  assert.equal(url.searchParams.get('limit'), '1')
  assert.equal(url.searchParams.get('returnTo'), origin)
})
