/**
 * lesson-nav.mjs —— 静态讲义 HTML 的站点导航条注入（sync-learn / sync-prep 共享）。
 *
 * /lessons/ 下的讲义是独立静态页，不加载 VuePress 应用（client.js 够不到），
 * 只能在镜像写入时注入。四类模板族（a-shares/pi-agent/engineering-skills/
 *Hallmark 内联族/专升本四科族）统一走「<body> 开标签后插入」的保守路线，
 * 46+ 页均有 charset/viewport 与 <body> 开标签。
 *
 * 幂等：注入带 data-blog-nav-bar 标记，重复注入自动跳过；
 * sync 的 staging 每轮都是全新拷贝，注入必然整体重放，不会叠加。
 */
import { withBase } from '../../docs/.vuepress/site-meta.mjs'

export const NAV_BAR_MARKER = 'data-blog-nav-bar'

const BAR_LINKS = [
  ['首页', '/'],
  ['博客', '/blog/'],
  ['课程', '/courses/'],
  ['备考', '/prep/'],
]

const LINK_STYLE = 'color:rgba(255,255,255,.85);text-decoration:none;white-space:nowrap'
const BACK_STYLE = 'color:#fff;text-decoration:none;white-space:nowrap;font-weight:600'

/**
 * 在讲义 HTML 的 <body> 后插入站点导航条。
 * @param {string} html 讲义全文
 * @param {{ backUrl: string, backLabel?: string }} back 返回链接（站内绝对路径，须已含 base）
 * @returns {string} 注入后的 HTML；无 <body> 开标签或缺 backUrl 时原样返回
 */
export function injectLessonNav(html, back) {
  const bodyOpen = html.match(/<body[^>]*>/i)
  if (!bodyOpen || !back?.backUrl || html.includes(NAV_BAR_MARKER)) return html
  const links = BAR_LINKS
    .map(([t, u]) => `<a href="${withBase(u)}" style="${LINK_STYLE}">${t}</a>`)
    .join('')
  const bar = `<div ${NAV_BAR_MARKER}="1" style="position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 14px;background:rgba(17,20,28,.9);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);font:13px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif"><a href="${back.backUrl}" style="${BACK_STYLE}">${back.backLabel ?? '‹ 返回'}</a><span style="display:flex;gap:14px">${links}</span></div>\n<style>body{padding-top:44px!important}</style>`
  return html.replace(/<body[^>]*>/i, (m) => `${m}\n${bar}`)
}
