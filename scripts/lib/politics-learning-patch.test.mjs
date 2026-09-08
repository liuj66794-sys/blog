import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { test } from 'node:test'
import {
  POLITICS_LEARNING_PATCH_MARKER,
  patchPoliticsIndex,
  patchPoliticsLearning,
} from './politics-learning-patch.mjs'

const PAGE = '<!doctype html><html><body><main></main>' +
  '<script type="application/json" id="due-data">[]</script></body></html>'

const INDEX_PATH = new URL('../../docs/.vuepress/public/lessons/zsb-politics/index.html', import.meta.url)

function node(attrs = {}, children = {}) {
  const classes = new Set()
  return {
    attrs,
    children,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name) },
      contains(name) { return classes.has(name) },
    },
    getAttribute(name) { return attrs[name] ?? null },
    querySelector(selector) { return children[selector] ?? null },
  }
}

test('politics home patch is idempotent and adds the new-card-aware renderer', () => {
  const once = patchPoliticsIndex(PAGE)
  assert.ok(once.includes(POLITICS_LEARNING_PATCH_MARKER))
  assert.match(once, /ZQ\.srs\.newIds/)
  assert.match(once, /已学到期/)
  assert.equal(patchPoliticsIndex(once), once)
})

test('politics patch leaves non-home tool pages and unrelated HTML unchanged', () => {
  const tool = '<html><body><script id="cards">[]</script></body></html>'
  assert.equal(patchPoliticsLearning(tool, { page: 'srs' }), tool)
  assert.equal(patchPoliticsIndex('<html><body>no data</body></html>'), '<html><body>no data</body></html>')
})

test('patched inline script remains valid JavaScript', () => {
  const once = patchPoliticsIndex(PAGE)
  const start = once.lastIndexOf('<script>') + '<script>'.length
  const end = once.lastIndexOf('</script>')
  assert.doesNotThrow(() => new Function(once.slice(start, end)))
})

test('patched real politics index counts a completed xg lesson', () => {
  const source = fs.readFileSync(INDEX_PATH, 'utf8')
  const ids = [...source.matchAll(/class="lcard"[^>]*data-lesson="([^"]+)"/g)].map(match => match[1])
  assert.equal(ids.length, 27)
  assert.ok(ids.includes('xg00'))
  const patched = patchPoliticsIndex(source)
  const marker = patched.indexOf(`<!-- ${POLITICS_LEARNING_PATCH_MARKER} -->`)
  const start = patched.indexOf('<script>', marker) + '<script>'.length
  const end = patched.indexOf('</script>', start)
  const cards = ids.map(id => node({ 'data-lesson': id }, {
    '[data-done]': node(),
    '[data-best]': node(),
  }))
  const fields = new Map([
    ['done-all', node()], ['done-mzt', node()], ['done-xg', node()],
    ['bar-all', node()], ['score-all', node()], ['cd-days', node()],
    ['cd-round', node()], ['today-list', node()],
    ['due-data', { textContent: '[]' }],
  ])
  const document = {
    querySelector(selector) {
      if (selector === '.progress-panel .row span') return node()
      return null
    },
    querySelectorAll(selector) {
      if (selector === '.lcard') return cards
      if (selector === '.progress-panel .row span') return [node()]
      return []
    },
    getElementById(id) { return fields.get(id) ?? null },
    addEventListener() {},
  }
  const context = {
    document,
    LESSON_ORDER: ids,
    ZQ: {
      config: { examDate: '2027-03-27' },
      progress: { all: () => ({ xg00: { exerciseComplete: true } }) },
      srs: { LIMITS: { due: 20, fresh: 10 }, dueIds: () => [], newIds: () => [] },
      wrong: { count: () => 0 },
    },
  }
  context.window = context
  vm.runInNewContext(patched.slice(start, end), context)
  assert.equal(String(fields.get('done-xg').textContent), '1')
  assert.equal(String(fields.get('done-mzt').textContent), '0')
  assert.equal(String(fields.get('done-all').textContent), '1')
  assert.equal(cards.find(card => card.attrs['data-lesson'] === 'xg00').classList.contains('finished'), true)
})
