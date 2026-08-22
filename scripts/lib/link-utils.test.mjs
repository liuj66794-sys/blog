import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { urlToDistFile } from './link-utils.mjs'

const DIST = path.join(path.sep, 'dist')
const BASE = '/blog'

test('urlToDistFile: base 根（带/不带尾斜杠）映射到首页', () => {
  assert.equal(urlToDistFile('/blog', DIST, BASE), path.join(DIST, 'index.html'))
  assert.equal(urlToDistFile('/blog/', DIST, BASE), path.join(DIST, 'index.html'))
})

test('urlToDistFile: 尾斜杠目录追加 index.html（静态托管语义）', () => {
  assert.equal(urlToDistFile('/blog/courses/a-shares/', DIST, BASE), path.join(DIST, 'courses', 'a-shares', 'index.html'))
})

test('urlToDistFile: 文件路径原样映射', () => {
  assert.equal(urlToDistFile('/blog/lessons/x/1.html', DIST, BASE), path.join(DIST, 'lessons', 'x', '1.html'))
})

test('urlToDistFile: base 外路径返回 null（外站/越界）', () => {
  assert.equal(urlToDistFile('/archives/', DIST, BASE), null)
  assert.equal(urlToDistFile('/', DIST, BASE), null)
  assert.equal(urlToDistFile('/blogging/', DIST, BASE), null) // 前缀同名但非 base
})

test('urlToDistFile: percent-decode 解码后再映射（中文文件名）', () => {
  const decoded = urlToDistFile('/blog/lessons/a-shares/%E8%AF%BE%E7%A8%8B%E6%80%BB%E7%BA%B2.md', DIST, BASE)
  assert.equal(decoded, path.join(DIST, 'lessons', 'a-shares', '课程总纲.md'))
})

test('urlToDistFile: 畸形编码按原始路径兜底（倾向暴露死链）', () => {
  const fallback = urlToDistFile('/blog/%E0%A4%A/', DIST, BASE)
  assert.equal(fallback, path.join(DIST, '%E0%A4%A', 'index.html'))
})
