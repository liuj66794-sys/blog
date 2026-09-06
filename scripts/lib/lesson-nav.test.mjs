import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NAV_BAR_MARKER, injectLessonNav } from './lesson-nav.mjs'

const PAGE = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><title>t</title></head><body><h1>课</h1></body></html>'

test('课程讲义保留首页、课程总览、备考中心和课程目录，当前标签返回', () => {
  const out = injectLessonNav(PAGE, { backUrl: '/blog/courses/a-shares/', backLabel: '课程目录' })
  assert.ok(out.includes(NAV_BAR_MARKER))
  const after = out.indexOf('<body>') + '<body>'.length
  const injected = out.slice(after, after + 650)
  assert.ok(injected.includes('data-blog-nav-bar'))
  assert.ok(injected.includes('href="/blog/courses/a-shares/"'))
  for (const u of ['/blog/', '/blog/courses/', '/blog/prep/', '/blog/courses/a-shares/']) {
    assert.ok(out.includes(`href="${u}" target="_self"`), `缺当前标签站点链接 ${u}`)
  }
  assert.match(out, /<nav data-blog-nav-bar="3" aria-label="学习导航">/)
  assert.ok(out.indexOf('<h1>') > out.indexOf(NAV_BAR_MARKER))
  assert.match(out, /data-lesson-toc aria-haspopup="dialog"/)
  assert.match(out, /data-lesson-theme aria-label="切换主题"/)
  assert.match(out, /href="\/blog\/learning\/lesson-shell.css"/)
  assert.match(out, /src="\/blog\/learning\/lesson-shell.mjs"/)
  assert.match(out, /data-blog-nav-spacer aria-hidden="true"/)
  assert.doesNotMatch(out, /body\{padding-top:/)
  assert.ok(out.includes('<link rel="icon" type="image/png" href="/blog/avatar.png">'))
})

test('备考讲义区分本科目课程目录与学习计划，保留原课程脚本', () => {
  const script = '<script>localStorage.setItem("zsb-math-progress", "w1");</script>'
  const out = injectLessonNav(PAGE.replace('</body>', `${script}</body>`), {
    backUrl: '/blog/courses/zsb-math/', backLabel: '高数课程目录',
    planUrl: '/blog/prep/gaoshu/', planLabel: '高数学习计划',
  })
  assert.match(out, /href="\/blog\/courses\/zsb-math\/" target="_self">高数课程目录/)
  assert.match(out, /href="\/blog\/prep\/gaoshu\/" target="_self">高数学习计划/)
  assert.equal((out.match(/<a /g) ?? []).length, 6)
  assert.ok(out.includes(script))
})

test('导航文字和 URL 中的特殊字符按 HTML 转义', () => {
  const out = injectLessonNav(PAGE, { backUrl: '/blog/courses/?a=1&b=2', backLabel: '<课程>' })
  assert.match(out, /href="\/blog\/courses\/\?a=1&amp;b=2"/)
  assert.match(out, /&lt;课程&gt;/)
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
