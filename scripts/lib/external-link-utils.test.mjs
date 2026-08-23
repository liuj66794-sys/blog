/**
 * external-link-utils.test.mjs —— 外链巡检纯函数单测。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { extractExternalRefs, classifyStatus } from './external-link-utils.mjs'

const ORIGIN = 'https://liuj66794-sys.github.io'

test('extractExternalRefs：提取外链、去重、去锚点、剔除本站与协议外引用', () => {
  const html = [
    '<a href="https://edu.sse.com.cn/a?b=1#x">外链</a>',
    '<a href="https://edu.sse.com.cn/a?b=1">同链不同锚（应去重）</a>',
    '<a href="https://liuj66794-sys.github.io/blog/x">本站（剔除）</a>',
    '<a href="mailto:a@b.c">协议外（剔除）</a>',
    "<img src='https://nodejs.org/static/x.png'>",
    '<link>https://feed.example/1</link>',
    '<atom:link href="https://atom.example/2" />',
    '<a href="/blog/internal">站内相对（剔除）</a>',
  ].join('')
  const refs = extractExternalRefs(html, ORIGIN)
  assert.deepEqual([...refs].sort(), [
    'https://atom.example/2',
    'https://edu.sse.com.cn/a?b=1',
    'https://feed.example/1',
    'https://nodejs.org/static/x.png',
  ])
})

test('extractExternalRefs：畸形 URL 与空值安全跳过', () => {
  assert.deepEqual(extractExternalRefs('<a href="https://">x</a><a href="">y</a>', ORIGIN), [])
})

test('classifyStatus：2xx/3xx ok、反爬系 soft、其余 dead', () => {
  assert.equal(classifyStatus(200), 'ok')
  assert.equal(classifyStatus(204), 'ok')
  assert.equal(classifyStatus(301), 'ok') // fetch 已跟随重定向，到不了这里，防御性归 ok
  assert.equal(classifyStatus(403), 'soft')
  assert.equal(classifyStatus(429), 'soft')
  assert.equal(classifyStatus(999), 'soft') // LinkedIn 反爬码
  assert.equal(classifyStatus(404), 'dead')
  assert.equal(classifyStatus(410), 'dead')
  assert.equal(classifyStatus(500), 'dead')
})
