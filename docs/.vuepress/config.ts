import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { feedPlugin } from '@vuepress/plugin-feed'
import { plumeTheme } from 'vuepress-theme-plume'
import { fileURLToPath } from 'node:url'
import theme from './theme.js'
import { base, origin, siteUrl, withBase } from './site-meta.mjs'
import { brand } from './brand.mjs'

// 上游 @vuepress/plugin-comment rc.131 自引用断裂的兜底，详见 shim 文件头注释
const commentServiceShim = fileURLToPath(new URL('./shims/comment-service.mjs', import.meta.url))

export default defineUserConfig({
  lang: 'zh-CN',
  // 部署在项目站点 https://liuj66794-sys.github.io/blog/；
  // base/origin 取值见 site-meta.mjs（单一数据来源，迁移根域名只改那个文件）
  base,
  title: brand.name,
  description: brand.description,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: withBase(brand.mark) }],
    ['meta', { name: 'theme-color', content: '#214e45' }],
    ['meta', { name: 'keywords', content: '知序,ZHIXU,系统学习,专升本备考,互动练习,知识库,TypeScript,Agent,工程实践' }],
    [
      'script',
      { type: 'application/ld+json' },
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: brand.name,
        alternateName: brand.latin,
        url: siteUrl,
        description: brand.description,
        inLanguage: 'zh-CN',
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
