/**
 * teaching-pipeline.test.mjs —— 教学补充同步与转换流水线单测。
 *
 * 覆盖：content-patches 应用（命中/未命中/absorbed/文件过滤）、镜像 #teaching-data
 * 与题库 #teaching-bank 注入、索引合并（mergeQuestionTeaching + validateSubject 防呆）、
 * 阅读版渲染（小节元数据 / 讲解块 / 逐选项解析 / 政治 mcq / 主观题支架）与无补充回归。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyContentPatches, supplementsForLesson, resolveQuestionRef,
  mergeQuestionTeaching, validateSubject,
} from './teaching.mjs'
import { injectTeachingData, injectTeachingBank, teachingLessonId } from '../sync-prep.mjs'
import { lessonHtmlToMarkdown } from './lesson-convert.mjs'
import { extractCourseQuestions } from './course-question-index.mjs'

/** 构造最小教学目录（slug 单科） */
const makeCatalog = (slug, { patches = [], points = [], lessons = {}, bank = {} } = {}) => ({
  patches,
  subjects: {
    'zsb-english': { knowledgePoints: { points: [] }, lessons: {}, bank: {} },
    'zsb-politics': { knowledgePoints: { points: [] }, lessons: {}, bank: {} },
    [slug]: { knowledgePoints: { points }, lessons, bank },
  },
})

/* ---------------- applyContentPatches ---------------- */

const patchCatalog = makeCatalog('zsb-english', {
  patches: [
    { id: 'p-hit', subject: 'zsb-english', file: 'lessons/0001-nouns.html', changes: [{ from: 'old text', to: 'new text' }] },
    { id: 'p-absorbed', subject: 'zsb-english', file: 'lessons/0002-verbs.html', absorbed: true, reason: '已吸收', changes: [{ from: 'gone', to: 'x' }] },
  ],
})

test('内容补丁：命中替换', () => {
  assert.equal(
    applyContentPatches('<p>old text</p>', 'zsb-english', 'lessons/0001-nouns.html', patchCatalog),
    '<p>new text</p>',
  )
})

test('内容补丁：未命中抛错（防源变化后悄悄失效）', () => {
  assert.throws(
    () => applyContentPatches('<p>changed</p>', 'zsb-english', 'lessons/0001-nouns.html', patchCatalog),
    /内容补丁 p-hit 未命中/,
  )
})

test('内容补丁：absorbed 仅留档，不校验不替换', () => {
  assert.equal(
    applyContentPatches('<p>anything</p>', 'zsb-english', 'lessons/0002-verbs.html', patchCatalog),
    '<p>anything</p>',
  )
})

test('内容补丁：按 file 与 subject 过滤', () => {
  assert.equal(
    applyContentPatches('<p>old text</p>', 'zsb-english', 'lessons/0003-other.html', patchCatalog),
    '<p>old text</p>',
  )
  assert.equal(
    applyContentPatches('<p>old text</p>', 'zsb-politics', 'lessons/0001-nouns.html', patchCatalog),
    '<p>old text</p>',
  )
})

/* ---------------- injectTeachingData / injectTeachingBank ---------------- */

test('teachingLessonId：英语数字课号去前导零，政治按文件名，工具页与非课科目为 null', () => {
  assert.equal(teachingLessonId('zsb-english', 'lessons/0009-tenses-voice.html'), '9')
  assert.equal(teachingLessonId('zsb-english', 'lessons/course.html'), null)
  assert.equal(teachingLessonId('zsb-politics', 'lessons/mzt01.html'), 'mzt01')
  assert.equal(teachingLessonId('zsb-politics', 'lessons/xg05.html'), 'xg05')
  assert.equal(teachingLessonId('zsb-politics', 'lessons/sz00.html'), 'sz00')
  assert.equal(teachingLessonId('zsb-politics', 'lessons/practice.html'), null)
  assert.equal(teachingLessonId('zsb-math', 'lessons/0001-limit.html'), null)
})

