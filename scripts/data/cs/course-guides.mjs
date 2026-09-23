import { cGuides } from './c-language-guides.mjs'
import { dsGuides } from './data-structure-guides.mjs'
import { reviewGuides } from './review-guides.mjs'
import { createHash } from 'node:crypto'

export const courseGuides = { ...cGuides, ...dsGuides, ...reviewGuides }

const hints = {
  1: '先分清声明和定义：编译器知道接口后，还需要哪一步把函数实现连接进来？',
  2: '先写满 8 位的 +6，再逐位取反。完成取反后还有最后一个步骤。',
  3: '沿着赋值右侧读：在除法开始前，至少让一个操作数先成为 double。',
  4: '把两个 %d 与两个 int 的地址一一配对，再检查成功赋值次数是否等于 2。',
  5: '把“除数不为零”放在左边，再选一个左边为假时会跳过右边的逻辑运算符。',
  6: '找到 case 1 做完加法的位置。要在进入下一标签下的语句前离开 switch。',
  7: '分别记录 i=1、2、3、4。i=2 时跳过加法，但 for 的更新表达式仍会执行。',
  8: '数可见字母之后，再为字符串结束标志额外留一个 char。',
  9: '把函数内的 x 和调用者的 n 分成两栏；最后检查调用者有没有执行赋值。',
  10: '关键在 static：第二次调用时，n 会保留上次的值，还是再次从 0 开始？',
  12: '从 r 读声明：先用括号把 *r 结合，再写一行中包含多少个 int。',
  13: '先判断是否取得有效文件流。打开失败与打开成功后的读取失败是两个检查点。',
  14: '直接列出小于 16 的 1、2、4……；条件为 i<n，不包含等于 n 的那次。',
  15: '在释放目标结点前，先取出它的后继并让前驱接过去。',
  16: '先从位置 3 沿环走到 rear=1，数经过的有效位置；出队只移动 front。',
  17: '第 2 行前面只有第 0、1 两行，压缩后分别占 1、2 个位置。',
  18: '判断 ac 时先看是否连续；计数时把非空子串和唯一的空串分开。',
  19: '先用 n0=n2+1 求叶子，再把三种度的结点数相加。',
  20: '后序把 A 放最后，并先完整处理 B 子树；层序先写 A，再写 B、C。',
  21: 'E 和 F 同属 B 的孩子。编码“下一个兄弟”用的是右指针。',
  22: '第一次合并 1 与 2 后，新权值是 3；第二次将 3 与 4 合并。',
  23: 'DFS 从 A 先选字母较小的 B，再向 D 深入；只记录第一次访问。',
  24: '先统计每个顶点的入度。A、B 都处理完，C 的前置依赖才清空。',
  25: '用三栏写 low、high、mid。每次排除中点，直到 low 超过 high。',
  26: '把 A、B 看成贴在相等数字上的名字；检查 2B 会不会越过先到的 2A。',
  27: 'key 已保存待插入值；把当前较大的 a[j] 复制到它右边的空位。',
  28: '不要只写课名：明确混淆的两种表达式，以及重做时要核对哪几个状态。',
  29: '把任务写成“到哪一课→独立做什么→怎样确认没有漏结点”。',
}

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
// These authored Chinese explanations contain ASCII C expressions. Mark the
// entire ASCII run as code so *, [], backslashes and {{}} survive Markdown/Vue.
const prose = value => String(value).split(/([\x20-\x7e]+)/g).map(part => {
  if (!/[A-Za-z0-9]/.test(part) || /[^\x20-\x7e]/.test(part)) return esc(part)
  const trimmed = part.trim()
  return `${part.startsWith(' ') ? ' ' : ''}<code>${esc(trimmed)}</code>${part.endsWith(' ') ? ' ' : ''}`
}).join('')
const strip = html => html.replace(/<[^>]*>/g, '').replace(/^[一二三四五六七八九十]+、/, '').trim()

function staticCheck(check) {
  return `<details class="cs-check-answer"><summary>核对判断与理由</summary><p>${prose(check.question)}</p><ol>${check.choices.map((choice, i) => `<li>${prose(choice)}：${prose(check.why[i])}</li>`).join('')}</ol><p>正确判断：${prose(check.choices[check.answer])}</p></details>`
}

