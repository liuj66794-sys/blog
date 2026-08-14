import { defineUserConfig } from 'vuepress'
import { viteBundler } from '@vuepress/bundler-vite'
import { plumeTheme } from 'vuepress-theme-plume'
import theme from './theme.js'

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
  ],
  bundler: viteBundler(),
  theme: plumeTheme(theme),
})
