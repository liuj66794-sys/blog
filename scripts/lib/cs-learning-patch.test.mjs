import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { patchCsLearning, csReadingHtml } from './cs-learning-patch.mjs'
import { lessonHtmlToMarkdown } from './lesson-convert.mjs'
import { extractCourseQuestions } from './course-question-index.mjs'
import { cleanState, cleanCourseState, checks, traces } from '../runtime/cs-pointer.mjs'
import { courseGuides } from '../data/cs/course-guides.mjs'

const file = 'lessons/0011-pointers-basics.html'
const source = '<html lang="zh-CN"><head></head><body><h1>指针</h1><p>旧讲解</p><h2>六、测验（点击选项作答）</h2><div class="quiz" data-answer="a"><p class="quiz-q">int *p; *p++ 与 3*4 的星号必须保留</p><ol class="quiz-opts"><li data-opt="a"><code>int *p = &amp;a;</code></li><li data-opt="b">int p;</li></ol><p class="quiz-expl">应先初始化指针。</p></div><nav class="footer-nav"><a href="0012-pointers-advanced.html">下一课</a></nav></body></html>'

test('CS teaching patch is repeatable and preserves original quiz identity and navigation', () => {
  const patched = patchCsLearning(source, 'zsb-cs', file)
  assert.equal(patchCsLearning(patched, 'zsb-cs', file), patched)
  assert.equal(patchCsLearning(source, 'zsb-math', file), source)
  assert.equal(patchCsLearning(source, 'zsb-cs', 'tools/index.html'), source)
  const ctx = { slug: 'zsb-cs', lessonId: '11', source: '/lesson', title: '指针' }
  assert.deepEqual(extractCourseQuestions(patched, ctx), extractCourseQuestions(source, ctx))
  assert.equal((patched.match(/data-cs-step/g) || []).length, 7)
  assert.match(patched, /href="0012-pointers-advanced.html"/)
  assert.match(patched, /cs-pointer\.mjs\?v=[a-f0-9]{12}/)
  assert.throws(() => patchCsLearning('<h1>changed</h1>', 'zsb-cs', file), /原始结构已变化/)
})

test('reading conversion keeps C operators, removes code wrappers and includes full sample solution', () => {
  const result = lessonHtmlToMarkdown(csReadingHtml(patchCsLearning(source, 'zsb-cs', file)), { slug: 'zsb-cs' })
  assert.ok(result.body.includes('int \\*p; \\*p++ 与 3\\*4'))
  assert.ok(result.body.includes('`int *p = &a;`'))
  assert.ok(result.body.includes('int *p = &a;\n```'))
  assert.ok(!result.body.includes('<code>'))
  assert.ok(!result.body.includes('data-cs-lab'))
  assert.ok(!result.body.includes('#cs-address'))
  assert.ok(result.body.includes('x=2 y=6 a={2,7,6}'))
  assert.ok(result.body.includes('完整推演'))
})

test('saved pointer state rejects invalid or stale answers and trace positions', () => {
  const result = cleanState({ version: 1, step: 'bad', answers: { address: { choice: 1, submitted: true }, write: { choice: 99, submitted: true } }, labs: { array: -1, write: 3 } })
  assert.equal(result.step, 'cs-address')
  assert.deepEqual(result.answers, { address: { choice: 1, submitted: true } })
  assert.deepEqual(result.labs, { write: 3 })
  assert.deepEqual(cleanState({ version: 0, step: 'cs-swap', answers: result.answers }), cleanState(null))
})

test('CS explanations keep code operators and semantic emphasis without literal HTML tags', () => {
  const html = source.replace('应先初始化指针。', '<code>*p</code> 访问目标，<strong>指针</strong>要初始化；3*4 是乘法。')
  const body = lessonHtmlToMarkdown(html, { slug: 'zsb-cs' }).body
  assert.ok(body.includes('`*p` 访问目标，**指针**要初始化；3\\*4 是乘法。'))
  assert.ok(!body.includes('&lt;code&gt;'))
})

