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
  const sibling = url.match(/^(?:\.\/|\.\.\/lessons\/)?([^/?#]+)\.html([?#].*)?$/)
  if (sibling) {
    const [, name, suffix = ''] = sibling
    const mapped = ctx.lessonUrls?.get(name)
    if (mapped) return mapped + suffix
    const numeric = name.match(/^(\d{4})-/)
    if (numeric && !ctx.lessonUrls) return `/courses/${ctx.slug}/l/${Number(numeric[1])}/${suffix}`
    if (ctx.lessonNames?.has(name)) return `/courses/${ctx.slug}/l/${name}/${suffix}`
    return withBase(`/lessons/${ctx.slug}/lessons/${name}.html${suffix}`)
  }
  const up = url.match(/^\.\.\/(.+)$/)
  if (up) return withBase(`/lessons/${ctx.slug}/${up[1]}`)
  // 同目录课件互链（专升本四科）：非纯数字文件名（mzt01.html）且属于本课
  // 站内全文集 → l/<名>/；否则（刷题场等功能页）→ 镜像交互页
  const sib = url.match(/^\.?\/?([^/]+\.html)$/)
  if (sib) {
    const name = sib[1].replace(/\.html$/, '')
    if (ctx.lessonNames?.has(name)) return `/courses/${ctx.slug}/l/${name}/`
    return withBase(`/lessons/${ctx.slug}/lessons/${sib[1]}`)
  }
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
  // 交互控件（标记完成按钮等）与页码溯源/课号徽标（专升本政治 cite、高数 lesson-no/crumb）：
  // 纯静态全文版用不上，整元素丢弃
  s = s.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, '')
  s = s.replace(/<span class="(?:cite|lesson-no|crumb)"[^>]*>[\s\S]*?<\/span>/gi, '')
  s = s.replace(/<a\b[^>]*href=(["'])(?:obsidian:|file:|[a-z]:[\\/]).*?\1[^>]*>([\s\S]*?)<\/a>/gi, (_, quote, text) => text)
  // 指向未镜像源层（笔记 .md / 原始 PDF，可带 #锚点）的链接：保留文本去掉跳转（点了就是 404）
  s = s.replace(/<a\b[^>]*href="[^"]*\.(?:md|pdf)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/gi, (_, t) => t)
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
  // 未闭合标签，转义回实体；反引号代码 span 与 $...$ 数学 span（\ge、< 等
  // 关系符）不经实体转义——转了 katex 就渲染不出——占位符保护后统一还原
  s = s.replace(/`[^`]*`/g, (m) => m.replace(/</g, '\u0000').replace(/>/g, '\u0001'))
  s = s.replace(/\$[^$\n]+?\$/g, (m) => m.replace(/</g, '\u0000').replace(/>/g, '\u0001'))
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
const TRANSPARENT_TAGS = new Set(['main', 'footer', 'article', 'section', 'aside', 'header', 'nav'])
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
      let end = matchBlockEnd(rest, tag)
      if (end === -1 && (tag === 'p' || tag === 'li' || tag === 'summary')) {
        // HTML 允许这些标签省略闭合（下一块级开标签自动收口）：取到下一个块级边界
        const b = nextBlockBoundary(rest, rest.match(/^<[^>]*>/)[0].length)
        end = b === -1 ? rest.length : b
      }
      if (end === -1) {
        yield { tag: '#unknown', raw: rest } // 真未闭合：整段兜底
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
  // Expand merged cells into a rectangular table, retaining each cell's column meaning.
  const rows = []
  const sourceRows = [...html.matchAll(/<tr(?=[\s>])[^>]*>([\s\S]*?)<\/tr>/gi)]
  sourceRows.forEach((sourceRow, rowIndex) => {
    const row = rows[rowIndex] ?? (rows[rowIndex] = [])
    let column = 0
    for (const cell of sourceRow[1].matchAll(/<t[hd]((?=[\s>])[^>]*)>([\s\S]*?)<\/t[hd]>/gi)) {
      while (row[column] !== undefined) column++
      const span = (name, limit) => {
        const value = Number(cell[1].match(new RegExp(`\\b${name}\\s*=\\s*["']?(\\d+)`, 'i'))?.[1] ?? 1)
        return Math.min(limit, Math.max(1, value))
      }
      const height = span('rowspan', sourceRows.length - rowIndex)
      const width = span('colspan', 100)
      const text = cellText(cell[2], ctx)
      for (let r = rowIndex; r < rowIndex + height; r++) {
        rows[r] ??= []
        for (let c = column; c < column + width; c++) rows[r][c] = text
      }
      column += width
    }
  })
  if (!rows.length) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const norm = rows.map((r) => {
    const cells = Array.from(r, (cell) => cell ?? ' ')
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
  // An outer callout needs a longer fence than nested details, or its closing marker leaks into the page.
  const innerFences = [...contentMd.matchAll(/^(:{3,})/gm)].map(match => match[1].length)
  const fence = ':'.repeat(Math.max(3, ...innerFences.map(length => length + 1)))
  return `${fence} ${name}${title ? ` ${title}` : ''}\n\n${contentMd.trim()}\n\n${fence}`
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

  // 题干：p.q / p.quiz-question / div.quiz-question /（专升本）p.quiz-q /（english）无 class 的 p
  let qHtml = inner.match(/<p class="q">([\s\S]*?)<\/p>/)?.[1]
    || inner.match(/<(?:p|div) class="quiz-question"[^>]*>([\s\S]*?)<\/(?:p|div)>/)?.[1]
    || inner.match(/<p class="quiz-q"[^>]*>([\s\S]*?)<\/p>/)?.[1]
  const h4 = inner.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)
  if (!qHtml) {
    const plainP = inner.match(/<p>([\s\S]*?)<\/p>/)
    if (plainP) qHtml = plainP[1]
  }
  // 题号徽标（专升本高数：随堂测 N）
  const quizNo = stripTags(inner.match(/<span class="quiz-no">([\s\S]*?)<\/span>/)?.[1] ?? '')

  // 选项：多种布局依次探测，产出 { key, text, correct }
  const opts = []
  const liMatches = [...inner.matchAll(/<li(?=[\s>])[^>]*>([\s\S]*?)<\/li>/gi)]
  const liRaw = [...inner.matchAll(/<li(?=[\s>])[^>]*>/gi)]
  if (/<button[^>]*data-k=/.test(inner)) {
    // 专升本高数：div.quiz-opts > button[data-k=字母]
    for (const m of inner.matchAll(/<button[^>]*data-k="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi)) {
      opts.push({ key: m[1].trim().toUpperCase(), text: inline(m[2], ctx).trim(), correct: false })
    }
  } else if (/data-opt=/.test(inner)) {
    // 专升本计算机：ol.quiz-opts > li[data-opt=字母]
    for (const m of inner.matchAll(/<li[^>]*data-opt="([^"]*)"[^>]*>([\s\S]*?)<\/li>/gi)) {
      opts.push({ key: m[1].trim().toUpperCase(), text: inline(m[2], ctx).trim(), correct: false })
    }
  } else if (inner.includes('class="option"')) {
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
      const prefixed = text.match(/^([A-Za-z])[.、)]\s*([\s\S]*)/)
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

  // 解析兜底：engineering-skills 页尾 script 的 explanations[ratioName][字母]；
  // 专升本四科在块内自带 quiz-exp / quiz-expl / quiz-verdict（verdict 常为空容器）
  if (!explain) {
    explain = escapeAngle(decodeEntities(
      inner.match(/<div class="quiz-exp"[^>]*>([\s\S]*?)<\/div>/)?.[1]
      || inner.match(/<p class="quiz-expl"[^>]*>([\s\S]*?)<\/p>/)?.[1]
      || inner.match(/<div class="quiz-verdict"[^>]*>([\s\S]*?)<\/div>/)?.[1]
      || '',
    )).replace(/\s+/g, ' ').trim()
  }
  if (!explain) {
    const radioName = inner.match(/<input[^>]*name="([^"]*)"/)?.[1]
    const key = answerIdx >= 0 ? (opts[answerIdx].key ?? letterOf(answerIdx)) : null
    explain = radioName && key ? (ctx.explanations?.[radioName]?.[key] ?? '') : ''
  }

  const qText = (h4 ? `${stripTags(h4[1])}：` : '') + (quizNo ? `${quizNo}：` : '') + (qHtml ? inline(qHtml, ctx) : '')
  // 模板族不匹配（缺题干或选项）：整块原样保留，不丢内容
  if (!qText.trim() || !opts.length) {
    ctx.onWarn('[lesson-convert] quiz 块模板不匹配（缺题干或选项），原样保留 HTML')
    return inner.trim()
  }
  const hasAnswer = answerIdx >= 0 && answerIdx < opts.length
  const parts = []
  parts.push(`**${qText.replace(/\*/g, '').trim()}**`)
  parts.push(opts.map((o, i) => `- ${letterOf(i)}. ${o.text.replace(/\n/g, '<br>')}`).join('\n'))
  const ansOpt = hasAnswer ? `（${escapeAngle(opts[answerIdx].text.replace(/[*`]/g, '')).replace(/\n/g, '<br>')}）` : ''
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

  if (has('lesson-meta') || has('meta') || has('meta-row')) {
    // 专升本高数/政治的 meta、meta-row 与 learn 的 lesson-meta 同构：span 拼元信息行
    const spans = [...inner.matchAll(/<span(?:\s[^>]*)?>([\s\S]*?)<\/span>/g)]
      .map((m) => stripTags(m[1])).filter(Boolean)
    state.metaLine = escapeAngle(spans.length ? spans.join(' ｜ ') : stripTags(inner))
      .replace(/\s\|\s/g, ' ｜ ')
    return ''
  }
  if (has('nav') || /nav$/.test(classes[0] ?? '')) {
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
    // pi-agent（p.q + div.answer）/ 专升本高数（recall-tag + p.recall-q + div.recall-a）
    const q = inner.match(/<p class="q">([\s\S]*?)<\/p>/)?.[1]
      ?? inner.match(/<p class="recall-q"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? ''
    const answerHtml = inner.match(/<div class="answer"[^>]*>([\s\S]*?)<\/div>/)?.[1]
      ?? inner.match(/<div class="recall-a"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? ''
    if (!q || !answerHtml.trim()) {
      ctx.onWarn('[lesson-convert] recall 块缺少题干/答案，原样保留 HTML')
      return inner.trim()
    }
    const label = stripTags(inner.match(/<span class="recall-tag"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '')
    // 高数回忆卡（有 recall-tag）用回忆式标题；pi-agent 沿用「显示答案」
    const revealTitle = label ? '先回忆，再揭晓' : '显示答案'
    return [
      `**${label ? `${label}：` : ''}${inline(q, ctx)}**`,
      container('details', revealTitle, convertInner(answerHtml, ctx, state)),
    ].join('\n\n')
  }
  if (has('map')) {
    // 专升本英语考点地图：span.cap 作标题
    const cap = stripTags(inner.match(/<span class="cap"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '')
    const rest = inner.replace(/<span class="cap"[^>]*>[\s\S]*?<\/span>/, '')
    return container('info', cap || '考点地图', convertInner(rest, ctx, state))
  }
  if (has('warn')) {
    // 专升本高数易错框：warn-title 作标题
    const t = stripTags(inner.match(/<div class="warn-title">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const rest = inner.replace(/<div class="warn-title">[\s\S]*?<\/div>/, '')
    return container('danger', t || '易错', convertInner(rest, ctx, state))
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
  if (has('goal')) {
    // 专升本高数学习目标：goal-title 子块作容器标题
    const titleDiv = inner.match(/<div class="goal-title">([\s\S]*?)<\/div>/)
    const title = titleDiv ? stripTags(titleDiv[1]) : '学习目标'
    const rest = titleDiv ? inner.replace(titleDiv[0], '') : inner
    const md = convertInner(rest, ctx, state).replace(/^(?:学完(?:本课)?(?:你)?(?:将能|能)[：:]?|本课目标[：:]?)\s*/, '')
    return container('tip', title || '学习目标', md)
  }
  if (has('goal-title')) return '' // 未被 goal 消费的孤立标题块（正常不会出现）
  if (has('keypoint')) {
    // 专升本高数易错考点框：kp-title 作标题
    const t = stripTags(inner.match(/<div class="kp-title">([\s\S]*?)<\/div>/)?.[1] ?? '')
    const rest = inner.replace(/<div class="kp-title">[\s\S]*?<\/div>/, '')
    return container('warning', t || '易错考点', convertInner(rest, ctx, state))
  }
  if (has('recall-a')) return convertInner(inner, ctx, state) // 专升本计算机回忆答案区
  if (has('wrap') || has('topbar') || has('topbar-inner') || has('crumbs')) {
    return convertInner(inner, ctx, state) // 专升本政治布局壳
  }
  if (has('sec')) return convertInner(inner, ctx, state) // 专升本政治小节包裹层
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
  if (has('kicker')) return '' // 专升本课程名徽标：与 h1/meta-row 重复
  if (has('gapnote')) {
    // 专升本政治课件缺口警示（如「真实课件缺失，已由相邻课覆盖」）：原样保留文字
    return container('warning', '', convertInner(inner, ctx, state))
  }
  if (has('spaced-review')) return convertInner(inner, ctx, state) // 专升本高数间隔复习壳
  if (has('passage')) return convertInner(inner, ctx, state) // 专升本英语题型文章段
  if (has('plot') || has('plot-row')) return convertInner(inner, ctx, state) // 专升本高数函数图像壳
  if (has('ansbody')) return convertInner(inner, ctx, state) // 专升本政治答案正文壳
  if (has('ans')) {
    // 专升本政治裸答案块（details 之外）：anslabel 作折叠标题
    const label = stripTags(inner.match(/<span class="anslabel"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '')
    const rest = inner.replace(/<span class="anslabel"[^>]*>[\s\S]*?<\/span>/, '')
    return container('details', label || '答案', convertInner(rest, ctx, state))
  }
  // 无类名裸 div / 纯布局壳（content、lesson-progress 等）：按透明容器展开
  if (classes.length === 0 || has('content') || has('lesson-progress')) {
    return inner.trim() ? convertInner(inner, ctx, state) : ''
  }

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
    case 'details': {
      // 专升本政治自测问答（details.qa）：summary = 题干（含 tag 徽标），.ans = 答案要点
      const summary = b.inner.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? ''
      const rest = b.inner.replace(/<summary[^>]*>[\s\S]*?<\/summary>/i, '')
      const title = stripTags(summary.replace(/<span class="tag"[^>]*>[\s\S]*?<\/span>/i, '')) || '自测'
      const body = convertInner(rest, ctx, state)
      return container('details', title, body.replace(/^(?:答案要点[：:]?|参考答案[：:]?)\s*/, ''))
    }
    case 'ul':
      return listToMarkdown(b.inner, ctx, false)
    case 'ol':
      return listToMarkdown(b.inner, ctx, true)
    case 'pre':
      return preToMarkdown(b.raw)
    case 'blockquote':
      return blockquoteToMarkdown(b.inner, ctx)
    case 'button':
      return '' // 块级位置的交互控件（揭晓/自评按钮）：纯静态版无意义
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

/** 解 JS 字符串字面量的常见转义（\uXXXX、\xXX、\n、\\、\' 等） */
function jsUnescape(s) {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g, (_, e) => {
    if (e[0] === 'u' || e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16))
    return { n: '\n', t: '\t', r: '\r' }[e] ?? e
  })
}

/**
 * 专升本英语：随堂测数据在页尾 script 的 Quiz.render('#quiz', [...]) 里
 * （q/opts/a/why 字段），script 随后会被剥掉——先把测验静态化成与其他
 * 模板族同构的 HTML（quiz-q + 选项 li + quiz-exp），再走通用 quiz 转换。
 */
function inlineScriptQuizzes(html) {
  if (!html.includes('Quiz.render(')) return html
  const source = html
  const calls = [...html.matchAll(/Quiz\.render\(\s*(['"])#([\w-]+)\1\s*,\s*(\[[\s\S]*?\])\s*\)/g)]
  if (!calls.length) throw new Error('无法提取 Quiz.render 测验，请检查源课程格式')
  for (const call of calls) {
    const items = []
    const itemRe = /\{\s*q:\s*'((?:[^'\\]|\\.)*)'\s*,\s*opts:\s*(\[[^\]]*\]|[\w$]+)\s*,\s*a:\s*(\d+)\s*,\s*why:\s*'((?:[^'\\]|\\.)*)'\s*\}/g
    for (const m of call[3].matchAll(itemRe)) {
      let options = m[2]
      // Matching passages share one literal option bank across several questions.
      if (!options.startsWith('[')) {
        const identifier = options.replace(/\$/g, '\\$')
        const declaration = new RegExp(`\\b(?:var|let|const)\\s+${identifier}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`, 'g')
        options = [...source.slice(0, call.index).matchAll(declaration)].at(-1)?.[1]
        if (!options) throw new Error(`#${call[2]} 无法提取共享选项 ${m[2]}`)
      }
      const opts = [...options.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
        .map((o) => jsUnescape(o[1] ?? o[2]))
      if (opts.length < 2 || Number(m[3]) >= opts.length) throw new Error(`#${call[2]} 测验选项或答案索引异常`)
      items.push({
        q: jsUnescape(m[1]),
        opts,
        a: Number(m[3]),
        why: jsUnescape(m[4]),
      })
    }
    const expected = (call[3].match(/\{\s*q:/g) ?? []).length
    if (!expected || items.length !== expected) throw new Error(`#${call[2]} 测验提取不完整：${items.length}/${expected}`)
    const staticHtml = items
      .map((it) => `<div class="quiz" data-answer="${it.a}"><p class="q">${it.q}</p><ul>${it.opts.map((o) => `<li>${o}</li>`).join('')}</ul><div class="quiz-exp">${it.why}</div></div>`)
      .join('\n')
    const target = new RegExp(`<div\\b[^>]*\\bid=(["'])${call[2]}\\1[^>]*>`, 'i')
    if (!target.test(html)) throw new Error(`缺少测验容器 #${call[2]}`)
    html = html.replace(target, (opening) => `${opening}\n${staticHtml}`)
  }
  return html
}

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
    lessonNames: ctx.lessonNames,
    lessonUrls: ctx.lessonUrls,
    onWarn: ctx.onWarn ?? (() => {}),
    explanations: parseExplanations(html),
  }
  const state = { headline: '', metaLine: '', nav: { prev: null, middle: [], next: null } }

  const prepared = inlineScriptQuizzes(html)
  const bodyHtml = (prepared.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? prepared)
    .replace(/\r\n?/g, '\n')
    // main 只是布局壳（专升本英语课件只开不闭），透明标签剥掉反而防未闭合吞全文
    .replace(/<\/?main\b[^>]*>/gi, '')
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
