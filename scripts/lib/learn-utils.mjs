/**
 * learn-utils.mjs —— sync-learn / check-links 共享的纯函数工具库。
 *
 * 从 sync-learn.mjs 抽出，供 node:test 单测直接覆盖（见 learn-utils.test.mjs）。
 * 链接拼接统一走 site-meta.mjs 的 withBase（base 单一数据来源）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { withBase } from '../../docs/.vuepress/site-meta.mjs'

export { withBase }

/**
 * mtime 相等判断（容忍亚毫秒差）：copyIfStale/writeAtomic 经 utimesSync 回写 mtime，
 * Date 只有毫秒精度，而 statSync().mtimeMs 带亚毫秒小数——严格相等永不命中，
 * 增量跳过因此失效（表现为每次 sync 都全量复制）。
 */
export const sameMtime = (a, b) => Math.abs(a - b) < 1

export function fmtTime(date) {
  const p = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

/** 递归收集文件（filter 按文件名过滤）；目录不存在时返回空数组 */
export function walk(dir, filter = () => true, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name), filter, out)
    else if (e.isFile() && filter(e.name)) out.push(path.join(dir, e.name))
  }
  return out
}

/** 极简通配：只支持单个 *（如 SPEC-*.md），够本脚本用 */
export function minimatchName(name, pattern) {
  const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$')
  return re.test(name)
}

/** 解析 markdown frontmatter（仅顶层 key: value，够用即可） */
export function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { fm: null, body: text }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)$/)
    if (kv) fm[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '')
  }
  return { fm, body: text.slice(m[0].length) }
}

export function buildFrontmatter(obj) {
  const lines = Object.entries(obj).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}:\n${v.map((i) => `  - ${i}`).join('\n')}`
    return `${k}: ${v}`
  })
  return `---\n${lines.join('\n')}\n---\n`
}

/** 从正文提取摘要：首个非标题段落，去除 markdown 标记，截断到 150 字 */
export function extractDescription(body) {
  const text = body
    .replace(/^#\s+.+$/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`~\-\[\]()!|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 150 ? `${text.slice(0, 150)}…` : text
}

/** 从讲义 HTML 提取纯文本（供摘要卡），去脚本样式与标签 */
export function extractLessonText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 学习记录里的相对链接重写：../xxx → <base>/lessons/<slug>/xxx（其余保持原样）。
 * 语义：learning-records/ 本身不进镜像，只有跳出到项目根（收录名单内）的
 * ../ 链接才有可映射的托管地址；./ 链接指向 learning-records 内部，
 * 映射过去必死链——不改写，但经 onWarn 告警提示作者改用 ../assets/ 等镜像内路径。
 */
export function rewriteRelativeLinks(text, slug, onWarn = console.warn) {
  text = text.replace(/\]\((\.\/[^)\s]+)([^)]*)\)/g, (m, rel) => {
    onWarn(`[sync-learn] ${slug} 学习记录含 ./ 相对链接（指向 learning-records 内部，不在公开镜像内），保持原样：${rel}`)
    return m
  })
  return text.replace(/\]\((\.\.\/[^)\s]+)([^)]*)\)/g, (_, rel, tail) => {
    const clean = rel.replace(/^\.\//, '').replace(/^\.\.\//, '')
    return `](${withBase(`/lessons/${slug}/${clean}`)}${tail})`
  })
}

/**
 * 知识库 md 里的根文档相对链接重写：](./MISSION.md) / ](MISSION.md) / ](../MISSION.md)
 * → ](/lessons/<slug>/MISSION.md)。支持 #anchor 与 "标题" 尾缀（原样保留），
 * 此前要求 ) 直接收尾，带尾缀的写法会静默漏网。
 * md 渲染成页面后相对链接会断裂（页面目录 ≠ 源文件所在目录），
 * 统一改指镜像里原样托管的根文档，与讲义导航栏的链接方式一致。
 * rootDocNames：镜像收录名单中的根级 md 文件名（未转义）。
 */
export function rewriteRootDocLinks(text, slug, rootDocNames) {
  const escaped = rootDocNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const pattern = new RegExp(`\\]\\((?:\\./|\\.\\./)?(${escaped.join('|')})((?:#[^)\\s]*)?(?:\\s+"[^"]*")?)\\)`, 'g')
  return text.replace(pattern, (_, doc, tail) => `](${withBase(`/lessons/${slug}/${doc}`)}${tail})`)
}
