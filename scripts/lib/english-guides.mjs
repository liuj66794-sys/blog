import { createRequire } from 'node:module'
import { extractCourseQuestions } from './course-question-index.mjs'
import { primers, terms, paperStrategies } from '../data/teaching/english-guidance.mjs'
import { validateGuide } from '../runtime/guided-state.mjs'

const require = createRequire(import.meta.resolve('vue/package.json'))
const { parse } = require('@vue/compiler-dom')
const attr = (n, key) => n.props?.find(p => p.type === 6 && p.name === key)?.value?.content || ''
const has = (n, cls) => attr(n, 'class').split(/\s+/).includes(cls)
const find = (n, match) => (n.children || []).flatMap(c => [...(match(c) ? [c] : []), ...find(c, match)])
function plain(n) {
  if (n.type === 2) return n.content
  if (['script', 'style', 'summary'].includes(n.tag)) return ''
  if (n.tag === 'br') return '\n'
  const value = (n.children || []).map(plain).join('')
  if (['td', 'th'].includes(n.tag)) return `${value} | `
  return ['p', 'div', 'li', 'h3', 'tr'].includes(n.tag) ? `${value}\n` : value
}
const text = n => plain(n).trim()
const lines = n => text(n).split(/\n+/).map(s => s.trim()).filter(Boolean)
const glossary = value => Object.entries(terms).filter(([word]) => value.includes(word)).map(([word, meaning]) => `${word}：${meaning}`)
const uncertain = value => /存疑|答案有争议|答案待核|答案缺失/.test(value)

function lessonGuide(section, teaching, questions, lessonId) {
  const primer = primers[lessonId]
  const candidates = (section.practiceRefs || []).map(ref => ({ ref, q: questions.get(ref), supplement: teaching.questions.get(ref) }))
    .filter(({ q, supplement }) => q && supplement?.optionAnalysis?.length === q.options.length && supplement.steps?.length)
  // A short guide samples the original practice; the complete bank remains in the original section.
  const selected = candidates.filter(({ q, supplement }) => !uncertain(JSON.stringify([q.explanation, supplement]))).slice(0, 4)
  const steps = [{ id: 'start', short: '先理解', title: primer[0], minutes: 1, body: [primer[1]],
    reflection: '先用自己的话说说：这节内容要帮你解决什么问题？', reference: [section.goal || primer[2]] }]
  const blocks = section.teaching || []
  for (const [i, block] of blocks.entries()) {
    const basics = [block.meaning, block.grammar].filter(Boolean)
    if (!basics.length) continue
    steps.push({ id: `concept-${i + 1}`, short: `概念 ${i + 1}`, title: block.title, minutes: 2,
      body: basics, terms: glossary(JSON.stringify(block)),
      extra: { title: '需要时再看：句子拆解与适用边界', lines: [...(block.breakdown || []), block.examples?.boundary].filter(Boolean) },
      reflection: '试着指出例子中的线索，再用一句话解释为什么这样表达。',
      reference: [block.grammar, ...(block.examples?.right || []).map(s => `正例：${s}`), ...(block.examples?.wrong || []).map(s => `对照：${s}`)].filter(Boolean) })
  }
  const checks = selected.map(({ ref, q, supplement }, index) => ({
    id: `check-${ref.replace(/[^a-z0-9-]/g, '-')}`, short: `练习 ${index + 1}`, title: index ? '换一道，独立判断' : '先自己判断，再核对理由', minutes: 2,
    body: [index ? '先不看提示，说出线索和理由，再选择答案。' : primer[2]], transfer: index > 0,
    ...(q.contextRequired && supplement.sourceContext?.quote ? { context: [`课件定位片段（完整篇章见下方原课内容）：${supplement.sourceContext.quote}`] } : {}),
    question: { stem: q.stem, translation: supplement.translation,
      sourceLabel: '原课练习 · 解析沿用本课教学补充', hint: primer[2], answer: Number(q.answer[0]),
      options: q.options.map((o, i) => ({ text: o.text.replace(new RegExp(`^${String.fromCharCode(65 + i)}[.．、]\\s*`), ''), why: supplement.optionAnalysis.find(a => Number(a.option) === i)?.why || '' })), steps: supplement.steps },
  }))
  // Interleave the first check with the teaching; reserve the remaining examples for independent application.
  if (checks.length) steps.splice(Math.min(2, steps.length), 0, checks.shift())
  steps.push(...checks)
  if (Number(lessonId) === 24 && section.id === 'pt-5') steps.push({
    id: 'write-invitation', short: '动笔写', title: '自己写一封邀请信', minutes: 10, writing: true,
    body: ['练习情境：你是李华，邀请交换生 Mark 参加学校英语读书会。活动在周五下午 3 点、图书馆 2 楼举行，内容包括分享最喜欢的书和小组讨论。'],
    reflection: '用英语写约 100 词：说明邀请目的、时间地点、活动内容，并表达期待。这是补充练习，不是原卷试题。',
    reference: ['先检查收信人 Mark、邀请目的、周五下午 3 点、图书馆 2 楼、分享与讨论是否都写到了。', '正文按“发出邀请 → 活动安排 → 期待回复”组织；逐句检查主语、动词与时间表达。', '邀请句可参考 I would like to invite you to our English reading club.（我想邀请你参加我们的英语读书会。）不要只抄这句，继续完成其余要点。'] })
  const omitted = candidates.length - selected.length
  return { revision: 1, outlineInReading: true, title: `${section.title} · 小步学`,
    intro: `先理解例子，再解释理由，最后独立练习。这里选取 ${selected.length} 道原课题；完整练习保留在下方原课内容。${omitted ? '其余题目未计入本轮，存疑题不参与本轮自动判分。' : ''}`,
    recall: section.retell || '不看讲解，说出本节方法，并用一个例子说明。',
    checklist: [section.goal || primer[2], '能指出题目线索，解释自己的判断，并说明一个不适用的情况。'], steps }
}

