/**
 * learn-utils 单测（node:test 内置 runner，零依赖）。
 * 重点锁死批次 A 修掉的正则漏网场景，防回归。
 * 运行：pnpm test
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { base } from '../../docs/.vuepress/site-meta.mjs'
import {
  buildFrontmatter,
  extractDescription,
  extractLessonText,
  fmtTime,
  minimatchName,
  parseFrontmatter,
  rewriteRelativeLinks,
  rewriteRootDocLinks,
  sameMtime,
  walk,
} from './learn-utils.mjs'

/** 期望前缀从 site-meta 派生：测的是拼接/正则逻辑，不钉死 base 取值 */
const B = base.replace(/\/$/, '')
const ROOT_DOCS = ['MISSION.md', 'RESOURCES.md', 'GLOSSARY.md', 'ROADMAP.md', '课程总纲.md']

test('rewriteRelativeLinks: ../ 链接映射到镜像地址', () => {
  const out = rewriteRelativeLinks('[讲义](../lessons/01.html)', 'a-shares')
  assert.equal(out, `[讲义](${B}/lessons/a-shares/lessons/01.html)`)
})

test('rewriteRelativeLinks: 保留 #anchor 与 "标题" 尾缀', () => {
  assert.equal(
    rewriteRelativeLinks('[x](../a.md#sec)', 's'),
    `[x](${B}/lessons/s/a.md#sec)`,
  )
  assert.equal(
    rewriteRelativeLinks('[x](../a.md "标题")', 's'),
    `[x](${B}/lessons/s/a.md "标题")`,
  )
})

test('rewriteRelativeLinks: ./ 链接不改写但告警（指向未镜像的 learning-records 内部）', () => {
  const warnings = []
  const out = rewriteRelativeLinks('[姊妹](./02.md)', 's', (m) => warnings.push(m))
  assert.equal(out, '[姊妹](./02.md)')
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /学习记录含 \.\/ 相对链接/)
})

test('rewriteRelativeLinks: 绝对路径与外链不动', () => {
  const input = '[a](/blog/x/) [b](https://example.com/y)'
  assert.equal(rewriteRelativeLinks(input, 's'), input)
})

test('rewriteRootDocLinks: ./ ../ 与裸写三种前缀统一改写', () => {
  for (const prefix of ['./', '../', '']) {
    assert.equal(
      rewriteRootDocLinks(`[使命](${prefix}MISSION.md)`, 'pi-agent', ROOT_DOCS),
      `[使命](${B}/lessons/pi-agent/MISSION.md)`,
    )
  }
})

test('rewriteRootDocLinks: 保留 #anchor 与 "标题" 尾缀（原漏网场景）', () => {
  assert.equal(
    rewriteRootDocLinks('[m](./MISSION.md#why)', 's', ROOT_DOCS),
    `[m](${B}/lessons/s/MISSION.md#why)`,
  )
  assert.equal(
    rewriteRootDocLinks('[m](./MISSION.md "使命")', 's', ROOT_DOCS),
    `[m](${B}/lessons/s/MISSION.md "使命")`,
  )
})

test('rewriteRootDocLinks: 名单外文档与中文文档名', () => {
  assert.equal(rewriteRootDocLinks('[x](./OTHER.md)', 's', ROOT_DOCS), '[x](./OTHER.md)')
  assert.equal(
    rewriteRootDocLinks('[总纲](./课程总纲.md)', 's', ROOT_DOCS),
    `[总纲](${B}/lessons/s/课程总纲.md)`,
  )
})

test('parseFrontmatter: 有/无 frontmatter、引号剥离', () => {
  const { fm, body } = parseFrontmatter('---\ntitle: "你好"\ntags: a\n---\n正文')
  assert.equal(fm.title, '你好')
  assert.equal(fm.tags, 'a')
  assert.equal(body, '正文')
  const none = parseFrontmatter('# 直接正文')
  assert.equal(none.fm, null)
  assert.equal(none.body, '# 直接正文')
})

test('buildFrontmatter: 数组字段渲染为 YAML 列表', () => {
  const out = buildFrontmatter({ title: 'T', tags: ['a', 'b'] })
  assert.equal(out, '---\ntitle: T\ntags:\n  - a\n  - b\n---\n')
})

test('extractDescription: 去标题/代码块并截断到 150 字', () => {
  const body = '# 标题\n\n```\ncode\n```\n\n第一段正文。'
  assert.equal(extractDescription(body), '第一段正文。')
  const long = '长'.repeat(200)
  const desc = extractDescription(long)
  assert.equal(desc.length, 151) // 150 + 省略号
  assert.ok(desc.endsWith('…'))
})

test('extractLessonText: 去脚本/样式/标签', () => {
  const html = '<style>.a{}</style><p>正文&nbsp;一</p><script>alert(1)</script>'
  assert.equal(extractLessonText(html), '正文 一')
})

test('minimatchName: 单星号通配', () => {
  assert.ok(minimatchName('SPEC-01.md', 'SPEC-*.md'))
  assert.ok(!minimatchName('SPEC.md', 'SPEC-*.md'))
  assert.ok(!minimatchName('a/b.md', 'SPEC-*.md'))
})

test('fmtTime: 本地时间零填充', () => {
  assert.equal(fmtTime(new Date(2026, 0, 5, 9, 7, 3)), '2026-01-05 09:07:03')
})

test('sameMtime: 容忍亚毫秒差（utimesSync 经 Date 回写丢失精度）', () => {
  assert.ok(sameMtime(1234.0, 1234.789123))
  assert.ok(!sameMtime(1234.0, 1235.001))
})

test('walk: 递归收集 + filter，目录不存在返回空', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-test-'))
  try {
    fs.mkdirSync(path.join(tmp, 'sub'), { recursive: true })
    fs.writeFileSync(path.join(tmp, 'a.md'), '')
    fs.writeFileSync(path.join(tmp, 'sub', 'b.md'), '')
    fs.writeFileSync(path.join(tmp, 'sub', 'c.txt'), '')
    const mdOnly = walk(tmp, (n) => n.endsWith('.md'))
    assert.equal(mdOnly.length, 2)
    assert.equal(walk(tmp).length, 3)
    assert.deepEqual(walk(path.join(tmp, 'nonexistent')), [])
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
