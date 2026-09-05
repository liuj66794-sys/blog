import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { origin } from '../docs/.vuepress/site-meta.mjs'

const checker = fileURLToPath(new URL('./check-links.mjs', import.meta.url))

function checkHtml(markup) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-check-links-'))
  const file = path.join(dir, 'index.html')
  try {
    fs.writeFileSync(file, markup)
    return spawnSync(process.execPath, [checker, dir], { encoding: 'utf8' })
  } finally {
    fs.unlinkSync(file)
    fs.rmdirSync(dir)
  }
}

test('发布校验拒绝漏 base 的四科静态入口', () => {
  const result = checkHtml('<a href="/lessons/zsb-math/">互动学习</a>')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /本站路径缺少 base \/blog\//)
  assert.match(result.stderr, /\/lessons\/zsb-math\//)
})

test('同站绝对 URL 的漏 base 也不能绕过发布校验', () => {
  const result = checkHtml(`<a href="${origin}/lessons/zsb-english/lessons/course.html">互动学习</a>`)
  assert.equal(result.status, 1)
  assert.match(result.stderr, /本站路径缺少 base/)
})

test('合法站内链接、明确的运行时兼容例外与域名其他项目可以共存', () => {
  const result = checkHtml('<a href="/blog/">首页</a><a href="/archives/">归档</a><a href="/another-project/">项目</a><a href="https://example.com/lessons/">外站</a>')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1 个站内链接全部有效/)
})
