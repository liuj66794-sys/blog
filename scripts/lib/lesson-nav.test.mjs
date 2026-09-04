import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NAV_BAR_MARKER, injectLessonNav } from './lesson-nav.mjs'

const PAGE = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>t</title></head><body><h1>课</h1></body></html>'

test('在 <body> 开标签后插入导航条，含返回链接与四个站点链接', () => {
  const out = injectLessonNav(PAGE, { backUrl: '/blog/courses/a-shares/', backLabel: '‹ 返回课程' })
  assert.ok(out.includes(NAV_BAR_MARKER))
  const after = out.indexOf('<body>') + '<body>'.length
  const injected = out.slice(after, after + 400)
  assert.ok(injected.includes('data-blog-nav-bar'))
  assert.ok(injected.includes('href="/blog/courses/a-shares/"'))
  for (const u of ['/blog/', '/blog/blog/', '/blog/courses/', '/blog/prep/']) {
    assert.ok(out.includes(`href="${u}"`), `缺站点链接 ${u}`)
  }
  // body 内容仍在导航条之后
  assert.ok(out.indexOf('<h1>') > out.indexOf(NAV_BAR_MARKER))
  assert.ok(out.includes('padding-top:44px'))
})

test('重复注入幂等；无 body 或缺 backUrl 时原样返回', () => {
  const once = injectLessonNav(PAGE, { backUrl: '/x/' })
  assert.equal(injectLessonNav(once, { backUrl: '/x/' }), once)
  assert.equal(injectNavNoBody(), PAGE_WITHOUT_BODY())
  assert.equal(injectLessonNav(PAGE, undefined), PAGE)
  function injectNavNoBody() {
    return injectLessonNav('<body', { backUrl: '/x/' })
  }
  function PAGE_WITHOUT_BODY() {
    return '<body'
  }
})