const englishCatalog = makeCatalog('zsb-english', {
  points: [
    { id: 'kp-tense', name: '时态', summary: '动词时间' },
    { id: 'kp-voice', name: '语态', summary: '主被动' },
    { id: 'kp-unused', name: '未引用', summary: '不应注入' },
  ],
  lessons: {
    1: {
      lessonId: '1',
      sections: [{ id: 'pt-1', title: '导入', goal: '认识名词', minutes: 10, knowledgePoints: ['kp-tense'] }],
      questions: { 'quiz:0': { knowledgePoints: ['kp-voice', 'kp-tense'], translation: '译文' } },
    },
  },
})

const readPayload = (html, id) => JSON.parse(
  html.match(new RegExp(`<script type="application/json" id="${id}"[^>]*>([\\s\\S]*?)</script>`))[1],
)

test('injectTeachingData：有补充注入 #teaching-data，知识点按引用收集去重', () => {
  const html = '<html><body><div id="quiz"></div>'
    + '<script>Quiz.render(\'#quiz\', [{ q: \'题干\', opts: [\'A 甲\', \'B 乙\'], a: 0, why: \'解析\' }]);</script></body></html>'
  const out = injectTeachingData(html, 'zsb-english', '1', englishCatalog)
  assert.ok(out.includes('id="teaching-data"'))
  assert.ok(out.indexOf('id="teaching-data"') < out.indexOf('</body>'))
  const payload = readPayload(out, 'teaching-data')
  assert.equal(payload.version, 1)
  assert.equal(payload.lessonId, '1')
  assert.equal(payload.sections[0].id, 'pt-1')
  assert.equal(payload.questions['quiz:0'].translation, '译文')
  assert.deepEqual(payload.knowledgePoints.map((p) => p.id), ['kp-tense', 'kp-voice'])
  assert.deepEqual(payload.knowledgePoints.map((p) => p.name), ['时态', '语态'])
})

test('injectTeachingData：无补充不注入；引用未定义知识点快速报错', () => {
  const html = '<html><body><p>课件</p></body></html>'
  assert.equal(injectTeachingData(html, 'zsb-english', '99', englishCatalog), html)
  const bad = makeCatalog('zsb-english', {
    points: [],
    lessons: { 2: { lessonId: '2', questions: { 'quiz:0': { knowledgePoints: ['kp-ghost'] } } } },
  })
  assert.throws(() => injectTeachingData(html, 'zsb-english', '2', bad), /未定义知识点 kp-ghost/)
})

test('injectTeachingBank：单个 #teaching-bank 按卷打包，sections 取 bank.sections', () => {
  const catalog = makeCatalog('zsb-politics', {
    bank: {
      'paper-1': {
        paperId: 'paper-1',
        sections: [{ title: '卷首指导', goal: '先易后难' }],
        questions: { q1: { steps: ['看题干', '排错项'] } },
      },
    },
  })
  const out = injectTeachingBank('<html><body></body></html>', catalog)
  assert.equal(out.match(/id="teaching-bank"/g).length, 1)
  const payload = readPayload(out, 'teaching-bank')
  assert.equal(payload.papers['paper-1'].lessonId, 'paper-1')
  assert.equal(payload.papers['paper-1'].sections[0].goal, '先易后难')
  assert.deepEqual(payload.papers['paper-1'].questions.q1.steps, ['看题干', '排错项'])
  // 无 bank 补充时不注入
  const empty = makeCatalog('zsb-politics', {})
  assert.ok(!injectTeachingBank('<html><body></body></html>', empty).includes('teaching-bank'))
})

/* ---------------- 索引合并 ---------------- */

