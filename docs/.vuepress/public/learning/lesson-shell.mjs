import { trackReading } from './reading-state.mjs'
import { attachLessonSession } from './lesson-session.mjs'

const base = document.querySelector('script[data-study-base]')?.dataset.studyBase || '/blog/'
const root = document.documentElement
// The shared runtime brands existing mirrors as well as future generated lessons.
const brandMark = `${base}brand/zhixu-mark.png`
function makeBrandMark(extraClass = '') {
  const image = document.createElement('img')
  image.src = brandMark
  image.alt = ''
  image.width = 28
  image.height = 28
  image.className = `study-nav-mark ${extraClass}`.trim()
  return image
}
const homeLink = document.querySelector('.blog-lesson-home')
if (homeLink) {
  const wordmark = document.createElement('span')
  wordmark.textContent = '知序'
  homeLink.replaceChildren(makeBrandMark(), wordmark)
  homeLink.setAttribute('aria-label', '知序首页')
}
document.querySelector('.blog-lesson-nav-back')?.prepend(makeBrandMark('is-mobile'))
const icons = [...document.querySelectorAll('link[rel~="icon"]')]
if (!icons.length) {
  const icon = document.createElement('link')
  icon.rel = 'icon'
  document.head.append(icon)
  icons.push(icon)
}
for (const icon of icons) { icon.href = brandMark; icon.type = 'image/png' }
if (!document.title.includes('知序')) document.title += ' | 知序'
const appearanceKey = 'vuepress-theme-appearance'
const themeButton = document.querySelector('[data-lesson-theme]')
const systemTheme = matchMedia('(prefers-color-scheme: dark)')
function paintTheme() {
  let preference = 'auto'
  try { preference = localStorage.getItem(appearanceKey) || 'auto' } catch {}
  const dark = preference === 'dark' || (preference !== 'light' && systemTheme.matches)
  root.dataset.theme = dark ? 'dark' : 'light'
  if (themeButton) {
    themeButton.textContent = dark ? '☀' : '◐'
    themeButton.setAttribute('aria-label', dark ? '切换为浅色主题' : '切换为深色主题')
    themeButton.title = themeButton.getAttribute('aria-label')
  }
}
themeButton?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem(appearanceKey, theme) } catch {}
  root.dataset.theme = theme
  themeButton.setAttribute('aria-label', theme === 'dark' ? '切换为浅色主题' : '切换为深色主题')
  themeButton.textContent = theme === 'dark' ? '☀' : '◐'
})
window.addEventListener('storage', event => { if (event.key === appearanceKey) paintTheme() })
systemTheme.addEventListener('change', paintTheme)
paintTheme()

const main = document.querySelector('main, article, .wrap') || document.body
const headings = [...main.querySelectorAll('h2,h3')].filter(node => !node.closest('nav,footer'))
const tocButton = document.querySelector('[data-lesson-toc]')
if (headings.length && tocButton) {
  const dialog = document.createElement('dialog')
  dialog.className = 'study-contents'
  dialog.setAttribute('aria-labelledby', 'study-contents-title')
  const header = document.createElement('header')
  const title = document.createElement('h2')
  title.id = 'study-contents-title'
  title.textContent = '本课目录'
  const close = document.createElement('button')
  close.type = 'button'
  close.textContent = '关闭'
  close.addEventListener('click', () => dialog.close())
  header.append(title, close)
  const nav = document.createElement('nav')
  nav.setAttribute('aria-label', '本课章节')
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `lesson-section-${index}`
    const link = document.createElement('a')
    link.href = `#${encodeURIComponent(heading.id)}`
    link.textContent = heading.textContent.trim()
    if (heading.tagName === 'H3') link.className = 'is-child'
    link.addEventListener('click', () => dialog.close())
    nav.append(link)
  })
  dialog.append(header, nav)
  document.body.append(dialog)
  tocButton.hidden = false
  tocButton.addEventListener('click', () => dialog.showModal())
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
}
const more = document.querySelector('.blog-lesson-more')
document.addEventListener('click', event => { if (more?.open && !more.contains(event.target)) more.open = false })
document.addEventListener('keydown', event => { if (event.key === 'Escape' && more?.open) { more.open = false; more.querySelector('summary').focus() } })

// Wide tables scroll locally; cells, formulas and source content stay intact.
for (const table of main.querySelectorAll('table')) {
  if (table.parentElement?.classList.contains('study-table-scroll')) continue
  const wrapper = document.createElement('div')
  wrapper.className = 'study-table-scroll'
  wrapper.tabIndex = 0
  wrapper.setAttribute('role', 'region')
  wrapper.setAttribute('aria-label', '表格，可横向滚动查看')
  table.before(wrapper)
  wrapper.append(table)
}
function startSession() { attachLessonSession(base, {interactive:true}); trackReading(base) }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startSession, { once: true })
else startSession()
