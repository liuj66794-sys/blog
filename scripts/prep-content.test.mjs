import fs from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { prepCatalog } from '../docs/.vuepress/prep-catalog.mjs'
import { prepSubjects } from '../docs/.vuepress/learning-data.mjs'

const docs = new URL('../docs/', import.meta.url)
const publicDir = new URL('.vuepress/public/', docs)

test('四科入口、目录课数、唯一课号与已发布的阅读讲义对应', () => {
  for (const subject of prepSubjects) {
    const course = prepCatalog[subject.slug]
    assert.equal(course.count, course.lessons.length)
    assert.equal(subject.count, course.count)
    assert.equal(new Set(course.lessons.map((lesson) => lesson.id)).size, course.count)
    const lessonDir = new URL(`courses/${subject.slug}/l/`, docs)
    assert.equal(fs.readdirSync(lessonDir).filter((f) => f.endsWith('.md')).length, course.count)
    for (const lesson of course.lessons) {
      const markdown = fs.readFileSync(new URL(`${lesson.id}.md`, lessonDir), 'utf8')
      assert.ok(markdown.includes(`permalink: ${lesson.href}`))
      assert.ok(fs.existsSync(new URL(lesson.interactive.slice(1), publicDir)))
      assert.notEqual(lesson.id, 'NaN')
    }
    for (const tool of course.tools) assert.ok(fs.existsSync(new URL(tool.href.slice(1), publicDir)))
  }
})

test('英语所有随堂测分组进入阅读讲义，逐课题量与原互动数据一致', () => {
  let total = 0
  for (const lesson of prepCatalog['zsb-english'].lessons) {
    const html = fs.readFileSync(new URL(lesson.interactive.slice(1), publicDir), 'utf8')
    const expected = (html.match(/\{\s*q:/g) ?? []).length
    const markdown = fs.readFileSync(new URL(`courses/zsb-english/l/${lesson.id}.md`, docs), 'utf8')
    assert.equal((markdown.match(/::: details 点开核对答案/g) ?? []).length, expected, lesson.title)
    total += expected
  }
  assert.ok(total >= 1328, `当前英语题量不足：${total}`)
})

test('计算机错题本作为工具发布，旧错误课号提供有效跳转', () => {
  const course = prepCatalog['zsb-cs']
  assert.ok(course.tools.some((tool) => tool.href.endsWith('/mistakes.html')))
  const redirect = fs.readFileSync(new URL('courses/zsb-cs/l/NaN/index.html', publicDir), 'utf8')
  assert.ok(redirect.includes('content="0;url=/blog/lessons/zsb-cs/lessons/mistakes.html"'))
  assert.ok(!fs.existsSync(new URL('courses/zsb-cs/l/NaN.md', docs)))
})