function diagramHtml(diagram) {
  if (!diagram) return ''
  const positions = Object.fromEntries(diagram.nodes.map(([id,x,y])=>[id,{x,y}]))
  const edges = diagram.edges.map(([a,b,label]) => {
    const start=positions[a], end=positions[b], dx=end.x-start.x, dy=end.y-start.y, length=Math.hypot(dx,dy)
    const x1=start.x+dx/length*24, y1=start.y+dy/length*24, x2=end.x-dx/length*28, y2=end.y-dy/length*28
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${diagram.directed ? ' marker-end="url(#cs-arrow-head)"' : ''}/>${label ? `<text class="cs-edge-label" x="${(start.x+end.x)/2+13}" y="${(start.y+end.y)/2-8}">${esc(label)}</text>` : ''}`
  }).join('')
  return `<section class="cs-map" data-cs-map><svg viewBox="0 0 500 245" role="img" aria-label="${esc(diagram.description)}"><title>${esc(diagram.description)}</title><defs><marker id="cs-arrow-head" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"/></marker></defs>${edges}${diagram.nodes.map(([id,x,y])=>`<g data-node="${esc(id)}"><circle cx="${x}" cy="${y}" r="23"/><text x="${x}" y="${y+6}">${esc(id)}</text></g>`).join('')}</svg><p class="cs-muted">${esc(diagram.description)}</p></section>`
}

/** Keeps source sections and all original questions; supplements their hardest prerequisite. */
export function renderCourseGuide(html, id) {
  const guide = courseGuides[id]
  if (!guide) return null
  const start = html.indexOf('<h1>'), first = html.indexOf('<h2>', start), footer = html.indexOf('<nav class="footer-nav">')
  if (start < 0 || first < start || footer < first) throw new Error(`第 ${id} 课原始结构已变化，请核对教学版插入位置。`)
  const intro = html.slice(start, first)
  const h1 = intro.match(/<h1>[\s\S]*?<\/h1>/)?.[0]
  const meta = intro.match(/<p class="lesson-meta">[\s\S]*?<\/p>/)?.[0] ?? ''
  const prerequisites = intro.replace(h1, '').replace(meta, '')
  const sourceSections = html.slice(first, footer).split(/(?=<h2>)/).filter(Boolean)
  let practiceFound = false
  const originals = sourceSections.map((content, i) => {
    const title = content.match(/<h2>([\s\S]*?)<\/h2>/)?.[1]
    if (!title) throw new Error(`第 ${id} 课小节缺少标题。`)
    const quiz = /class="quiz"/.test(content)
    if (quiz && practiceFound) throw new Error(`第 ${id} 课有多个测验区，需要显式指定。`)
    if (quiz) practiceFound = true
    return { id: quiz ? 'cs-practice' : `cs-detail-${i + 1}`, title: strip(title),
      html: content.replace('<h2>', '<h2 tabindex="-1">') + (i === 0 ? `<details><summary>本课目标与前置回顾</summary>${prerequisites}</details>` : '') }
  })
  if (!practiceFound) throw new Error(`第 ${id} 课未找到原课测验。`)
  const steps = [
    { id: 'cs-core', title: guide.title, html: `<h2 tabindex="-1">${esc(guide.title)}</h2><p class="cs-goal">这一节要学会：${esc(guide.goal)}</p>${guide.paragraphs.map(p => `<p>${esc(p)}</p>`).join('')}<section data-cs-lab="core"></section><details class="cs-trace-transcript"><summary>查看完整过程，逐步核对</summary>${guide.trace.frames.map((frame, i) => `<h3>第 ${i + 1} 步</h3><pre><code>${esc(frame.code)}</code></pre><p>${frame.cells.map(([k,v]) => `${esc(k)}：${esc(v)}`).join('；')}</p>${frame.pointer ? `<p>${esc(frame.pointer)}</p>` : ''}<p>${esc(frame.note)}</p>`).join('')}</details><section data-cs-check="core"></section>${staticCheck(guide.checkpoint)}` },
    { id: 'cs-transfer', title: Number(id) >= 27 ? '把复习任务写具体' : '换个例子，自己试一次', html: `<h2 tabindex="-1">${Number(id) >= 27 ? '把复习任务写具体' : '换个例子，自己试一次'}</h2><p class="cs-goal">先独立写出过程，再核对理由。遇到卡点可以回上一小节重走。</p><p class="cs-task">${esc(guide.transfer)}</p><details><summary>卡住时看提示</summary><p>先写下题目给定的状态和规则，再一次只处理一个变化。用上一小节的例子检查自己的第一步；复盘任务则先指出具体哪一步有问题。</p></details><details><summary>查看参考过程</summary><p>${esc(guide.solution)}</p></details><section data-cs-check="transfer"></section>${staticCheck(guide.transferCheck)}` },
    ...originals,
  ]
  const config = { version: 1, storageKey: `zhixu:cs-course:${id}:1`, stepIds: steps.map(s => s.id),
    checks: { core: guide.checkpoint, transfer: guide.transferCheck }, traces: { core: guide.trace } }
  config.signature = createHash('sha256').update(JSON.stringify([config.checks, config.traces])).digest('hex').slice(0, 16)
  // Apply code semantics only to the newly authored guide text, never source quizzes.
  for (const step of steps.slice(0,2)) {
    const authored = [...guide.paragraphs, guide.transfer, guide.solution]
    for (const text of authored) step.html = step.html.replace(esc(text), prose(text))
  }
  steps[1].html = steps[1].html.replace('先写下题目给定的状态和规则，再一次只处理一个变化。用上一小节的例子检查自己的第一步；复盘任务则先指出具体哪一步有问题。', prose(hints[id]))
  if (guide.diagram) steps[0].html = steps[0].html.replace('<section data-cs-lab=', diagramHtml(guide.diagram) + '<section data-cs-lab=')
  const body = `<header class="cs-intro"><p class="cs-eyebrow">计算机 · ${Number(id) >= 27 ? '复习与模拟' : '逐步理解'}</p>${h1}${meta.replace(/约 \d+ 分钟(?=<\/p>)/, '建议按小节分次学习')}<p>${esc(guide.goal)}</p><p class="cs-interactive-note">先看核心过程，再独立尝试，随后按需深入各知识点和原课测验。小节可以自由切换，支持展开全文。</p></header>
<section class="cs-course"><aside class="cs-path" aria-label="本课学习路径"><strong>本课学习路径</strong><ol>${steps.map((s, i) => `<li><a href="#${s.id}">${String(i + 1).padStart(2,'0')} / ${esc(s.title)}</a></li>`).join('')}</ol></aside><section class="cs-content">${steps.map(s => `<section id="${s.id}" data-cs-step>${s.html}</section>`).join('\n')}</section></section>
<script type="application/json" id="cs-course-data">${JSON.stringify(config).replace(/</g, '\\u003c')}</script>\n`
  return html.slice(0, start) + body + html.slice(footer)
}
