import { defineClientConfig } from 'vuepress/client'
import { nextTick, onMounted } from 'vue'
import { trackPortfolioEvent } from './analytics.mjs'
import CommercialHome from './components/CommercialHome.vue'
import HireMePage from './components/HireMePage.vue'
import PortfolioProjectsPage from './components/PortfolioProjectsPage.vue'
import ProjectCasePage from './components/ProjectCasePage.vue'
import LearningHome from './components/LearningHome.vue'
import CourseHub from './components/CourseHub.vue'
import KnowledgeHub from './components/KnowledgeHub.vue'
import PrepDashboard from './components/PrepDashboard.vue'
import PrepCourseCatalog from './components/PrepCourseCatalog.vue'
import './styles/palette.css'
import './styles/index.css'
import './styles/commercial.css'
import './styles/learning.css'

/**
 * plume 在页面不属于任何集合时（首页即如此），标签/分类/归档链接会回落到
 * 根路径（/tags/ 等）——缺 base 与博客集合前缀，且被 VPLink 判定为站外链接
 * （带 external 图标、新标签页打开），部署在子路径下点击即 404。
 * 这里按博客集合的真实路径（base + /blog/ 前缀）重写；将来迁移到根域名
 * （base 改为 '/'）后该公式同样成立。
 */
function fixPostsNavLinks() {
  for (const a of document.querySelectorAll('.posts-nav a[href], .vp-posts-nav a[href]')) {
    const href = a.getAttribute('href') ?? ''
    const match = href.match(/^\/(archives|categories|tags)\/$/)
    if (!match) continue
    a.setAttribute('href', `${__VUEPRESS_BASE__}blog/${match[1]}/`)
    a.removeAttribute('target')
    a.removeAttribute('rel')
    a.classList.remove('vp-external-link-icon')
  }
}

function trackHomepageHero(event) {
  const link = event.target.closest?.('.vp-home-hero a[href]')
  if (!link) return

  const url = new URL(link.href, window.location.href)
  const hirePath = `${__VUEPRESS_BASE__}hire/`
  const projectsPath = `${__VUEPRESS_BASE__}projects/`
  if (url.pathname === hirePath) {
    trackPortfolioEvent('portfolio_hire_cta', { location: 'home_hero' })
  } else if (url.pathname === projectsPath) {
    trackPortfolioEvent('portfolio_case_catalog_open', { location: 'home_hero' })
  }
}

// 独立 HTML 互动课属于本站，使用正常的当前标签导航。
function normalizeLessonLinks() {
  for (const link of document.querySelectorAll(`a[href^="${__VUEPRESS_BASE__}lessons/"]`)) {
    link.removeAttribute('target')
    link.removeAttribute('rel')
    link.classList.remove('vp-external-link-icon')
    const helper = link.querySelector('.visually-hidden, .sr-only')
    if (helper?.textContent.includes('新窗口')) helper.remove()
  }
}

/**
 * 备考区（/prep/，sync-prep 生成）客户端增强：
 * - #exam-countdown（data-exam）：距考天数
 * - #prep-now（data-start + data-p1/p2/p3 各阶段最后一天及名称）：当前周与阶段
 * - .prep-check input：周打卡勾选持久化到 localStorage（换设备不同步，页面有说明）
 * - #prep-progress：本页周完成计数
 */
const PREP_CHECKS_KEY = 'zsb-prep-checks'

function enhancePrep() {
  if (!window.location.pathname.startsWith(`${__VUEPRESS_BASE__}prep/`)) return
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const toDate = (s) => new Date(`${s}T00:00:00`)
  const fmt = (d) =>
    `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const cd = document.getElementById('exam-countdown')
  if (cd?.dataset.exam) {
    const days = Math.round((toDate(cd.dataset.exam) - today) / 86400000)
    cd.textContent =
      days > 1
        ? `距考试还有 ${days} 天`
        : days === 1
          ? '明天考试'
          : days === 0
            ? '今天考试 🎓'
            : '考试已结束'
  }

  const nw = document.getElementById('prep-now')
  if (nw?.dataset.start) {
    const start = toDate(nw.dataset.start)
    const week = Math.min(29, Math.max(0, Math.floor((today - start) / 86400000 / 7) + 1))
    const phaseEnds = [1, 2, 3]
      .map((i) => ({ end: nw.dataset[`p${i}`], name: nw.dataset[`p${i}n`] }))
      .filter((p) => p.end && p.name)
    const phase = phaseEnds.find((p) => today <= toDate(p.end))
    if (week === 0) {
      nw.textContent = `计划尚未开始（W1 自 ${nw.dataset.start.slice(5)} 起）`
    } else {
      const ws = new Date(start)
      ws.setDate(ws.getDate() + (week - 1) * 7)
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      nw.textContent = `当前第 ${week} 周（${fmt(ws)} ~ ${fmt(we)}）· ${phase?.name ?? '考期已过'}`
    }
  }

  const boxes = [
    ...(document.querySelector('.vp-doc')?.querySelectorAll('.prep-check input[type="checkbox"]') ?? []),
  ]
  if (!boxes.length) return
  const readStore = () => {
    try {
      return JSON.parse(localStorage.getItem(PREP_CHECKS_KEY) ?? '{}')
    } catch {
      return {}
    }
  }
  const progress = document.getElementById('prep-progress')
  const updateProgress = () => {
    if (progress) {
      progress.textContent = `已完成 ${boxes.filter((b) => b.checked).length} / ${boxes.length} 周`
    }
  }
  const pageKey = window.location.pathname
  for (const box of boxes) {
    const key = `${pageKey}#${box.dataset.key}`
    box.checked = Boolean(readStore()[key])
    if (box.dataset.prepBound) continue
    box.dataset.prepBound = 'true'
    box.addEventListener('change', () => {
      const store = readStore()
      if (box.checked) store[key] = 1
      else delete store[key]
      localStorage.setItem(PREP_CHECKS_KEY, JSON.stringify(store))
      updateProgress()
    })
  }
  updateProgress()
}

export default defineClientConfig({
  enhance({ app, router }) {
    app.component('CommercialHome', CommercialHome)
    app.component('HireMePage', HireMePage)
    app.component('PortfolioProjectsPage', PortfolioProjectsPage)
    app.component('ProjectCasePage', ProjectCasePage)
    app.component('LearningHome', LearningHome)
    app.component('CourseHub', CourseHub)
    app.component('KnowledgeHub', KnowledgeHub)
    app.component('PrepDashboard', PrepDashboard)
    app.component('PrepCourseCatalog', PrepCourseCatalog)

    if (__VUEPRESS_SSR__) return
    document.addEventListener('click', trackHomepageHero)
    router.afterEach(async () => {
      // 页面内容在路由确认后的后续帧渲染，多等两帧确保目标 DOM 已挂载
      await nextTick()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      fixPostsNavLinks()
      normalizeLessonLinks()
      enhancePrep()
    })
  },
  setup() {
    onMounted(() => {
      nextTick(() => requestAnimationFrame(() => {
        fixPostsNavLinks()
        normalizeLessonLinks()
        enhancePrep()
      }))
    })
  },
})
