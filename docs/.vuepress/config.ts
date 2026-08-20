import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { feedPlugin } from '@vuepress/plugin-feed'
import { plumeTheme } from 'vuepress-theme-plume'
import { fileURLToPath } from 'node:url'
import theme from './theme.js'

// 上游 @vuepress/plugin-comment rc.131 自引用断裂的兜底，详见 shim 文件头注释
const commentServiceShim = fileURLToPath(new URL('./shims/comment-service.mjs', import.meta.url))

export default defineUserConfig({
  lang: 'zh-CN',
  // 部署在项目站点 https://liuj66794-sys.github.io/blog/；
  // 若迁移到用户站仓库 liuj66794-sys.github.io（根路径），改回 '/'
  base: '/blog/',
  title: 'L1U.J 的学习宇宙',
  description:
    '个人技术博客：A 股入门、TypeScript Agent、工程技能、英语教学、政策学习五门课程，配套博客、知识库与 GitHub 项目墙。',
  head: [
    ['link', { rel: 'icon', href: 'https://github.com/liuj66794-sys.png' }],
    ['meta', { name: 'keywords', content: '博客,课程,A股,TypeScript,Agent,工程技能,英语,专升本政治' }],
    // Google Analytics（Measurement ID: G-TYH712JVJB，2026-08-21 创建）
    ['script', { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=G-TYH712JVJB' }],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];\nfunction gtag(){dataLayer.push(arguments);}\ngtag('js', new Date());\ngtag('config', 'G-TYH712JVJB');`,
    ],
  ],
  bundler: viteBundler({
    viteOptions: {
      resolve: {
        alias: {
          '@vuepress/plugin-comment/service': commentServiceShim,
        },
      },
    },
  }),
  theme: plumeTheme(theme),
  plugins: [
    // RSS/Atom 订阅：只收录博客文章（课程/知识库文档页不进 feed）；
    // base 由插件自动处理，文章 URL 会带上 /blog 前缀
    feedPlugin({
      hostname: 'https://liuj66794-sys.github.io',
      rss: true,
      atom: true,
      filter: ({ filePathRelative }) => Boolean(filePathRelative?.startsWith('blog/')),
      sorter: (a, b) =>
        new Date(b.frontmatter.createTime ?? 0).getTime() - new Date(a.frontmatter.createTime ?? 0).getTime(),
    }),
  ],
})