test('mergeQuestionTeaching：teaching/subjective 并入，题目身份与旧解析不动', () => {
  const q = {
    id: 'zsb-english:1:abc', ref: 'quiz:0', kind: 'choice', stem: 's',
    options: [{ value: '0', text: '甲' }, { value: '1', text: '乙' }], answer: ['1'], explanation: '旧解析',
  }
  const merged = mergeQuestionTeaching(q, {
    translation: '译文',
    optionAnalysis: [{ option: 0, verdict: 'wrong', why: '错因' }, { option: 1, verdict: 'correct', why: '对因' }],
  })
  assert.equal(merged.id, q.id)
  assert.equal(merged.explanation, '旧解析')
  assert.equal(merged.teaching.translation, '译文')
  assert.equal(merged.teaching.optionAnalysis.length, 2)
  const withSubjective = mergeQuestionTeaching(q, { subjective: { keyPoints: ['要点'] } })
  assert.deepEqual(withSubjective.subjective, { keyPoints: ['要点'] })
  assert.ok(!withSubjective.teaching)
  assert.equal(mergeQuestionTeaching(q, null), q)
  assert.equal(mergeQuestionTeaching(q, {}), q)
})

test('extractCourseQuestions + 补充合并：英语 Quiz.render 题按 ref 命中，旧 explanation 保留', () => {
  const html = `<body><h1>t</h1><div id="quiz"></div><script>
    Quiz.render('#quiz', [{ q: 'She ___ finished.', opts: ['has', 'have'], a: 0, why: '三单用 has' }]);
    </script></body>`
  const questions = extractCourseQuestions(html, { slug: 'zsb-english', lessonId: '1', source: 'x', title: 't' })
  assert.equal(questions[0].ref, 'quiz:0')
  const catalog = makeCatalog('zsb-english', {
    lessons: { 1: { lessonId: '1', questions: { 'quiz:0': { translation: '她已经完成了。' } } } },
  })
  const merged = supplementsForLesson(catalog, 'zsb-english', '1')
  const supplement = merged.questions.get(resolveQuestionRef('quiz:0', questions))
  const entry = mergeQuestionTeaching(questions[0], supplement)
  assert.equal(entry.teaching.translation, '她已经完成了。')
  assert.equal(entry.explanation, '三单用 has')
})

test('validateSubject：缺题目/缺知识点/选项越界/前置成环均报错，合法补充通过', () => {
  const questions = [{
    ref: 'quiz:0', kind: 'choice', stem: 's',
    options: [{ value: '0' }, { value: '1' }], answer: ['0'],
  }]
  const bad = makeCatalog('zsb-english', {
    points: [{ id: 'kp-a', name: 'A', summary: '' }],
    lessons: {
      1: {
        lessonId: '1',
        sections: [{ id: 'pt-1', title: 't', knowledgePoints: ['kp-missing'] }],
        questions: {
          'quiz:9': { translation: '不存在' },
          'quiz:0': { optionAnalysis: [{ option: 5, verdict: 'wrong', why: 'x' }] },
        },
      },
    },
  })
  const errors = validateSubject(bad, 'zsb-english', (id) => (id === '1' ? questions : []))
  assert.ok(errors.some((e) => e.includes('不存在的题目 "quiz:9"')), errors.join('\n'))
  assert.ok(errors.some((e) => e.includes('知识点 kp-missing 未定义')), errors.join('\n'))
  assert.ok(errors.some((e) => e.includes('选项解析越界 5')), errors.join('\n'))

  const cyclic = makeCatalog('zsb-english', {
    points: [
      { id: 'kp-a', name: 'A', summary: '', prereqs: ['kp-b'] },
      { id: 'kp-b', name: 'B', summary: '', prereqs: ['kp-a'] },
    ],
  })
  assert.ok(validateSubject(cyclic, 'zsb-english', () => []).some((e) => e.includes('成环')))

  const good = makeCatalog('zsb-english', {
    points: [{ id: 'kp-a', name: 'A', summary: '' }],
    lessons: {
      1: {
        lessonId: '1',
        sections: [{ id: 'pt-1', title: 't', knowledgePoints: ['kp-a'] }],
        questions: {
          'quiz:0': {
            knowledgePoints: ['kp-a'],
            optionAnalysis: [{ option: 0, verdict: 'correct', why: '对' }, { option: 1, verdict: 'wrong', why: '错' }],
          },
        },
      },
    },
  })
  assert.deepEqual(validateSubject(good, 'zsb-english', (id) => (id === '1' ? questions : [])), [])
})

