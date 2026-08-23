/**
 * external-link-utils.mjs —— 外链巡检（check-external-links.mjs）的纯函数。
 *
 * 提取 dist 产物中的外链引用并按 HTTP 状态分类：
 * - ok：2xx/3xx（fetch 自动跟随重定向）
 * - soft：401/403/405/429/999 等反爬或需登录——无法判定，告警不失败
 * - dead：404/410/其他 4xx/5xx——真死链，巡检失败
 */
export const SOFT_STATUS = new Set([401, 403, 405, 429, 999])

/** 从一段 HTML/feed 文本中提取不在本站 origin 的 http(s) 引用（去重、去锚点） */
export function extractExternalRefs(text, origin) {
  const refs = []
  const seen = new Set()
  const push = (raw) => {
    if (!raw || !/^https?:\/\//i.test(raw)) return
    let u
    try {
      u = new URL(raw)
    } catch {
      return
    }
    if (u.origin === origin) return
    u.hash = ''
    const key = u.href
    if (seen.has(key)) return
    seen.add(key)
    refs.push(key)
  }
  for (const m of text.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)) push(m[1])
  for (const m of text.matchAll(/(?:href|src)\s*=\s*'([^']*)'/g)) push(m[1])
  for (const m of text.matchAll(/<link>([^<]+)<\/link>/g)) push(m[1]) // rss
  for (const m of text.matchAll(/<link[^>]*href="([^"]+)"/g)) push(m[1]) // atom
  return refs
}

/** 状态码分类（HEAD 被 405 拒绝时调用方应改用 GET 重试，不算 soft 也不是 dead） */
export function classifyStatus(status) {
  if (status >= 200 && status < 400) return 'ok'
  if (SOFT_STATUS.has(status)) return 'soft'
  return 'dead' // 404/410/其余 4xx/5xx
}
