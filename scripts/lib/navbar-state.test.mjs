import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const commercialCss = readFileSync(
  new URL('../../docs/.vuepress/styles/commercial.css', import.meta.url),
  'utf8',
)
const themeConfig = readFileSync(
  new URL('../../docs/.vuepress/theme.ts', import.meta.url),
  'utf8',
)

test('找我开发只使用主题的当前页和交互状态，不永久高亮', () => {
  assert.doesNotMatch(commercialCss, /\.vp-navbar a\[href\$="\/hire\/"\]/)
})

test('课程是指向课程总览的普通导航链接', () => {
  assert.match(
    themeConfig,
    /\{ text: '课程', link: '\/courses\/', activeMatch: '\^\/courses\/' \}/,
  )
})
