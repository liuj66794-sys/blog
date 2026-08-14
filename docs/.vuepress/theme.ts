import { defineThemeConfig } from 'vuepress-theme-plume'

const avatar = 'https://github.com/liuj66794-sys.png'

export default defineThemeConfig({
  logo: avatar,
  repo: 'liuj66794-sys',
  editLink: false,
  appearance: true,

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
