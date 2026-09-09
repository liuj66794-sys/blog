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
const THEME_ICONS = {
  // 浅色模式下显示月亮（点击切到深色），深色模式下显示太阳
  dark: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  light: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2M12 19.2v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.8 12h2M19.2 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
}
function paintTheme() {
  let preference = 'auto'
  try { preference = localStorage.getItem(appearanceKey) || 'auto' } catch {}
  const dark = preference === 'dark' || (preference !== 'light' && systemTheme.matches)
  root.dataset.theme = dark ? 'dark' : 'light'
  if (themeButton) {
    themeButton.innerHTML = dark ? THEME_ICONS.light : THEME_ICONS.dark
    themeButton.setAttribute('aria-label', dark ? '切换为浅色主题' : '切换为深色主题')
    themeButton.setAttribute('aria-pressed', String(dark))
    themeButton.title = themeButton.getAttribute('aria-label')
  }
}
themeButton?.addEventListener('click', () => {
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem(appearanceKey, theme) } catch {}
  paintTheme()
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
  const tocLinks = new Map()
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `lesson-section-${index}`
    const link = document.createElement('a')
    link.href = `#${encodeURIComponent(heading.id)}`
    link.textContent = heading.textContent.trim()
    if (heading.tagName === 'H3') link.className = 'is-child'
    link.addEventListener('click', () => dialog.close())
    tocLinks.set(heading.id, link)
    nav.append(link)
  })
  dialog.append(header, nav)
  document.body.append(dialog)
  // 目录打开时高亮当前阅读到的章节
  let spy = null
  const startSpy = () => {
    if (spy || !('IntersectionObserver' in window)) return
    spy = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const active = tocLinks.get(entry.target.id)
        if (!active) continue
        for (const link of tocLinks.values()) link.removeAttribute('aria-current')
        active.setAttribute('aria-current', 'location')
        active.scrollIntoView({ block: 'nearest' })
      }
    }, { rootMargin: '-80px 0px -70% 0px' })
    headings.forEach(heading => spy.observe(heading))
  }
  const stopSpy = () => { spy?.disconnect(); spy = null }
  tocButton.hidden = false
  tocButton.addEventListener('click', () => { dialog.showModal(); close.focus(); startSpy() })
  dialog.addEventListener('close', () => { stopSpy(); tocButton.focus() })
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close() })
}

// 顶部细进度条：读到哪里，一眼可见
const progressBar = document.createElement('div')
progressBar.className = 'study-reading-progress'
progressBar.setAttribute('aria-hidden', 'true')
progressBar.append(document.createElement('span'))
document.body.append(progressBar)
let progressTicking = false
function paintReadingProgress() {
  progressTicking = false
  const scrollable = document.documentElement.scrollHeight - window.innerHeight
  const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0
  progressBar.firstChild.style.width = `${ratio * 100}%`
  progressBar.hidden = scrollable <= 0
}
window.addEventListener('scroll', () => {
  if (progressTicking) return
  progressTicking = true
  requestAnimationFrame(paintReadingProgress)
}, { passive: true })
window.addEventListener('resize', paintReadingProgress)
paintReadingProgress()
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