/* ---------------- lesson-convert 阅读版渲染 ---------------- */

const ENGLISH_HTML = `<body><h1>时态</h1><h2 id="pt-1">现在完成时</h2><p>正文段落</p><div id="quiz"></div><script>
  Quiz.render('#quiz', [{ q: 'She ___ finished her homework.', opts: ['has', 'have'], a: 0, why: '三单用 has' }]);
  </script></body>`

const englishTeaching = {
  lessonId: '1',
  sections: [{
    id: 'pt-1', title: '现在完成时', goal: '掌握 have/has + done', minutes: 15,
    knowledgePoints: ['kp-pperf'],
    teaching: [{
      type: 'english-explain', meaning: '她已经完成了作业。',
      breakdown: ['She 主语', 'has finished 谓语'], grammar: '现在完成时：have/has + 过去分词',
      mnemonic: { text: '三单 has 其余 have', note: '看主语人称' },
    }],
  }],
  questions: new Map([['quiz:0', {
    optionAnalysis: [
      { option: 0, verdict: 'correct', why: '三单用 has' },
      { option: 1, verdict: 'wrong', why: 'have 不能配三单' },
    ],
    translation: '她已经完成了作业。',
    phrases: [{ text: 'finish homework', meaning: '完成作业' }],
    compareTo: 'quiz:1',
    sourceContext: { label: '讲义例句', quote: 'She has finished her homework.' },
  }]]),
  subjective: {},
}

test('阅读版（英语 teaching）：小节元数据 + 讲解块 + 逐选项解析/翻译/词组/对比/原文定位', () => {
  const conv = lessonHtmlToMarkdown(ENGLISH_HTML, {
    slug: 'zsb-english', teaching: englishTeaching,
    knowledgePoints: new Map([['kp-pperf', { id: 'kp-pperf', name: '现在完成时', summary: '' }]]),
  })
  // 小节元数据
  assert.ok(conv.body.includes('::: info 本节指引 · 现在完成时'), conv.body)
  assert.ok(conv.body.includes('- **目标**：掌握 have/has + done'))
  assert.ok(conv.body.includes('- **建议用时**：15 分钟'))
  assert.ok(conv.body.includes('`现在完成时`'), '知识点 chips 缺失')
  // 讲解块在小节开头（元数据之后）
  assert.ok(conv.body.indexOf('::: info 本节指引') < conv.body.indexOf('::: tip 句子精讲'))
  assert.ok(conv.body.includes('**句意**：她已经完成了作业。'))
  assert.ok(conv.body.includes('- She 主语'))
  assert.ok(conv.body.includes('**语法**：现在完成时：have/has + 过去分词'))
  assert.ok(conv.body.includes('**口诀**：三单 has 其余 have —— 看主语人称'))
  // 逐选项解析进 details
  assert.ok(conv.body.includes('**逐选项解析**'))
  assert.ok(conv.body.includes('- A ✅ 三单用 has'))
  assert.ok(conv.body.includes('- B ❌ have 不能配三单'))
  assert.ok(conv.body.includes('**整句翻译**：她已经完成了作业。'))
  assert.ok(conv.body.includes('`finish homework` 完成作业'))
  assert.ok(conv.body.includes('**对比自测**'))
  assert.ok(conv.body.includes('**原文定位**（讲义例句）：She has finished her homework.'))
  // 旧字段保留
  assert.ok(conv.body.includes('**答案：A（has）** —— 三单用 has'))
})

