import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const home = readFileSync(new URL('../../docs/README.md', import.meta.url), 'utf8')
const commercialHome = readFileSync(
  new URL('../../docs/.vuepress/components/CommercialHome.vue', import.meta.url),
  'utf8',
)
const hirePage = readFileSync(
  new URL('../../docs/.vuepress/components/HireMePage.vue', import.meta.url),
  'utf8',
)

test('首页保持短路径并关闭文章流与页内目录', () => {
  assert.doesNotMatch(home, /type:\s*posts/)
  assert.match(home, /aside:\s*false/)
  assert.match(commercialHome, /services\.slice\(0, 4\)/)
})

test('找我开发页按证据、服务、流程、FAQ 和联系排序', () => {
  const positions = [
    'PROOF OF WORK',
    'SERVICES',
    'WORKFLOW',
    'FAQ',
    'id="contact"',
  ].map((marker) => hirePage.indexOf(marker))

  assert.ok(positions.every((position) => position >= 0))
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
})
