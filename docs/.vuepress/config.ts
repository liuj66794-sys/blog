import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { feedPlugin } from '@vuepress/plugin-feed'
import { plumeTheme } from 'vuepress-theme-plume'
import { fileURLToPath } from 'node:url'
import theme from './theme.js'
import { base, origin, siteUrl, withBase } from './site-meta.mjs'

// 上游 @vuepress/plugin-comment rc.131 自引用断裂的兜底，详见 shim 文件头注释
const commentServiceShim = fileURLToPath(new URL('./shims/comment-service.mjs', import.meta.url))

export default defineUserConfig({
  lang: 'zh-CN',
  // 部署在项目站点 https://liuj66794-sys.github.io/blog/；
  // base/origin 取值见 site-meta.mjs（单一数据来源，迁移根域名只改那个文件）
  base,
  title: 'L1U.J',
  description:
    'L1U.J 的学习空间：课程讲义、互动练习、专升本备考、知识库与项目实践。',
  head: [
    // 头像本地化（public/avatar.png），不再依赖 GitHub 头像外链
    ['link', { rel: 'icon', href: withBase('/avatar.png') }],
    ['meta', { name: 'keywords', content: 'L1U.J,全栈开发,Windows软件,Android开发,AI应用,Agent,MVP,开发者作品集,技术博客' }],
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'L1U.J',
        alternateName: 'liuj66794-sys',
        url: siteUrl,
        email: 'mailto:386239680@qq.com',
        sameAs: ['https://github.com/liuj66794-sys'],
        jobTitle: 'Full-stack, Windows, Android and AI Developer',
        knowsAbout: ['Web development', 'Windows desktop software', 'Android development', 'AI applications', 'AI agents'],
      }),
    ],
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
      hostname: origin,
      rss: true,
      atom: true,
      filter: ({ filePathRelative }) => Boolean(filePathRelative?.startsWith('blog/')),
      sorter: (a, b) =>
        // frontmatter 索引签名是宽松类型，String() 收窄后才能进 Date
        new Date(String(b.frontmatter.createTime ?? 0)).getTime()
        - new Date(String(a.frontmatter.createTime ?? 0)).getTime(),
    }),
  ],
})
