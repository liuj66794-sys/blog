/** Shared shell for mirrored lessons. Source content and course scripts remain intact. */
import { withBase } from '../../docs/.vuepress/site-meta.mjs'

export const NAV_BAR_MARKER = 'data-blog-nav-bar'
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char])

export function injectLessonNav(html, back) {
  if (!/<body[^>]*>/i.test(html) || !back?.backUrl || html.includes(NAV_BAR_MARKER)) return html
  const link = (label, url, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${escapeHtml(url)}" target="_self">${escapeHtml(label)}</a>`
  const menuLinks = link('首页', withBase('/'), 'blog-lesson-menu-home') + link('课程总览', withBase('/courses/')) + link('备考中心', withBase('/prep/'))
    + (back.planUrl ? link(back.planLabel || '本科目计划', back.planUrl) : '')
  const bar = `<nav ${NAV_BAR_MARKER}="3" aria-label="学习导航"><div class="blog-lesson-nav-inner">${link('首页', withBase('/'), 'blog-lesson-home')}${link(back.backLabel || '课程目录', back.backUrl, 'blog-lesson-nav-back')}<div class="blog-lesson-actions"><button type="button" data-lesson-toc aria-haspopup="dialog" hidden>本课目录</button><button type="button" data-lesson-theme aria-label="切换主题">◐</button><details class="blog-lesson-more"><summary>更多</summary><div>${menuLinks}</div></details></div></div></nav><div data-blog-nav-spacer aria-hidden="true"></div>`
  const theme = `<script data-study-appearance>try{var a=localStorage.getItem('vuepress-theme-appearance');document.documentElement.dataset.theme=a==='dark'||((a!=='light')&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}</script>`
  const assets = `${theme}<link rel="stylesheet" href="${withBase('/learning/learning-tokens.css')}"><link rel="stylesheet" href="${withBase('/learning/lesson-shell.css')}"><script type="module" src="${withBase('/learning/lesson-shell.mjs')}" data-study-base="${withBase('/')}"></script>`
  if (!/<link\b[^>]*\brel=["'][^"']*\bicon\b/i.test(html)) {
    html = html.replace(/<\/head>/i, `<link rel="icon" type="image/png" href="${withBase('/avatar.png')}">\n</head>`)
  }
  return html.replace(/<html\b/i, '<html data-study-shell')
    .replace(/<\/head>/i, `${assets}\n</head>`)
    .replace(/<body[^>]*>/i, match => `${match}\n${bar}\n`)
}