test('阅读版回归：无 teaching 时输出不含任何教学补充标记', () => {
  const conv = lessonHtmlToMarkdown(ENGLISH_HTML, { slug: 'zsb-english' })
  assert.ok(!conv.body.includes('本节指引'))
  assert.ok(!conv.body.includes('逐选项解析'))
  assert.ok(conv.body.includes('**答案：A（has）** —— 三单用 has'))
})

const POLITICS_HTML = `<body><h1>毛概第一课</h1><p>正文段落</p>
<script type="application/json" id="lesson-data">{"lessonId":"mzt01","cards":[],"mcxs":0,"mcqs":[{"id":"m1","stem":"毛泽东思想活的灵魂不包括？","options":[{"letter":"A","text":"实事求是"},{"letter":"B","text":"群众路线"},{"letter":"C","text":"独立自主"},{"letter":"D","text":"改革开放"}],"answer":"D","exp":"活的灵魂是前三者"}]}</script></body>`

test('阅读版（政治 teaching）：课内 mcq 补渲染为题目块并并入逐选项解析，主观题支架收尾', () => {
  const teaching = {
    lessonId: 'mzt01', sections: [], sectionNotes: [],
    questions: new Map([['mcq:1', {
      optionAnalysis: [{ option: 'D', verdict: 'correct', why: '改革开放不属于活的灵魂' }],
      sourceContext: { label: '教材', quote: '实事求是、群众路线、独立自主' },
    }]]),
    subjective: {
      'qa:1': { keyPoints: ['实事求是', '群众路线'], derivation: '从定义出发逐项排除', selfEval: ['能默写三个要点', '能各举一例'] },
    },
  }
  const conv = lessonHtmlToMarkdown(POLITICS_HTML, { slug: 'zsb-politics', teaching })
  assert.ok(conv.body.includes('## 章末选择题'), conv.body)
  assert.ok(conv.body.includes('**1. 毛泽东思想活的灵魂不包括？**'))
  assert.ok(conv.body.includes('- D. 改革开放'))
  assert.ok(conv.body.includes('**答案：D** —— 活的灵魂是前三者'))
  assert.ok(conv.body.includes('- D ✅ 改革开放不属于活的灵魂'), 'mcq:1 键应按序解析到第 1 道选择题')
  assert.ok(conv.body.includes('**原文定位**（教材）：实事求是、群众路线、独立自主'))
  assert.ok(conv.body.includes('## 主观题支架'))
  assert.ok(conv.body.includes('### qa:1'))
  assert.ok(conv.body.includes('- 实事求是'))
  assert.ok(conv.body.includes('**推导**：从定义出发逐项排除'))
  assert.ok(conv.body.includes('- [ ] 能默写三个要点'))
  // 题块在正文之后
  assert.ok(conv.body.indexOf('正文段落') < conv.body.indexOf('## 章末选择题'))
})

test('阅读版回归：政治课无 teaching 时不补渲染 mcq 与主观题支架', () => {
  const conv = lessonHtmlToMarkdown(POLITICS_HTML, { slug: 'zsb-politics' })
  assert.ok(!conv.body.includes('章末选择题'))
  assert.ok(!conv.body.includes('主观题支架'))
  assert.ok(conv.body.includes('正文段落'))
})

test('阅读版：未识别的 teaching 块类型告警并跳过，其余内容不丢', () => {
  const warns = []
  const conv = lessonHtmlToMarkdown('<body><h1>t</h1><h2 id="pt-1">小节</h2><p>保留我</p></body>', {
    slug: 'zsb-english',
    teaching: {
      lessonId: '1',
      sections: [{ id: 'pt-1', title: '小节', goal: '目标', teaching: [{ type: 'mystery-block', data: 1 }] }],
      questions: new Map(), subjective: {},
    },
    onWarn: (m) => warns.push(m),
  })
  assert.ok(warns.some((w) => w.includes('未识别的 teaching 块类型')), warns.join('\n'))
  assert.ok(conv.body.includes('保留我'))
  assert.ok(conv.body.includes('::: info 本节指引 · 小节'))
})
