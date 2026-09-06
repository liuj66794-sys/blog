/**
 * 独立 HTML 讲义共享的站点导航。随镜像生成，不依赖 VuePress 运行时。
 * 固定导航下方保留占位；课程原有的 sticky .topbar 从导航下方开始吸顶。
 * 只插入导航和有作用域的样式，不改课程脚本与浏览器中的学习记录。
 */
import { withBase } from '../../docs/.vuepress/site-meta.mjs'

export const NAV_BAR_MARKER = 'data-blog-nav-bar'

const BAR_LINKS = [
  ['首页', '/'],
  ['课程总览', '/courses/'],
  ['备考中心', '/prep/'],
]

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])

const NAV_STYLE = `<style data-blog-nav-style>
:root{--blog-nav-height:57px}
html{scroll-padding-top:calc(var(--blog-nav-height) + 80px)}
[data-blog-nav-bar]{position:fixed;inset:0 0 auto;z-index:9999;box-sizing:border-box;border-bottom:1px solid #dbe5f0;background:rgba(248,251,255,.97);box-shadow:0 2px 12px #1635530a;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);font:14px/1.4 system-ui,-apple-system,'Segoe UI','Microsoft YaHei',sans-serif;color:#264461}
[data-blog-nav-bar] .blog-lesson-nav-inner{box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:6px;max-width:1120px;margin:0 auto;padding:6px 12px}
[data-blog-nav-bar] a{box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;padding:8px 15px;border:0;border-radius:8px;color:#264461;text-decoration:none;white-space:nowrap;font:inherit;letter-spacing:normal}
[data-blog-nav-bar] a:hover{background:#e8f0fb;color:#174f94;text-decoration:none}
[data-blog-nav-bar] a:focus-visible{outline:3px solid #2864b4;outline-offset:-3px;background:#e8f0fb}
[data-blog-nav-bar] .blog-lesson-nav-back{background:#e8f0fb;color:#174f94;font-weight:650}
[data-blog-nav-spacer]{height:var(--blog-nav-height);flex-shrink:0}
body>.topbar{top:var(--blog-nav-height)}
@media(max-width:720px){
  body>.topbar>.topbar-inner>nav.topnav{min-width:0;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;padding:2px 0 6px}
  body>.topbar>.topbar-inner>nav.topnav>a{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;min-height:44px}
}
@media(max-width:600px){
  :root{--blog-nav-height:105px}
  [data-blog-nav-bar] .blog-lesson-nav-inner{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px;padding:6px 8px}
  [data-blog-nav-bar] a{grid-column:span 2;min-width:0;padding:8px 4px;font-size:13px}
  [data-blog-nav-bar] a:nth-child(n+4){grid-column:span 3}
  [data-blog-nav-bar] a:nth-child(4):last-child{grid-column:1/-1}
}
@media print{[data-blog-nav-bar],[data-blog-nav-spacer]{display:none}:root{--blog-nav-height:0px}}
</style>`

/**
 * @param {string} html
 * @param {{backUrl: string, backLabel?: string, planUrl?: string, planLabel?: string}} back
 * 所有返回 URL 均须已含站点 base；planUrl 只用于有独立周计划的备考科目。
 */
export function injectLessonNav(html, back) {
  const bodyOpen = html.match(/<body[^>]*>/i)
  if (!bodyOpen || !back?.backUrl || html.includes(NAV_BAR_MARKER)) return html
  if (!/<link\b[^>]*\brel=["'][^"']*\bicon\b/i.test(html)) {
    html = html.replace(/<\/head>/i, `<link rel="icon" type="image/png" href="${withBase('/avatar.png')}">\n</head>`)
  }
  const links = BAR_LINKS
    .map(([label, url]) => `<a href="${escapeHtml(withBase(url))}" target="_self">${label}</a>`)
    .join('')
  const backLink = `<a class="blog-lesson-nav-back" href="${escapeHtml(back.backUrl)}" target="_self">${escapeHtml(back.backLabel ?? '返回课程目录')}</a>`
  const planLink = back.planUrl
    ? `<a href="${escapeHtml(back.planUrl)}" target="_self">${escapeHtml(back.planLabel ?? '本科目计划')}</a>`
    : ''
  const bar = `<nav ${NAV_BAR_MARKER}="2" aria-label="学习导航"><div class="blog-lesson-nav-inner">${links}${backLink}${planLink}</div></nav><div data-blog-nav-spacer aria-hidden="true"></div>\n${NAV_STYLE}`
  return html.replace(/<body[^>]*>/i, (match) => `${match}\n${bar}`)
}
