/**
 * lesson-convert.mjs —— 讲义 HTML → Markdown 全文页转换器（方案 B：讲义转 MD）。
 *
 * 把 learn 仓库自家生成的讲义 HTML 结构性转成 Markdown，纳入 plume 主题体系
 * （统一外观、深色模式、TOC、全文搜索）；随堂测静态化为「折叠核对答案」，
 * 交互版仍走 public/lessons/ 的 HTML 镜像。
 *
 * 模板识别范围以 a-shares 一族为准（.lesson-meta/.win/.mission-tie/
 * .quiz[data-answer][data-explain]/.example/.task/.feynman/.teacher-note/.nav）。
 * 遇到不认识的块原样保留 HTML 并经 onWarn 提示——上游模板演进时最坏只是
 * 该块以原生 HTML 渲染，同步不会失败。
 *
 * 容器只用 VuePress 核心保证的集合（tip/info/warning/details），
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

/** 顶层已知块标签（可递归处理其内部） */
const KNOWN_BLOCK = new Set(['div', 'h1', 'h2', 'h3', 'h4', 'p', 'table', 'ul', 'ol', 'pre', 'blockquote'])
/** 自闭合标签（不参与配对） */
const VOID_TAGS = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'source'])

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
 * 认识的标签按配对切；注释跳过；其余（裸文本/未知标签）作为 raw 块吐出兜底。
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
    if (html[i] !== '<') {
      const j = html.indexOf('<', i)
      const end = j === -1 ? n : j
      yield { tag: '#text', raw: html.slice(i, end) }
      i = end
      continue
    }
    const m = /^<([a-zA-Z][\w-]*)/.exec(html.slice(i))
    if (!m) {
      const j = html.indexOf('<', i + 1)
      const end = j === -1 ? n : j
      yield { tag: '#text', raw: html.slice(i, end) }
      i = end
      continue
    }
    const tag = m[1].toLowerCase()
    if (VOID_TAGS.has(tag)) {
      const j = html.indexOf('>', i)
      yield { tag: '#text', raw: '' } // 块级位置的 br/img 无语义，丢弃
      i = j === -1 ? n : j + 1
      continue
    }
    const rest = html.slice(i)
    const end = matchBlockEnd(rest, tag)
    if (end === -1) {
      // 未闭合：整段作为兜底块
      yield { tag: '#unknown', raw: rest }
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

/** 随堂测 → 题干 + 字母选项 + 折叠答案（答案索引来自 data-answer） */
function quizToMarkdown(openTag, inner, ctx) {
  const answerIdx = Number(openTag.match(/data-answer="(\d+)"/)?.[1] ?? -1)
  const explain = decodeEntities(openTag.match(/data-explain="([^"]*)"/)?.[1] ?? '')
  const qHtml = inner.match(/<p class="q">([\s\S]*?)<\/p>/)?.[1] ?? ''
  const opts = [...inner.matchAll(/<li(?=[\s>])[^>]*>([\s\S]*?)<\/li>/gi)].map((x) => inline(x[1], ctx))
  const qText = inline(qHtml, ctx).replace(/\*/g, '')
  // 模板族不匹配（如 pi-agent 的 .option 结构没有 li/data-answer）：整块原样保留，不丢内容
  if (!qText || !opts.length) {
    ctx.onWarn('[lesson-convert] quiz 块模板不匹配（缺题干或选项非 li 结构），原样保留 HTML')
    return inner.trim()
  }
  const letter = (i) => String.fromCharCode(65 + i)
  const hasAnswer = answerIdx >= 0 && answerIdx < opts.length
  const ansOpt = hasAnswer ? `（${opts[answerIdx].replace(/[*`]/g, '')}）` : ''
  const parts = []
  if (qText) parts.push(`**${qText}**`)
  parts.push(opts.map((opt, i) => `- ${letter(i)}. ${opt}`).join('\n'))
  parts.push(container('details', '点开核对答案',
    hasAnswer
      ? `**答案：${letter(answerIdx)}${ansOpt}**${explain ? ` —— ${explain}` : ''}`
      : `**答案：见交互版讲义**${explain ? ` —— ${explain}` : ''}`))
  return parts.join('\n\n')
}

/** 语义 div → plume 容器 / 元信息收集 / nav 收集 */
function divToMarkdown(openTag, inner, ctx, state) {
  const classes = (openTag.match(/class="([^"]*)"/)?.[1] ?? '').split(/\s+/).filter(Boolean)
  const has = (c) => classes.includes(c)

  if (has('lesson-meta')) {
    state.metaLine = [...inner.matchAll(/<span>([\s\S]*?)<\/span>/g)]
      .map((m) => stripTags(m[1])).filter(Boolean).join(' ｜ ').replace(/\s\|\s/g, ' ｜ ')
    return ''
  }
  if (has('nav')) {
    const links = [...inner.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => ({ text: stripTags(m[2]), url: rewriteUrl(m[1], ctx) }))
    for (const l of links) {
      if (l.text.includes('←')) state.nav.prev = l
      else if (l.text.includes('→')) state.nav.next = l
      else state.nav.middle.push(l)
    }
    return ''
  }
  if (has('quiz')) return quizToMarkdown(openTag, inner, ctx)
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
    const topic = decodeEntities(openTag.match(/data-topic="([^"]*)"/)?.[1] ?? '')
    return container('info', h3 ? inline(h3[1], ctx) : '费曼自测', topic)
  }
  if (has('teacher-note')) return container('info', '老师的话', convertInner(inner, ctx, state))
  if (has('src')) return convertInner(inner, ctx, state) // 推荐来源：普通列表/段落即可

  ctx.onWarn(`[lesson-convert] 未识别的块（原样保留 HTML）：class="${classes.join(' ')}"`)
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
    case 'p':
      return paraToMarkdown(b.inner, ctx)
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
      ctx.onWarn(`[lesson-convert] 未识别的块（原样保留 HTML）：<${b.tag}>`)
      return b.raw
  }
}

/* ---------------- 顶层入口 ---------------- */

/**
 * 讲义 HTML → Markdown。
 * @param {string} html 讲义全文
 * @param {{ slug?: string, onWarn?: (msg: string) => void }} ctx
 *   slug：课程 slug（相邻课互链与镜像相对链接重写依赖它）
 * @returns {{
 *   headline: string,          // h1 主标题（讲义 headline，非 <title> 的课号名）
 *   metaLine: string,          // lesson-meta 拼接行（模块｜周课｜三段式）
 *   body: string,              // 正文 Markdown（不含 headline 与 meta，nav 已剥离）
 *   nav: { prev: {text,url}|null, middle: {text,url}[], next: {text,url}|null },
 * }}
 */
export function lessonHtmlToMarkdown(html, ctx = {}) {
  const c = { slug: ctx.slug ?? '', onWarn: ctx.onWarn ?? (() => {}) }
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
