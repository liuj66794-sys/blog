/**
 * lesson-convert.mjs —— 讲义 HTML → Markdown 全文页转换器（方案 B：讲义转 MD）。
 *
 * 把 learn 仓库自家生成的讲义 HTML 结构性转成 Markdown，纳入 plume 主题体系
 * （统一外观、深色模式、TOC、全文搜索）；随堂测静态化为「折叠核对答案」，
 * 交互版仍走 public/lessons/ 的 HTML 镜像。
 *
 * 覆盖五门课的模板族（结构同源、局部变体）：
 * - a-shares：.lesson-meta/.win/.mission-tie/.quiz[data-answer=索引]/.example/.task/.feynman/.nav
 * - pi-agent：<main> 包裹/.callout(span.label)/.recall(reveal+answer)/.quiz[字母]+button.option/.further
 * - engineering-skills：.callout(callout-title)/.step/.quiz[大写字母]+label>input、解析在页尾 script
 * - english：.card 变体卡/.quiz-options[data-answer]+li[data-idx]/<footer>/内嵌 <style> 剥离
 * - policy：div.container/p.subtitle/.card/.compare/.mnemonic/.quiz onclick 布尔标记答案
 * 遇到不认识的块按内容展开并经 onWarn 提示——上游模板演进时最坏只是语义降级，
 * 同步不会失败。
 *
 * 容器只用 VuePress 核心保证的集合（tip/info/warning/danger/details），
 * plume 扩展容器名不依赖，避免主题升级踩坑。
 */
import { withBase } from '../../docs/.vuepress/site-meta.mjs'

/* ---------------- 基础工具 ---------------- */

const ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  mdash: '—', ndash: '–', hellip: '…', middot: '·', times: '×', divide: '÷',
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
}

/** HTML 实体解码（数字 + 常用命名；未识别的保持原样） */
export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n) => ENTITIES[n] ?? m)
}

/** 去全部标签取纯文本（容器标题/链接文本用，不做 markdown 转换） */
function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

/** 裸尖括号转义回实体：泛型文本（Promise<string> 等）进了 Vue 模板会当未闭合标签 */
const escapeAngle = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * 讲义体内 URL 重写：
 * - ./0004-x.html / 0004-x.html → /courses/<slug>/l/4/（相邻课互链走站内全文页）
 * - ../reference/x.html 等 → <base>/lessons/<slug>/reference/…（镜像原样托管路径）
 * - 外链 / 锚点 / 其他 → 原样保留
 */
