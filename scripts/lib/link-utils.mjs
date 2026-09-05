/**
 * link-utils.mjs —— check-links.mjs 的核心纯函数：站内 URL 路径 → dist 文件路径。
 *
 * 从脚本内抽出供 node:test 直接覆盖（见 link-utils.test.mjs）——
 * 这个映射是死链校验的正确性根基：映射错一个分支，就是成片的漏检或误报。
 */
import path from 'node:path'

// 这些首段属于本站内容/资源。其他根路径可能属于同一域名的其他项目，
// 不凭“根路径”一概报错；Plume 的兼容例外由调用方显式处理。
const SITE_ROOTS = new Set([
  'lessons', 'courses', 'prep', 'knowledge', 'projects', 'hire',
  'about', 'archives', 'categories', 'tags', 'images', 'assets',
])

/** 已知本站路径漏了部署 base。先排除合法 base，避免前缀误判。 */
export function isMissingSiteBase(pathname, siteBase) {
  const cleanBase = siteBase.replace(/\/$/, '')
  if (!cleanBase) return false
  let decoded
  try { decoded = decodeURIComponent(pathname) } catch { decoded = pathname }
  const cleanPath = decoded.split(/[?#]/)[0]
  if (!cleanPath.startsWith('/') || cleanPath.startsWith('//')) return false
  if (cleanPath === cleanBase || cleanPath.startsWith(`${cleanBase}/`)) return false
  return SITE_ROOTS.has(cleanPath.split('/')[1])
}

/**
 * 站内 URL 路径 → dist 文件路径。
 * - base 根（`/blog` 与 `/blog/`）→ dist/index.html
 * - 尾斜杠目录形式 → 追加 index.html（静态托管语义）
 * - 路径做 percent-decode（中文讲义文件名以解码后的磁盘路径存在）
 * - 不在 base 内 → null（外站或越界路径，不归本检查管）
 * decodeURIComponent 失败（恶意/畸形编码）时按原始路径兜底，
 * 落到磁盘上基本必然不存在 → 报死链，倾向暴露而不是吞掉。
 */
export function urlToDistFile(pathname, distRoot, siteBase) {
  let decoded
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    decoded = pathname
  }
  if (decoded === siteBase || decoded === `${siteBase}/`) return path.join(distRoot, 'index.html')
  if (!decoded.startsWith(`${siteBase}/`)) return null
  let rel = decoded.slice(siteBase.length + 1)
  if (rel.endsWith('/')) rel += 'index.html'
  return path.join(distRoot, rel)
}
