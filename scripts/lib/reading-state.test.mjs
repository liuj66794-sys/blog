import assert from 'node:assert/strict'
import test from 'node:test'
import { READING_KEY, lessonIdentity, readRecent, readEntries, saveReading, resumeUrl, trackReading } from '../runtime/reading-state.mjs'

function memory() {
  const values = new Map([['zc-progress-v1', '{"0001":{"quizTotal":2}}']])
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}
const path = '/blog/lessons/zsb-math/lessons/0001-三角函数必背包.html'

test('only genuine lessons can replace the last learning session', () => {
  assert.equal(lessonIdentity(path).subject, '高等数学')
  assert.equal(lessonIdentity('/blog/courses/pi-agent/l/2/').mode, 'reading')
  for (const url of ['/blog/', '/blog/courses/zsb-math/', '/blog/lessons/zsb-math/',
    '/blog/lessons/zsb-politics/lessons/practice.html', '/blog/lessons/zsb-cs/lessons/mistakes.html',
    'javascript:alert(1)', '//other.test/blog/courses/zsb-math/l/1/', '/other/courses/zsb-math/l/1/',
    '/blog/courses/zsb-math/l/../', '/blog/courses/zsb-cs/l/NaN/']) {
    assert.equal(lessonIdentity(url), null, url)
  }
})

test('resume records preserve existing scores and survive being read by a different page', () => {
  const storage = memory()
  const legacy = storage.getItem('zc-progress-v1')
  assert.equal(saveReading({ path, title: '三角函数必背包', y: 1450, anchor: 'section-2', offset: 30 }, '/blog/', storage), true)
  const recent = readRecent('/blog/', storage)
  assert.equal(recent.y, 1450)
  assert.equal(recent.offset, 30)
  assert.equal(recent.subject, '高等数学')
  assert.equal(resumeUrl(recent), `${encodeURI(path)}?resume=1`)
  assert.equal(storage.getItem('zc-progress-v1'), legacy)
  assert.equal(saveReading({ path: '/blog/courses/', title: '目录' }, '/blog/', storage), false)
  assert.equal(readRecent('/blog/', storage).path, path)
})

test('a repeated visit updates one record, and old history stays bounded', () => {
  const storage = memory()
  for (let i = 1; i <= 55; i++) saveReading({ path: `/blog/courses/zsb-math/l/${i}/`, title: `课 ${i}`, y: i }, '/blog/', storage)
  assert.equal(readEntries('/blog/', storage).length, 40)
  const last = readRecent('/blog/', storage)
  saveReading({ ...last, y: 200 }, '/blog/', storage)
  assert.equal(readEntries('/blog/', storage).filter(entry => entry.path === last.path).length, 1)
  assert.equal(readRecent('/blog/', storage).y, 200)
})

test('blocked or corrupt storage cannot break learning or create unsafe links', () => {
  const denied = { getItem() { throw Error('blocked') }, setItem() { throw Error('full') } }
  assert.equal(readRecent('/blog/', denied), null)
  assert.equal(saveReading({ path, title: '课' }, '/blog/', denied), false)
  const storage = memory()
  for (const value of ['null', '{broken', '[]', '{"version":1,"entries":[null,{"path":"javascript:alert(1)"}]}']) {
    storage.setItem(READING_KEY, value)
    assert.deepEqual(readEntries('/blog/', storage), [])
  }
  assert.equal(resumeUrl({ path: 'https://other.test/' }), null)
})

test('resume waits for asynchronous math layout before restoring the saved section offset', async t => {
  const storage = memory()
  saveReading({ path, title: '三角函数必背包', y: 1440, anchor: 'section-1', offset: 40 }, '/blog/', storage)
  const originalRecord = storage.getItem(READING_KEY)
  const globals = ['window', 'document', 'history', 'requestAnimationFrame']
  const originals = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key))
  t.after(() => globals.forEach((key, i) => {
    if (originals[i]) Object.defineProperty(globalThis, key, originals[i])
    else delete globalThis[key]
  }))
  let rendered
  const mathReady = new Promise(resolve => { rendered = resolve })
  let y = 0, sectionY = 1400, scrolls = 0, focused = null
  const noop = () => {}
  const heading = absoluteY => ({ dataset: {}, textContent: '三角函数必背包',
    getBoundingClientRect: () => ({ top: absoluteY() - y }), matches: () => true, closest: () => null,
    setAttribute: noop, focus: options => { focused = options ?? null } })
  const title = heading(() => 100), section = heading(() => sectionY)
  const main = { querySelector: () => title, querySelectorAll: () => [title, section] }
  globalThis.window = { location: { pathname: path, href: `https://local.test${encodeURI(path)}?resume=1` },
    localStorage: storage, ZC: { mathReady }, get scrollY() { return y },
    scrollTo: options => { y = options.top; scrolls++ }, addEventListener: noop, removeEventListener: noop, dispatchEvent: noop }
  globalThis.document = { fonts: { ready: Promise.resolve() },
    querySelector: selector => selector === '[data-blog-nav-bar]' ? { getBoundingClientRect: () => ({ height: 56 }) } : main,
    addEventListener: noop, removeEventListener: noop }
  globalThis.history = { state: {}, replaceState: noop }
  globalThis.requestAnimationFrame = callback => queueMicrotask(callback)
  const stop = trackReading()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(scrolls, 0, 'restoration must not run on unrendered math')
  assert.equal(storage.getItem(READING_KEY), originalRecord, 'pending rendering must not overwrite the old position')
  sectionY = 1600
  rendered()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(y, 1640, 'the restored offset follows the fully rendered section')
  assert.deepEqual(focused, { preventScroll: true }, 'focus lands on the resumed section without scrolling')
  assert.equal(readRecent('/blog/', storage).y, 1640)
  stop()
})
