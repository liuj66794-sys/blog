import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { courseCorrections, applyCourseCorrections } from './course-corrections.mjs'
import { extractCourseQuestions } from './course-question-index.mjs'

test('declared corrections apply once and remain stable on subsequent syncs', () => {
  for (const f of courseCorrections) {
    const source = fs.readFileSync(new URL(`../../docs/.vuepress/public/lessons/${f.subject}/${f.file}`, import.meta.url), 'utf8')
    const corrected = applyCourseCorrections(source, f.subject, f.file)
    assert.equal(applyCourseCorrections(corrected, f.subject, f.file), corrected, f.id)
    for (const change of f.changes) assert.ok(corrected.includes(change.to), f.id)
  }
})

test('a changed upstream question blocks a stale patch instead of silently editing another question', () => {
  const f = courseCorrections.find(f => f.id === 'MATH-0034-q1-area-answer')
  assert.throws(() => applyCourseCorrections('<p>upstream replacement</p>', f.subject, f.file), /期望/)
})

test('question extraction retains groups, formulas, answer IDs and contextual-reading boundaries', () => {
  const html = `<div class="quiz" data-answer="A"><p class="quiz-q">$x^2$ 的导数</p><div class="quiz-opts"><button data-k="A">$2x$</button><button data-k="B">$x$</button></div><div class="quiz-exp">幂函数求导。</div></div>`
  const [q] = extractCourseQuestions(html, { slug: 'zsb-math', lessonId: '1' })
  assert.equal(q.stem, '$x^2$ 的导数'); assert.deepEqual(q.answer, ['A']); assert.equal(q.options[0].text, '$2x$')
  const en = `<div id="quiz-s2"></div><script>Quiz.render('#quiz-s2', [{ q: 'Blank 1', opts: ['a','b'], a: 1, why: 'See passage' }])</script>`
  const [english] = extractCourseQuestions(en, { slug: 'zsb-english', lessonId: '18' })
  assert.equal(english.ref, 'quiz-s2:0'); assert.equal(english.contextRequired, true); assert.deepEqual(english.answer, ['1'])
})