test('each guided checkpoint has feedback for every choice and traces end in consistent states', () => {
  for (const q of Object.values(checks)) {
    assert.equal(q.choices.length, q.why.length)
    assert.ok(q.answer >= 0 && q.answer < q.choices.length)
  }
  assert.deepEqual(traces.swap.frames.at(-1).cells.slice(0, 2), [['a', '20'], ['b', '10']])
  assert.equal(traces.array.frames[1].pointer, 'p → a[0]')
  const template = fs.readFileSync(new URL('../data/cs/pointer-lesson.html', import.meta.url), 'utf8')
  for (const id of Object.keys(checks)) assert.ok(template.includes(`data-cs-check="${id}"`))
})

test('all 28 promoted lessons preserve source questions, supply static reading and mount unique sections', () => {
  assert.equal(Object.keys(courseGuides).length, 28)
  for (const [id, guide] of Object.entries(courseGuides)) {
    const patched = patchCsLearning(source, 'zsb-cs', `lessons/${id.padStart(4, '0')}-example.html`)
    const ctx = { slug: 'zsb-cs', lessonId: id, source: '/lesson', title: 'fixture' }
    assert.deepEqual(extractCourseQuestions(patched, ctx), extractCourseQuestions(source, ctx))
    assert.equal(patchCsLearning(patched, 'zsb-cs', `lessons/${id.padStart(4, '0')}-example.html`), patched)
    const data = JSON.parse(patched.match(/id="cs-course-data">([\s\S]*?)<\/script>/)[1])
    assert.equal(new Set(data.stepIds).size, data.stepIds.length)
    assert.equal(data.storageKey, `zhixu:cs-course:${id}:1`)
    assert.equal(data.signature.length, 16)
    assert.ok(data.stepIds.includes('cs-practice'))
    for (const check of Object.values(data.checks)) {
      assert.ok(check.choices[check.answer])
      assert.equal(check.why.length, check.choices.length)
      assert.ok(check.why.every(reason => reason.length >= 8))
    }
    const body = lessonHtmlToMarkdown(csReadingHtml(patched), { slug: 'zsb-cs' }).body
    assert.ok(body.includes(guide.title))
    assert.ok(body.includes('查看完整过程'))
    assert.ok(body.includes('查看参考过程'))
    assert.ok(!body.includes('cs-course-data'))
    assert.ok(!body.includes('data-cs-lab'))
    assert.ok(!body.includes('&lt;code&gt;'))
    for (const trace of Object.values(data.traces)) {
      assert.ok(trace.frames.length >= 3)
      assert.ok(trace.frames.every(frame => frame.code && frame.note && frame.cells.length))
    }
  }
})

test('changed teaching content invalidates saved choices but compatible content restores them', () => {
  const config = { stepIds: ['cs-core', 'cs-transfer'], checks: { core: courseGuides[7].checkpoint }, traces: { core: courseGuides[7].trace }, signature: 'revision-a' }
  const raw = { version: 1, signature: 'revision-a', step: 'cs-transfer', answers: { core: { choice: 0, submitted: true } }, labs: { core: 4 }, updatedAt: 123 }
  assert.deepEqual(cleanCourseState(raw, config), raw)
  const changed = cleanCourseState(raw, { ...config, signature: 'revision-b' })
  assert.equal(changed.step, 'cs-core')
  assert.deepEqual(changed.answers, {})
  assert.deepEqual(changed.labs, {})
})

test('numerical teaching traces match independent calculations', () => {
  const value = (id, name) => courseGuides[id].trace.frames.at(-1).cells.find(([key]) => key === name)?.[1]
  let i=1, sum=0
  for (;i<=3;i++) sum+=i
  assert.equal(value(7, 'sum'), String(sum))
  assert.equal(value(7, 'i'), String(i))
  assert.equal(value(14, '累计'), String([1,2,3,4].reduce((a,b)=>a+b, 0)))
  assert.equal(value(17, '地址'), String(1000+(1*4+2)*4))
  let weights=[2,3,7,8], wpl=0
  while(weights.length>1) { weights.sort((a,b)=>a-b); const merged=weights.shift()+weights.shift(); wpl+=merged; weights.push(merged) }
  assert.equal(value(22, 'WPL'), String(wpl))
  assert.equal(value(26, '数组'), [3,1,2].sort((a,b)=>a-b).join(' '))
})
