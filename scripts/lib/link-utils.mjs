/**
 * link-utils.mjs —— check-links.mjs 的核心纯函数：站内 URL 路径 → dist 文件路径。
 *
 * 从脚本内抽出供 node:test 直接覆盖（见 link-utils.test.mjs）——
 * 这个映射是死链校验的正确性根基：映射错一个分支，就是成片的漏检或误报。
 */
import path from 'node:path'

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
