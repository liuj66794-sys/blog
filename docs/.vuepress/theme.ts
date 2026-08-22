import { defineThemeConfig } from 'vuepress-theme-plume'
import { COURSES, origin, siteUrl } from './site-meta.mjs'

// 头像本地化（public/avatar.png）。logo/profile 交给 plume 自动补 base（手动拼会双重前缀）；
// og:image 类必须绝对 URL
const avatar = '/avatar.png'
const avatarAbsolute = `${siteUrl}/avatar.png`

/** 博客目录 slug → 课程显示名（分类页分组标签用；名单单一来源见 site-meta.mjs COURSES） */
const COURSE_NAMES: Record<string, string> = Object.fromEntries(COURSES.map((c) => [c.slug, c.name]))

export default defineThemeConfig({
  logo: avatar,
  // editLink 实际经 resolveThemeData 透传进 themeData 生效（默认 true）；
  // ThemeConfig 类型没声明此字段是上游类型缺口。@ts-expect-error：
  // 上游补上类型后这里会报"未使用"，提醒删除标记
  // @ts-expect-error plume ThemeConfig 缺 editLink 声明
  editLink: false,
  appearance: true,
  hostname: origin,
  plugins: {
    seo: {
      // page.path 不含 base，canonical 前缀需带 base；siteUrl 已含（派生自 site-meta.mjs）
      canonical: siteUrl,
      fallBackImage: avatarAbsolute,
      // 首页按 website 标注，其余有源文件的页面按 article
      // （用结构化类型标注，不依赖 @vuepress/core 的可访问性）
      isArticle: (page: { filePathRelative: string | null; path: string }) =>
        Boolean(page.filePathRelative && page.path !== '/'),
    },
    // giscus 评论（数据存 GitHub Discussions）。前置条件均已验证（2026-08-21）：
    // 仓库已启用 Discussions，giscus app 已安装（经 giscus.app/api 验证可访问仓库讨论）。
    comment: {
      type: 'giscus',
      repo: 'liuj66794-sys/blog',
      repoId: 'R_kgDOT4V1mw',
      category: 'Announcements',
      categoryId: 'DIC_kwDOT4V1m84DDz8O',
      mapping: 'pathname',
      reactionsEnabled: '1',
      inputPosition: 'top',
      theme: 'preferred_color_scheme',
      lang: 'zh-CN',
    },
  },

  profile: {
    avatar,
    name: 'L1U.J',
    description: '0x6C6975 · 把学习过程变成可检索的知识资产',
    location: 'China',
  },

  social: [{ icon: 'github', link: 'https://github.com/liuj66794-sys' }],

  footer: {
    message: '把学习过程变成可检索的知识资产',
    copyright: 'Copyright © 2026 L1U.J',
  },

  navbar: [
    { text: '首页', link: '/' },
    { text: '博客', link: '/blog/' },
    {
      text: '课程',
      items: COURSES.map((c) => ({ text: c.name, link: `/courses/${c.slug}/` })),
    },
    { text: '知识库', link: '/knowledge/' },
    { text: '项目', link: '/projects/' },
  ],

  collections: [
    {
      type: 'post',
      dir: 'blog',
      title: '博客',
      link: '/blog/',
      autoFrontmatter: { permalink: 'filepath' },
      // 分类默认取目录 slug（a-shares 等），映射为课程显示名；id 不变，分类页 URL 稳定
      categoriesTransform: (categories) =>
        categories.map((c) => ({ ...c, name: COURSE_NAMES[c.name] ?? c.name })),
    },
    // 课程 doc 集合由 COURSES 名单派生（目录/标题一一对应，配置项全同）。
    // as const：map 展开进数组字面量后不再有字面量上下文，不加会把
    // 'doc'/'auto'/'filepath' widen 成 string 而 theme 集合类型不收
    ...COURSES.map((c) => ({
      type: 'doc' as const,
      dir: `courses/${c.slug}`,
      title: c.name,
      sidebar: 'auto' as const,
      autoFrontmatter: { permalink: 'filepath' as const },
    })),
    {
      type: 'doc',
      dir: 'knowledge',
      title: '知识库',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
    {
      type: 'doc',
      dir: 'projects',
      title: '项目',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
  ],

  search: {
    provider: 'local',
    locales: {
      '/': {
        placeholder: '搜索',
      },
    },
  },
})