function rewriteUrl(href, ctx) {
  const url = decodeEntities(href.trim())
  if (/^(https?:|mailto:|#|\/)/i.test(url)) return url
  const lesson = url.match(/^\.?\/?(\d{4})-[^/?#]+\.html/)
  if (lesson) return `/courses/${ctx.slug}/l/${Number(lesson[1])}/`
  const up = url.match(/^\.\.\/(.+)$/)
  if (up) return withBase(`/lessons/${ctx.slug}/${up[1]}`)
  ctx.onWarn(`[lesson-convert] 未识别的相对链接，保持原样：${url}`)
  return url
}

/* ---------------- 行内转换 ---------------- */

/**
 * 行内 HTML → Markdown 文本（b/strong → **，i/em → *，code → `，
 * span 等语义壳去标签保留内容，a → []()）。
 * 注意：实体解码必须放在所有标签处理之后，避免解码出的 < > 干扰标签匹配。
 */
function inline(html, ctx) {
  let s = html
  s = s.replace(/<br\s*\/?>/gi, '\n')
  // 链接先行：链接内可能含加粗/数字 span，递归处理标签部分
  s = s.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => {
    const label = inline(text, ctx).replace(/\s+/g, ' ').trim() || decodeEntities(href)
    return `[${label}](${rewriteUrl(href, ctx)})`
  })
  s = s.replace(/<\/?(b|strong)>/gi, '**')
  s = s.replace(/<\/?(i|em)>/gi, '*')
  s = s.replace(/<code>([\s\S]*?)<\/code>/gi, (_, c) => `\`${c.trim()}\``)
  s = s.replace(/<\/?span[^>]*>/gi, '')
  s = s.replace(/<\/?(?:u|mark|small|sub|sup|font)[^>]*>/gi, '')
  s = decodeEntities(s)
  // 泛型文本（Promise<string> 等）解码出的裸尖括号会被 Vue 模板编译器当成
  // 未闭合标签，转义回实体；反引号代码 span 内的内容 markdown-it 会自行
  // 转义，跳过（占位符保护后统一还原）
  s = s.replace(/`[^`]*`/g, (m) => m.replace(/</g, '\u0000').replace(/>/g, '\u0001'))
  s = s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  s = s.replace(/\u0000/g, '<').replace(/\u0001/g, '>')
  // CommonMark 强调边界：** 内侧紧贴空格会失效，把空格挤到外侧；再收敛空白
  s = s.replace(/\*\* +/g, '** ').replace(/ +\*\*/g, ' **')
  s = s.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n')
  return s.trim()
}

/** 表格单元格用：压成单行并转义竖线 */
function cellText(html, ctx) {
  return inline(html, ctx).replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|').trim() || ' '
}

/* ---------------- 块级解析 ---------------- */

/** 结构性包裹标签（main/footer 等）：本身无语义，内容按顶层块展开 */
const TRANSPARENT_TAGS = new Set(['main', 'footer', 'article', 'section', 'aside', 'header'])
/** 行内标签：出现在文本流里不构成块边界（连同其开闭标签一起并入文本 run） */
const INLINE_TAGS = new Set([
  'a', 'strong', 'b', 'em', 'i', 'code', 'span', 'u', 'mark', 'small',
  'sub', 'sup', 'font', 'abbr', 'del', 's', 'br', 'img',
])
/** 自闭合标签（不参与配对） */
const VOID_TAGS = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'source'])

/** 从 from 起找下一个「块级」标签的下标：行内标签的开/闭形式都跳过 */
function nextBlockBoundary(html, from) {
  let j = from
  for (;;) {
    const lt = html.indexOf('<', j)
    if (lt === -1) return -1
    if (html.startsWith('<!--', lt)) {
      const e = html.indexOf('-->', lt)
      j = e === -1 ? html.length : e + 3
      continue
    }
    const m = /^<(\/?)([a-zA-Z][\w-]*)/.exec(html.slice(lt, lt + 40))
    if (m && INLINE_TAGS.has(m[2].toLowerCase())) {
      j = lt + 1
      continue
    }
    return lt
  }
}

/**
 * 在 html（以 <tag ...> 开头）中找配对闭合标签的结束下标（含 </tag>）。
 * 同名标签嵌套计数；p/h 等不可嵌套标签计数自然为 1。
 */
function matchBlockEnd(html, tag) {
  const openRe = new RegExp(`<${tag}(?=[\\s>])[^>]*>`, 'gi')
  const closeRe = new RegExp(`</${tag}\\s*>`, 'gi')
  let depth = 0
  let pos = 0
  for (;;) {
    openRe.lastIndex = pos
    closeRe.lastIndex = pos
    const o = openRe.exec(html)
    const c = closeRe.exec(html)
    if (o && (!c || o.index < c.index)) {
      depth++
      pos = o.index + o[0].length
    } else if (c) {
      depth--
      pos = c.index + c[0].length
      if (depth === 0) return pos
    } else {
      return -1
    }
  }
}

/**
 * 顶层块切分：产出 { tag, openTag, inner, raw }。
 * 块级标签按配对切；行内标签（含开/闭形式）与裸文本合成一个 #text run；
 * 注释跳过；块级位置的自闭合标签（hr 等）无语义丢弃。
 */
function* iterBlocks(html) {
  let i = 0
  const n = html.length
  while (i < n) {
    if (/\s/.test(html[i])) { i++; continue }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i)
      i = end === -1 ? n : end + 3
      continue
    }
    const m = html[i] === '<' ? /^<([a-zA-Z][\w-]*)/.exec(html.slice(i, i + 40)) : null
    const isBlockEl = m && !INLINE_TAGS.has(m[1].toLowerCase())
    if (isBlockEl) {
      const tag = m[1].toLowerCase()
      if (VOID_TAGS.has(tag)) {
        const j = html.indexOf('>', i)
        yield { tag: '#text', raw: '' } // 块级位置的 hr/meta 等无内容语义
        i = j === -1 ? n : j + 1
        continue
      }
      const rest = html.slice(i)
      const end = matchBlockEnd(rest, tag)
      if (end === -1) {
        yield { tag: '#unknown', raw: rest } // 未闭合：整段兜底
        i = n
        continue
      }
      const raw = rest.slice(0, end)
      yield {
        tag,
        openTag: raw.match(/^<[^>]*>/)[0],
        inner: raw.slice(raw.indexOf('>') + 1, raw.length - `</${tag}>`.length),
        raw,
      }
      i += end
      continue
    }
    // 文本流（含行内标签）直到下一个块级标签
    const boundary = nextBlockBoundary(html, i + 1)
    const end = boundary === -1 ? n : boundary
    const raw = html.slice(i, end)
    if (raw.trim()) yield { tag: '#text', raw }
    i = end
  }
}

/* ---------------- 块级转换 ---------------- */

function headingToMarkdown(tag, inner, ctx) {
  const level = Number(tag[1])
  return `${'#'.repeat(level)} ${inline(inner, ctx)}`
}

function paraToMarkdown(inner, ctx) {
  return inline(inner, ctx)
}

function listToMarkdown(html, ctx, ordered) {
  // 拆顶层 li：逐个用配对查找（li 可含嵌套 ul/ol）
  const items = []
  const re = /<li(?=[\s>])[^>]*>/gi
  let m
  while ((m = re.exec(html))) {
    const end = matchBlockEnd(html.slice(m.index), 'li')
    if (end === -1) break
    items.push(html.slice(m.index, m.index + end))
    re.lastIndex = m.index + end
  }
  const out = []
  let no = 0
  for (const item of items) {
    no++
    const innerEnd = matchBlockEnd(item, 'li')
    const inner = item.slice(item.indexOf('>') + 1, innerEnd - '</li>'.length)
    // li 内嵌套列表：拆出首个顶层 ul/ol，头段行内转换，尾段降一层缩进递归
    const nested = inner.match(/<(ul|ol)\b/)
    let head = inner
    let tail = ''
    if (nested) {
      const idx = nested.index
      head = inner.slice(0, idx)
      tail = inner.slice(idx)
    }
    const marker = ordered ? `${no}. ` : '- '
    const headMd = inline(head, ctx)
    out.push(`${marker}${headMd}`)
    if (tail) {
      const isOl = /^<ol\b/i.test(tail.trim())
      const tailEnd = matchBlockEnd(tail, isOl ? 'ol' : 'ul')
      const tailInner = tail.slice(0, tailEnd === -1 ? tail.length : tailEnd)
      const nestedMd = listToMarkdown(tailInner, ctx, isOl)
      out.push(nestedMd.split('\n').map((l) => (l ? `  ${l}` : '')).join('\n'))
    }
  }
  return out.join('\n')
}

function tableToMarkdown(html, ctx) {
  const rows = [...html.matchAll(/<tr(?=[\s>])[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((r) => [...r[1].matchAll(/<t[hd](?=[\s>])[^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map((c) => cellText(c[1], ctx)))
  if (!rows.length) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const norm = rows.map((r) => {
    const cells = [...r]
    while (cells.length < width) cells.push(' ')
    return cells
  })
  const [head, ...body] = norm
  const sep = `| ${Array(width).fill('---').join(' | ')} |`
  return [
    `| ${head.join(' | ')} |`,
    sep,
    ...body.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n')
}

function preToMarkdown(html) {
  const inner = html.match(/^<pre[^>]*>([\s\S]*?)<\/pre>$/i)?.[1] ?? ''
  const code = decodeEntities(inner).replace(/\n+$/, '')
  // 内容含反引号串时加长围栏，避免提前闭合
  const runs = code.match(/`+/g) || []
  const fence = '`'.repeat(Math.max(3, ...runs.map((r) => r.length + 1), 3))
  return `${fence}\n${code}\n${fence}`
}

function blockquoteToMarkdown(inner, ctx) {
  return inline(inner, ctx).split('\n').map((l) => `> ${l}`.trimEnd()).join('\n')
}

/** 容器包装（只允许 VuePress 核心容器名，见文件头注释） */
function container(name, title, contentMd) {
  return `::: ${name}${title ? ` ${title}` : ''}\n\n${contentMd.trim()}\n\n:::`
}

/**
 * 随堂测 → 题干 + 字母选项 + 折叠答案。
 * 兼容五门课的选项布局与答案标记：
 * - a-shares：div[data-answer=索引][data-explain] + ul.opts>li
 * - pi-agent：div[data-answer=字母] + div.options>button.option[data-key]
 * - engineering-skills：div[data-answer=大写字母] + label>input[radio][value]
 *   （解析在页尾 script 的 explanations 对象里，按 radio name + 字母提取）
 * - english：ul.quiz-options[data-answer=索引][data-explain] + li[data-idx]，
 *   题干前的 h4「第 N 题」并入题干
 * - policy：li onclick=checkAnswer(this,true|false) 里 true 标记正确项，
 *   选项文本自带「A. 」前缀
 */
function quizToMarkdown(openTag, inner, ctx) {
  const letterOf = (i) => String.fromCharCode(65 + i)

  // 答案/解析属性可能在 quiz div 或 options 容器（english）上
  const answerAttr = (openTag.match(/data-answer="([^"]*)"/)?.[1]
    || inner.match(/<ul[^>]*class="[^"]*quiz-options[^"]*"[^>]*data-answer="([^"]*)"/)?.[1]
    || '').trim()
  let explain = escapeAngle(decodeEntities(openTag.match(/data-explain="([^"]*)"/)?.[1]
    || inner.match(/<ul[^>]*class="[^"]*quiz-options[^"]*"[^>]*data-explain="([^"]*)"/)?.[1]
    || ''))

  // 题干：p.q / p.quiz-question / div.quiz-question /（english）无 class 的 p
  let qHtml = inner.match(/<p class="q">([\s\S]*?)<\/p>/)?.[1]
    || inner.match(/<(?:p|div) class="quiz-question"[^>]*>([\s\S]*?)<\/(?:p|div)>/)?.[1]
  const h4 = inner.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)
  if (!qHtml) {
    const plainP = inner.match(/<p>([\s\S]*?)<\/p>/)
    if (plainP) qHtml = plainP[1]
  }

  // 选项：三种布局依次探测，产出 { key, text, correct }
  const opts = []
  const liMatches = [...inner.matchAll(/<li(?=[\s>])[^>]*>([\s\S]*?)<\/li>/gi)]
  const liRaw = [...inner.matchAll(/<li(?=[\s>])[^>]*>/gi)]
  if (inner.includes('class="option"')) {
    // pi-agent：button.option[data-key]
    for (const m of inner.matchAll(/<button class="option" data-key="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi)) {
      opts.push({ key: m[1].toUpperCase(), text: inline(m[2], ctx).trim(), correct: false })
    }
  } else if (/<label>/.test(inner)) {
    // engineering-skills：label > input[radio][value] + 文本
    for (const m of inner.matchAll(/<label><input[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/label>/gi)) {
      opts.push({ key: m[1].toUpperCase(), text: inline(m[2], ctx).trim(), correct: false })
    }
  } else if (liMatches.length) {
    // a-shares / english / policy：li 选项
    liMatches.forEach((m, i) => {
      let text = inline(m[1], ctx).trim()
      const raw = liRaw[i]?.[0] ?? ''
      const correct = /,\s*true\b/.test(raw) // policy：onclick 的 true 标记
      let key = null
      const prefixed = text.match(/^([A-Za-z])[.、)]\s*(.*)/)
      if (prefixed) { key = prefixed[1].toUpperCase(); text = prefixed[2] } // policy 自带前缀
      opts.push({ key, text, correct })
    })
  }

  // 答案索引解析：数字 → 位置；字母 → 匹配 key 或位置；都没有 → correct 标记
  let answerIdx = -1
  if (/^\d+$/.test(answerAttr)) {
    answerIdx = Number(answerAttr)
  } else if (/^[a-zA-Z]$/.test(answerAttr)) {
    const want = answerAttr.toUpperCase()
    answerIdx = opts.findIndex((o) => o.key === want)
    if (answerIdx === -1) answerIdx = want.charCodeAt(0) - 65
  } else if (opts.some((o) => o.correct)) {
    answerIdx = opts.findIndex((o) => o.correct)
  }

  // 解析兜底：engineering-skills 页尾 script 的 explanations[ratioName][字母]
  if (!explain) {
    const radioName = inner.match(/<input[^>]*name="([^"]*)"/)?.[1]
    const key = answerIdx >= 0 ? (opts[answerIdx].key ?? letterOf(answerIdx)) : null
    explain = radioName && key ? (ctx.explanations?.[radioName]?.[key] ?? '') : ''
  }

  const qText = (h4 ? `${stripTags(h4[1])}：` : '') + (qHtml ? inline(qHtml, ctx) : '')
  // 模板族不匹配（缺题干或选项）：整块原样保留，不丢内容
  if (!qText.trim() || !opts.length) {
    ctx.onWarn('[lesson-convert] quiz 块模板不匹配（缺题干或选项），原样保留 HTML')
    return inner.trim()
  }
  const hasAnswer = answerIdx >= 0 && answerIdx < opts.length
  const parts = []
  parts.push(`**${qText.replace(/\*/g, '').trim()}**`)
  parts.push(opts.map((o, i) => `- ${letterOf(i)}. ${o.text}`).join('\n'))
  const ansOpt = hasAnswer ? `（${escapeAngle(opts[answerIdx].text.replace(/[*`]/g, ''))}）` : ''
  parts.push(container('details', '点开核对答案',
    hasAnswer
      ? `**答案：${letterOf(answerIdx)}${ansOpt}**${explain ? ` —— ${explain}` : ''}`
      : `**答案：见交互版讲义**${explain ? ` —— ${explain}` : ''}`))
  return parts.join('\n\n')
}

/** 语义 div → plume 容器 / 元信息收集 / nav 收集 */
function divToMarkdown(openTag, inner, ctx, state) {
  const classes = (openTag.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean)
  const has = (c) => classes.includes(c)

  if (has('lesson-meta')) {
    const spans = [...inner.matchAll(/<span>([\s\S]*?)<\/span>/g)]
      .map((m) => stripTags(m[1])).filter(Boolean)
    state.metaLine = escapeAngle(spans.length ? spans.join(' ｜ ') : stripTags(inner))
      .replace(/\s\|\s/g, ' ｜ ')
    return ''
  }
  if (has('nav')) {
    const links = [...inner.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => ({ text: stripTags(m[2]), url: rewriteUrl(m[1], ctx) }))
    for (const l of links) {
      // 箭头可能写在锚点外（policy：`→ <a>下一课…</a>`），按符号或文字前缀双重识别
      const isNext = l.text.includes('→') || /^(下一课|下一节)/.test(l.text)
      const isPrev = l.text.includes('←') || /^(上一课|上一节|返回)/.test(l.text)
      if (isPrev && !isNext) state.nav.prev = l
      else if (isNext) state.nav.next = l
      else state.nav.middle.push(l)
    }
    return ''
  }
  if (has('quiz')) return quizToMarkdown(openTag, inner, ctx)
  if (has('recall')) {
    // pi-agent 温故/回忆挑战：题干 + 显示答案（reveal 按钮与自评按钮丢弃）
    const q = inner.match(/<p class="q">([\s\S]*?)<\/p>/)?.[1] ?? ''
    const answerHtml = inner.match(/<div class="answer"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''
    if (!q || !answerHtml.trim()) {
      ctx.onWarn('[lesson-convert] recall 块缺少题干/答案，原样保留 HTML')
      return inner.trim()
    }
    return [
      `**${inline(q, ctx)}**`,
      container('details', '显示答案', convertInner(answerHtml, ctx, state)),
    ].join('\n\n')
  }
  if (has('compare')) {
    // policy 对比框：❌ 错误理解 → danger，✅ 正确理解 → tip
    const parts = []
    for (const m of inner.matchAll(/<div class="compare-item[^"]*"/gi)) {
      const end = matchBlockEnd(inner.slice(m.index), 'div')
      if (end === -1) continue
      const raw = inner.slice(m.index, m.index + end)
      const itemInner = raw.slice(raw.indexOf('>') + 1, raw.length - '</div>'.length)
      const name = /compare-wrong/.test(m[0]) ? 'danger' : /compare-right/.test(m[0]) ? 'tip' : 'info'
      parts.push(container(name, '', convertInner(itemInner, ctx, state)))
    }
    return parts.join('\n\n') || convertInner(inner, ctx, state)
  }
  if (has('step')) {
    // engineering-skills 步骤条：step-number + step-body → 加粗编号段落
    const num = stripTags(inner.match(/<div class="step-number">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const bodyHtml = inner.match(/<div class="step-body">([\s\S]*?)<\/div>/)?.[1]
      ?? inner.replace(/<div class="step-number">[\s\S]*?<\/div>/, '')
    const body = convertInner(bodyHtml, ctx, state)
    return num ? `**${num}.** ${body}` : body
  }
  if (has('timeline')) return convertInner(inner, ctx, state)
  if (has('timeline-item')) {
    // policy 时间线项：年份加粗 + 事件说明
    const year = stripTags(inner.match(/<span class="timeline-year">([\s\S]*?)<\/span>/)?.[1] ?? '')
    const rest = inner.replace(/<span class="timeline-year">[\s\S]*?<\/span>/, '')
    const desc = convertInner(rest, ctx, state).replace(/\n+/g, ' ')
    return year ? `**${year}** —— ${desc}` : desc
  }
  if (has('mnemonic')) {
    // policy 口诀：剥掉开头的「本课口诀：」加粗标签避免与容器标题重复
    const md = convertInner(inner, ctx, state).replace(/^\*\*?本课口诀[：:]\*\*?\s*/, '')
    return container('tip', '记忆口诀', md)
  }
  if (has('callout')) {
    // pi-agent（span.label）/ engineering-skills（div.callout-title）
    let title = stripTags(inner.match(/<span class="label">([\s\S]*?)<\/span>/)?.[1] ?? '')
    if (!title) title = stripTags(inner.match(/<div class="callout-title">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const rest = inner
      .replace(/<span class="label">[\s\S]*?<\/span>/, '')
      .replace(/<div class="callout-title">[\s\S]*?<\/div>/, '')
    return container('info', title, convertInner(rest, ctx, state))
  }
  if (classes[0] === 'card') {
    // english / policy 卡片：变体映射容器色，内嵌 h3 作容器标题
    const variant = (classes[1] ?? '').replace(/^card-/, '')
    const name = { info: 'info', success: 'tip', warning: 'warning', error: 'danger', key: 'info', tip: 'tip' }[variant] ?? 'info'
    const h3 = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
    const rest = h3 ? inner.replace(h3[0], '') : inner
    return container(name, h3 ? inline(h3[1], ctx) : '', convertInner(rest, ctx, state))
  }
  if (has('further')) return convertInner(inner, ctx, state) // pi-agent 延伸阅读+课程导航：按普通内容展开
  if (has('container')) return convertInner(inner, ctx, state) // policy 页面包裹层
  // win/mission-tie 正文以「容器同义前缀：」开头，去掉避免与容器标题重复
  if (has('win')) {
    const md = convertInner(inner, ctx, state).replace(/^学完你能[：:]\s*/, '')
    return container('tip', '学完你能', md)
  }
  if (has('mission-tie')) {
    const md = convertInner(inner, ctx, state).replace(/^与考核的关系[：:]\s*/, '')
    return container('info', '与考核的关系', md)
  }
  if (has('example')) {
    let tagTitle = ''
    const rest = inner.replace(/<span class="tag">([\s\S]*?)<\/span>/, (m, t) => {
      tagTitle = inline(t, ctx)
      return ''
    })
    return container('tip', tagTitle || '算例', convertInner(rest, ctx, state))
  }
  if (has('task')) {
    const h3 = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
    const rest = h3 ? inner.replace(h3[0], '') : inner
    return container('warning', h3 ? inline(h3[1], ctx) : '动手环节', convertInner(rest, ctx, state))
  }
  if (has('feynman')) {
    const h3 = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)
    const topic = escapeAngle(decodeEntities(openTag.match(/data-topic="([^"]*)"/)?.[1] ?? ''))
    return container('info', h3 ? inline(h3[1], ctx) : '费曼自测', topic)
  }
  if (has('teacher-note')) return container('info', '老师的话', convertInner(inner, ctx, state))
  if (has('src')) return convertInner(inner, ctx, state) // 推荐来源：普通列表/段落即可

  ctx.onWarn(`[lesson-convert] 未识别的块（按内容展开）：class="${classes.join(' ')}"`)
  return inner.trim() ? convertInner(inner, ctx, state).trim() : ''
}

/** 容器内部递归转换：块序列 → Markdown 段落序列 */
function convertInner(html, ctx, state) {
  const out = []
  for (const b of iterBlocks(html)) {
    const md = blockToMarkdown(b, ctx, state)
    if (md && md.trim()) out.push(md.trim())
  }
  return out.join('\n\n')
}

function blockToMarkdown(b, ctx, state) {
  // 结构性包裹标签（main/footer 等）：内容按顶层块展开
  if (TRANSPARENT_TAGS.has(b.tag)) return convertInner(b.inner, ctx, state)
  switch (b.tag) {
    case '#text': {
      const t = inline(b.raw, ctx)
      return t
    }
    case 'div':
      return divToMarkdown(b.openTag, b.inner, ctx, state)
    case 'h1': {
      const text = inline(b.inner, ctx)
      if (!state.headline) {
        state.headline = text // 主标题由调用方以 # 输出（页面标题来自 frontmatter title）
        return ''
      }
      return `# ${text}` // 正文中间再出现 h1（未见过的模板变化）按原层级保留
    }
    case 'h2':
    case 'h3':
    case 'h4':
      return headingToMarkdown(b.tag, b.inner, ctx)
    case 'p': {
      const pClass = b.openTag.match(/class="([^"]*)"/)?.[1] ?? ''
      if (pClass.includes('teacher-note')) {
        return container('info', '老师的话', inline(b.inner, ctx))
      }
      if (pClass.includes('subtitle')) {
        if (!state.metaLine) state.metaLine = inline(b.inner, ctx).replace(/\s\|\s/g, ' ｜ ')
        return ''
      }
      return paraToMarkdown(b.inner, ctx)
    }
    case 'table':
      return tableToMarkdown(b.inner, ctx)
    case 'ul':
      return listToMarkdown(b.inner, ctx, false)
    case 'ol':
      return listToMarkdown(b.inner, ctx, true)
    case 'pre':
      return preToMarkdown(b.raw)
    case 'blockquote':
      return blockquoteToMarkdown(b.inner, ctx)
    default:
      ctx.onWarn(`[lesson-convert] 未识别的标签（原样保留 HTML）：<${b.tag}>`)
      return b.raw
  }
}

