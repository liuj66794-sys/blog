import { defineClientConfig } from 'vuepress/client'
import { nextTick } from 'vue'
import './styles/palette.css'
import './styles/index.css'

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

export default defineClientConfig({
  enhance({ router }) {
    if (__VUEPRESS_SSR__) return
    router.afterEach(async () => {
      // 页面内容在路由确认后的后续帧渲染，多等两帧确保目标 DOM 已挂载
      await nextTick()
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      fixPostsNavLinks()
    })
  },
})