function paperSections(html) {
  const root = parse(html, { parseMode: 'html', onError() {} })
  const main = find(root, n => n.tag === 'main')[0]
  if (!main) return { html, sections: [] }
  const groups = []
  let group
  for (const n of main.children) {
    if (n.tag === 'h2') { group = { heading: n, children: [] }; groups.push(group) }
    else if (group) group.children.push(n)
  }
  if (groups.length < 5 || !find(main, n => has(n, 'ansbody')).length) return { html, sections: [] }
  const inserts = []
  const sections = groups.slice(0, 5).map(({ heading, children }, part) => {
    const id = attr(heading, 'id') || `paper-${part + 1}`
    if (!attr(heading, 'id')) inserts.push(heading.loc.start.offset + 3)
    const title = text(heading)
    const [shortTitle, method, reflection] = paperStrategies[part]
    const body = { children }
    const answerNodes = find(body, n => has(n, 'ansbody'))
    const answerLines = answerNodes.flatMap(lines)
    const contentNodes = children.filter(n => !has(n, 'ansbox') && n.tag !== 'footer' && n.tag !== 'script')
    let shared = contentNodes.filter(n => n.tag !== 'ol' && n.tag !== 'h3').flatMap(lines)
    const lists = contentNodes.filter(n => n.tag === 'ol' && has(n, 'paper'))
    let tasks = lists.flatMap(list => {
      const start = Number(attr(list, 'start') || 1)
      return (list.children || []).filter(n => n.tag === 'li').map((n, i) => ({ n, number: start + i }))
    })
    if (!tasks.length && part === 2) {
      const optionLines = shared.filter(s => /^(2[1-9]|3[0-5])\.\s*A\./.test(s))
      tasks = optionLines.map(s => ({ number: Number(s.match(/^\d+/)[0]), content: [s] }))
      if (tasks.length) shared = shared.filter(s => !optionLines.includes(s))
      if (!tasks.length) {
        const rows = contentNodes.filter(n => n.tag === 'table').flatMap(n => find(n, c => c.tag === 'tr'))
        tasks = rows.map(row => (row.children || []).filter(n => n.tag === 'td')).filter(cells => cells.length === 5 && /^\d+\s*\|\s*$/.test(text(cells[0])))
          .map(cells => ({ number: Number(text(cells[0]).replace(/\s*\|\s*$/, '')), content: [cells.slice(1).map((n, i) => `${String.fromCharCode(65 + i)}. ${text(n).replace(/\s*\|\s*$/, '')}`).join('\n')] }))
        if (tasks.length) shared = contentNodes.filter(n => !['table', 'ol', 'h3'].includes(n.tag)).flatMap(lines)
      }
    }
    if (!tasks.length && (part === 1 || part === 3)) {
      const start = part === 1 ? 16 : 36
      const count = part === 1 ? 5 : 10
      tasks = Array.from({ length: count }, (_, i) => ({ number: start + i, content: [`请完成第 ${start + i} 空。`] }))
    }
    const sourceNote = answerLines.filter(s => /课件|来源|参考答案|整理|补充|缺|存疑/.test(s) && !/^(?:第\s*)?\d+/.test(s) && s.length < 500)
    const steps = [{ id: 'method', short: '先看方法', title: `${shortTitle}：先想清楚怎样做`, minutes: 1,
      body: [method, '本卷按原题练习，保留原课参考答案的来源说明。每题先写依据，再展开参考，不自动判分。'],
      reflection: '准备怎样找线索或组织答案？', reference: [reflection] }]
    if (tasks.length) {
      for (const { n, number, content } of tasks) {
        const reference = answerLines.filter(s => new RegExp(`^(?:第\\s*${number}\\s*题|${number}[.．、]\\s*)`).test(s))
        const source = n ? lines(n) : content
        const fallbackContext = part === 0 && n && !find(n, c => has(c, 'passage')).length
          ? lists.flatMap(list => find(list, c => has(c, 'passage')).flatMap(lines)) : []
        steps.push({ id: `task-${number}`, short: `第 ${number} 题`, title: `${shortTitle} · 第 ${number} 题`, minutes: 3,
          body: [method], context: [...shared, ...fallbackContext, ...source], writing: part === 4,
          reflection: part === 4 ? reflection : '写下你的答案和依据；答完后核对参考解析。',
          reference: part === 4 ? answerLines : [...sourceNote, ...(reference.length ? reference : ['这一题未提取到独立解析，请查看下方原卷答案区核对；此处不自动判分。'])] })
      }
    } else steps.push({ id: 'task', short: part === 4 ? '动笔写' : '独立作答', title: `${shortTitle} · 独立完成`, minutes: part === 4 ? 20 : 10,
      body: [method], context: shared, writing: part === 4, reflection,
      reference: answerLines.length ? answerLines : ['原课未提供参考答案，请保留草稿并记录待核对的问题。'] })
    return { id, title, goal: method, knowledgePoints: [], prereqs: [], practiceRefs: [], retell: reflection,
      guide: { revision: 1, outlineInReading: true, shortTitle, title: `${shortTitle} · 逐步练习`, intro: '按题分步练，答案与理由会自动保存在此设备。整卷限时练习仍可使用下方原卷。',
        recall: reflection, checklist: [method, '核对参考答案的来源和存疑提示；不能仅凭答案字母判断自己是否理解。'], steps } }
  })
  // Reverse offsets keep source markup and every pre-existing anchor unchanged.
  for (let i = inserts.length - 1; i >= 0; i--) {
    const offset = inserts[i]
    const part = groups.findIndex(g => g.heading.loc.start.offset + 3 === offset)
    html = `${html.slice(0, offset)} id="paper-${part + 1}"${html.slice(offset)}`
  }
  return { html, sections }
}

/** Pure build-time adapter shared by interactive and reading editions. Never changes source answers. */
export function prepareEnglishGuides(html, teaching, lessonId) {
  let sections
  if (teaching?.sections?.length && primers[lessonId]) {
    const questions = new Map(extractCourseQuestions(html, { slug: 'zsb-english', lessonId: String(lessonId), source: `zsb-english/${lessonId}`, title: '' }).map(q => [q.ref, q]))
    sections = teaching.sections.map(section => ({ ...section, guide: section.guide || lessonGuide(section, teaching, questions, lessonId) }))
  } else if (Number(lessonId) >= 25 && Number(lessonId) <= 36) {
    const paper = paperSections(html)
    html = paper.html
    sections = paper.sections
  }
  if (!sections?.length) return { html, teaching }
  for (const section of sections) {
    const errors = validateGuide(section.guide)
    if (errors.length) throw new Error(`英语 ${lessonId}/${section.id} 小步学：${errors.join('；')}`)
  }
  return { html, teaching: { lessonId: String(lessonId), questions: new Map(), ...teaching, sections } }
}