/**
 * 提取 engineering-skills 页尾 script 里的题目解析对象：
 * const explanations = { q1: { A: "…", C: "正确。…" }, … }
 * key 为 radio name，值为 字母 → 解析文本。
 */
export function parseExplanations(html) {
  const out = {}
  for (const sm of html.matchAll(/explanations\s*=\s*\{([\s\S]*?)\}\s*;/g)) {
    for (const qm of sm[1].matchAll(/([A-Za-z0-9_-]+)\s*:\s*\{([^{}]*)\}/g)) {
      const map = {}
      // 字母键在源码里不带引号：q1: { A: "…", C: "…" }
      for (const em of qm[2].matchAll(/(?<![A-Za-z0-9])([A-Za-z])\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
        map[em[1].toUpperCase()] = escapeAngle(decodeEntities(em[2].replace(/\\"/g, '"')))
      }
      if (Object.keys(map).length) out[qm[1]] = map
    }
  }
  return out
}

/* ---------------- 顶层入口 ---------------- */

/**
 * 讲义 HTML → Markdown。
 * @param {string} html 讲义全文
 * @param {{ slug?: string, onWarn?: (msg: string) => void }} ctx
 *   slug：课程 slug（相邻课互链与镜像相对链接重写依赖它）
 * @returns {{
 *   headline: string,          // h1 主标题（讲义 headline，非 <title> 的课号名）
 *   metaLine: string,          // lesson-meta / subtitle 拼接行（模块｜周课｜时长等）
 *   body: string,              // 正文 Markdown（不含 headline 与 meta，nav 已剥离）
 *   nav: { prev: {text,url}|null, middle: {text,url}[], next: {text,url}|null },
 * }}
 */
export function lessonHtmlToMarkdown(html, ctx = {}) {
  const c = {
    slug: ctx.slug ?? '',
    onWarn: ctx.onWarn ?? (() => {}),
    explanations: parseExplanations(html),
  }
  const state = { headline: '', metaLine: '', nav: { prev: null, middle: [], next: null } }

  const bodyHtml = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html)
    .replace(/\r\n?/g, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')

  const out = []
  for (const b of iterBlocks(bodyHtml)) {
    const md = blockToMarkdown(b, c, state)
    if (md && md.trim()) out.push(md.trim())
  }

  return {
    headline: state.headline,
    metaLine: state.metaLine,
    body: out.join('\n\n').trim(),
    nav: state.nav,
  }
}
