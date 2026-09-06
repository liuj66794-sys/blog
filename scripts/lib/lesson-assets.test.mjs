import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { installLessonRuntime, stripMissingFontUrls } from './lesson-assets.mjs'

function fontFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-fonts-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  fs.mkdirSync(path.join(dir, 'fonts'))
  fs.writeFileSync(path.join(dir, 'fonts', 'Main.woff2'), '')
  return dir
}

test('compressed KaTeX keeps closed font blocks and the following math layout rules', (t) => {
  const dir = fontFixture(t)
  const face = '@font-face{font-family:KaTeX_Main;src:url(fonts/Main.woff2) format("woff2"),url(fonts/Main.woff) format("woff"),url(fonts/Main.ttf) format("truetype")}'
  const rules = '.katex{font:normal 1.21em KaTeX_Main}.katex .katex-mathml{clip:rect(1px,1px,1px,1px);position:absolute;width:1px}.katex .base{display:inline-block}'
  const cleanFace = '@font-face{font-family:KaTeX_Main;src:url(fonts/Main.woff2) format("woff2")}'
  const result = stripMissingFontUrls(face + face + rules, dir)
  assert.equal(result, cleanFace + cleanFace + rules)
  assert.equal(stripMissingFontUrls(result, dir), result)
})

test('removes an unavailable face while preserving other declarations and source formatting', (t) => {
  const dir = fontFixture(t)
  const css = '@font-face {\n font-family: Main;\n src: url("fonts/Main.woff2"), url("fonts/missing.ttf");\n font-display: swap;\n}\n@font-face{src:url(missing.woff)}.text{color:blue}'
  assert.equal(stripMissingFontUrls(css, dir), '@font-face {\n font-family: Main;\n src: url("fonts/Main.woff2");\n font-display: swap;\n}\n.text{color:blue}')
})

test('preserves remote, root, data and local sources including embedded delimiters', (t) => {
  const dir = fontFixture(t)
  const sources = 'local("Font, Regular"),url(data:font/woff2;base64,AAAA),url("https://example.test/a.woff2"),url(//example.test/b.woff2),url(/fonts/site.woff2)'
  const css = `@font-face{src:${sources},url(missing.ttf);font-display:swap}`
  assert.equal(stripMissingFontUrls(css, dir), `@font-face{src:${sources};font-display:swap}`)
})

test('checks decoded local paths without query or fragment and leaves unrelated CSS alone', (t) => {
  const dir = fontFixture(t)
  fs.writeFileSync(path.join(dir, 'fonts', 'With space.woff2'), '')
  const css = '@font-face { src: url("fonts/With%20space.woff2?v=2#face") }\n@font-face{font-family:system}.card{background:url(missing.png)}'
  assert.equal(stripMissingFontUrls(css, dir), css)
})

test('all four prep mirrors install maintained resume runtimes; other courses keep their original scripts', (t) => {
  const dir = fontFixture(t)
  fs.mkdirSync(path.join(dir, 'assets'))
  const target = path.join(dir, 'assets', 'quiz.js')
  fs.writeFileSync(target, 'original subject runtime')
  installLessonRuntime(dir, 'a-shares')
  assert.equal(fs.readFileSync(target, 'utf8'), 'original subject runtime')
  for (const [slug, file] of [['zsb-english', 'english'], ['zsb-politics', 'politics'], ['zsb-cs', 'cs']]) {
    installLessonRuntime(dir, slug)
    assert.equal(fs.readFileSync(target, 'utf8'), fs.readFileSync(new URL(`../runtime/${file}-quiz.js`, import.meta.url), 'utf8'))
  }
  installLessonRuntime(dir, 'zsb-math')
  assert.equal(fs.readFileSync(target, 'utf8'), fs.readFileSync(new URL('../runtime/math-quiz.js', import.meta.url), 'utf8'))
  installLessonRuntime(dir, 'zsb-math')
  assert.equal(fs.readFileSync(target, 'utf8'), fs.readFileSync(new URL('../runtime/math-quiz.js', import.meta.url), 'utf8'))
})
