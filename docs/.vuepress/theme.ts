import { defineThemeConfig } from 'vuepress-theme-plume'

const avatar = 'https://github.com/liuj66794-sys.png'

export default defineThemeConfig({
  logo: avatar,
  repo: 'liuj66794-sys',
  editLink: false,
  appearance: true,
  hostname: 'https://liuj66794-sys.github.io',
  plugins: {
    seo: {
      // page.path 不含 base，canonical 前缀需带上 /blog；迁移根域名时同步改为站点根
      canonical: 'https://liuj66794-sys.github.io/blog',
      fallBackImage: avatar,
      // 首页按 website 标注，其余有源文件的页面按 article
      isArticle: (page) => Boolean(page.filePathRelative && page.path !== '/'),
    },
    // giscus 评论（数据存 GitHub Discussions，仓库 2026-08-21 已启用 Discussions）。
    // 剩余前置条件：giscus app 安装到仓库 https://github.com/apps/giscus
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
      items: [
        { text: 'A 股入门', link: '/courses/a-shares/' },
        { text: 'TypeScript Agent', link: '/courses/pi-agent/' },
        { text: '工程技能', link: '/courses/engineering-skills/' },
        { text: '英语教学', link: '/courses/english/' },
        { text: '政策学习', link: '/courses/policy/' },
      ],
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
    },
    {
      type: 'doc',
      dir: 'courses/a-shares',
      title: 'A 股入门',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
    {
      type: 'doc',
      dir: 'courses/pi-agent',
      title: 'TypeScript Agent',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
    {
      type: 'doc',
      dir: 'courses/engineering-skills',
      title: '工程技能',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
    {
      type: 'doc',
      dir: 'courses/english',
      title: '英语教学',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
    {
      type: 'doc',
      dir: 'courses/policy',
      title: '政策学习',
      sidebar: 'auto',
      autoFrontmatter: { permalink: 'filepath' },
    },
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
